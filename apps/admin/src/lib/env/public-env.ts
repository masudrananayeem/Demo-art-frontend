/**
 * Public Environment Variable Accessor
 * 
 * This module provides access to public environment variables that are
 * safe to expose to the browser (prefixed with NEXT_PUBLIC_).
 * 
 * Usage:
 *   import { getPublicEnv } from '@/lib/env/public-env';
 *   const apiKey = getPublicEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
 */

/**
 * Get a public environment variable (must be prefixed with NEXT_PUBLIC_)
 */
export function getPublicEnv(key: string, defaultValue?: string): string {
  if (!key.startsWith('NEXT_PUBLIC_')) {
    throw new Error(
      `Invalid public environment variable name: ${key}. ` +
      `Public variables must be prefixed with 'NEXT_PUBLIC_'. ` +
      `If this is a secret, use getServerEnv() instead.`
    );
  }

  const value = process.env[key];

  return value || defaultValue || '';
}

/**
 * Validate that required public environment variables are set
 */
export function validatePublicEnv(keys: string[]): void {
  const missing: string[] = [];
  
  for (const key of keys) {
    if (!key.startsWith('NEXT_PUBLIC_')) {
      throw new Error(`Invalid public environment variable name: ${key}. Must be prefixed with 'NEXT_PUBLIC_'`);
    }
    
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required public environment variables: ${missing.join(', ')}. ` +
      `Please set them in your .env.local file.`
    );
  }
}
