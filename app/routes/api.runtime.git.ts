/**
 * @route /api/runtime/git
 * Server-side API route for git operations on project directories.
 *
 * POST operations:
 *   - commit: Stage all changes and create a commit
 *   - log: Get commit history
 *   - checkout: Checkout a specific commit
 *   - checkout-main: Return to main branch
 *   - diff: Get diff stat for a commit
 *   - commit-files: Get files changed in a commit
 */

import type { ActionFunctionArgs } from 'react-router';
import { RuntimeManager } from '~/lib/runtime/local-runtime';
import {
  autoCommit,
  getGitLog,
  getDiff,
  checkoutCommit,
  checkoutMain,
  getCommitFiles,
  getCommitFilesWithStatus,
  getFileDiff,
  getCommitDiff,
  archiveCommit,
  archiveChangedFiles,
} from '~/lib/runtime/git-manager';
import { withSecurity } from '~/lib/security';
import { gitRequestSchema, validateInput } from '~/lib/api/schemas';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';

async function gitAction({ request }: ActionFunctionArgs) {
  const validation = await validateInput(request, gitRequestSchema);

  if (!validation.success) {
    return errorResponse(validation.error);
  }

  const body = validation.data;
  const { op, projectId } = body;

  const manager = RuntimeManager.getInstance();

  let runtime;

  try {
    runtime = await manager.getRuntime(projectId);
  } catch {
    return errorResponse(new AppError(AppErrorType.NOT_FOUND, 'Runtime not found for project'));
  }

  const workdir = runtime.workdir;

  switch (op) {
    case 'commit': {
      const { message } = body;
      const sha = autoCommit(workdir, message);

      return successResponse({ sha, committed: !!sha });
    }

    case 'log': {
      const maxCount = body.maxCount ?? 50;
      const commits = getGitLog(workdir, maxCount);

      return successResponse({ commits });
    }

    case 'checkout': {
      const { sha } = body;
      const success = checkoutCommit(workdir, sha);

      return successResponse({ success });
    }

    case 'checkout-main': {
      const success = checkoutMain(workdir);
      return successResponse({ success });
    }

    case 'diff': {
      const { sha } = body;
      const diff = getDiff(workdir, sha);

      return successResponse({ diff });
    }

    case 'commit-files': {
      const { sha } = body;
      const files = getCommitFiles(workdir, sha);

      return successResponse({ files });
    }

    case 'commit-files-status': {
      const { sha } = body;
      const files = getCommitFilesWithStatus(workdir, sha);

      return successResponse({ files });
    }

    case 'file-diff': {
      const { sha, file } = body;
      const diff = getFileDiff(workdir, sha, file);

      return successResponse({ diff });
    }

    case 'commit-diff': {
      const { sha } = body;
      const diff = getCommitDiff(workdir, sha);

      return successResponse({ diff });
    }

    case 'archive': {
      const { sha, type: archiveType } = body;

      try {
        const zipBuffer = archiveType === 'changed' ? archiveChangedFiles(workdir, sha) : archiveCommit(workdir, sha);

        return new Response(new Uint8Array(zipBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="project-${sha.substring(0, 7)}.zip"`,
            'Content-Length': String(zipBuffer.length),
          },
        });
      } catch (error) {
        return errorResponse(error instanceof Error ? error : 'Archive failed');
      }
    }

    default: {
      return errorResponse(new AppError(AppErrorType.VALIDATION, `Unknown git operation: ${op}`));
    }
  }
}

export const action = withSecurity(gitAction, { auth: AUTH_PRESETS.authenticated, rateLimit: false });
