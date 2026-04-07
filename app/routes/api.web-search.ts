import type { ActionFunctionArgs } from 'react-router';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';
import { isAllowedUrl } from '~/utils/url';
import { z } from 'zod';

const MAX_CONTENT_LENGTH = 8000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB cap on raw response body

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

const logger = createScopedLogger('WebSearch');

const webSearchRequestSchema = z.object({
  url: z.string().optional(),
});

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);

  if (match) {
    return match[1].trim();
  }

  // Try reverse attribute order
  const altMatch = html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);

  return altMatch ? altMatch[1].trim() : '';
}

function extractTextContent(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function webSearchAction({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return errorResponse(new AppError(AppErrorType.FORBIDDEN, 'Method not allowed'), 405);
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid JSON in request body'), 400);
  }

  const parsed = webSearchRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    logger.warn('Validation failed:', parsed.error.flatten());

    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid request body'), 400);
  }

  try {
    const { url } = parsed.data;

    if (!url || typeof url !== 'string') {
      return errorResponse(new AppError(AppErrorType.VALIDATION, 'URL is required'), 400);
    }

    if (!isAllowedUrl(url)) {
      return errorResponse(
        new AppError(AppErrorType.VALIDATION, 'URL is not allowed. Only public HTTP/HTTPS URLs are accepted.'),
        400,
      );
    }

    let response: Response;

    try {
      response = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new AppError(AppErrorType.TIMEOUT, 'Request timed out after 10 seconds', 504);
      }

      throw error;
    }

    if (!response.ok) {
      return errorResponse(
        new AppError(AppErrorType.NETWORK, `Failed to fetch URL: ${response.status} ${response.statusText}`, 502),
      );
    }

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return errorResponse(new AppError(AppErrorType.VALIDATION, 'URL must point to an HTML or text page'), 400);
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    if (contentLength > MAX_RESPONSE_SIZE) {
      return errorResponse(
        new AppError(
          AppErrorType.VALIDATION,
          `Response too large (${contentLength} bytes). Maximum is ${MAX_RESPONSE_SIZE}.`,
        ),
        413,
      );
    }

    const html = await response.text();

    if (html.length > MAX_RESPONSE_SIZE) {
      return errorResponse(new AppError(AppErrorType.VALIDATION, 'Response body exceeds maximum allowed size.'), 413);
    }

    const title = extractTitle(html);
    const description = extractMetaDescription(html);
    const content = extractTextContent(html);

    return successResponse({
      title,
      description,
      content: content.length > MAX_CONTENT_LENGTH ? content.slice(0, MAX_CONTENT_LENGTH) + '...' : content,
      sourceUrl: url,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Web search failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(webSearchAction, { auth: AUTH_PRESETS.authenticated });
