import { NextRequest, NextResponse } from 'next/server';
import { getServerEnv } from '@/lib/env/server-env';
import { checkRateLimit, getClientIdentifier } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { requireCORS, applyCORSHeaders } from '@/lib/security/cors';
import { createSafeErrorResponse, logErrorSecurely } from '@/lib/security/error-handler';

/**
 * API Route: Contact Form Submission to Telegram
 * 
 * This endpoint handles contact form submissions and sends them to Telegram.
 * 
 * Security features:
 * - Rate limiting (5 requests per minute per IP)
 * - Input validation with Zod
 * - Telegram bot token is server-only (not exposed to client)
 */

const contactFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute

/**
 * Send message to Telegram
 */
async function sendToTelegram(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || 'Failed to send message to Telegram',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Format contact form data into Telegram message
 */
function formatTelegramMessage(data: z.infer<typeof contactFormSchema>): string {
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `
<b>📧 New Contact Form Submission</b>

<b>Name:</b> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}
<b>Email:</b> ${escapeHtml(data.email)}
<b>Subject:</b> ${escapeHtml(data.subject)}

<b>Message:</b>
${escapeHtml(data.message)}

<i>Submitted: ${timestamp} UTC</i>
  `.trim();
}

/**
 * Escape HTML special characters for Telegram HTML parse mode
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: NextRequest) {
  try {
    // CORS validation
    const corsResult = await requireCORS(request);
    if (!corsResult.allowed) {
      return corsResult.response;
    }
    
    // For OPTIONS requests, return the response directly
    if ('response' in corsResult) {
      return corsResult.response;
    }
    
    // For other requests, use headers
    const corsHeaders = corsResult.headers;

    // Rate limiting
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
    });

    if (!rateLimitResult.allowed) {
      const rateLimitResponse = NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ).toString(),
            ...corsHeaders,
          },
        }
      );
      return applyCORSHeaders(rateLimitResponse, request);
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = contactFormSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: 'Invalid form data',
          details: validationResult.error.issues,
        },
        { status: 400, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }

    // Get Telegram configuration
    const botToken = getServerEnv('TELEGRAM_BOT_TOKEN');
    const chatId = getServerEnv('TELEGRAM_CHAT_ID');

    // Format and send message to Telegram
    const message = formatTelegramMessage(validationResult.data);
    const telegramResult = await sendToTelegram(botToken, chatId, message);

    if (!telegramResult.success) {
      const errorResponse = NextResponse.json(
        {
          success: false,
          error: 'Failed to send message. Please try again later.',
        },
        { status: 500, headers: corsHeaders }
      );
      return applyCORSHeaders(errorResponse, request);
    }

    const successResponse = NextResponse.json({
      success: true,
      message: 'Message sent successfully!',
    }, { headers: corsHeaders });
    
    return applyCORSHeaders(successResponse, request);
  } catch (error) {
    logErrorSecurely('contact-form', error);
    logger.error('Contact form API error:', error);
    const safeError = createSafeErrorResponse(error, 500, 'An unexpected error occurred. Please try again later.');
    
    const errorResponse = NextResponse.json(
      safeError,
      { status: 500 }
    );
    return applyCORSHeaders(errorResponse, request);
  }
}

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  const corsResult = await requireCORS(request);
  if (corsResult.allowed && 'response' in corsResult) {
    return corsResult.response as NextResponse;
  }
  return new NextResponse(null, { status: 204 });
}
