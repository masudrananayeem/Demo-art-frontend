import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import { getPublicEnv } from '@/lib/env/public-env';
import { isDev } from '@/lib/env';
import { logger } from '@/lib/logger';

// Note: We don't validate environment variables at module load time
// because they may not be loaded yet during SSR. Validation happens
// lazily when Firebase is actually accessed.

function getFirebaseConfig() {
  // Direct access to process.env to ensure we get the actual values
  // Next.js automatically exposes NEXT_PUBLIC_ variables to the client
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };
  
  return config;
}

let configErrorLogged = false;

function checkFirebaseConfig(config: ReturnType<typeof getFirebaseConfig>): string[] {
  const missingVars: string[] = [];
  if (!config.apiKey) missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!config.authDomain) missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!config.projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!config.storageBucket) missingVars.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!config.messagingSenderId) missingVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!config.appId) missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');
  return missingVars;
}

/**
 * Generate a helpful error message for missing Firebase environment variables
 */
function generateFirebaseEnvError(missingVars: string[], context: 'client' | 'server'): string {
  const contextLabel = context === 'client' ? 'Client-side' : 'Server-side (SSR)';
  
  return (
    `Firebase Auth cannot be initialized [${contextLabel}].\n` +
    `Missing environment variables: ${missingVars.join(', ')}\n\n` +
    `Troubleshooting steps:\n` +
    `1. Verify these variables exist in your .env.local file in the project root\n` +
    `2. Check for typos in variable names (they must start with NEXT_PUBLIC_)\n` +
    `3. CRITICAL: Restart your Next.js dev server - environment variables are only loaded on startup\n` +
    `4. If variables are in .env.local but still missing, try:\n` +
    `   - Stop the dev server completely (Ctrl+C)\n` +
    `   - Delete the .next folder: rm -rf .next\n` +
    `   - Restart the dev server: npm run dev\n` +
    `5. For client-side issues, clear browser cache and hard refresh (Ctrl+Shift+R)\n` +
    (isDev ? `\nNote: In development, you may see warnings but Firebase may still initialize.\n` : '')
  );
}

function validateFirebaseConfig(config: ReturnType<typeof getFirebaseConfig>): void {
  const missingVars = checkFirebaseConfig(config);
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required Firebase environment variables: ${missingVars.join(', ')}. ` +
      `Please add them to your .env.local file. ` +
      `See SECURITY_AUDIT.md for configuration details.`;
    
    const isServer = typeof window === 'undefined';
    
    if (isDev) {
      if (!configErrorLogged) {
        configErrorLogged = true;
      }
      return;
    }
    
    throw new Error(errorMessage);
  }
}

let app: FirebaseApp | null = null;
let appInitialized = false;

function initializeFirebaseApp(): FirebaseApp {
  if (app && appInitialized) {
    return app;
  }

  const firebaseConfig = getFirebaseConfig();
  
  validateFirebaseConfig(firebaseConfig);
  
  const missingVars = checkFirebaseConfig(firebaseConfig);
  if (missingVars.length > 0 && !isDev) {
    throw new Error(
      `Cannot initialize Firebase: Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
  
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      
      // Configure Firestore log level to reduce noise from connection warnings
      // These warnings are normal when offline or during initial connection
      // Firebase operates in offline mode automatically, so these can be safely suppressed
      if (typeof window !== 'undefined') {
        try {
          // Set Firestore log level:
          // 'silent' = suppress all logs (production)
          // 'error' = only show errors (development)
          // This suppresses "Could not reach Cloud Firestore backend" warnings
          setLogLevel(isDev ? 'error' : 'silent');
        } catch (logError) {
          // setLogLevel might not be available in all Firebase versions
          // Ignore if not available - app will still work fine
        }
      }
    } else {
      app = getApps()[0];
    }
    appInitialized = true;
  } catch (error: any) {
    if (missingVars.length > 0) {
      const isClient = typeof window !== 'undefined';
      const context = isClient ? 'client' : 'server';
      const errorMsg = generateFirebaseEnvError(missingVars, context);
      throw new Error(errorMsg);
    }
    throw error;
  }
  
  return app;
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _app: FirebaseApp | null = null;

