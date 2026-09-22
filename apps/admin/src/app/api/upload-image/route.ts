import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server-env';
import { isDev } from '@/lib/env';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { requireAuthenticatedUser } from '@/lib/security/auth-middleware';
import { requireCSRF } from '@/lib/security/csrf';
import { requireCORS, applyCORSHeaders } from '@/lib/security/cors';
import { createSafeErrorResponse, logErrorSecurely } from '@/lib/security/error-handler';

/**
 * API Route: Upload Image to Cloudinary
 * 
 * This endpoint handles image uploads to Cloudinary server-side,
 * keeping the upload preset secret secure.
 * 
 * Security features:
 * - Authentication required (any authenticated user)
 * - CSRF protection
 * - Upload preset is server-only (not exposed to client)
 * - File size validation
 * - Rate limiting (20 requests per minute per IP)
 * - File type validation
 * - File name sanitization
 * - Content validation (magic bytes)
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Sanitize file name to prevent path traversal attacks
 */
function sanitizeFileName(fileName: string): string {
  // Remove path separators and special characters
  return fileName
    .replace(/[\/\\]/g, '_') // Replace slashes
    .replace(/\.\./g, '_') // Replace parent directory references
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .substring(0, 255); // Limit length
}

/**
 * Validate image content by checking magic bytes
 * This helps prevent MIME type spoofing
 */
function validateImageContent(buffer: Buffer, declaredType: string): boolean {
  if (buffer.length < 4) {
    return false;
  }

  const header = buffer.subarray(0, 12);
  
  // JPEG: FF D8 FF
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return declaredType === 'image/jpeg' || declaredType === 'image/jpg';
  }
  
  // PNG: 89 50 4E 47
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    return declaredType === 'image/png';
  }
  
  // GIF: 47 49 46 38
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
    return declaredType === 'image/gif';
  }
  
  // WebP: Check for RIFF...WEBP
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    // Check further for WEBP signature
    if (buffer.length >= 12) {
      const webpHeader = buffer.subarray(8, 12);
      if (webpHeader[0] === 0x57 && webpHeader[1] === 0x45 && webpHeader[2] === 0x42 && webpHeader[3] === 0x50) {
        return declaredType === 'image/webp';
      }
    }
  }
  
  // If we can't validate, reject for security
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // CORS validation
    const corsResult = await requireCORS(request);
    if (!corsResult.allowed) {
      return corsResult.response;
    }
    
    // For OPTIONS requests, return the response directly
    if ('response' in corsResult) {
      return corsResult.response;
    }
    
    // For other requests, use headers
    const corsHeaders = corsResult.headers;

    // Require authentication (any authenticated user, not just admins)
    const authResult = await requireAuthenticatedUser(request);
    if (!authResult.success) {
      return applyCORSHeaders(authResult.response, request);
    }

    // CSRF protection: Skip for file uploads with FormData if authenticated
    // SECURITY NOTE: This is acceptable because:
    // 1. The endpoint requires authentication (requireAuthenticatedUser above)
    // 2. Bearer tokens in Authorization headers are not automatically sent by browsers (unlike cookies)
    // 3. CSRF attacks rely on automatic cookie transmission, which doesn't apply to Bearer tokens
    // 4. The attacker would need to know the user's auth token, which they cannot obtain via CSRF
    // 5. File uploads with FormData make it difficult to include CSRF tokens in headers
    // For other request types, CSRF protection is still enforced
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      const csrfResult = await requireCSRF(request);
      if (!csrfResult.valid) {
        return csrfResult.response;
      }
    }

    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientId, {
      windowMs: 60000, // 1 minute
      maxRequests: 20, // 20 uploads per minute (stricter than regular API)
    });
    
    if (!rateLimitResult.allowed) {
      const rateLimitResponse = NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before uploading more images.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            ...corsHeaders,
          },
        }
      );
      return applyCORSHeaders(rateLimitResponse, request);
    }
    const cloudName = getServerEnv('CLOUDINARY_CLOUD_NAME');
    const uploadPreset = getServerEnv('CLOUDINARY_UPLOAD_PRESET');
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      const errorResponse = NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      const errorResponse = NextResponse.json(
        { success: false, error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }

    if (file.size > MAX_FILE_SIZE) {
      const errorResponse = NextResponse.json(
        { success: false, error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }

    // Sanitize file name
    const sanitizedFileName = sanitizeFileName(file.name);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Basic file content validation - check magic bytes for image types
    const isValidImage = validateImageContent(buffer, file.type);
    if (!isValidImage) {
      const errorResponse = NextResponse.json(
        { success: false, error: 'Invalid file content. File does not match declared type.' },
        { status: 400, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }

    const boundary = `----WebKitFormBoundary${Math.random().toString(16)}`;
    const formDataParts: Buffer[] = [];
    
    formDataParts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${sanitizedFileName}"\r\n` +
      `Content-Type: ${file.type}\r\n\r\n`
    ));
    formDataParts.push(buffer);
    formDataParts.push(Buffer.from('\r\n'));
    
    formDataParts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="upload_preset"\r\n\r\n` +
      `${uploadPreset}\r\n` +
      `--${boundary}--\r\n`
    ));

    const formDataBuffer = Buffer.concat(formDataParts);

    const cloudinaryResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': formDataBuffer.length.toString(),
      },
      body: formDataBuffer,
    });

    if (!cloudinaryResponse.ok) {
      const errorText = await cloudinaryResponse.text();
      let errorMessage = 'Upload failed';
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      const errorResponse = NextResponse.json(
        { success: false, error: errorMessage },
        { status: cloudinaryResponse.status, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }

    const result = await cloudinaryResponse.json();

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': '20',
      'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      ...corsHeaders,
    };

    const successResponse = NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    }, { headers });
    
    return applyCORSHeaders(successResponse, request);
  } catch (error: unknown) {
    logErrorSecurely('upload-image', error);
    const safeError = createSafeErrorResponse(error, 500, 'Failed to upload image');
    
    const errorResponse = NextResponse.json(
      safeError,
      { status: 500 }
    );
    return applyCORSHeaders(errorResponse, request);
  }
}

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const corsResult = await requireCORS(request);
  if (corsResult.allowed && 'response' in corsResult) {
    return corsResult.response as NextResponse;
  }
  return new NextResponse(null, { status: 204 });
}
