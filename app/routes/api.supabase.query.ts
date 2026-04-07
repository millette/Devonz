import { type ActionFunctionArgs } from 'react-router';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';

const logger = createScopedLogger('SupabaseQuery');

const supabaseQueryRequestSchema = z.object({
  projectId: z.string(),
  query: z.string(),
});

async function supabaseQueryAction({ request }: ActionFunctionArgs) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'No authorization token provided'));
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid JSON in request body', 400));
  }

  const parsed = supabaseQueryRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    logger.warn('Validation failed:', parsed.error.flatten());

    return errorResponse(
      new AppError(AppErrorType.VALIDATION, 'Invalid request body', 400, {
        details: parsed.error.flatten().fieldErrors,
      }),
    );
  }

  const { projectId, query } = parsed.data;

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }

      const message = errorData.message || errorData.error || errorText;

      return errorResponse(new AppError(AppErrorType.NETWORK, message, response.status), response.status);
    }

    const result = await response.json();

    return successResponse(result);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Query execution failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(supabaseQueryAction, { auth: AUTH_PRESETS.authenticated });
