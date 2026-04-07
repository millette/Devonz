import { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { resolveToken, externalFetch } from '~/lib/api/apiUtils';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('VercelUser');

const VERCEL_TOKEN_KEYS = ['VITE_VERCEL_ACCESS_TOKEN'];

async function vercelUserLoader({ request, context }: LoaderFunctionArgs) {
  const token = resolveToken(request, context, ...VERCEL_TOKEN_KEYS);

  if (!token) {
    return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Vercel token not found'));
  }

  try {
    const response = await externalFetch({ url: 'https://api.vercel.com/v2/user', token });

    if (!response.ok) {
      if (response.status === 401) {
        return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Invalid Vercel token'));
      }

      const errorText = await response.text();
      throw new AppError(AppErrorType.NETWORK, `Vercel API error: ${errorText}`, response.status);
    }

    const userData = (await response.json()) as {
      user: {
        id: string;
        name: string | null;
        email: string;
        avatar: string | null;
        username: string;
      };
    };

    return successResponse({
      id: userData.user.id,
      name: userData.user.name,
      email: userData.user.email,
      avatar: userData.user.avatar,
      username: userData.user.username,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Vercel user loader failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const loader = withSecurity(vercelUserLoader, { auth: AUTH_PRESETS.authenticated });

async function vercelUserAction({ request, context }: ActionFunctionArgs) {
  const token = resolveToken(request, context, ...VERCEL_TOKEN_KEYS);

  if (!token) {
    return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Vercel token not found'));
  }

  try {
    const formData = await request.formData();
    const action = formData.get('action');

    if (action === 'get_projects') {
      const response = await externalFetch({ url: 'https://api.vercel.com/v13/projects', token });

      if (!response.ok) {
        const errorText = await response.text();
        throw new AppError(AppErrorType.NETWORK, `Vercel API error: ${errorText}`, response.status);
      }

      const data = (await response.json()) as {
        projects: Array<{
          id: string;
          name: string;
          framework: string | null;
          public: boolean;
          createdAt: string;
          updatedAt: string;
        }>;
      };

      return successResponse({
        projects: data.projects.map((project) => ({
          id: project.id,
          name: project.name,
          framework: project.framework,
          public: project.public,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        })),
        totalProjects: data.projects.length,
      });
    }

    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid action'));
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Vercel user action failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(vercelUserAction, { auth: AUTH_PRESETS.authenticated });
