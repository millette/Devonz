import { type LoaderFunctionArgs } from 'react-router';
import { externalFetch, resolveToken } from '~/lib/api/apiUtils';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('GitHubBranches');

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

interface BranchInfo {
  name: string;
  sha: string;
  protected: boolean;
  isDefault: boolean;
}

const GH_HEADERS = { Accept: 'application/vnd.github.v3+json' };

async function githubBranchesLoader({ request, context }: LoaderFunctionArgs) {
  try {
    let owner: string;
    let repo: string;
    let githubToken: string;

    if (request.method === 'POST') {
      const body = (await request.json()) as { owner: string; repo: string; token: string };
      owner = body.owner;
      repo = body.repo;
      githubToken = body.token;

      if (!owner || !repo) {
        return errorResponse(new AppError(AppErrorType.VALIDATION, 'Owner and repo parameters are required', 400));
      }

      if (!githubToken) {
        return errorResponse(new AppError(AppErrorType.VALIDATION, 'GitHub token is required', 400));
      }
    } else {
      const url = new URL(request.url);
      owner = url.searchParams.get('owner') || '';
      repo = url.searchParams.get('repo') || '';

      if (!owner || !repo) {
        return errorResponse(new AppError(AppErrorType.VALIDATION, 'Owner and repo parameters are required', 400));
      }

      const token = resolveToken(request, context, 'GITHUB_API_KEY', 'VITE_GITHUB_ACCESS_TOKEN', 'GITHUB_TOKEN');
      githubToken = token || '';
    }

    if (!githubToken) {
      return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'GitHub token not found', 401));
    }

    const repoResponse = await externalFetch({
      url: `https://api.github.com/repos/${owner}/${repo}`,
      token: githubToken,
      headers: GH_HEADERS,
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return errorResponse(new AppError(AppErrorType.NOT_FOUND, 'Repository not found', 404));
      }

      if (repoResponse.status === 401) {
        return errorResponse(new AppError(AppErrorType.UNAUTHORIZED, 'Invalid GitHub token', 401));
      }

      throw new AppError(AppErrorType.NETWORK, `GitHub API error: ${repoResponse.status}`, repoResponse.status);
    }

    const repoInfo = (await repoResponse.json()) as { default_branch: string };
    const defaultBranch = repoInfo.default_branch;

    const branchesResponse = await externalFetch({
      url: `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
      token: githubToken,
      headers: GH_HEADERS,
    });

    if (!branchesResponse.ok) {
      throw new AppError(
        AppErrorType.NETWORK,
        `Failed to fetch branches: ${branchesResponse.status}`,
        branchesResponse.status,
      );
    }

    const branches: GitHubBranch[] = await branchesResponse.json();

    const transformedBranches: BranchInfo[] = branches.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
      isDefault: branch.name === defaultBranch,
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
      defaultBranch,
      total: transformedBranches.length,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('GitHub branches fetch failed', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const loader = withSecurity(githubBranchesLoader, { auth: AUTH_PRESETS.authenticated });
export const action = withSecurity(githubBranchesLoader, { auth: AUTH_PRESETS.authenticated });
