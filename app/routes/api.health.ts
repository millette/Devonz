import { type LoaderFunctionArgs } from 'react-router';
import { withSecurity } from '~/lib/security';
import { successResponse } from '~/lib/api/responses';
import { AUTH_PRESETS } from '~/lib/security-config';

async function healthLoader({ request: _request }: LoaderFunctionArgs) {
  return successResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

export const loader = withSecurity(healthLoader, {
  auth: AUTH_PRESETS.public,
  rateLimit: false,
});
