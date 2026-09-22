/**
 * CORS (Cross-Origin Resource Sharing) Protection Utility
 * 
 * Implements CORS validation for API routes based on ALLOWED_ORIGINS
 * environment variable. Prevents unauthorized cross-origin requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server-env';

/**
 * Get allowed origins from environment variable
 * Returns array of allowed origins, or empty array if not configured
 */
function getAllowedOrigins(): string[] {
  try {
    const allowedOrigins = getServerEnv('ALLOWED_ORIGINS', '');
    if (!allowedOrigins) {
      return [];
    }
    
    // Split by comma and trim whitespace
    return allowedOrigins
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
  } catch (error) {
    // If ALLOWED_ORIGINS is not set, return empty array (strict mode)
    return [];
  }
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) {
    // If no origins configured, deny all (strict security)
    return false;
  }
  
  return allowedOrigins.includes(origin);
}

/**
 * CORS middleware for API routes
 * Validates Origin header and sets appropriate CORS headers
 * 
 * Usage:
 *   const corsResult = await requireCORS(request);
 *   if (!corsResult.allowed) {
 *     return corsResult.response;
 *   }
 *   // Use corsResult.headers in response
 */
export async function requireCORS(
  request: NextRequest
): Promise<
  | { allowed: true; headers: Record<string, string> }
  | { allowed: true; response: NextResponse }
  | { allowed: false; response: NextResponse }
> {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  // For same-origin requests (no Origin header), allow
  if (!origin) {
    return {
      allowed: true,
      headers: {},
    };
  }

  // Check if origin is allowed
  if (!isOriginAllowed(origin, allowedOrigins)) {
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: 'CORS policy: Origin not allowed' },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': 'null',
          },
        }
      ),
    };
  }

  // Origin is allowed - return CORS headers
  const method = request.method;
  const requestHeaders = request.headers.get('access-control-request-headers');
  
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (requestHeaders) {
    corsHeaders['Access-Control-Allow-Headers'] = requestHeaders;
  } else {
    corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRF-Token';
  }

  // Handle preflight OPTIONS request
  if (method === 'OPTIONS') {
    return {
      allowed: true,
      response: new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      }),
    };
  }

  return {
    allowed: true,
    headers: corsHeaders,
  };
}

/**
 * Apply CORS headers to response
 */
export function applyCORSHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  // For same-origin requests, no CORS headers needed
  if (!origin) {
    return response;
  }

  // Check if origin is allowed
  if (isOriginAllowed(origin, allowedOrigins)) {
    // Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}
