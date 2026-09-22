/**
 * Secure Error Handler Utility
 * 
 * Provides functions to sanitize error messages and prevent information disclosure
 * in production environments.
 */

import { isDev } from '@/lib/env';

/**
 * Sanitize error message for production
 * Removes sensitive information like stack traces, file paths, and internal details
 */
export function sanitizeErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  if (isDev) {
    // In development, return detailed error messages
    if (error instanceof Error) {
      return error.message || defaultMessage;
    }
    if (typeof error === 'string') {
      return error;
    }
    return defaultMessage;
  }

  // In production, return generic error messages
  // Never expose:
  // - Stack traces
  // - File paths
  // - Internal error codes
  // - Database connection strings
  // - API keys or secrets
  // - User-specific data in error messages

  if (error instanceof Error) {
    const message = error.message || '';
    
    // Check for sensitive patterns and replace with generic message
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /credential/i,
      /api[_-]?key/i,
      /private[_-]?key/i,
      /connection[_-]?string/i,
      /database[_-]?url/i,
      /mongodb/i,
      /postgres/i,
      /mysql/i,
      /file:\/\//i,
      /\/.*\/.*\.(js|ts|jsx|tsx)/i, // File paths
      /at\s+\w+.*\(.*\)/i, // Stack trace patterns
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return defaultMessage;
      }
    }

    // Return sanitized message (but still generic)
    // Only return specific messages for known safe error types
    if (message.includes('not found') || message.includes('does not exist')) {
      return 'Resource not found';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'Access denied';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Invalid request';
    }

    // Default to generic message
    return defaultMessage;
  }

  if (typeof error === 'string') {
    // Check string for sensitive patterns
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(error)) {
        return defaultMessage;
      }
    }

    // Return generic version
    return defaultMessage;
  }

  return defaultMessage;
}

/**
 * Create a safe error response for API routes
 * Ensures no sensitive information is leaked in production
 */
export function createSafeErrorResponse(
  error: unknown,
  statusCode: number = 500,
  defaultMessage: string = 'An error occurred'
): { success: false; error: string } {
  const sanitizedMessage = sanitizeErrorMessage(error, defaultMessage);
  
  return {
    success: false,
    error: sanitizedMessage,
  };
}

/**
 * Log error securely
 * Logs detailed information in development, generic in production
 */
export function logErrorSecurely(context: string, error: unknown): void {
  if (isDev) {
    console.error(`[${context}] Error:`, error);
  } else {
    // In production, log generic error without sensitive details
    const errorType = error instanceof Error ? error.constructor.name : typeof error;
    console.error(`[${context}] Error occurred: ${errorType}`);
    // Optionally send to error tracking service (e.g., Sentry)
    // Sentry.captureException(error, { tags: { context } });
  }
}
