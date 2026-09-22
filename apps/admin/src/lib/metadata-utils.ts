/**
 * Metadata Utilities
 * 
 * Provides utility functions for generating metadata, particularly for
 * Open Graph and Twitter Card images that require absolute URLs.
 */
import { getPublicEnv } from "@/lib/env/public-env";

/**
 * Get the absolute site URL for metadata images
 * 
 * Open Graph and Twitter Card images require absolute URLs (e.g., https://example.com/image.png).
 * This function determines the site URL from environment variables or falls back to defaults.
 * 
 * @returns The absolute site URL (e.g., "https://example.com" or "http://localhost:3000")
 */
export function getSiteUrl(): string {
  // Check for explicit site URL in public environment variable
  const siteUrl = getPublicEnv("NEXT_PUBLIC_SITE_URL", "");
  if (siteUrl) {
    return siteUrl;
  }

  // Fallback: use Vercel URL in production, but only on the server
  if (typeof window === "undefined" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default fallback for local development
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  // Production fallback (should be overridden with NEXT_PUBLIC_SITE_URL)
  return "https://your-domain.com";
}

/**
 * Generate an absolute URL for a public asset
 * 
 * @param path - The path to the asset relative to the public folder (e.g., "/dashboard.png")
 * @returns The absolute URL to the asset
 */
export function getAbsoluteImageUrl(path: string): string {
  const baseUrl = getSiteUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
