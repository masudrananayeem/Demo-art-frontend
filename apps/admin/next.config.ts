import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Next/Image optimization to avoid Vercel image optimization usage/limits.
  images: {
    unoptimized: true,
  },

  // Request size limits
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Limit for server actions (includes API routes)
    },
  },

  // Headers for better security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Allow Firebase/Google scripts required for Google Sign-In
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' http://localhost:8787 https://identitytoolkit.googleapis.com https://*.firebaseio.com https://*.cloudinary.com https://api.cloudinary.com https://*.googleapis.com",
              // Allow Google auth iframes and Firebase auth handler
              "frame-src 'self' https://www.google.com https://accounts.google.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },

  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/contact',
        destination: '/landing#contact',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
