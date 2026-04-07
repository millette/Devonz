import type { ActionFunctionArgs } from 'react-router';
import { z } from 'zod';
import { encrypt } from '~/lib/.server/encryption';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.encrypt');

const encryptRequestSchema = z.object({
  value: z.string().min(1, 'Value is required'),
});

async function encryptAction({ request }: ActionFunctionArgs) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid JSON in request body'), 400);
  }

  const parsed = encryptRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    logger.warn('Encrypt request validation failed:', parsed.error.issues);

    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Validation failed'), 400);
  }

  try {
    const encrypted = `enc:${encrypt(parsed.data.value)}`;
    return successResponse({ encrypted });
  } catch (error) {
    logger.error('Encryption failed:', error);
    return errorResponse(new AppError(AppErrorType.INTERNAL, 'Encryption failed'), 500);
  }
}

export const action = withSecurity(encryptAction, {
  auth: AUTH_PRESETS.authenticated,
  allowedMethods: ['POST'],
});
