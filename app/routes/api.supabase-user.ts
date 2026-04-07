import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { resolveToken, externalFetch } from '~/lib/api/apiUtils';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('SupabaseUser');

const SUPABASE_TOKEN_KEYS = ['VITE_SUPABASE_ACCESS_TOKEN'];

interface SupabaseProject {
  id: string;
  name: string;
  region: string;
  status: string;
  organization_id: string;
  created_at: string;
}

async function supabaseUserLoader({ request, context }: LoaderFunctionArgs) {
  const token = resolveToken(request, context, ...SUPABASE_TOKEN_KEYS);

  if (!token) {
    return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Supabase token not found'));
  }

  try {
    const response = await externalFetch({ url: 'https://api.supabase.com/v1/projects', token });

    if (!response.ok) {
      if (response.status === 401) {
        return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Invalid Supabase token'));
      }

      const errorText = await response.text();
      throw new AppError(AppErrorType.NETWORK, `Supabase API error: ${errorText}`, response.status);
    }

    const projects = (await response.json()) as SupabaseProject[];

    const user =
      projects.length > 0
        ? {
            id: projects[0].organization_id,
            name: 'Supabase User',
            email: 'user@supabase.co',
          }
        : null;

    return successResponse({
      user,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        region: p.region,
        status: p.status,
        organization_id: p.organization_id,
        created_at: p.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Supabase user loader failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const loader = withSecurity(supabaseUserLoader, { auth: AUTH_PRESETS.authenticated });

async function supabaseUserAction({ request, context }: ActionFunctionArgs) {
  const token = resolveToken(request, context, ...SUPABASE_TOKEN_KEYS);

  if (!token) {
    return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Supabase token not found'));
  }

  try {
    const formData = await request.formData();
    const action = formData.get('action');

    if (action === 'get_projects') {
      const response = await externalFetch({ url: 'https://api.supabase.com/v1/projects', token });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(AppErrorType.NETWORK, `Supabase API error: ${errorText}`, response.status);
      }

      const projects = (await response.json()) as SupabaseProject[];

      const user =
        projects.length > 0
          ? {
              id: projects[0].organization_id,
              name: 'Supabase User',
              email: 'user@supabase.co',
            }
          : null;

      return successResponse({
        user,
        stats: {
          projects: projects.map((p) => ({
            id: p.id,
            name: p.name,
            region: p.region,
            status: p.status,
            organization_id: p.organization_id,
            created_at: p.created_at,
          })),
          totalProjects: projects.length,
        },
      });
    }

    if (action === 'get_api_keys') {
      const projectId = formData.get('projectId');

      if (!projectId) {
        return errorResponse(new AppError(AppErrorType.VALIDATION, 'Project ID is required'));
      }

      const response = await externalFetch({
        url: `https://api.supabase.com/v1/projects/${projectId}/api-keys`,
        token,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(AppErrorType.NETWORK, `Supabase API error: ${errorText}`, response.status);
      }

      const apiKeys = (await response.json()) as Array<{ name: string; api_key: string }>;

      return successResponse({
        apiKeys: apiKeys.map((key) => ({ name: key.name, api_key: key.api_key })),
      });
    }

    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid action'));
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Supabase user action failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(supabaseUserAction, { auth: AUTH_PRESETS.authenticated });
