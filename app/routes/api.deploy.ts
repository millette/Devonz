import type { ActionFunctionArgs } from 'react-router';
import { z } from 'zod';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';
import { DeploymentService } from '~/lib/services/deployment-service';
import type { DeployStatusEvent } from '~/types/streaming-events';

const logger = createScopedLogger('ApiDeploy');

const deployRequestSchema = z.object({
  provider: z.enum(['vercel']),
  projectName: z.string().min(1).max(100),
  files: z.record(z.string(), z.string()),
  token: z.string().min(1),
  teamId: z.string().optional(),
});

async function deployAction({ request }: ActionFunctionArgs) {
  try {
    const rawBody: unknown = await request.json();

    const parsed = deployRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      logger.warn('Validation failed:', parsed.error.flatten());

      return errorResponse(
        new AppError(AppErrorType.VALIDATION, 'Invalid request', 400, { details: parsed.error.flatten().fieldErrors }),
      );
    }

    const { provider, projectName, files, token, teamId } = parsed.data;

    if (provider !== 'vercel') {
      return errorResponse(new AppError(AppErrorType.VALIDATION, `Unsupported provider: ${provider}`, 400));
    }

    logger.info(`Deploy request: provider=${provider}, project=${projectName}, files=${Object.keys(files).length}`);

    const service = new DeploymentService(token, teamId);

    const events: DeployStatusEvent[] = [];

    const onStatus = (event: DeployStatusEvent) => {
      events.push(event);
      logger.info(`Deploy status: ${event.state}`, event.url ?? '');
    };

    const controller = new AbortController();

    // Abort if the client disconnects
    request.signal.addEventListener('abort', () => {
      controller.abort();
    });

    const result = await service.deployToVercel(files, projectName, onStatus, controller.signal);

    return successResponse({
      url: result.url,
      deploymentId: result.deploymentId,
      events,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    const message = error instanceof Error ? error.message : 'Deployment failed';
    logger.error('Deployment failed:', message);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(deployAction, {
  allowedMethods: ['POST'],
  auth: AUTH_PRESETS.authenticated,
});
