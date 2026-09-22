/**
 * Firebase Admin SDK Initialization
 * 
 * This module initializes Firebase Admin SDK for server-side operations.
 * Firebase Admin SDK provides secure server-side token verification and
 * administrative operations.
 * 
 * Setup Instructions:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Get service account credentials from Firebase Console:
 *    - Go to Project Settings > Service Accounts
 *    - Click "Generate New Private Key"
 *    - Save the JSON file securely (DO NOT commit to git)
 * 3. Set FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable:
 *    - Option A: Set FIREBASE_ADMIN_SERVICE_ACCOUNT to the JSON file path
 *    - Option B: Set FIREBASE_ADMIN_SERVICE_ACCOUNT to the JSON string
 *    - Option C: Set individual fields (see below)
 * 
 * Alternative: Use individual environment variables:
 * - FIREBASE_ADMIN_PROJECT_ID
 * - FIREBASE_ADMIN_CLIENT_EMAIL
 * - FIREBASE_ADMIN_PRIVATE_KEY (base64 encoded or raw)
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getServerEnv } from '@/lib/env/server-env';
import { isDev } from '@/lib/env';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

/**
 * Initialize Firebase Admin SDK
 * Returns the admin app instance
 */
export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  try {
    // Try to get service account from environment variable
    const serviceAccountPath = getServerEnv('FIREBASE_ADMIN_SERVICE_ACCOUNT', '');
    
    let credential;
    
    if (serviceAccountPath) {
      // Check if it's a file path or JSON string
      if (serviceAccountPath.startsWith('{')) {
        // It's a JSON string
        try {
          const serviceAccount = JSON.parse(serviceAccountPath);
          credential = cert(serviceAccount);
        } catch (error) {
          throw new Error('Invalid FIREBASE_ADMIN_SERVICE_ACCOUNT JSON format');
        }
      } else {
        // It's a file path
        credential = cert(serviceAccountPath);
      }
    } else {
      // Try individual environment variables
      const projectId = getServerEnv('FIREBASE_ADMIN_PROJECT_ID', '');
      const clientEmail = getServerEnv('FIREBASE_ADMIN_CLIENT_EMAIL', '');
      const privateKey = getServerEnv('FIREBASE_ADMIN_PRIVATE_KEY', '');
      
      if (projectId && clientEmail && privateKey) {
        // Decode private key if it's base64 encoded
        const decodedPrivateKey = privateKey.includes('-----BEGIN') 
          ? privateKey 
          : Buffer.from(privateKey, 'base64').toString('utf-8');
        
        credential = cert({
          projectId,
          clientEmail,
          privateKey: decodedPrivateKey,
        });
      } else {
        // Fallback: Use application default credentials (for GCP/Cloud Run)
        // This will work if running on Google Cloud Platform
        credential = undefined; // Will use application default credentials
      }
    }

    adminApp = initializeApp({
      credential: credential,
      projectId: getServerEnv('FIREBASE_ADMIN_PROJECT_ID', '') || 
                 getServerEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', ''),
    });

    return adminApp;
  } catch (error: any) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // In production, Admin SDK is mandatory - fail hard
      throw new Error(
        'SECURITY ERROR: Firebase Admin SDK is required in production but failed to initialize. ' +
        'Please configure FIREBASE_ADMIN_SERVICE_ACCOUNT or individual credentials. ' +
        'Error: ' + error.message
      );
    }
    
    if (isDev) {
      console.warn('Firebase Admin SDK initialization failed:', error.message);
      console.warn('Falling back to REST API for token verification.');
      console.warn('To use Firebase Admin SDK, set up service account credentials.');
      console.warn('NOTE: Admin SDK is MANDATORY in production.');
    }
    // In development, allow fallback to REST API
    throw error;
  }
}

/**
 * Get Firebase Admin Auth instance
 * Returns null if Admin SDK is not configured (will fall back to REST API in dev only)
 * In production, this will throw an error if Admin SDK is not configured
 */
export function getAdminAuth(): Auth | null {
  try {
    if (adminAuth) {
      return adminAuth;
    }

    const app = getAdminApp();
    adminAuth = getAuth(app);
    return adminAuth;
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // In production, fail hard if Admin SDK is not available
      throw new Error(
        'SECURITY ERROR: Firebase Admin SDK is required in production. ' +
        'Please configure FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable.'
      );
    }
    
    // In development, allow fallback to REST API
    return null;
  }
}

/**
 * Check if Firebase Admin SDK is available
 */
export function isAdminSDKAvailable(): boolean {
  try {
    return getAdminAuth() !== null;
  } catch {
    return false;
  }
}
