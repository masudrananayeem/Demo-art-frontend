/**
 * Standardized React Query keys for Firebase data
 * 
 * Using consistent query keys ensures proper cache sharing and deduplication
 * across components that fetch the same data.
 */

export const QUERY_KEYS = {
  // Orders
  adminOrders: ['adminOrders'] as const,
  adminOrdersWithLimit: (limit: number) => ['adminOrders', limit] as const,
  
  // Books/Posts
  adminPosts: ['adminPosts'] as const,
  adminPostsWithLimit: (limit: number) => ['adminPosts', limit] as const,
  
  // Sellers
  adminSellers: ['adminSellers'] as const,
  
  // Users
  adminUsers: ['adminUsers'] as const,
  
  // Admins
  admins: ['admins'] as const,
  
  // Audit Logs
  auditLogs: ['auditLogs'] as const,
  auditLogsWithLimit: (limit: number) => ['auditLogs', limit] as const,
  
  // Visitor Stats
  visitorStats: ['visitorStats'] as const,
  dailyVisitorData: (days: number) => ['dailyVisitorData', days] as const,
  
  // Categories
  categories: ['categories'] as const,
  
  // Admin Notes
  adminNotes: (adminId: string) => ['adminNotes', adminId] as const,
  sharedNotesCount: (adminId: string) => ['sharedNotesCount', adminId] as const,
  
  // Admin Requests
  adminRequests: ['adminRequests'] as const,
  pendingAdminRequests: ['pendingAdminRequests'] as const,
  
  // Customizer Settings
  customizerSettings: (adminId: string) => ['customizerSettings', adminId] as const,
  
  // Contact Messages (Book Store contact form)
  adminContactMessages: ['adminContactMessages'] as const,
} as const;
