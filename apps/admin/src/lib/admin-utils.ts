import { AuditLog, AuditAction, AuditTargetType } from "@/types/admin"

// Create audit log entry
export function createAuditLog(
  adminId: string,
  adminName: string,
  adminEmail: string,
  action: AuditAction,
  targetType: AuditTargetType,
  targetId: string,
  targetName?: string,
  details?: string,
  ipAddress?: string
): AuditLog {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    adminId,
    adminName,
    adminEmail,
    action,
    targetType,
    targetId,
    targetName,
    timestamp: new Date().toISOString(),
    details,
    ipAddress,
  }
}

// Soft delete helper
export function softDelete<T extends { id: string; deletedAt?: string | null }>(
  entity: T
): T {
  return {
    ...entity,
    deletedAt: new Date().toISOString(),
  }
}

// Restore deleted entity
export function restoreEntity<T extends { id: string; deletedAt?: string | null }>(
  entity: T
): T {
  return {
    ...entity,
    deletedAt: null,
  }
}

// Update entity status
export function updateStatus<T extends { status: string }>(
  entity: T,
  status: string
): T {
  return {
    ...entity,
    status,
  }
}

// Suspend entity
export function suspendEntity<T extends { 
  status: string
  suspendedAt?: string | null 
}>(
  entity: T
): T {
  return {
    ...entity,
    status: 'suspended',
    suspendedAt: new Date().toISOString(),
  }
}

// Activate entity
export function activateEntity<T extends { 
  status: string
  suspendedAt?: string | null 
}>(
  entity: T
): T {
  return {
    ...entity,
    status: 'active',
    suspendedAt: null,
  }
}

// Generate password reset token
export function generatePasswordResetToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36)
}

// Format date for display (handles ISO strings, Date, Firestore Timestamp, null)
export function formatDate(dateValue: unknown): string {
  if (!dateValue) return "—"

  let date: Date | null = null

  // Date instance
  if (dateValue instanceof Date) {
    date = dateValue
  }

  // Firestore Timestamp-like { toDate(): Date }
  if (!date && typeof dateValue === "object" && dateValue !== null) {
    const maybe = dateValue as { toDate?: () => Date; seconds?: number; nanoseconds?: number }
    if (typeof maybe.toDate === "function") {
      date = maybe.toDate()
    } else if (typeof maybe.seconds === "number") {
      date = new Date(maybe.seconds * 1000)
    }
  }

  // ISO string / number
  if (!date) {
    date = new Date(dateValue as any)
  }

  if (Number.isNaN(date.getTime())) return "—"

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Format currency
export function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-US')}`
}

// Get status badge variant
export function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status.toLowerCase()) {
    case 'active':
    case 'delivered':
      return 'default'
    case 'pending':
    case 'processing':
      return 'secondary'
    case 'suspended':
    case 'disabled':
    case 'cancelled':
      return 'destructive'
    case 'deleted':
      return 'outline'
    default:
      return 'outline'
  }
}

// Generate avatar fallback from name (initials)
import { getPublicEnv } from '@/lib/env/public-env';

/**
 * Get the Book Store URL for "View post" links.
 * Set NEXT_PUBLIC_MAIN_APP_URL (single URL, e.g. https://boisetu.vercel.app).
 * If multiple URLs are set (comma-separated), the first one is used.
 * When set, this is always used (even when admin runs on localhost).
 * Only falls back to localhost when env is unset and admin is running on localhost.
 */
export function getMainAppUrl(): string {
  const raw = getPublicEnv('NEXT_PUBLIC_MAIN_APP_URL', '');
  const envUrl = raw ? raw.split(',')[0].trim().replace(/\/$/, '') : '';
  if (envUrl) return envUrl;

  if (typeof window === 'undefined') {
    const isProd = process.env.NODE_ENV === 'production';
    return isProd ? '' : 'http://localhost:3000';
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const port = window.location.port;
    if (port === '3001') return 'http://localhost:3000';
    return port ? `http://localhost:${port}` : 'http://localhost:3000';
  }

  return '';
}

export function generateAdminAvatarFallback(name: string): string {
  if (!name) return '??'
  const names = name.trim().split(' ')
  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}
