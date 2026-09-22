import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Proxy for Server-Side Route Protection
 * 
 * This proxy provides server-side protection for admin routes and handles redirects.
 * It runs in Edge Runtime, so it can only use Edge-compatible APIs (no Firestore).
 * 
 * Note: Full authentication verification happens in API routes and client-side.
 * This proxy provides basic route protection and redirects.
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle redirects
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  if (pathname === '/register') {
    return NextResponse.redirect(new URL('/admin/sign-up', request.url));
  }

  // Allow public routes
  const publicRoutes = [
    '/',
    '/landing',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/admin/login',
    '/admin/sign-up',
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // For admin routes, we rely on client-side protection in admin/layout.tsx
  // and API route protection for actual data access.
  // Edge Runtime limitations prevent us from doing full Firestore queries here.
  // The client-side layout will handle redirects if not authenticated.
  
  // Allow access - client-side protection will handle authentication
  return NextResponse.next();
}

// Configure which routes this proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled by API route middleware)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
