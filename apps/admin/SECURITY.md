# Security Documentation

This document provides comprehensive security information for the Admin Dashboard project.

## Security Architecture

### Authentication & Authorization

- **Firebase Authentication**: All users must authenticate via Firebase Auth
- **Admin Verification**: Server-side verification that user exists in `adminUsers` collection
- **Role-Based Access Control**: Admin, Moderator, Seller roles with granular permissions
- **Token Verification**: Firebase Admin SDK (mandatory in production) with REST API fallback (dev only)

### API Security

All API routes are protected with:

1. **Authentication Middleware** (`requireAuth()`)
   - Verifies Firebase Auth token
   - Checks admin status in Firestore
   - Returns 401 if unauthenticated, 403 if not admin

2. **CSRF Protection** (`requireCSRF()`)
   - HMAC-based token generation
   - 1-hour token expiration
   - Required for all state-changing operations (POST, PUT, DELETE)
   - Bypassed for file uploads (acceptable - see below)

3. **CORS Protection** (`requireCORS()`)
   - Origin validation via `ALLOWED_ORIGINS` environment variable
   - Strict mode: denies all if not configured

4. **Rate Limiting** (`checkRateLimit()`)
   - IP-based tracking
   - Configurable per endpoint
   - In-memory implementation (per-instance)
   - See distributed rate limiting section for production

### File Upload Security

The `/api/upload-image` endpoint has the following protections:

- ✅ **Authentication Required**: `requireAuthenticatedUser()`
- ✅ **File Type Validation**: Only JPEG, PNG, WebP, GIF
- ✅ **File Size Limits**: 10MB maximum
- ✅ **Magic Bytes Validation**: Prevents MIME type spoofing
- ✅ **Filename Sanitization**: Prevents path traversal
- ✅ **Rate Limiting**: 20 requests/minute per IP
- ⚠️ **CSRF Bypass**: Intentionally bypassed for multipart/form-data

**CSRF Bypass Justification**:
- Bearer tokens in `Authorization` headers are not automatically sent by browsers (unlike cookies)
- CSRF attacks rely on automatic cookie transmission, which doesn't apply to Bearer tokens
- Attacker would need the user's auth token, which cannot be obtained via CSRF
- File uploads with FormData make it difficult to include CSRF tokens in headers
- Authentication token provides sufficient protection

### Firebase Security Rules

**CRITICAL**: You must deploy Firestore and Storage rules to Firebase Console.

#### Firestore Rules

Located in `firestore.rules`. Key protections:

- **adminUsers**: Admin-only read, Admin role-only write
- **adminRequests**: Authenticated users can create, admins can read/update
- **auditLogs**: Admin-only read, no client-side writes (server-only)
- **All other collections**: Admin-only access

#### Storage Rules

Located in `storage.rules`. Key protections:

- **Read**: Any authenticated user
- **Write**: Only authenticated admins

### Environment Variables Security

- **Public Variables** (`NEXT_PUBLIC_*`): Exposed to client, safe for public use
- **Server Variables**: Never exposed to client, protected by `getServerEnv()`
- **Secrets**: Stored in `.env.local` (never committed to git)

### Error Handling

- **Development**: Detailed error messages for debugging
- **Production**: Generic error messages to prevent information disclosure
- **Error Sanitization**: Removes stack traces, file paths, and sensitive data

## Security Best Practices

### Development

1. ✅ Use Firebase Admin SDK (optional in dev, falls back to REST API)
2. ✅ Test with Firebase Emulator Suite
3. ✅ Use detailed error messages for debugging
4. ✅ Test authentication and authorization flows

### Production

1. ✅ **MANDATORY**: Configure Firebase Admin SDK
2. ✅ **MANDATORY**: Deploy Firebase Security Rules
3. ✅ Use generic error messages
4. ✅ Enable HTTPS only (HSTS header configured)
5. ✅ Monitor for security issues
6. ⚠️ Consider distributed rate limiting for multi-instance deployments

## Known Limitations

### Rate Limiting

- **Current**: In-memory, per-instance
- **Limitation**: Resets on server restart, not shared across instances
- **Solution**: Use distributed rate limiting (Redis/Upstash) for production
- **File**: `src/lib/security/rate-limit-distributed.ts` (placeholder for implementation)

### Firebase Admin SDK

- **Development**: Falls back to REST API if not configured
- **Production**: **MANDATORY** - application will fail to start if not configured
- **Why**: REST API uses public API key, less secure than Admin SDK

## Security Checklist

### Before Deployment

- [ ] All environment variables set
- [ ] Firebase Security Rules deployed
- [ ] Firebase Admin SDK configured
- [ ] `CSRF_TOKEN_SECRET` generated (32+ bytes)
- [ ] `ALLOWED_ORIGINS` configured
- [ ] HTTPS enabled
- [ ] Error handling tested (production mode)

### After Deployment

- [ ] Test authentication flows
- [ ] Test authorization (role-based access)
- [ ] Verify rate limiting works
- [ ] Test file upload security
- [ ] Verify CORS protection
- [ ] Check logs for security warnings
- [ ] Monitor for abuse patterns

## Reporting Security Issues

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email security concerns to the project maintainer
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## Security Updates

This document is updated as security measures are added or changed. Review regularly to ensure your deployment follows current best practices.
