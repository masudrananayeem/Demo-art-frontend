import { NextResponse } from 'next/server';

/**
 * Returns the main app (Book Store) URL from server env.
 * Used as a runtime fallback when NEXT_PUBLIC_MAIN_APP_URL wasn't
 * available at build time (e.g. dev server started before env was set).
 */
export async function GET() {
  const raw = process.env.NEXT_PUBLIC_MAIN_APP_URL || '';
  const url = raw ? raw.split(',')[0].trim().replace(/\/$/, '') : '';
  return NextResponse.json({ url });
}
