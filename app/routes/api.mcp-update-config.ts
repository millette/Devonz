import { type ActionFunctionArgs } from 'react-router';
import { MCPService, type MCPConfig } from '~/lib/services/mcpService';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.mcp-update-config');

async function mcpUpdateConfigAction({ request }: ActionFunctionArgs) {
  try {
    const mcpConfig = (await request.json()) as MCPConfig;

    if (!mcpConfig || typeof mcpConfig !== 'object') {
      return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid MCP servers configuration'), 400);
    }

    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.updateConfig(mcpConfig);

    return successResponse(serverTools);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Failed to update MCP config', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const action = withSecurity(mcpUpdateConfigAction, {
  auth: AUTH_PRESETS.authenticated,
  allowedMethods: ['POST'],
  rateLimit: false,
});
