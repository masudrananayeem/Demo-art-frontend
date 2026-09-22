/**
 * CSRF Protection Utility
 * 
 * Implements CSRF token generation and validation for API routes
 * Uses the CSRF_TOKEN_SECRET from environment variables
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server-env';
import crypto from 'crypto';

/**
 * Generate a CSRF token
 * Returns a token that should be sent to the client and included in subsequent requests
 */
export function generateCSRFToken(): string {
  // SECURITY: No default secret - must be set in environment variables
  // Using a default would allow attackers to forge CSRF tokens
  const secret = getServerEnv('CSRF_TOKEN_SECRET');
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString();
  
  const token = crypto
    .createHmac('sha256', secret)
    .update(`${randomBytes}:${timestamp}`)
    .digest('hex');
  
  return `${randomBytes}:${timestamp}:${token}`;
}

/**
 * Validate a CSRF token
 * Returns true if token is valid, false otherwise
 */
export function validateCSRFToken(token: string): boolean {
  try {
    // SECURITY: No default secret - must be set in environment variables
    const secret = getServerEnv('CSRF_TOKEN_SECRET');
    const parts = token.split(':');
    
    if (parts.length !== 3) {
      return false;
    }
    
    const [randomBytes, timestamp, receivedHash] = parts;
    
    // Check token age (expire after 1 hour)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    if (tokenAge > 3600000) { // 1 hour
      return false;
    }
    
    // Verify token hash
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(`${randomBytes}:${timestamp}`)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(receivedHash),
      Buffer.from(expectedHash)
    );
  } catch (error) {
    return false;
  }
}

/**
 * CSRF middleware for API routes
 * Validates CSRF token from request header or body
 * 
 * Usage:
 *   const csrfResult = await requireCSRF(request);
 *   if (!csrfResult.valid) {
 *     return csrfResult.response;
 *   }
 */
export async function requireCSRF(
  request: NextRequest
): Promise<
  | { valid: true }
  | { valid: false; response: NextResponse }
> {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // Get token from header or body
  let token: string | null = null;
  
  // Try X-CSRF-Token header first
  token = request.headers.get('x-csrf-token') || request.headers.get('X-CSRF-Token');
  
  // If not in header, try to get from body (for form submissions)
  if (!token) {
    try {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await request.json().catch(() => ({}));
        token = body._csrf || body.csrfToken;
        // Re-create request with body for downstream handlers
        // Note: This is a limitation - we can't easily re-read the body
        // In practice, prefer using headers for CSRF tokens
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData().catch(() => null);
        if (formData) {
          token = formData.get('_csrf') as string || formData.get('csrfToken') as string;
        }
      }
    } catch (error) {
      // If we can't read the body, continue with header check only
    }
  }

  if (!token) {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: 'CSRF token missing. Include X-CSRF-Token header.' },
        { status: 403 }
      ),
    };
  }

  const isValid = validateCSRFToken(token);
  if (!isValid) {
    return {
      valid: false,
      response: NextResponse.json(
        { success: false, error: 'Invalid or expired CSRF token' },
        { status: 403 }
      ),
    };
  }

  return { valid: true };
}

/**
 * Get CSRF token for client-side use
 * This should be called from a server component or API route
 * and passed to the client
 */
export function getCSRFToken(): string {
  return generateCSRFToken();
}
