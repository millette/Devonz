import { externalFetch } from '~/lib/api/apiUtils';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('GitLabBranches');

interface GitLabBranch {
  name: string;
  commit: { id: string; short_id: string };
  protected: boolean;
  default: boolean;
  can_push: boolean;
}

interface BranchInfo {
  name: string;
  sha: string;
  protected: boolean;
  isDefault: boolean;
  canPush: boolean;
}

async function gitlabBranchesHandler({ request }: { request: Request }) {
  try {
    const body = (await request.json()) as { token?: string; gitlabUrl?: string; projectId?: string };
    const { token, gitlabUrl = 'https://gitlab.com', projectId } = body;

    if (!token) {
      return errorResponse(new AppError(AppErrorType.VALIDATION, 'GitLab token is required', 400));
    }

    if (!projectId) {
      return errorResponse(new AppError(AppErrorType.VALIDATION, 'Project ID is required', 400));
    }

    const branchesResponse = await externalFetch({
      url: `${gitlabUrl}/api/v4/projects/${projectId}/repository/branches?per_page=100`,
      token,
      headers: { Accept: 'application/json' },
    });

    if (!branchesResponse.ok) {
      if (branchesResponse.status === 401) {
        return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Invalid GitLab token', 401));
      }

      if (branchesResponse.status === 404) {
        return errorResponse(new AppError(AppErrorType.NOT_FOUND, 'Project not found or no access', 404));
      }

      throw new AppError(AppErrorType.NETWORK, `GitLab API error: ${branchesResponse.status}`, branchesResponse.status);
    }

    const branches: GitLabBranch[] = await branchesResponse.json();

    const projectResponse = await externalFetch({
      url: `${gitlabUrl}/api/v4/projects/${projectId}`,
      token,
      headers: { Accept: 'application/json' },
    });

    let defaultBranchName = 'main';

    if (projectResponse.ok) {
      const projectInfo = (await projectResponse.json()) as { default_branch?: string };
      defaultBranchName = projectInfo.default_branch || 'main';
    }

    const transformedBranches: BranchInfo[] = branches.map((branch) => ({
      name: branch.name,
      sha: branch.commit.id,
      protected: branch.protected,
      isDefault: branch.name === defaultBranchName,
      canPush: branch.can_push,
    }));

    transformedBranches.sort((a, b) => {
      if (a.isDefault) {
        return -1;
      }

      if (b.isDefault) {
        return 1;
      }

      return a.name.localeCompare(b.name);
    });

    return successResponse({
      branches: transformedBranches,
      defaultBranch: defaultBranchName,
      total: transformedBranches.length,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('GitLab branches fetch failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(gitlabBranchesHandler, { auth: AUTH_PRESETS.authenticated });
