/**
 * Vercel Domains API
 *
 * Handles domain management for Vercel projects:
 * - List project domains
 * - Add custom subdomain
 * - Remove domain
 */

import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { externalFetch, resolveToken } from '~/lib/api/apiUtils';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('VercelDomains');

const VERCEL_API_BASE = 'https://api.vercel.com';

interface DomainRequest {
  /** Project ID */
  projectId: string;

  /** Action to perform */
  action: 'list' | 'add' | 'remove';

  /** Domain name (for add/remove) */
  domain?: string;
}

/**
 * Handle GET requests - list domains for a project
 */
async function vercelDomainsLoader({ request, context }: LoaderFunctionArgs) {
  const vercelToken = resolveToken(request, context, 'VITE_VERCEL_ACCESS_TOKEN');

  if (!vercelToken) {
    return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Vercel token not found'));
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Project ID is required'));
  }

  try {
    const response = await externalFetch({
      url: `${VERCEL_API_BASE}/v9/projects/${projectId}/domains`,
      token: vercelToken,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new AppError(AppErrorType.NETWORK, `Failed to fetch domains: ${response.status}`, response.status, {
        details: errorData,
      });
    }

    const data = await response.json();

    return successResponse(data);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Vercel domains loader failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

/**
 * Handle POST requests - add or remove domains
 */
async function vercelDomainsAction({ request, context }: ActionFunctionArgs) {
  const vercelToken = resolveToken(request, context, 'VITE_VERCEL_ACCESS_TOKEN');

  if (!vercelToken) {
    return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Vercel token not found'));
  }

  try {
    const body: DomainRequest = await request.json();
    const { projectId, action, domain } = body;

    if (!projectId) {
      return errorResponse(new AppError(AppErrorType.VALIDATION, 'Project ID is required'));
    }

    if (action === 'add') {
      if (!domain) {
        return errorResponse(new AppError(AppErrorType.VALIDATION, 'Domain name is required for add action'));
      }

      const response = await externalFetch({
        url: `${VERCEL_API_BASE}/v9/projects/${projectId}/domains`,
        token: vercelToken,
        method: 'POST',
        body: { name: domain },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          return errorResponse(new AppError(AppErrorType.VALIDATION, 'Domain already exists', 409, { details: data }));
        }

        if (response.status === 400) {
          const errorMessage =
            data?.error?.message || data?.message || 'Invalid domain name or domain already registered on another team';

          return errorResponse(new AppError(AppErrorType.VALIDATION, errorMessage, 400, { details: data }));
        }

        throw new AppError(AppErrorType.NETWORK, `Failed to add domain: ${response.status}`, response.status, {
          details: data,
        });
      }

      return successResponse({ domain: data });
    }

    if (action === 'remove') {
      if (!domain) {
        return errorResponse(new AppError(AppErrorType.VALIDATION, 'Domain name is required for remove action'));
      }

      const response = await externalFetch({
        url: `${VERCEL_API_BASE}/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}`,
        token: vercelToken,
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new AppError(AppErrorType.NETWORK, `Failed to remove domain: ${response.status}`, response.status, {
          details: data,
        });
      }

      return successResponse({ removed: domain });
    }

    if (action === 'list') {
      const response = await externalFetch({
        url: `${VERCEL_API_BASE}/v9/projects/${projectId}/domains`,
        token: vercelToken,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new AppError(AppErrorType.NETWORK, `Failed to fetch domains: ${response.status}`, response.status, {
          details: errorData,
        });
      }

      const data = await response.json();

      return successResponse(data);
    }

    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid action. Use: list, add, or remove'));
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Vercel domains action failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const loader = withSecurity(vercelDomainsLoader, { auth: AUTH_PRESETS.authenticated });

export const action = withSecurity(vercelDomainsAction, { auth: AUTH_PRESETS.authenticated });
