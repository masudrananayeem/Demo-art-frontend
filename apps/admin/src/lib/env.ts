/**
 * Check if running in development mode
 * Works on both client and server side
 */
export const isDev =
  typeof process !== "undefined" &&
  (process.env.NODE_ENV === "development" || 
   process.env.NEXT_PUBLIC_NODE_ENV === "development");

