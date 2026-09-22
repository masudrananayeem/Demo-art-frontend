/**
 * Server-Side Environment Variable Accessor
 * 
 * This module provides secure access to server-only environment variables.
 * It throws errors if accessed from client-side code.
 * 
 * Usage:
 *   import { getServerEnv } from '@/lib/env/server-env';
 *   const preset = getServerEnv('CLOUDINARY_UPLOAD_PRESET');
 */

/**
 * Check if code is running on the server
 */
function isServer(): boolean {
  return typeof window === 'undefined';
}

/**
 * Get a server-only environment variable
 * @throws Error if accessed from client-side or variable is missing
 */
export function getServerEnv(key: string, defaultValue?: string): string {
  if (!isServer()) {
    throw new Error(
      `Security Error: Attempted to access server-only environment variable '${key}' from client-side code. ` +
      `This variable must only be accessed in server components, API routes, or server-side code.`
    );
  }

  const value = process.env[key];
  
  if (!value && defaultValue === undefined) {
    throw new Error(
      `Missing required server-only environment variable: ${key}. ` +
      `Please set it in your .env.local file.`
    );
  }

  return value || defaultValue || '';
}

/**
 * Get multiple server-only environment variables
 */
export function getServerEnvs(keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const key of keys) {
    result[key] = getServerEnv(key);
  }
  
  return result;
}

/**
 * Validate that required server environment variables are set
 * Call this in API routes or server components at startup
 */
export function validateServerEnv(keys: string[]): void {
  const missing: string[] = [];
  
  for (const key of keys) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required server-only environment variables: ${missing.join(', ')}. ` +
      `Please set them in your .env.local file.`
    );
  }
}
