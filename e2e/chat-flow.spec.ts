import { test, expect } from '@playwright/test';

/**
 * Mock the Vercel AI SDK data-stream response for POST /api/chat.
 *
 * Protocol format (v4):
 *   0:"text chunk"\n   — text delta
 *   d:{...}\n           — finish message
 */
function mockChatSSE(page: import('@playwright/test').Page) {
  return page.route('**/api/chat', (route) => {
    const body = [
      '0:"Hello"\n',
      '0:" from"\n',
      '0:" the"\n',
      '0:" mocked"\n',
      '0:" assistant!"\n',
      'd:{"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":5}}\n',
    ].join('');

    return route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
      body,
    });
  });
}

/** Mock the model list so the app doesn't call real provider APIs on load. */
function mockModels(page: import('@playwright/test').Page) {
  return page.route('**/api/models', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        modelList: [
          {
            name: 'test-model',
            label: 'Test Model',
            provider: 'OpenAI',
            maxTokenAllowed: 4096,
          },
        ],
      }),
    });
  });
}

/** Mock provider-scoped model fetch. */
function mockProviderModels(page: import('@playwright/test').Page) {
  return page.route('**/api/models/*', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ modelList: [] }),
    });
  });
}

/** Mock configured providers (prevents real server check). */
function mockConfiguredProviders(page: import('@playwright/test').Page) {
  return page.route('**/api/configured-providers', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

/** Mock env-key check endpoints. */
function mockEnvKeyChecks(page: import('@playwright/test').Page) {
  return Promise.all([
    // Single-provider env key check
    page.route('**/api/check-env-key', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { hasKey: false } }),
      });
    }),
    // Bulk env key check — returns { success, data: Record<provider, status> }
    page.route('**/api/check-env-keys', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            OpenAI: { hasEnvKey: true, hasCookieKey: false },
          },
        }),
      });
    }),
  ]);
}

test.describe('Chat flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockModels(page);
    await mockProviderModels(page);
    await mockConfiguredProviders(page);
    await mockEnvKeyChecks(page);

    // Enable OpenAI provider so the send button is not disabled.
    // The providersStore merges saved localStorage settings on init,
    // so setting `provider_settings` before navigation activates OpenAI.
    await page.addInitScript(() => {
      localStorage.setItem(
        'provider_settings',
        JSON.stringify({ OpenAI: { settings: { enabled: true } } }),
      );
    });
  });

  test('loads app and verifies the chat page renders', async ({ page }) => {
    await page.goto('/');

    // The page title should contain "Devonz"
    await expect(page).toHaveTitle(/Devonz/);

    // The chat input textarea should be visible
    const chatInput = page.getByLabel('Chat message input');
    await expect(chatInput).toBeVisible({ timeout: 15_000 });
  });

  test('sends a message and verifies mocked assistant response appears', async ({ page }) => {
    await mockChatSSE(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    const chatInput = page.getByLabel('Chat message input');
    await expect(chatInput).toBeVisible({ timeout: 15_000 });

    // Type a message character-by-character so React onChange fires reliably
    await chatInput.pressSequentially('What is 2 + 2?', { delay: 30 });

    // Wait for the send button to appear (rendered after input state updates)
    const sendButton = page.getByLabel('Send message');
    await expect(sendButton).toBeVisible({ timeout: 5_000 });
    await sendButton.click();

    // Allow time for the streaming response to process and render.
    // The AI SDK data stream needs time to parse and update React state,
    // and replaceState navigation to /chat/:id needs to settle.
    await page.waitForTimeout(3_000);

    // Verify the mocked assistant response appears on the page
    await expect(page.getByText('Hello from the mocked assistant!')).toBeVisible({ timeout: 15_000 });
  });
});
