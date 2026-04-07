import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { resolveToken, externalFetch } from '~/lib/api/apiUtils';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('NetlifyUser');

const NETLIFY_TOKEN_KEYS = ['VITE_NETLIFY_ACCESS_TOKEN'];

async function netlifyUserLoader({ request, context }: LoaderFunctionArgs) {
  const token = resolveToken(request, context, ...NETLIFY_TOKEN_KEYS);

  if (!token) {
    return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Netlify token not found'));
  }

  try {
    const response = await externalFetch({ url: 'https://api.netlify.com/api/v1/user', token });

    if (!response.ok) {
      if (response.status === 401) {
        return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Invalid Netlify token'));
      }

      const errorText = await response.text();
      throw new AppError(AppErrorType.NETWORK, `Netlify API error: ${errorText}`, response.status);
    }

    const userData = (await response.json()) as {
      id: string;
      name: string | null;
      email: string;
      avatar_url: string | null;
      full_name: string | null;
    };

    return successResponse({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      avatar_url: userData.avatar_url,
      full_name: userData.full_name,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Netlify user loader failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const loader = withSecurity(netlifyUserLoader, { auth: AUTH_PRESETS.authenticated });

async function netlifyUserAction({ request, context }: ActionFunctionArgs) {
  const token = resolveToken(request, context, ...NETLIFY_TOKEN_KEYS);

  if (!token) {
    return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Netlify token not found'));
  }

  try {
    const formData = await request.formData();
    const action = formData.get('action');

    if (action === 'get_sites') {
      const response = await externalFetch({ url: 'https://api.netlify.com/api/v1/sites', token });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(AppErrorType.NETWORK, `Netlify API error: ${errorText}`, response.status);
      }

      const sites = (await response.json()) as Array<{
        id: string;
        name: string;
        url: string;
        admin_url: string;
        build_settings: Record<string, unknown>;
        created_at: string;
        updated_at: string;
      }>;

      return successResponse({
        sites: sites.map((site) => ({
          id: site.id,
          name: site.name,
          url: site.url,
          admin_url: site.admin_url,
          build_settings: site.build_settings,
          created_at: site.created_at,
          updated_at: site.updated_at,
        })),
        totalSites: sites.length,
      });
    }

    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid action'));
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Netlify user action failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(netlifyUserAction, { auth: AUTH_PRESETS.authenticated });
