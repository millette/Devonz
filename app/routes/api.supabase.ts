import { type ActionFunctionArgs } from 'react-router';
import type { SupabaseProject } from '~/types/supabase';
import { externalFetch } from '~/lib/api/apiUtils';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';

const logger = createScopedLogger('Supabase');

const supabaseRequestSchema = z.object({
  token: z.string(),
});

async function supabaseAction({ request }: ActionFunctionArgs) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid JSON in request body', 400));
  }

  const parsed = supabaseRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    logger.warn('Validation failed:', parsed.error.flatten());

    return errorResponse(
      new AppError(AppErrorType.VALIDATION, 'Invalid request body', 400, {
        details: parsed.error.flatten().fieldErrors,
      }),
    );
  }

  const { token } = parsed.data;

  try {
    const projectsResponse = await externalFetch({
      url: 'https://api.supabase.com/v1/projects',
      token,
      headers: { 'Content-Type': 'application/json' },
    });

    if (!projectsResponse.ok) {
      const errorText = await projectsResponse.text();
      throw new AppError(AppErrorType.UNAUTHORIZED, `Failed to fetch projects: ${errorText}`, 401);
    }

    const projects = (await projectsResponse.json()) as SupabaseProject[];

    const uniqueProjectsMap = new Map<string, SupabaseProject>();

    for (const project of projects) {
      if (!uniqueProjectsMap.has(project.id)) {
        uniqueProjectsMap.set(project.id, project);
      }
    }

    const uniqueProjects = Array.from(uniqueProjectsMap.values());

    uniqueProjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return successResponse({
      user: { email: 'Connected', role: 'Admin' },
      stats: {
        projects: uniqueProjects,
        totalProjects: uniqueProjects.length,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Supabase action failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(supabaseAction, { auth: AUTH_PRESETS.authenticated });
