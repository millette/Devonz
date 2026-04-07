import type { ActionFunctionArgs } from 'react-router';
import { streamText, type Messages } from '~/lib/.server/llm/stream-text';
import { withSecurity } from '~/lib/security';
import { requireApiAuth } from '~/lib/.server/api/auth';
import { v1ChatRequestSchema, formatSSE } from '~/lib/.server/api/types';
import { errorResponse } from '~/lib/api/responses';
import { AppError, AppErrorType } from '~/lib/api/errors';
import { AUTH_PRESETS } from '~/lib/security-config';
import { createScopedLogger } from '~/utils/logger';
import { DEFAULT_PROVIDER } from '~/utils/constants';

const logger = createScopedLogger('api.v1.chat');

async function v1ChatAction({ context, request }: ActionFunctionArgs): Promise<Response> {
  // Parse and validate request body
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid JSON in request body'));
  }

  const parsed = v1ChatRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    logger.warn('v1/chat validation failed:', parsed.error.issues);

    return errorResponse(new AppError(AppErrorType.VALIDATION, 'Invalid request'));
  }

  const { model, prompt, context: userContext } = parsed.data;

  // Build messages array — system context (if provided) + user prompt
  const messages: Messages = [];

  if (userContext) {
    messages.push({
      id: 'ctx-1',
      role: 'system',
      content: userContext,
    });
  }

  messages.push({
    id: 'msg-1',
    role: 'user',
    content: `[Model: ${model}]\n\n[Provider: ${DEFAULT_PROVIDER.name}]\n\n${prompt}`,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const result = await streamText({
          messages,
          env: context.cloudflare?.env as Record<string, string> | undefined,
          options: { toolChoice: 'none' },
          chatMode: 'discuss',
        });

        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            controller.enqueue(encoder.encode(formatSSE(JSON.stringify({ type: 'text', content: part.textDelta }))));
          } else if (part.type === 'error') {
            logger.error('Stream error:', part.error);
            controller.enqueue(
              encoder.encode(formatSSE(JSON.stringify({ type: 'error', message: 'Stream error' }), 'error')),
            );
            break;
          }
        }

        // Send done event
        controller.enqueue(encoder.encode(formatSSE(JSON.stringify({ type: 'done' }), 'done')));
        controller.close();
      } catch (err) {
        logger.error('v1/chat stream failed:', err);
        controller.enqueue(
          encoder.encode(formatSSE(JSON.stringify({ type: 'error', message: 'Internal server error' }), 'error')),
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export const action = withSecurity(requireApiAuth(v1ChatAction), {
  auth: AUTH_PRESETS.public,
  csrfExempt: true,
  allowedMethods: ['POST'],
  rateLimit: false, // rate limiting is handled by requireApiAuth (separate API pool)
});
