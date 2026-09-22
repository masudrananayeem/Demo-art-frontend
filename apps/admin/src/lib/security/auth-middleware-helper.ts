/**
 * Authentication Helper Functions for Middleware
 * 
 * These functions are used by Next.js middleware to verify authentication
 * on the server side. They use the same logic as auth-middleware.ts but
 * are separated to avoid circular dependencies.
 */

import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getPublicEnv } from '@/lib/env/public-env';
import { getAdminAuth, isAdminSDKAvailable } from '@/lib/firebase/admin';
import { isDev } from '@/lib/env';

/**
 * Verify Firebase Auth token using Firebase Admin SDK (preferred)
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
    return null;
  }
}

/**
 * Verify Firebase Auth token using Firebase REST API (fallback)
 */
async function verifyAuthTokenWithREST(token: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const apiKey = getPublicEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
    if (!apiKey) {
      return null;
    }

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
export async function verifyAuthToken(token: string): Promise<{ uid: string; email?: string } | null> {
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
export async function isAdminUser(uid: string, email?: string): Promise<boolean> {
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
