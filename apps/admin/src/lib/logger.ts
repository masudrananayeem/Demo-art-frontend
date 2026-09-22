/**
 * Logger Utility
 * 
 * Environment-aware logging that only logs in development
 * In production, logs are suppressed to avoid performance overhead
 * and information leakage
 * 
 * Uses isDev from @/lib/env for consistency
 */

import { isDev } from '@/lib/env';

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors in development, but sanitize in production
    if (isDev) {
      console.error(...args);
    } else {
      // In production, log to error reporting service (e.g., Sentry)
      // For now, silently ignore or send to monitoring service
      // Example: Sentry.captureException(args[0])
    }
  },
  
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};