// Export getAuthInstance for cases where we need the actual instance (not the proxy)
// This is needed for operations like signInWithPopup that require direct access to internal properties
export function getAuthInstance(): Auth {
  if (!_auth) {
    const config = getFirebaseConfig();
    const missingVars = checkFirebaseConfig(config);
    
    if (missingVars.length > 0) {
      if (isDev) {
        // In development, allow initialization to proceed
      } else {
        throw new Error(
          `Firebase Auth cannot be initialized. Missing environment variables: ${missingVars.join(', ')}. ` +
          `Please add them to your .env.local file and restart the server.`
        );
      }
    }
    
    try {
      const firebaseApp = initializeFirebaseApp();
      _auth = getAuth(firebaseApp);
      
      // Ensure auth instance is valid
      if (!_auth) {
        throw new Error('Firebase Auth initialization returned null or undefined. Please check your Firebase configuration.');
      }
      
      // Verify auth is properly initialized by checking internal structure
      // This helps ensure the auth instance is ready for operations like signInWithPopup
      if ((_auth as any)._delegate) {
        const delegate = (_auth as any)._delegate;
        // Ensure the delegate has necessary properties
        if (delegate && typeof delegate.config === 'object') {
          void delegate.config;
        }
      }
    } catch (error: any) {
      if (missingVars.length > 0) {
        const isClient = typeof window !== 'undefined';
        const context = isClient ? 'client' : 'server';
        const errorMsg = generateFirebaseEnvError(missingVars, context);
        throw new Error(errorMsg);
      }
      throw error;
    }
  }
  
  if (!_auth) {
    throw new Error(
      'Firebase Auth instance is null or undefined. This should not happen. ' +
      'Please check your Firebase configuration and restart the server.'
    );
  }
  
  return _auth;
}

function getDbInstance(): Firestore {
  if (!_db) {
    const config = getFirebaseConfig();
    const missingVars = checkFirebaseConfig(config);
    
    if (missingVars.length > 0 && !isDev) {
      const isClient = typeof window !== 'undefined';
      const context = isClient ? 'client' : 'server';
      const errorMsg = 
        generateFirebaseEnvError(missingVars, context) +
        `\nSee SECURITY_AUDIT.md for configuration details.`;
      throw new Error(errorMsg);
    }
    
    try {
      const firebaseApp = initializeFirebaseApp();
      
      // CRITICAL: Initialize Auth before Firestore
      // Firestore's credentials provider requires Auth to be initialized first
      try {
        getAuthInstance();
      } catch (authError: any) {
        // Firestore might still work for public queries, but Auth-dependent features won't work
      }
      
      // Configure Firestore log level before initialization to suppress connection warnings
      // These warnings are normal when offline - Firebase automatically uses offline mode
      if (typeof window !== 'undefined') {
        try {
          setLogLevel(isDev ? 'error' : 'silent');
        } catch (logError) {
          // setLogLevel might not be available in all Firebase versions - ignore if not available
        }
      }
      
      _db = getFirestore(firebaseApp);
      
      if (!_db) {
        const errorMsg = 
          'Firebase Firestore initialization returned null or undefined. ' +
          'This usually means Firebase configuration is invalid. ' +
          'Please check your environment variables and restart the server.';
        throw new Error(errorMsg);
      }
      
      // CRITICAL: Ensure Firestore's internal client is fully initialized
      // The AsyncQueue error suggests the internal client state isn't ready
      try {
        if ((_db as any)._delegate) {
          const delegate = (_db as any)._delegate;
          if (delegate && delegate._databaseId) {
            void delegate._databaseId;
          }
          // Ensure the internal client is ready
          if (delegate && typeof delegate._settings === 'object') {
            void delegate._settings;
          }
        }
        // Verify db is usable by checking type
        if (typeof (_db as any).type !== 'string') {
          // This is a Firestore instance, type should be 'firestore'
          // If it's not accessible, there might be an initialization issue
        }
      } catch (initCheckError: any) {
        // Log but don't fail - Firestore might still work
        if (isDev) {
          logger.warn('Firestore initialization check warning:', initCheckError);
        }
      }
    } catch (error: any) {
      if (missingVars.length > 0) {
        const isClient = typeof window !== 'undefined';
        const context = isClient ? 'client' : 'server';
        const errorMsg = 
          generateFirebaseEnvError(missingVars, context) +
          `\nSee SECURITY_AUDIT.md for configuration details.`;
        
        throw new Error(errorMsg);
      }
      
      const errorMessage = error?.message || '';
      const isInitializationOrderError = 
        errorMessage.includes('asyncQueue') ||
        errorMessage.includes('INTERNAL ASSERTION') ||
        errorMessage.includes('Unexpected state') ||
        errorMessage.includes('credentials provider') ||
        errorMessage.includes('FirebaseAuthCredentialsProvider');
      
      if (isInitializationOrderError) {
        const errorMsg = 
          `Firebase Firestore initialization failed due to Auth initialization order issue. ` +
          `This usually means Auth wasn't properly initialized before Firestore. ` +
          `Please ensure your Firebase configuration is correct and restart the server.`;
        
        throw new Error(errorMsg);
      }
      
      const errorMsg = 
        `Firebase Firestore initialization failed: ${error?.message || 'Unknown error'}. ` +
        `Please check your Firebase configuration and ensure all environment variables are set correctly.`;
      throw new Error(errorMsg);
    }
  }
  
  if (!_db) {
    throw new Error(
      'Firebase Firestore instance is null or undefined. This should not happen. ' +
      'Please check your Firebase configuration and restart the server.'
    );
  }
  
  return _db;
}

