/**
 * Standardized API response helpers.
 *
 * Produces a consistent BaseApiResponse<T> envelope for all API routes.
 * Composes with withSecurity's header injection — it merges its security
 * headers onto the Response returned by the handler.
 */

import { AppError, type AppErrorType } from '~/lib/api/errors';

/**
 * Standard envelope shape returned by every API endpoint.
 */
export interface BaseApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    name: string;
    type?: AppErrorType;
  };
  message?: string;
}

/**
 * Creates a JSON success response with the standard envelope.
 *
 * @param data    - The payload to return under `data`.
 * @param message - Optional human-readable message.
 * @param status  - HTTP status code (default 200).
 */
export function successResponse<T>(data: T, message?: string, status = 200): Response {
  const body: BaseApiResponse<T> = {
    success: true,
    data,
    ...(message !== undefined ? { message } : {}),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Creates a JSON error response with the standard envelope.
 *
 * Accepts a plain string, a generic `Error`, or an `AppError` (including its
 * subclasses `SecurityError` and `ApiError`). When an `AppError` is provided
 * its `statusCode` and `type` are propagated into the response automatically.
 *
 * @param error      - The error source (string | Error | AppError).
 * @param statusCode - HTTP status code override (default: 500, or AppError.statusCode).
 * @param message    - Optional human-readable message override.
 */
export function errorResponse(error: string | Error | AppError, statusCode?: number, message?: string): Response {
  const isAppError = error instanceof AppError;

  const resolvedStatus = statusCode ?? (isAppError ? error.statusCode : 500);
  const errorMessage = error instanceof Error ? error.message : error;
  const errorName = error instanceof Error ? error.name : 'Error';

  const body: BaseApiResponse = {
    success: false,
    error: {
      message: errorMessage,
      name: errorName,
      ...(isAppError ? { type: error.type } : {}),
    },
    message: message ?? errorMessage,
  };

  return new Response(JSON.stringify(body), {
    status: resolvedStatus,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
