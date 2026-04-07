/**
 * Centralized error module — typed error hierarchy for the application.
 *
 * AppError is the base class for all application errors, scoped by AppErrorType.
 * SecurityError extends AppError for auth/CSRF/rate-limit specific errors.
 * ApiError is a backward-compatible alias preserved for existing route handlers.
 */

/**
 * AppError
 */

export enum AppErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL = 'INTERNAL',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
}

const APP_ERROR_STATUS_DEFAULTS: Record<AppErrorType, number> = {
  [AppErrorType.VALIDATION]: 400,
  [AppErrorType.NOT_FOUND]: 404,
  [AppErrorType.UNAUTHORIZED]: 401,
  [AppErrorType.FORBIDDEN]: 403,
  [AppErrorType.RATE_LIMITED]: 429,
  [AppErrorType.INTERNAL]: 500,
  [AppErrorType.NETWORK]: 503,
  [AppErrorType.TIMEOUT]: 504,
};

export class AppError extends Error {
  readonly type: AppErrorType;
  readonly statusCode: number;
  readonly context?: Record<string, unknown>;

  constructor(type: AppErrorType, message: string, statusCode?: number, context?: Record<string, unknown>) {
    super(message);
    this.type = type;
    this.statusCode = statusCode ?? APP_ERROR_STATUS_DEFAULTS[type];
    this.context = context;
    this.name = 'AppError';

    // Ensure proper prototype chain for instanceof checks after transpilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * SecurityError
 */

export enum SecurityErrorType {
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  RATE_LIMITED = 'RATE_LIMITED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
}

const SECURITY_ERROR_STATUS_DEFAULTS: Record<SecurityErrorType, number> = {
  [SecurityErrorType.INVALID_TOKEN]: 401,
  [SecurityErrorType.TOKEN_EXPIRED]: 401,
  [SecurityErrorType.CSRF_VIOLATION]: 403,
  [SecurityErrorType.RATE_LIMITED]: 429,
  [SecurityErrorType.UNAUTHORIZED]: 401,
  [SecurityErrorType.FORBIDDEN]: 403,
};

/** Map SecurityErrorType → the most appropriate AppErrorType */
const SECURITY_TO_APP_TYPE: Record<SecurityErrorType, AppErrorType> = {
  [SecurityErrorType.INVALID_TOKEN]: AppErrorType.UNAUTHORIZED,
  [SecurityErrorType.TOKEN_EXPIRED]: AppErrorType.UNAUTHORIZED,
  [SecurityErrorType.CSRF_VIOLATION]: AppErrorType.FORBIDDEN,
  [SecurityErrorType.RATE_LIMITED]: AppErrorType.RATE_LIMITED,
  [SecurityErrorType.UNAUTHORIZED]: AppErrorType.UNAUTHORIZED,
  [SecurityErrorType.FORBIDDEN]: AppErrorType.FORBIDDEN,
};

export class SecurityError extends AppError {
  readonly securityType: SecurityErrorType;

  constructor(
    securityType: SecurityErrorType,
    message: string,
    statusCode?: number,
    context?: Record<string, unknown>,
  ) {
    super(
      SECURITY_TO_APP_TYPE[securityType],
      message,
      statusCode ?? SECURITY_ERROR_STATUS_DEFAULTS[securityType],
      context,
    );
    this.securityType = securityType;
    this.name = 'SecurityError';

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * ApiError — backward-compatible shim
 */

/**
 * Backward-compatible error class preserved for existing route handlers.
 * New code should prefer `AppError` or `SecurityError`.
 */
export class ApiError extends AppError {
  /** Alias so existing code that reads `.status` keeps working. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(AppErrorType.INTERNAL, message, status);
    this.status = status;
    this.name = 'ApiError';

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
