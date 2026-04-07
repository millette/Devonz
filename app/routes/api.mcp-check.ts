import { MCPService } from '~/lib/services/mcpService';
import { withSecurity } from '~/lib/security';
import { successResponse, errorResponse } from '~/lib/api/responses';
import { AppError } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.mcp-check');

async function mcpCheckLoader() {
  try {
    const mcpService = MCPService.getInstance();
    const serverTools = await mcpService.checkServersAvailabilities();

    return successResponse(serverTools);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error);
    }

    logger.error('Failed to check MCP servers', error);

    return errorResponse(error instanceof Error ? error : String(error));
  }
}

export const loader = withSecurity(mcpCheckLoader, {
  auth: AUTH_PRESETS.authenticated,
  allowedMethods: ['GET'],
  rateLimit: false,
});
