# Marketplace Admin Dashboard (Next.js)

A comprehensive admin dashboard and landing page for the Booksetu book marketplace, built with Next.js 16, TypeScript, Tailwind CSS v4, and shadcn/ui. This dashboard provides complete management capabilities for sellers, orders, users, products, and more, with robust security features and role-based access control.

## Table of Contents

- [Author](#author)
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Security Features](#security-features)
- [Security Documentation](#security-documentation)
- [Admin Roles & Permissions](#admin-roles--permissions)
- [Environment Variables](#environment-variables)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Key Paths & Routes](#key-paths--routes)
- [API Routes](#api-routes)
- [Development](#development)
- [Deployment](#deployment)
- [Theming](#theming)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Author

**Mosabbir Maruf**  
GitHub: [@mosabbir-maruf](https://github.com/mosabbir-maruf)

## Overview

This admin dashboard is designed specifically for managing a book marketplace platform. It provides administrators with comprehensive tools to manage sellers, track orders, monitor users, handle product listings, and analyze marketplace performance. The dashboard includes a marketing landing page and supports multiple admin roles with granular permission controls.

### Key Capabilities

- **Complete Marketplace Management**: Manage sellers, orders, users, products, and categories from a centralized dashboard
- **Role-Based Access Control**: Three-tier admin system (Admin, Moderator, Seller) with granular permissions
- **Real-Time Analytics**: Visualize sales, orders, and user activity with interactive charts and reports
- **Secure Authentication**: Firebase Auth with email/password and Google Sign-In support
- **Image Management**: Secure image uploads via Cloudinary with validation, magic-bytes checking, and rate limiting
- **External Avatar Handling**: Safe loading of third-party avatars via an image proxy and avatar utilities
- **Audit Logging**: Complete audit trail for all administrative actions (Admin role only)
- **Theme Customization**: Dark/light themes with customizable layouts and color schemes

## Features

### Admin Management
- Complete admin user management with role assignment
- Admin request approval system
- Granular permission management per admin
- Role-based access control (Admin, Moderator, Seller)
- Admin profile management and settings

### Seller Management
- Seller onboarding and approval workflow
- Seller profile management and statistics
- Seller performance tracking
- Seller verification and status management
- Link to seller profiles in main app

### Order Management
- Order tracking and status updates
- Payment management and transaction history
- Order details with buyer and seller information
- Order filtering and search capabilities
- Order statistics and analytics

### User Management
- Customer/user management and insights
- User profile viewing and editing
- User statistics and activity tracking
- User search and filtering

### Post/Product Management
- Book listing management (posts)
- Product status management (active, deleted, disabled)
- Product editing and deletion
- Product search and filtering
- Link to product pages in main app

### Category Management
- Product categorization system
- Category creation, editing, and deletion
- Category-based filtering

### FAQ Management
- FAQ system with categories
- FAQ creation, editing, and deletion
- FAQ search and filtering

### Audit Logs
- Complete audit trail for all administrative actions
- Action history with timestamps and user information
- Filterable audit logs (Admin role only)

### Calendar
- View orders by date on calendar
- Order date tracking and visualization

### Notes
- Note-taking system for administrators
- Persistent notes storage

### Dashboard Analytics
- Interactive charts and graphs
- Sales statistics and performance metrics
- Top products tracking
- Visitor analytics
- Recent transactions overview

### Landing Page
- Marketing landing page with hero section
- Features showcase
- Testimonials section
- FAQ section
- Contact form with Telegram integration
- Call-to-action sections

### Theme Customization
- Dark/light theme support
- Layout presets
- Persistent theme preferences

### Settings
- Account settings with profile management
- Appearance settings for theme preferences
- Billing and notification settings

## Tech Stack

### Core Framework
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type-safe JavaScript

### Styling & UI
- **Tailwind CSS v4** - Utility-first CSS framework
- **shadcn/ui** - Component library
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **next-themes** - Theme management

### Backend Services
- **Firebase** - Authentication and Firestore database
- **Cloudinary** - Image hosting and management
- **Telegram Bot API** - Contact form notifications (optional)

### Forms & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation

### Data Management
- **TanStack Query** - Server state management
- **TanStack Table** - Table component with sorting, filtering, pagination

### Charts & Visualization
- **Recharts** - Charting library

### UI Components & Utilities
- **Sonner** - Toast notifications
- **cmdk** - Command menu (Cmd/Ctrl + K)

## Security Features

### Authentication
- **Firebase Authentication**: Secure email/password and Google Sign-In
- **Token Verification**: Server-side token validation for API routes
- **Session Management**: Persistent authentication state with Firebase Auth

### Authorization
- **Role-Based Access Control**: Three-tier system (Admin, Moderator, Seller)
- **Permission-Based Access**: Granular permissions for specific features
- **Route Protection**: Protected routes require authentication and appropriate roles
- **Admin Request System**: New admins must be approved before access

### CSRF Protection
- **Server-Side CSRF Tokens**: HMAC-based token generation and validation
- **Token Expiration**: Tokens expire after 1 hour for security
- **Secure Secret**: Uses `CSRF_TOKEN_SECRET` from environment variables

### Rate Limiting
- **In-Memory Rate Limiting**: Configurable per endpoint (default implementation)
- **Default Limits**: 100 requests per minute for general API routes
- **Stricter Limits**: 20 requests per minute for image uploads
- **IP-Based Tracking**: Rate limiting based on client IP address
- **Automatic Cleanup**: Old entries cleaned up every 5 minutes
- **Multi-Instance Limitation**: Current implementation is per-instance (resets on restart)
- **Production Recommendation**: Use distributed rate limiting (Redis/Upstash) for multi-instance deployments

### Security Headers
Comprehensive security headers configured in `next.config.ts`:
- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **Content-Security-Policy**: Restrictive CSP with Firebase/Google allowances
- **Strict-Transport-Security**: Enforces HTTPS (max-age: 1 year)
- **Referrer-Policy**: origin-when-cross-origin
- **X-XSS-Protection**: 1; mode=block
- **Permissions-Policy**: Restricts camera, microphone, geolocation

### File Upload Security
- **Authentication Required**: Only authenticated users can upload
- **CSRF Protection**: Bypassed for multipart/form-data uploads (acceptable because Bearer tokens in Authorization headers are not vulnerable to CSRF attacks)
- **File Type Validation**: Only JPEG, PNG, WebP, GIF allowed
- **File Size Limits**: Maximum 10MB per file
- **Magic Bytes Validation**: Content validation to prevent MIME type spoofing
- **Filename Sanitization**: Prevents path traversal attacks
- **Rate Limiting**: 20 uploads per minute per IP

### API Route Protection
- **Authentication Middleware**: Verifies Firebase Auth tokens
- **Admin Verification**: Ensures user has admin account in Firestore
- **Error Handling**: Secure error messages (detailed in dev, generic in production)
- **Firebase Admin SDK**: Mandatory in production for secure token verification
 - **CORS Protection**: Validates request origin against `ALLOWED_ORIGINS` and applies strict CORS headers
 - **Safe Error Responses**: Centralized error sanitizer to avoid leaking stack traces and sensitive details
 - **Image Proxy Hardening**: Optional auth, strict domain allowlist, size limits, and rate limiting for proxied images

### Firebase Security Rules
- **Firestore Rules**: Configured in `firestore.rules` - must be deployed to Firebase Console
- **Storage Rules**: Configured in `storage.rules` - must be deployed to Firebase Console
- **Client-Side Protection**: Rules prevent unauthorized access even if client-side code is compromised
- **Admin-Only Access**: Most collections require admin authentication and role verification

## Security Documentation

For a deeper and continuously updated overview of the security model, see `SECURITY.md`.  
It documents authentication and authorization flows, API protections (CSRF, CORS, rate limiting), file upload security, Firebase rules, known limitations, and pre-/post-deployment security checklists.

## Admin Roles & Permissions

### Role Hierarchy

1. **Admin** (Highest Privileges)
   - Full access to all features
   - Can manage other admins
   - Can view audit logs
   - Can modify all permissions
   - All permissions enabled by default

2. **Moderator** (Moderate Privileges)
   - Can manage posts, orders, and users
   - Cannot manage other admins
   - Cannot view audit logs
   - Permissions must be explicitly granted
   - Can access Moderator and Seller-level features

3. **Seller** (Limited Privileges)
   - Limited access (works as regular seller)
   - No admin permissions by default
   - Can access Seller-level features only

### Permission System

Granular permissions can be assigned to Moderator and custom roles:

- **viewDashboard**: View dashboard analytics (read-only)
- **manageSellers**: Manage seller accounts and profiles
- **managePosts**: Manage product listings (books)
- **manageOrders**: Manage orders and transactions
- **manageCategories**: Manage product categories
- **manageCalendar**: Manage calendar events
- **manageLandingPage**: Manage landing page content
- **manageFAQs**: Manage FAQ content
- **manageAdmins**: Manage admin accounts (Admin only)
- **viewAuditLogs**: View audit logs (Admin only)
- **manageSettings**: Manage system settings

### Access Control

- Routes are protected based on roles and permissions
- UI elements are conditionally rendered based on permissions
- API routes verify both authentication and authorization
- Audit logs track all permission changes

## Environment Variables

Create a `.env.local` file in the project root directory with the following variables:

### Firebase Configuration (Required)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Cloudinary Configuration (Required)

```env
# Public (client-side) - used for image transformations
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

# Server-only (not exposed to client) - used for uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Security Configuration (Required)

```env
# Generate a secure random string: openssl rand -hex 32
CSRF_TOKEN_SECRET=your_secure_random_string_here

# Allowed Origins for CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Telegram Bot Configuration (Optional - for Contact Form)

```env
# Telegram Bot Token (server-only)
# Get this from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Telegram Chat ID (server-only)
# Your Telegram user ID or group chat ID where messages will be sent
TELEGRAM_CHAT_ID=your_chat_id_here
```

**Setting up Telegram Bot**: Create a bot via `@BotFather` on Telegram, get your bot token and chat ID, then add both values to your `.env.local` file.

### App Configuration

```env
# Main App URL (for linking to book pages from admin dashboard)
NEXT_PUBLIC_MAIN_APP_URL=http://localhost:3000
```

### Firebase Admin SDK (Required for Production)

**IMPORTANT**: Firebase Admin SDK is **mandatory in production** for secure token verification. The application will fail to start in production if Admin SDK is not configured.

For enhanced security, configure Firebase Admin SDK:

```env
# Option 1: Service account JSON file path
FIREBASE_ADMIN_SERVICE_ACCOUNT=/path/to/service-account-key.json

# Option 2: Service account JSON as string
FIREBASE_ADMIN_SERVICE_ACCOUNT={"type":"service_account",...}

# Option 3: Individual fields
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=your-private-key
```

**Note**: In development, the app will fall back to REST API if Admin SDK is not configured, but this is not secure for production use.


## Firebase Security Rules Setup

**CRITICAL**: You must configure Firebase Security Rules in the Firebase Console to protect your data. The rules files are provided in this repository but must be deployed to Firebase.

### Deploying Firestore Rules

1. Open Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to **Firestore Database** > **Rules** tab
4. Copy the contents of `firestore.rules` from this repository
5. Paste into the Firebase Console rules editor
6. Click **Publish**

### Deploying Storage Rules

1. In Firebase Console, go to **Storage** > **Rules** tab
2. Copy the contents of `storage.rules` from this repository
3. Paste into the Firebase Console rules editor
4. Click **Publish**

### What the Rules Do

- **Admin Users**: Only authenticated admins can read, only Admin role can write
- **Admin Requests**: Anyone authenticated can create, only admins can read/update
- **Audit Logs**: Admin-only read access, no client-side writes (server-only)
- **All Other Collections**: Admin-only access for read/write operations
- **Storage**: Authenticated users can read, only admins can upload

### Testing Rules

Use Firebase Emulator Suite to test your rules before deploying:
```bash
firebase emulators:start --only firestore,storage
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Firebase project with Authentication and Firestore enabled
- Firebase Security Rules deployed (see above)
- Cloudinary account with upload preset configured
- Telegram bot (optional, for contact form notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Boisetu-AdminDashboard-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env.local` file**
   ```bash
   cp .env.example .env.local  # If you have an example file
   # Or create .env.local manually with variables from above
   ```

4. **Configure environment variables**
   - Add all required Firebase, Cloudinary, and security variables
   - Generate CSRF token secret: `openssl rand -hex 32`
   - Set `NEXT_PUBLIC_MAIN_APP_URL` to your main app URL
   - (Optional) Configure Telegram bot for contact form

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Sign in with your admin credentials

### Build & Production

```bash
# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## Project Structure

```
.
├── public/                          # Static assets (images, icons)
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (auth)/                  # Authentication routes
│   │   │   ├── sign-in/
│   │   │   └── forgot-password/
│   │   ├── admin/                   # Admin authentication
│   │   │   ├── login/
│   │   │   └── sign-up/
│   │   ├── (dashboard)/            # Protected dashboard routes
│   │   │   ├── admin/               # Admin management routes
│   │   │   │   ├── dashboard/       # Main dashboard
│   │   │   │   ├── sellers/         # Seller management
│   │   │   │   ├── orders/          # Order management
│   │   │   │   ├── users/           # User management
│   │   │   │   ├── posts/           # Product/Post management
│   │   │   │   ├── categories/      # Category management
│   │   │   │   ├── faqs/            # FAQ management
│   │   │   │   ├── admins/          # Admin user management
│   │   │   │   ├── audit-logs/      # Audit log viewer
│   │   │   │   ├── calendar/        # Calendar (order dates)
│   │   │   │   ├── notes/           # Notes system
│   │   │   │   └── settings/        # Admin settings
│   │   │   └── settings/            # User settings
│   │   │       ├── account/
│   │   │       ├── appearance/
│   │   │       ├── billing/
│   │   │       ├── notifications/
│   │   │       ├── connections/
│   │   │       └── user/
│   │   ├── api/                     # API routes
│   │   │   ├── upload-image/        # Image upload endpoint
│   │   │   ├── contact/             # Contact form endpoint
│   │   │   └── proxy-image/         # Image proxy endpoint (Google/Cloudinary avatars)
│   │   ├── landing/                 # Marketing landing page
│   │   │   └── components/
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home page
│   │   ├── globals.css              # Global styles
│   │   ├── loading.tsx              # Loading UI
│   │   └── not-found.tsx            # 404 page
│   ├── components/                  # React components
│   │   ├── admin/                   # Admin-specific components
│   │   │   ├── confirm-dialog.tsx
│   │   │   ├── image-upload.tsx
│   │   │   ├── multiple-image-upload.tsx
│   │   │   └── status-badge.tsx
│   │   ├── landing/                 # Landing page components
│   │   │   └── mega-menu.tsx
│   │   ├── layouts/                 # Layout components
│   │   │   └── base-layout.tsx
│   │   ├── theme-customizer/        # Theme customization
│   │   │   ├── index.tsx
│   │   │   ├── layout-tab.tsx
│   │   │   ├── theme-tab.tsx
│   │   │   └── import-modal.tsx
│   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── form.tsx
│   │   │   └── ... (30+ components)
│   │   ├── app-sidebar.tsx          # Sidebar navigation
│   │   ├── command-search.tsx       # Command menu (Cmd+K)
│   │   ├── header-user.tsx          # User header component
│   │   └── theme-provider.tsx       # Theme provider
│   ├── config/                      # Configuration files
│   │   ├── theme-data.ts            # Theme tokens
│   │   └── theme-customizer-constants.ts
│   ├── contexts/                    # React contexts
│   │   ├── admin-auth-context.tsx   # Authentication context
│   │   ├── sidebar-context.tsx      # Sidebar state
│   │   └── theme-context.ts         # Theme context
│   ├── hooks/                       # Custom React hooks
│   │   ├── use-circular-transition.ts
│   │   ├── use-fullscreen.ts
│   │   ├── use-mobile.ts
│   │   ├── use-sidebar-config.ts
│   │   ├── use-theme-manager.ts
│   │   └── use-theme.ts
│   ├── lib/                         # Utility libraries
│   │   ├── cloudinary/              # Cloudinary integration
│   │   │   ├── config.ts
│   │   │   └── upload.ts
│   │   ├── env/                     # Environment variable helpers
│   │   │   ├── public-env.ts
│   │   │   └── server-env.ts
│   │   ├── firebase/                # Firebase integration
│   │   │   ├── config.ts            # Firebase initialization
│   │   │   ├── admin.ts             # Firebase Admin SDK
│   │   │   └── services/            # Firebase service functions
│   │   │       ├── admin-admins.ts
│   │   │       ├── admin-auth.ts
│   │   │       ├── admin-audit.ts
│   │   │       ├── admin-books.ts
│   │   │       ├── admin-categories.ts
│   │   │       ├── admin-customizer-settings.ts
│   │   │       ├── admin-notes.ts
│   │   │       ├── admin-orders.ts
│   │   │       ├── admin-password-reset.ts
│   │   │       ├── admin-requests.ts
│   │   │       ├── admin-sellers.ts
│   │   │       ├── admin-users.ts
│   │   │       └── admin-visitors.ts
│   │   ├── security/                        # Security utilities
│   │   │   ├── auth-middleware.ts           # Auth verification for API routes
│   │   │   ├── auth-middleware-helper.ts    # Edge/middleware-safe auth helpers
│   │   │   ├── csrf.ts                      # CSRF protection
│   │   │   ├── rate-limit.ts                # In-memory rate limiting
│   │   │   ├── rate-limit-distributed.ts    # Interface for Redis/Upstash-based rate limiting
│   │   │   ├── cors.ts                      # CORS configuration and enforcement
│   │   │   └── error-handler.ts             # Centralized error handling and sanitization
│   │   ├── admin-utils.ts                   # Admin utilities
│   │   ├── avatar-utils.ts                  # Avatar URL normalization and proxy helper
│   │   ├── env.ts                           # Environment helpers
│   │   ├── fonts.ts                         # Font configuration
│   │   ├── logger.ts                        # Logging utility
│   │   ├── metadata-utils.ts                # Shared metadata helpers
│   │   ├── query-keys.ts                    # Standardized TanStack Query keys
│   │   └── utils.ts                         # General utilities
│   ├── types/                       # TypeScript type definitions
│   │   ├── admin.ts                 # Admin types
│   │   ├── theme-customizer.ts      # Theme types
│   │   └── theme.ts                 # Theme types
│   └── utils/                       # Utility functions
│       ├── shadcn-ui-theme-presets.ts
│       └── tweakcn-theme-presets.ts
├── .env.local                       # Environment variables (not in git)
├── .env.example                     # Environment variables example
├── components.json                  # shadcn/ui configuration
├── eslint.config.mjs                # ESLint configuration
├── next.config.ts                   # Next.js configuration
├── package.json                     # Dependencies
├── postcss.config.mjs               # PostCSS configuration
├── tsconfig.json                    # TypeScript configuration
├── src/proxy.ts                     # Edge proxy for basic route protection/redirects
├── README.md                        # This file
├── SECURITY.md                      # Detailed security documentation
└── License.md                       # MIT License
```

## Key Paths & Routes

### Authentication Routes
- `/sign-in` - Sign in page with email/password and Google Sign-In
- `/admin/login` - Admin login page
- `/admin/sign-up` - Admin registration (requires approval)
- `/forgot-password` - Password reset functionality

### Admin Dashboard Routes
- `/admin/dashboard` - Main dashboard with analytics and overview
- `/admin/sellers` - Seller management and statistics
- `/admin/orders` - Order management and tracking
- `/admin/users` - User/customer management
- `/admin/posts` - Product/book listing management
- `/admin/categories` - Category management
- `/admin/faqs` - FAQ management
- `/admin/admins` - Admin user management (Admin role only)
- `/admin/audit-logs` - Audit log viewer (Admin role only)
- `/admin/calendar` - Calendar functionality
- `/admin/notes` - Notes system
- `/admin/settings/account` - Admin profile settings

### User Settings Routes
- `/settings/account` - Account and profile settings
- `/settings/appearance` - Theme and appearance preferences
- `/settings/billing` - Billing and subscription management
- `/settings/notifications` - Notification preferences
- `/settings/connections` - Third-party integrations
- `/settings/user` - User-specific settings

### Public Routes
- `/landing` - Marketing landing page
- `/` - Home/redirect page

## API Routes

### POST `/api/upload-image`

Secure image upload endpoint for Cloudinary.

**Authentication**: Required (admin users only)

**Rate Limiting**: 20 requests per minute per IP

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field

**File Requirements**:
- Allowed types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`
- Maximum size: 10MB
- Content validation: Magic bytes verification

**Response** (Success):
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/...",
  "publicId": "folder/image_id",
  "width": 1920,
  "height": 1080,
  "format": "jpg",
  "bytes": 245678
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Error message"
}
```

**Security Features**:
- Authentication middleware verification
- Rate limiting with headers
- File type and size validation
- Magic bytes content validation
- Filename sanitization

### POST `/api/contact`

Contact form submission endpoint that sends messages to Telegram.

**Authentication**: Not required (public endpoint)

**Rate Limiting**: 5 requests per minute per IP

**Request**:
- Method: `POST`
- Content-Type: `application/json`
- Body: JSON object with form data

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "subject": "Question about features",
  "message": "I have a question about..."
}
```

**Validation**:
- `firstName`: Minimum 2 characters
- `lastName`: Minimum 2 characters
- `email`: Valid email address
- `subject`: Minimum 5 characters
- `message`: Minimum 10 characters

**Response** (Success):
```json
{
  "success": true,
  "message": "Message sent successfully!"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Error message",
  "details": [/* validation errors if applicable */]
}
```

**Security Features**:
- Rate limiting (5 requests per minute per IP)
- Input validation with Zod schema
- HTML escaping for Telegram messages
- Server-only bot token (not exposed to client)

### GET `/api/proxy-image`

Image proxy endpoint to safely load external avatars and images (e.g., Google profile photos, Cloudinary-hosted assets) without exposing third-party rate limiting or CORS issues to the client.

- **Authentication**: Optional (works for unauthenticated `<img>` tags; uses stricter limits when authenticated)
- **Rate Limiting**: 30 requests per minute per client identifier
- **Request**:
  - Method: `GET`
  - Query: `url` (URL-encoded image URL)
- **Security**:
  - Strict allowlist of domains (Google-hosted avatars, Cloudinary)
  - Image-only content checks and size limits (5MB max)
  - Timeouts and robust error handling, with CORS-aware responses

## Development

Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) to open the command search menu for quick navigation.

### Best Practices

- Use TypeScript for type safety
- Follow shadcn/ui component patterns
- Implement proper error handling and loading states
- Use React Hook Form with Zod for form validation
- Always verify authentication and permissions in API routes

## Deployment

### Vercel Deployment

1. **Connect Repository**
   Connect your GitHub/GitLab repository to Vercel. Vercel will auto-detect Next.js configuration.

2. **Set Environment Variables**
   Add all required environment variables in Vercel dashboard:
   - Firebase configuration (with `NEXT_PUBLIC_` prefix)
   - Cloudinary variables
   - Security variables (`CSRF_TOKEN_SECRET`, `ALLOWED_ORIGINS`)
   - App configuration (`NEXT_PUBLIC_MAIN_APP_URL`)
   - Optional: Telegram bot variables
   
   **Important**: Set variables for all environments (Production, Preview, Development)

3. **Deploy**
   - Push to your main branch to trigger production deployment
   - Or use Vercel CLI: `vercel --prod`


### Post-Deployment Checklist

- ✅ Verify all environment variables are set
- ✅ **Deploy Firebase Security Rules** (Firestore and Storage)
- ✅ **Configure Firebase Admin SDK** (required for production)
- ✅ Test authentication and authorization flows
- ✅ Verify image uploads and API routes work correctly
- ✅ Test role-based access control
- ✅ Verify links to main app work correctly
- ✅ Test Firestore rules with Firebase Emulator
- ✅ Verify Admin SDK is working (check logs for REST API fallback warnings)
- ⚠️ **Consider distributed rate limiting** for multi-instance deployments (see `src/lib/security/rate-limit-distributed.ts`)

## Theming

The dashboard supports dark/light themes with customizable layouts. Theme preferences are stored in localStorage and persist across sessions. Edit `src/config/theme-data.ts` to customize brand colors and theme tokens.

## Troubleshooting

### Common Issues

#### Firebase Authentication Errors

**Problem**: "Firebase Auth cannot be initialized"

**Solutions**:
1. Verify all Firebase environment variables are set correctly
2. Check that variables start with `NEXT_PUBLIC_` prefix
3. Ensure Firebase project has Authentication enabled
4. Verify Firestore is enabled in Firebase console
5. Restart the development server after adding environment variables

#### Image Upload Fails

**Problem**: Image upload returns 401 or 403 error

**Solutions**:
1. Ensure you're signed in as an admin user
2. Verify Cloudinary environment variables are set
3. Check that `CLOUDINARY_UPLOAD_PRESET` is configured in Cloudinary dashboard
4. Verify file type is allowed (JPEG, PNG, WebP, GIF)
5. Check file size is under 10MB

#### Rate Limit Errors

**Problem**: "Rate limit exceeded" error

**Solutions**:
1. Wait for the rate limit window to reset (1 minute)
2. Reduce request frequency
3. For image uploads, limit to 20 per minute

#### CSRF Token Errors

**Problem**: CSRF validation fails

**Solutions**:
1. Ensure `CSRF_TOKEN_SECRET` is set in environment variables
2. Verify token hasn't expired (1 hour expiration)
3. Check that token is being sent in request headers
4. Regenerate `CSRF_TOKEN_SECRET` if compromised

#### Build Errors

**Problem**: Build fails with TypeScript or ESLint errors

**Solutions**:
1. Run `npm run lint` to identify issues
2. Fix TypeScript errors
3. Ensure all dependencies are installed: `npm install`
4. Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

#### Telegram Contact Form Not Working

**Problem**: Contact form submissions fail

**Solutions**:
1. Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set correctly
2. Ensure bot token is valid and has permission to send messages
3. Check rate limiting (5 requests per minute per IP)
4. Review server logs for detailed error messages

## License

MIT License — see `License.md` for full license text. Attribution is appreciated but not required.

---

**Built by [Mosabbir Maruf](https://github.com/mosabbir-maruf)**
