/**
 * WO-049: Playwright E2E tests — HTTP Security Response Headers
 *
 * These tests verify that all five required security headers are present with
 * correct values on responses from the deployed AirGap Scanner application.
 *
 * Tests cover:
 *   1. The root HTML document (/)
 *   2. A JavaScript asset response — confirming headers apply to non-HTML resources
 *
 * Run with:
 *   npx playwright test tests/e2e/security-headers.spec.ts
 *
 * Prerequisites:
 *   - PLAYWRIGHT_BASE_URL env var (default: http://localhost:4173)
 *   - Either `npm run preview` (Vite preview) or the deployed URL
 */
import { test, expect, APIResponse } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const expectedHeaders = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/expected-security-headers.json'), 'utf8')
);

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173';

/**
 * Assert that a response contains all five required security headers
 * with their exact expected values.
 */
function assertSecurityHeaders(response: APIResponse): void {
  for (const [name, expectedValue] of Object.entries(expectedHeaders)) {
    const actual = response.headers()[name.toLowerCase()];
    expect(
      actual,
      `Expected response header "${name}" to be "${expectedValue}" but got "${actual ?? '(missing)'}"`
    ).toBe(expectedValue);
  }
}

test.describe('WO-049: HTTP Security Response Headers — deployed application', () => {
  test('root HTML document includes all five security headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);

    expect(response.status()).toBe(200);
    assertSecurityHeaders(response);
  });

  test('Strict-Transport-Security is present with correct max-age, includeSubDomains, and preload', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/`);
    const hsts = response.headers()['strict-transport-security'];

    expect(hsts).toBe('max-age=31536000; includeSubDomains; preload');
  });

  test('X-Content-Type-Options is nosniff on root document', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('X-Frame-Options is DENY on root document', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    expect(response.headers()['x-frame-options']).toBe('DENY');
  });

  test('Referrer-Policy is no-referrer on root document', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    expect(response.headers()['referrer-policy']).toBe('no-referrer');
  });

  test('Permissions-Policy disables camera, microphone, geolocation, and payment on root document', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/`);
    expect(response.headers()['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=(), payment=()'
    );
  });

  test('security headers are present on JavaScript asset responses (not just HTML)', async ({
    page,
    request,
  }) => {
    // Navigate to the app to discover actual asset URLs
    await page.goto(`${BASE_URL}/`);

    // Collect all JS asset URLs loaded by the page
    const jsUrls: string[] = [];
    page.on('response', (resp) => {
      const url = resp.url();
      const ct = resp.headers()['content-type'] ?? '';
      if (url.startsWith(BASE_URL) && (ct.includes('javascript') || url.endsWith('.js'))) {
        jsUrls.push(url);
      }
    });

    // Reload to capture responses
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify at least one JS asset was found and check its headers
    expect(jsUrls.length).toBeGreaterThan(0);

    for (const jsUrl of jsUrls.slice(0, 3)) {
      const response = await request.get(jsUrl);
      assertSecurityHeaders(response);
    }
  });

  test('security headers match the committed expected-security-headers.json fixture (snapshot)', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/`);

    for (const [name, expectedValue] of Object.entries(expectedHeaders)) {
      expect(response.headers()[name.toLowerCase()]).toBe(expectedValue);
    }
  });
});
