/**
 * Client-side CSRF Token Utility — Double-Submit Cookie Pattern
 *
 * Reads the CSRF token from the non-HttpOnly cookie set by the server
 * and transparently attaches it as the X-CSRF-Token header on all
 * mutating requests (POST, PUT, PATCH, DELETE).
 *
 * Uses the same cookie and header names defined in security-config.ts
 * to keep client and server in sync.
 */

import { CSRF_CONFIG } from '~/lib/security-config';

/** HTTP methods that are exempt from CSRF — they never carry the token header. */
const SAFE_METHODS = new Set(CSRF_CONFIG.exemptMethods.map((m) => m.toUpperCase()));

/**
 * Read the CSRF token value from `document.cookie`.
 *
 * Returns `undefined` when the cookie is absent (e.g. first page load
 * before the server has set the cookie, or in SSR context where
 * `document` is unavailable).
 */
export function getCsrfToken(): string | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const prefix = `${CSRF_CONFIG.cookieName}=`;

  const match = document.cookie.split('; ').find((c) => c.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

/**
 * Drop-in replacement for the global `fetch` that automatically attaches
 * the `X-CSRF-Token` header on mutating requests.
 *
 * - GET / HEAD / OPTIONS requests pass through unchanged.
 * - If no CSRF cookie is present, the request proceeds without the
 *   header (graceful degradation).
 * - Existing headers supplied by the caller are preserved; the CSRF
 *   header is merged in without overwriting anything the caller set.
 *
 * The signature and return type are identical to `globalThis.fetch`.
 */
export function csrfFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();

  if (SAFE_METHODS.has(method)) {
    return fetch(input, init);
  }

  const token = getCsrfToken();

  if (!token) {
    return fetch(input, init);
  }

  const headers = new Headers(init?.headers);
  headers.set(CSRF_CONFIG.headerName, token);

  return fetch(input, { ...init, headers });
}
