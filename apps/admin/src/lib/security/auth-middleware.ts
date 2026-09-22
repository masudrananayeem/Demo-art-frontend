/**
 * Authentication Middleware for API Routes
 * 
 * Verifies Firebase Auth tokens from request headers
 * and checks if user is an authenticated admin
 * 
 * Uses Firebase Admin SDK when available (recommended for production),
 * falls back to REST API if Admin SDK is not configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getPublicEnv } from '@/lib/env/public-env';
import { getAdminAuth, isAdminSDKAvailable } from '@/lib/firebase/admin';
import { isDev } from '@/lib/env';

/**
 * Verify Firebase Auth token using Firebase Admin SDK (preferred)
 * Returns the decoded token with user info
 */
async function verifyAuthTokenWithAdminSDK(token: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const auth = getAdminAuth();
    if (!auth) {
      return null;
    }

    const decodedToken = await auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || undefined,
    };
  } catch (error) {
    // Token verification failed
    return null;
  }
}

/**
 * Verify Firebase Auth token using Firebase REST API (fallback)
 * Returns the decoded token with user info
 */
async function verifyAuthTokenWithREST(token: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const apiKey = getPublicEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
    if (!apiKey) {
      return null;
    }

    // Verify token with Firebase Auth REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.users && data.users.length > 0) {
      const user = data.users[0];
      return {
        uid: user.localId,
        email: user.email,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Verify Firebase Auth token
 * Uses Admin SDK if available, otherwise falls back to REST API (dev only)
 * In production, Admin SDK is mandatory
 */
async function verifyAuthToken(token: string): Promise<{ uid: string; email?: string } | null> {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Try Admin SDK first (more secure)
  if (isAdminSDKAvailable()) {
    const result = await verifyAuthTokenWithAdminSDK(token);
    if (result) {
      return result;
    }
    // If Admin SDK fails in production, this is a critical error
    if (isProduction) {
      throw new Error('Firebase Admin SDK token verification failed in production. This is a security issue.');
    }
    // If Admin SDK fails in dev, fall back to REST API
    if (isDev) {
      console.warn('Firebase Admin SDK token verification failed, falling back to REST API');
    }
  } else {
    // Admin SDK not available
    if (isProduction) {
      throw new Error('Firebase Admin SDK is required in production but is not configured. Please set up FIREBASE_ADMIN_SERVICE_ACCOUNT.');
    }
  }
  
  // Fall back to REST API (dev only)
  return verifyAuthTokenWithREST(token);
}

/**
 * Get approved admin request by email
 * Matches the logic in admin-requests.ts
 */
async function getApprovedAdminRequestByEmail(email: string) {
  try {
    const requestsRef = collection(db, 'adminRequests');
    const q = query(
      requestsRef,
      where('email', '==', email.toLowerCase().trim()),
      where('status', '==', 'approved'),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    
    return null;
  } catch (error) {
    // Silently fail - return null if query fails
    return null;
  }
}

/**
 * Check if user is an admin in Firestore
 * Also checks for approved requests by email (similar to getAdminUserData)
 */
async function isAdminUser(uid: string, email?: string): Promise<boolean> {
  try {
    const adminDoc = await getDoc(doc(db, 'adminUsers', uid));
    
    if (adminDoc.exists()) {
      const adminData = adminDoc.data();
      const status = adminData?.status;
      
      // Check if admin account is active
      // If status is undefined, null, 'active', or 'approved', consider it valid
      if (status === 'suspended' || status === 'deleted' || status === 'inactive') {
        return false;
      }
      
      return true;
    }
    
    // If no adminUsers document exists, check for approved request by email
    // This matches the logic in getAdminUserData
    if (email) {
      const approvedRequest = await getApprovedAdminRequestByEmail(email);
      if (approvedRequest) {
        // User has an approved request, they should be considered an admin
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Authentication middleware for API routes
 * Verifies Firebase Auth token and checks admin status
 * 
 * Usage:
 *   const authResult = await requireAuth(request);
 *   if (!authResult.success) {
 *     return authResult.response;
 *   }
 *   const { uid, email } = authResult.user;
 */
export async function requireAuth(
  request: NextRequest
): Promise<
  | { success: true; user: { uid: string; email?: string } }
  | { success: false; response: NextResponse }
> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Missing or invalid authorization header. Please include Authorization: Bearer <token>' },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const user = await verifyAuthToken(token);
    if (!user) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Invalid or expired authentication token' },
          { status: 401 }
        ),
      };
    }

    // Check if user is an admin (pass email to check for approved requests)
    const adminStatus = await isAdminUser(user.uid, user.email);
    if (!adminStatus) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Access denied. Admin privileges required.' },
          { status: 403 }
        ),
      };
    }

    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication service unavailable' },
        { status: 503 }
      ),
    };
  }
}

/**
 * Authentication middleware that requires any authenticated user (not just admins)
 * Useful for endpoints that should be accessible to all authenticated users
 * 
 * Usage:
 *   const authResult = await requireAuthenticatedUser(request);
 *   if (!authResult.success) {
 *     return authResult.response;
 *   }
 *   const { uid, email } = authResult.user;
 */
export async function requireAuthenticatedUser(
  request: NextRequest
): Promise<
  | { success: true; user: { uid: string; email?: string } }
  | { success: false; response: NextResponse }
> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Missing or invalid authorization header. Please include Authorization: Bearer <token>' },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const user = await verifyAuthToken(token);
    if (!user) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, error: 'Invalid or expired authentication token' },
          { status: 401 }
        ),
      };
    }

    // Return success without checking admin status
    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication service unavailable' },
        { status: 503 }
      ),
    };
  }
}

/**
 * Optional auth check - doesn't fail if not authenticated
 * Useful for endpoints that work for both authenticated and anonymous users
 */
export async function optionalAuth(
  request: NextRequest
): Promise<{ uid?: string; email?: string; isAdmin: boolean }> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAdmin: false };
    }

    const token = authHeader.substring(7);
    const user = await verifyAuthToken(token);
    
    if (!user) {
      return { isAdmin: false };
    }

    const isAdmin = await isAdminUser(user.uid, user.email);
    return {
      uid: user.uid,
      email: user.email,
      isAdmin,
    };
  } catch (error) {
    return { isAdmin: false };
  }
}
