/**
 * CSRF Protection Service — Double-Submit Cookie Pattern
 *
 * Generates secure tokens, sets them in non-HttpOnly cookies (so JavaScript
 * can read the token and copy it to the X-CSRF-Token header), then validates
 * the header value against the cookie value using timing-safe comparison.
 *
 * Validation is skipped for safe HTTP methods (GET, HEAD, OPTIONS) and for
 * requests carrying a Bearer Authorization header (v1 API tokens).
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createScopedLogger } from '~/utils/logger';
import { SecurityError, SecurityErrorType } from '~/lib/api/errors';
import { CSRF_CONFIG } from '~/lib/security-config';

const logger = createScopedLogger('CsrfService');

type CsrfValidationResult = { valid: true } | { valid: false; error: SecurityError };

export class CsrfService {
  /**
   * Generate a cryptographically secure CSRF token (32 random bytes, hex-encoded).
   */
  static generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Append a Set-Cookie header to the response with the CSRF token.
   *
   * The cookie is intentionally **not** HttpOnly — JavaScript must read
   * it to include the token in the X-CSRF-Token header (double-submit pattern).
   *
   * @param response - The outgoing Response to append the cookie to.
   * @param token    - The CSRF token value.
   * @param maxAge   - Cookie lifetime in seconds (defaults to CSRF_CONFIG.tokenTTL converted to seconds).
   */
  static setTokenCookie(response: Response, token: string, maxAge?: number): void {
    const ttlSeconds = maxAge ?? Math.floor(CSRF_CONFIG.tokenTTL / 1000);
    const isProduction = process.env.NODE_ENV === 'production';

    const parts: string[] = [
      `${CSRF_CONFIG.cookieName}=${token}`,
      `Path=/`,
      `SameSite=Strict`,
      `Max-Age=${ttlSeconds}`,
    ];

    if (isProduction) {
      parts.push('Secure');
    }

    // Explicitly omit HttpOnly — JavaScript must read this cookie
    response.headers.append('Set-Cookie', parts.join('; '));
  }

  /**
   * Validate the incoming request for CSRF compliance.
   *
   * Returns `{ valid: true }` when the request is acceptable, or
   * `{ valid: false, error: SecurityError }` when it fails validation.
   */
  static validateRequest(request: Request): CsrfValidationResult {
    // Skip validation when CSRF protection is disabled
    if (!CSRF_CONFIG.enabled) {
      return { valid: true };
    }

    const method = request.method.toUpperCase();

    // Skip validation for exempt (safe) HTTP methods
    if ((CSRF_CONFIG.exemptMethods as readonly string[]).includes(method)) {
      return { valid: true };
    }

    // Skip validation for Bearer-authenticated requests (v1 API tokens)
    const authHeader = request.headers.get('Authorization');

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      return { valid: true };
    }

    // Extract the token from the cookie
    const cookieHeader = request.headers.get('Cookie');

    if (!cookieHeader) {
      logger.warn('CSRF validation failed: no cookies present');

      return {
        valid: false,
        error: new SecurityError(SecurityErrorType.CSRF_VIOLATION, 'CSRF token missing: no cookies present'),
      };
    }

    const cookieToken = parseCookieValue(cookieHeader, CSRF_CONFIG.cookieName);

    if (!cookieToken) {
      logger.warn('CSRF validation failed: cookie token missing');

      return {
        valid: false,
        error: new SecurityError(SecurityErrorType.CSRF_VIOLATION, 'CSRF token missing from cookie'),
      };
    }

    // Extract the token from the request header
    const headerToken = request.headers.get(CSRF_CONFIG.headerName);

    if (!headerToken) {
      logger.warn('CSRF validation failed: header token missing');

      return {
        valid: false,
        error: new SecurityError(SecurityErrorType.CSRF_VIOLATION, 'CSRF token missing from header'),
      };
    }

    // Timing-safe comparison — both buffers must be the same length
    if (!timingSafeCompare(cookieToken, headerToken)) {
      logger.warn('CSRF validation failed: token mismatch');

      return {
        valid: false,
        error: new SecurityError(SecurityErrorType.CSRF_VIOLATION, 'CSRF token mismatch'),
      };
    }

    return { valid: true };
  }

  /**
   * Extract the CSRF token from the request's Cookie header (if present).
   *
   * Used by the security middleware to reuse the existing token on GET
   * responses instead of rotating it — preventing race conditions during
   * rapid concurrent requests.
   */
  static extractTokenFromRequest(request: Request): string | null {
    const cookieHeader = request.headers.get('Cookie');

    if (!cookieHeader) {
      return null;
    }

    return parseCookieValue(cookieHeader, CSRF_CONFIG.cookieName);
  }
}

/**
 * Extract a specific cookie value from the Cookie header string.
 */
function parseCookieValue(cookieHeader: string, name: string): string | null {
  const pattern = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
  const match = cookieHeader.match(pattern);

  return match?.[1] ?? null;
}

/**
 * Timing-safe string comparison following the pattern used in security.ts.
 */
function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
