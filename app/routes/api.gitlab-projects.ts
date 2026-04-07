import { externalFetch } from '~/lib/api/apiUtils';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';
import type { GitLabProjectInfo } from '~/types/GitLab';

const logger = createScopedLogger('GitLabProjects');

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  description: string;
  web_url: string;
  http_url_to_repo: string;
  star_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
  visibility: string;
}

async function gitlabProjectsLoader({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as { token?: string; gitlabUrl?: string };
    const { token, gitlabUrl = 'https://gitlab.com' } = body;

    if (!token) {
      return errorResponse(new AppError(AppErrorType.VALIDATION, 'GitLab token is required', 400));
    }

    const url = `${gitlabUrl}/api/v4/projects?membership=true&per_page=100&order_by=updated_at&sort=desc`;

    const response = await externalFetch({
      url,
      token,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Invalid GitLab token', 401));
      }

      const errorText = await response.text().catch(() => 'Unknown error');
      throw new AppError(AppErrorType.NETWORK, `GitLab API error: ${response.status} – ${errorText}`, response.status);
    }

    const projects: GitLabProject[] = await response.json();

    const transformedProjects: GitLabProjectInfo[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
      path_with_namespace: project.path_with_namespace,
      description: project.description || '',
      http_url_to_repo: project.http_url_to_repo,
      star_count: project.star_count,
      forks_count: project.forks_count,
      updated_at: project.updated_at,
      default_branch: project.default_branch,
      visibility: project.visibility,
    }));

    return successResponse({
      projects: transformedProjects,
      total: transformedProjects.length,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('GitLab projects fetch failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(gitlabProjectsLoader, { auth: AUTH_PRESETS.authenticated });