function getAppInstance(): FirebaseApp {
  if (!_app) {
    try {
      _app = initializeFirebaseApp();
    } catch (error: any) {
      const config = getFirebaseConfig();
      const missingVars = checkFirebaseConfig(config);
      if (missingVars.length > 0) {
        const isClient = typeof window !== 'undefined';
        const context = isClient ? 'client' : 'server';
        const errorMsg = generateFirebaseEnvError(missingVars, context);
        throw new Error(errorMsg);
      }
      throw error;
    }
  }
  return _app;
}

// CRITICAL: The Proxy must be completely transparent to Firebase Auth's internal code
// Firebase Auth's signInWithPopup needs direct access to the Auth instance and its internal properties
export const auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    // Handle React Fast Refresh / HMR property checks without initializing Firebase
    // These properties are checked during module evaluation and don't need Firebase to be initialized
    const reactPropertyNames = ['$$typeof', 'prototype', 'constructor', 'displayName', 'name'];
    if (typeof prop === 'string' && reactPropertyNames.includes(prop)) {
      // Return undefined for React property checks - this tells React it's not a React component
      return undefined;
    }
    
    // Handle Object.prototype methods
    if (prop === 'hasOwnProperty' || prop === Symbol.hasInstance) {
      return Reflect.get(Object.prototype, prop, receiver);
    }
    
    try {
      let authInstance: Auth | null = null;
      try {
        authInstance = getAuthInstance();
      } catch (initError: any) {
        // If initialization fails (e.g., missing env vars), handle gracefully for React property checks
        const isReactProperty = typeof prop === 'string' && reactPropertyNames.includes(prop);
        if (isReactProperty) {
          return undefined;
        }
        // In development, be more lenient and return undefined for non-critical properties
        if (isDev) {
          // Don't throw for React-related property checks during HMR
          return undefined;
        }
        // Re-throw for other properties in production
        throw initError;
      }
      
      // Ensure authInstance is valid
      if (!authInstance) {
        // For React property checks, return undefined instead of throwing
        if (prop === '$$typeof' || prop === 'prototype' || prop === 'constructor') {
          return undefined;
        }
        throw new Error('Firebase Auth instance is not initialized. Please check your Firebase configuration.');
      }
      
      // CRITICAL: Firebase's getModularInstance needs to access _delegate and other internal properties
      // Ensure we properly expose these properties
      
      // Special handling for _delegate - Firebase's getModularInstance needs this
      // CRITICAL: Return the actual delegate object, not a proxy, so Firebase can access
      // nested properties like _delegate.config._popupResolver.create
      if (prop === '_delegate') {
        const delegate = (authInstance as any)._delegate;
        // Return the actual delegate object directly - no proxy wrapping
        return delegate;
      }
      
      // CRITICAL: For internal properties, always access directly from the instance
      // This ensures Firebase Auth's internal code (like _withDefaultResolver) can access
      // config, resolvers, and other internal properties correctly
      if (typeof prop === 'string' && prop.startsWith('_')) {
        // Direct access for internal properties - don't use Reflect.get as it might interfere
        const value = (authInstance as any)[prop];
        if (value !== undefined) {
          // Return the actual value directly - don't wrap in proxy
          return value;
        }
        // If not found on instance, try delegate
        if ((authInstance as any)._delegate) {
          const delegateValue = ((authInstance as any)._delegate as any)[prop];
          if (delegateValue !== undefined) {
            // Return the actual delegate value directly
            return delegateValue;
          }
        }
      }
      
      // Try to get the value from the auth instance
      let value: any;
      try {
        // First try Reflect.get with receiver for proper property descriptor handling
        value = Reflect.get(authInstance, prop, receiver);
      } catch (getError: any) {
        // If Reflect.get fails, try direct property access
        try {
          value = (authInstance as any)[prop];
        } catch (directError: any) {
          // If both fail, try accessing through the delegate if it exists
          if ((authInstance as any)._delegate) {
            value = ((authInstance as any)._delegate as any)[prop];
          }
        }
      }
      
      // If value is still undefined, try direct access as fallback
      if (value === undefined && typeof prop === 'string') {
        value = (authInstance as any)[prop];
        // If still undefined and delegate exists, try delegate
        if (value === undefined && (authInstance as any)._delegate) {
          value = ((authInstance as any)._delegate as any)[prop];
        }
      }
      
      // CRITICAL: For functions, return them directly without binding
      // Firebase Auth's internal code (like _withDefaultResolver) needs to access
      // the function's original context and properties. Binding breaks this.
      // Firebase will call the function with the correct 'this' context.
      if (typeof value === 'function') {
        // Return the original function - Firebase handles the 'this' context
        // Binding would break Firebase's internal property access patterns
        return value;
      }
      
      return value;
    } catch (error: any) {
      // Handle React Fast Refresh / HMR property checks gracefully
      // These are checked during module evaluation and don't need Firebase
      const reactPropertyNames = ['$$typeof', 'prototype', 'constructor', 'displayName', 'name'];
      const isReactProperty = typeof prop === 'string' && reactPropertyNames.includes(prop);
      
      if (isReactProperty) {
        // Silently return undefined for React properties - no error logging
        return undefined;
      }
      
      if (isDev) {
        if (typeof prop === 'string') {
          if (prop === 'onAuthStateChanged' || prop === 'onIdTokenChanged') {
            return () => () => {};
          }
          if (prop === 'currentUser') {
            return null;
          }
          if (prop === 'signOut' || prop === 'signInWithEmailAndPassword' || prop === 'createUserWithEmailAndPassword') {
            return () => Promise.reject(new Error('Firebase Auth is not initialized. Please check your environment variables.'));
          }
        }
        
        // Only log errors for non-React properties to avoid noise during HMR
        // React Fast Refresh checks these properties during module evaluation
        if (!isReactProperty && isDev) {
          logger.error('Firebase Auth proxy error accessing property:', prop, error);
        }
        return undefined;
      }
      
      throw error;
    }
  },
  
  has(_target, prop) {
    try {
      const authInstance = getAuthInstance();
      // Check if property exists on the instance
      if (Reflect.has(authInstance, prop)) {
        return true;
      }
      // Also check delegate for internal properties
      if ((authInstance as any)._delegate && typeof prop === 'string') {
        return Reflect.has((authInstance as any)._delegate, prop);
      }
      return false;
    } catch {
      return false;
    }
  },
  
  getPrototypeOf(_target) {
    try {
      const authInstance = getAuthInstance();
      return Reflect.getPrototypeOf(authInstance);
    } catch (error: any) {
      // Return the prototype of a plain object as fallback
      return Object.getPrototypeOf({});
    }
  },
  
  getOwnPropertyDescriptor(_target, prop) {
    try {
      const authInstance = getAuthInstance();
      // CRITICAL: Ensure _delegate and other internal properties are accessible
      // This is needed for Firebase's getModularInstance to work
      const descriptor = Reflect.getOwnPropertyDescriptor(authInstance, prop);
      if (descriptor) {
        return descriptor;
      }
      // If not found on instance, try delegate
      if ((authInstance as any)._delegate && typeof prop === 'string') {
        const delegateDescriptor = Reflect.getOwnPropertyDescriptor((authInstance as any)._delegate, prop);
        if (delegateDescriptor) {
          return delegateDescriptor;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  },
  
  ownKeys(_target) {
    try {
      return Reflect.ownKeys(getAuthInstance());
    } catch {
      return [];
    }
  },
  
  // CRITICAL: Define property to ensure Firebase Auth can set internal properties if needed
  defineProperty(_target, prop, descriptor) {
    try {
      return Reflect.defineProperty(getAuthInstance(), prop, descriptor);
    } catch (error: any) {
      // In development, log but don't fail
      if (isDev) {
        logger.warn('Failed to define property on Auth instance:', prop, error);
      }
      return false;
    }
  },
  
  // CRITICAL: Delete property handler
  deleteProperty(_target, prop) {
    try {
      return Reflect.deleteProperty(getAuthInstance(), prop);
    } catch {
      return false;
    }
  },
  
  // CRITICAL: Set property handler - needed for Firebase Auth internal operations
  set(_target, prop, value) {
    try {
      const authInstance = getAuthInstance();
      return Reflect.set(authInstance, prop, value);
    } catch (error: any) {
      if (isDev) {
        logger.warn('Failed to set property on Auth instance:', prop, error);
      }
      return false;
    }
  }
});

// CRITICAL: The Proxy must be completely transparent to Firebase's internal code
// Firebase's collection() function needs direct access to the Firestore instance
export const db = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    try {
      const dbInstance = getDbInstance();
      
      // Ensure dbInstance is valid
      if (!dbInstance) {
        throw new Error('Firestore instance is not initialized. Please check your Firebase configuration.');
      }
      
      // Use Object.prototype.hasOwnProperty to check if property exists
      // This helps Firestore's internal code properly detect properties
      if (prop === 'hasOwnProperty' || prop === Symbol.hasInstance) {
        return Reflect.get(Object.prototype, prop, receiver);
      }
      
      // Try to get the value from the db instance
      let value: any;
      try {
        value = Reflect.get(dbInstance, prop, receiver);
      } catch (getError: any) {
        // If Reflect.get fails, try direct property access
        value = (dbInstance as any)[prop];
      }
      
      // For internal Firestore properties (starting with _), always try to get from instance
      if (value === undefined && typeof prop === 'string' && prop.startsWith('_')) {
        value = (dbInstance as any)[prop];
      }
      
      if (typeof value === 'function') {
        return value.bind(dbInstance);
      }
      
      return value;
    } catch (error: any) {
      // In development, provide more helpful error messages
      if (isDev) {
        logger.error('Firestore proxy error accessing property:', prop, error);
      }
      throw error;
    }
  },
  
  has(_target, prop) {
    try {
      return Reflect.has(getDbInstance(), prop);
    } catch {
      return false;
    }
  },
  
  getPrototypeOf(_target) {
    try {
      return Reflect.getPrototypeOf(getDbInstance());
    } catch (error: any) {
      return Object.getPrototypeOf({});
    }
  },
  
  getOwnPropertyDescriptor(_target, prop) {
    try {
      return Reflect.getOwnPropertyDescriptor(getDbInstance(), prop);
    } catch {
      return undefined;
    }
  },
  
  ownKeys(_target) {
    try {
      return Reflect.ownKeys(getDbInstance());
    } catch {
      return [];
    }
  },
  
  // CRITICAL: Define property to ensure Firebase can set internal properties if needed
  defineProperty(_target, prop, descriptor) {
    try {
      return Reflect.defineProperty(getDbInstance(), prop, descriptor);
    } catch (error: any) {
      // In development, log but don't fail
      if (isDev) {
        logger.warn('Failed to define property on Firestore instance:', prop, error);
      }
      return false;
    }
  },
  
  // CRITICAL: Delete property handler
  deleteProperty(_target, prop) {
    try {
      return Reflect.deleteProperty(getDbInstance(), prop);
    } catch {
      return false;
    }
  },
  
  // CRITICAL: Set property handler - needed for Firestore internal operations
  set(_target, prop, value) {
    try {
      const dbInstance = getDbInstance();
      return Reflect.set(dbInstance, prop, value);
    } catch (error: any) {
      if (isDev) {
        logger.warn('Failed to set property on Firestore instance:', prop, error);
      }
      return false;
    }
  }
});

const appProxy = new Proxy({} as FirebaseApp, {
  get(_target, prop) {
    const appInstance = getAppInstance();
    const value = (appInstance as any)[prop];
    if (typeof value === 'function') {
      return value.bind(appInstance);
    }
    return value;
  }
});

export default appProxy;
