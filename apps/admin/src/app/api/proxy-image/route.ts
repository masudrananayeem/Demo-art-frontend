import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth } from '@/lib/security/auth-middleware';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { requireCORS, applyCORSHeaders } from '@/lib/security/cors';

/**
 * Image Proxy API Route
 * 
 * Proxies external images (Google, Cloudinary, etc.) through our server
 * to avoid CORS issues and rate limiting (429 errors)
 * 
 * Note: This route uses optional authentication because <img> tags cannot send
 * Authorization headers. We rely on URL validation and rate limiting for security.
 * 
 * Security:
 * - Optional authentication (preferred but not required for image requests)
 * - Rate limiting (30 requests per minute)
 * - URL validation (only allows specific domains)
 */

const ALLOWED_DOMAINS = [
  'lh3.googleusercontent.com',
  'googleusercontent.com',
  'res.cloudinary.com',
  'cloudinary.com',
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if domain is allowed
    return ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // CORS validation
    const corsResult = await requireCORS(request);
    if (!corsResult.allowed) {
      return corsResult.response;
    }
    const corsHeaders = 'headers' in corsResult ? corsResult.headers : {};

    // Optional authentication (images can't send Authorization headers)
    // We rely on URL validation and rate limiting for security
    const auth = await optionalAuth(request);
    
    // If authenticated, we can use stricter rate limiting
    // For unauthenticated requests, we still allow but with basic rate limiting

    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientId, {
      windowMs: 60000, // 1 minute
      maxRequests: 30, // 30 image requests per minute
    });

    if (!rateLimitResult.allowed) {
      const rateLimitResponse = NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before requesting more images.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            ...corsHeaders,
          },
        }
      );
      return applyCORSHeaders(rateLimitResponse, request);
    }

    // Get image URL from query parameter
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      const errorResponse = NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }

    // Validate URL
    if (!isValidImageUrl(imageUrl)) {
      const errorResponse = NextResponse.json(
        { error: 'Invalid image URL. Only Google and Cloudinary images are allowed.' },
        { status: 400, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }

    // Fetch the image
    try {
      const imageResponse = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Next.js Image Proxy)',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!imageResponse.ok) {
        // If we get a 429, return it with proper CORS headers
        if (imageResponse.status === 429) {
          const retryAfter = imageResponse.headers.get('Retry-After') || '60';
          const errorResponse = NextResponse.json(
            { error: 'Image server rate limited. Please try again later.' },
            {
              status: 429,
              headers: {
                'Retry-After': retryAfter,
                ...corsHeaders,
              },
            }
          );
          return applyCORSHeaders(errorResponse, request);
        }

        const errorResponse = NextResponse.json(
          { error: `Failed to fetch image: ${imageResponse.statusText}` },
          { status: imageResponse.status, headers: corsHeaders }
        );
        return applyCORSHeaders(errorResponse, request);
      }

      // Check content type
      const contentType = imageResponse.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        const errorResponse = NextResponse.json(
          { error: 'URL does not point to an image' },
          { status: 400, headers: corsHeaders }
        );
        return applyCORSHeaders(errorResponse, request);
      }

      // Check content length
      const contentLength = imageResponse.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
        const errorResponse = NextResponse.json(
          { error: 'Image too large' },
          { status: 413, headers: corsHeaders }
        );
        return applyCORSHeaders(errorResponse, request);
      }

      // Get image data
      const imageBuffer = await imageResponse.arrayBuffer();
      
      if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
        const errorResponse = NextResponse.json(
          { error: 'Image too large' },
          { status: 413, headers: corsHeaders }
        );
        return applyCORSHeaders(errorResponse, request);
      }

      // Return the image with proper headers
      // Use shorter cache for Cloudinary images (they handle their own caching)
      // Use longer cache for Google images (they're more stable)
      const isCloudinaryUrl = imageUrl.includes('cloudinary.com')
      const cacheControl = isCloudinaryUrl 
        ? 'public, max-age=300, s-maxage=300' // 5 minutes for Cloudinary (new uploads)
        : 'public, max-age=3600, s-maxage=3600' // 1 hour for Google
      
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'image/jpeg',
          'Cache-Control': cacheControl,
          'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Credentials': 'true',
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        },
      });
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
        const errorResponse = NextResponse.json(
          { error: 'Request timeout' },
          { status: 408, headers: corsHeaders }
        );
        return applyCORSHeaders(errorResponse, request);
      }

      const errorResponse = NextResponse.json(
        { error: `Failed to fetch image: ${fetchError.message}` },
        { status: 500, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }
  } catch (error: any) {
    const errorResponse = NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
    return applyCORSHeaders(errorResponse, request);
  }
}
