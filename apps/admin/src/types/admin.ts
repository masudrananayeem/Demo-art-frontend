// Admin-specific TypeScript interfaces extending the eCommerce project interfaces

export type UserRole = 'Admin' | 'Moderator' | 'Seller'
export type UserStatus = 'active' | 'suspended' | 'deleted'
export type PostStatus = 'active' | 'disabled' | 'deleted'
export type OrderStatus = 'placed' | 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled'

// Admin permissions/capabilities
export interface AdminPermissions {
  // Dashboard
  viewDashboard?: boolean
  // Content Management
  manageSellers?: boolean
  managePosts?: boolean
  manageOrders?: boolean
  manageCategories?: boolean
  manageCalendar?: boolean
  manageLandingPage?: boolean
  manageFAQs?: boolean
  // Admin Management
  manageAdmins?: boolean
  viewAuditLogs?: boolean
  // Settings
  manageSettings?: boolean
  manageCirculation?: boolean
  manageMembership?: boolean
  manageContact?: boolean
}

// Extended User interface with admin fields
export interface AdminUser {
  id: string
  name: string
  email: string
  password: string
  sellerId?: string
  phone?: string
  location?: string
  bio?: string
  avatar?: string
  facebook?: string
  whatsapp?: string
  slug?: string
  // Admin-specific fields
  role: UserRole
  status: UserStatus
  deletedAt?: string | null
  suspendedAt?: string | null
  joinedDate: string
  lastLogin?: string
}

// Extended Seller interface with admin fields
export interface AdminSeller {
  id: string
  name: string
  nameBn: string
  avatar: string
  rating: number
  totalBooks: number
  totalSales: number
  location: string
  locationBn: string
  verified: boolean
  phone?: string
  whatsapp?: string
  facebook?: string
  bio?: string
  slug?: string
  userId?: string // User ID (used to fetch books/posts)
  // Admin-specific fields
  email: string
  status: UserStatus
  deletedAt?: string | null
  suspendedAt?: string | null
  totalPosts: number
  totalOrders: number
  joinedDate: string
}

// Extended Book/Post interface with admin fields
export interface AdminPost {
  id: string
  productCode?: string // Readable book ID like BOOK-TITLE-OF-THE-POST-7MAY1VNT
  title: string
  titleBn: string
  author: string
  authorBn: string
  price: number
  originalPrice?: number
  discount?: number
  rating: number
  reviewCount: number
  category: string
  categoryBn: string
  weight: string
  format: string
  formatBn: string
  stock: number
  condition: 'new' | 'used'
  sellerId: string
  sellerName: string
  sellerNameBn: string
  shipsTo: string[]
  shipsТoBn: string[]
  coverImage: string
  galleryImages?: string[]
  description: string
  descriptionBn: string
  postedDate: string
  viewCount: number
  negotiable?: boolean
  isSold?: boolean
  // Admin-specific fields
  status: PostStatus
  disabledAt?: string | null
  deletedAt?: string | null
}

// Extended Order interface with admin fields
export interface AdminCategory {
  id: string
  name?: string
  nameBn?: string
  icon: string
  /** Display order (lower = first). Used in admin and bookstore. */
  order?: number
  deletedAt?: string | null
}

export interface AdminOrder {
  id: string
  userId?: string // Optional - allows unsigned users to place orders
  orderId: string
  items: Array<{
    bookId: string
    productCode?: string
    title: string
    titleBn: string
    quantity: number
    price: number
    coverImage: string
  }>
  status: OrderStatus
  statusHistory: Array<{
    status: OrderStatus
    timestamp: string
    message?: string
    location?: string
  }>
  totalAmount: number
  subtotal?: number
  discount?: number
  deliveryCharge?: number
  returnCharge?: number
  paymentMethod: string
  shippingAddress: {
    fullName: string
    email: string
    phone: string
    address: string
    city: string
    postalCode?: string
    deliveryNote?: string
  }
  createdAt: string
  estimatedDelivery?: string
  trackingNumber?: string
  courierName?: string
  // Admin-specific fields
  adminNotes?: string
  trackingStatus?: string
  buyerName?: string
  buyerEmail?: string
  sellerName?: string
  sellerEmail?: string
  deletedAt?: string | null
}

// Audit Log interface
export type AuditAction = 
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_restored'
  | 'user_suspended'
  | 'user_password_reset'
  | 'seller_created'
  | 'seller_updated'
  | 'seller_deleted'
  | 'seller_restored'
  | 'seller_suspended'
  | 'admin_created'
  | 'admin_updated'
  | 'admin_deleted'
  | 'admin_request_approved'
  | 'admin_request_rejected'
  | 'post_created'
  | 'post_updated'
  | 'post_deleted'
  | 'post_disabled'
  | 'order_status_updated'
  | 'order_note_added'
  | 'order_tracking_updated'
  | 'order_deleted'
  | 'order_restored'
  | 'category_created'
  | 'category_updated'
  | 'category_deleted'

export type AuditTargetType = 'user' | 'seller' | 'post' | 'order' | 'admin' | 'adminRequest' | 'category'

export interface AuditLog {
  id: string
  adminId: string
  adminName: string
  adminEmail: string
  action: AuditAction
  targetType: AuditTargetType
  targetId: string
  targetName?: string
  timestamp: string
  details?: string
  ipAddress?: string
}

// Contact form submission (from Book Store contact page)
export interface ContactSubmission {
  id: string
  name: string
  email: string
  phone?: string | null
  message: string
  source?: string
  createdAt: string
}

// Dashboard stats
export interface DashboardStats {
  totalUsers: number
  totalSellers: number
  totalOrders: number
  totalRevenue: number
  ordersToday: number
  ordersThisMonth: number
  revenueToday: number
  revenueThisMonth: number
  activeUsers: number
  activeSellers: number
  activePosts: number
}
