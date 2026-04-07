import { createScopedLogger } from '~/utils/logger';
import { csrfFetch } from '~/lib/api/csrf-client';

const logger = createScopedLogger('EncryptValue');

const ENC_PREFIX = 'enc:';

/**
 * Encrypt a value via the server-side /api/encrypt endpoint.
 *
 * On failure (network error, server unavailable, encryption not configured),
 * returns the original plaintext value for graceful degradation — the cookie
 * will be stored unencrypted and the server will still read it correctly.
 */
export async function encryptApiKeyValue(value: string): Promise<string> {
  if (!value.trim()) {
    return value;
  }

  try {
    const response = await csrfFetch('/api/encrypt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      logger.warn(`Encryption endpoint returned ${response.status}, storing plaintext`);
      return value;
    }

    const envelope = (await response.json()) as { data?: { encrypted?: string } };
    const data = envelope.data || {};

    if (data.encrypted && data.encrypted.startsWith(ENC_PREFIX)) {
      return data.encrypted;
    }

    logger.warn('Unexpected response from /api/encrypt, storing plaintext');

    return value;
  } catch (error) {
    logger.warn('Failed to encrypt API key value, storing plaintext:', error);
    return value;
  }
}

/**
 * Check whether a cookie value is encrypted (uses the "enc:" prefix).
 */
export function isEncryptedValue(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}
