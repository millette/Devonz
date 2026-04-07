/**
 * @route /api/runtime/exec
 * Server-side API route for command execution and runtime lifecycle.
 *
 * POST operations:
 *   - boot: Initialize a runtime for a project
 *   - exec: Execute a command and return its result
 *   - teardown: Tear down a project's runtime
 *
 * GET operations:
 *   - portEvents: SSE stream of port open/close events
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { RuntimeManager } from '~/lib/runtime/local-runtime';
import { isValidProjectId, isSafePath } from '~/lib/runtime/runtime-provider';
import { validateCommand, auditCommand, DEFAULT_EXEC_TIMEOUT_MS } from '~/lib/runtime/command-safety';
import { withSecurity } from '~/lib/security';
import { execRequestSchema, validateInput } from '~/lib/api/schemas';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('RuntimeExec');

/*
 * ---------------------------------------------------------------------------
 * GET — SSE streams
 * ---------------------------------------------------------------------------
 */

async function execLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const op = url.searchParams.get('op');
  const projectId = url.searchParams.get('projectId');

  if (!projectId || !isValidProjectId(projectId)) {
    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid or missing projectId'));
  }

  switch (op) {
    case 'portEvents': {
      const manager = RuntimeManager.getInstance();
      const runtime = await manager.getRuntime(projectId);

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();

          // Send heartbeat so client knows connection is alive
          controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'));

          const dispose = runtime.onPortEvent((event) => {
            try {
              const data = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(data));
            } catch {
              // Stream may have been closed
            }
          });

          // Heartbeat every 30 seconds to keep connection alive
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'));
            } catch {
              clearInterval(heartbeat);
            }
          }, 30_000);

          // Clean up when client disconnects
          request.signal.addEventListener('abort', () => {
            dispose();
            clearInterval(heartbeat);

            try {
              controller.close();
            } catch {
              // Controller may already be closed
            }
          });
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    default: {
      return errorResponse(new AppError(AppErrorType.VALIDATION, `Unknown GET operation: ${op}`));
    }
  }
}

/*
 * ---------------------------------------------------------------------------
 * POST — Command execution & lifecycle
 * ---------------------------------------------------------------------------
 */

async function execAction({ request }: ActionFunctionArgs) {
  const validation = await validateInput(request, execRequestSchema);

  if (!validation.success) {
    return errorResponse(validation.error);
  }

  const body = validation.data;
  const { op, projectId } = body;

  const manager = RuntimeManager.getInstance();

  switch (op) {
    case 'boot': {
      try {
        const runtime = await manager.getRuntime(projectId);

        /*
         * Kill orphaned sessions from previous page loads / client reconnects.
         * This prevents dev-server processes from stacking up on different ports.
         */
        await runtime.cleanSessions();

        return successResponse({
          workdir: runtime.workdir,
          projectId: runtime.projectId,
        });
      } catch (error) {
        logger.error(`Boot failed for "${projectId}":`, error);

        return errorResponse(error instanceof Error ? error : 'Boot failed');
      }
    }

    case 'exec': {
      const { command, cwd, env } = body;

      if (cwd && !isSafePath(cwd)) {
        return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid cwd: traversal detected'));
      }

      const validation = validateCommand(command);

      if (!validation.allowed) {
        logger.warn(`Blocked command for project "${projectId}": ${command}`);

        return errorResponse(new AppError(AppErrorType.FORBIDDEN, `Command blocked: ${validation.reason}`));
      }

      auditCommand(projectId, command, 'exec');

      try {
        const runtime = await manager.getRuntime(projectId);
        const timeoutMs = body.timeout ?? DEFAULT_EXEC_TIMEOUT_MS;

        const result = await runtime.exec(command, { cwd, env, timeout: timeoutMs });

        return successResponse(result);
      } catch (error) {
        logger.error(`Exec failed: ${command}`, error);

        return errorResponse(error instanceof Error ? error : 'Exec failed');
      }
    }

    case 'teardown': {
      try {
        await manager.removeRuntime(projectId);
        return successResponse(null);
      } catch (error) {
        logger.error(`Teardown failed for "${projectId}":`, error);

        return errorResponse(error instanceof Error ? error : 'Teardown failed');
      }
    }

    case 'allocatePort': {
      try {
        const runtime = await manager.getRuntime(projectId);
        const port = await runtime.allocatePort();

        return successResponse({ port });
      } catch (error) {
        logger.error(`Port allocation failed for "${projectId}":`, error);

        return errorResponse(error instanceof Error ? error : 'Port allocation failed');
      }
    }

    default: {
      return errorResponse(new AppError(AppErrorType.VALIDATION, `Unknown operation: ${op}`));
    }
  }
}

/*
 * ---------------------------------------------------------------------------
 * Exports
 * ---------------------------------------------------------------------------
 */

export const loader = withSecurity(execLoader, { auth: AUTH_PRESETS.authenticated, rateLimit: false });
export const action = withSecurity(execAction, { auth: AUTH_PRESETS.authenticated, rateLimit: false });
