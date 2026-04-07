import { type ActionFunctionArgs } from 'react-router';
import { externalFetch } from '~/lib/api/apiUtils';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';

const logger = createScopedLogger('SupabaseVars');

const supabaseVariablesRequestSchema = z.object({
  projectId: z.string(),
  token: z.string(),
});

async function supabaseVariablesAction({ request }: ActionFunctionArgs) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid JSON in request body', 400));
  }

  const parsed = supabaseVariablesRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    logger.warn('Validation failed:', parsed.error.flatten());

    return errorResponse(
      new AppError(AppErrorType.VALIDATION, 'Invalid request body', 400, {
        details: parsed.error.flatten().fieldErrors,
      }),
    );
  }

  const { projectId, token } = parsed.data;

  try {
    const response = await externalFetch({
      url: `https://api.supabase.com/v1/projects/${projectId}/api-keys`,
      token,
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(AppErrorType.NETWORK, `Failed to fetch API keys: ${errorText}`, response.status);
    }

    const apiKeys = await response.json();

    return successResponse({ apiKeys });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Supabase variables fetch failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(supabaseVariablesAction, { auth: AUTH_PRESETS.authenticated });
