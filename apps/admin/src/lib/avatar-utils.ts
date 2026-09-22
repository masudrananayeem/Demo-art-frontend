/**
 * Avatar utility functions for consistent image handling across the application
 */

/**
 * Normalize avatar URL - handles empty strings, undefined, and null
 */
export function normalizeAvatarUrl(url: string | undefined | null): string | undefined {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return undefined
  }
  return url.trim()
}

/**
 * Add cache-busting parameter to image URL
 * Only adds cache-busting for data URLs or local URLs
 * External services (Google, Cloudinary) handle caching and adding cache-busting causes rate limiting
 * @param url - The image URL
 * @param version - Optional version number for cache-busting (defaults to timestamp)
 * @returns URL with cache-busting parameter, or original URL for external services
 */
export function addCacheBusterToUrl(
  url: string | undefined,
  version?: number
): string | undefined {
  if (!url) return undefined
  
  // If it's a data URL, return as is (no cache-busting needed)
  if (url.startsWith('data:')) {
    return url
  }
  
  // Don't add cache-busting for external services that handle their own caching
  // This prevents rate limiting (429 errors)
  const isGoogleUrl = url.includes('googleusercontent.com') || url.includes('google.com')
  const isCloudinaryUrl = url.includes('cloudinary.com')
  const isExternalUrl = url.startsWith('http://') || url.startsWith('https://')
  
  if (isExternalUrl && (isGoogleUrl || isCloudinaryUrl)) {
    // Remove any existing cache-busting parameters
    const urlObj = new URL(url)
    urlObj.searchParams.delete('v') // Remove cache-busting parameter
    return urlObj.toString()
  }
  
  // For local URLs or other URLs, add cache-busting if needed
  // But for now, let's not add it to avoid issues
  return url
}

/**
 * Get avatar URL - uses proxy for external images to avoid CORS and rate limiting
 * This prevents hydration mismatches by only processing on the client
 * @param url - The avatar URL
 * @param isMounted - Whether the component is mounted (client-side)
 * @param useProxy - Whether to use the image proxy for external URLs (default: true)
 */
export function getAvatarUrl(
  url: string | undefined | null,
  isMounted: boolean = true,
  useProxy: boolean = true
): string | undefined {
  const normalized = normalizeAvatarUrl(url)
  if (!normalized) return undefined
  
  // Don't process until mounted to prevent hydration mismatches
  if (!isMounted) {
    return normalized
  }
  
  // For data URLs, return as-is
  if (normalized.startsWith('data:')) {
    return normalized
  }
  
  // For external services (Google, Cloudinary), use proxy to avoid CORS and rate limiting
  const isGoogleUrl = normalized.includes('googleusercontent.com') || normalized.includes('google.com')
  const isCloudinaryUrl = normalized.includes('cloudinary.com')
  const isExternalUrl = normalized.startsWith('http://') || normalized.startsWith('https://')
  
  // Only proxy Google-hosted avatars; load Cloudinary directly to avoid proxy/CORS issues
  if (useProxy && isExternalUrl && isGoogleUrl) {
    // Use our image proxy to avoid CORS and rate limiting issues for Google images
    try {
      const encodedUrl = encodeURIComponent(normalized)
      return `/api/proxy-image?url=${encodedUrl}`
    } catch {
      // If encoding fails, return original URL
      return normalized
    }
  }
  
  // For Cloudinary and other URLs, return as-is
  return normalized
}
