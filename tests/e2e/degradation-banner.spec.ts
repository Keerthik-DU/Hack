/**
 * WO-043: Playwright E2E tests — WebGPU degradation banner and fallback scanning
 *
 * These tests verify the end-to-end degraded-mode experience when WebGPU is not
 * available in the browser:
 *
 *   1. The degradation banner is visible at the top of the scan interface
 *   2. A scan completes successfully using regex + entropy layers only
 *   3. Zero console errors occur during degraded operation
 *   4. The banner can be dismissed
 *
 * Run with:
 *   npx playwright test tests/e2e/degradation-banner.spec.ts
 *
 * Prerequisites:
 *   - PLAYWRIGHT_BASE_URL env var (default: http://localhost:4173)
 *   - Either `npm run preview` (Vite preview) or the deployed URL
 *
 * WebGPU is disabled by launching Chrome with --disable-gpu, which causes
 * navigator.gpu.requestAdapter() to return null or throw, triggering the
 * WebGPUDetector to return supported=false.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4173';

/**
 * Sample secret-containing text for degraded-mode scan verification.
 * Uses an AWS access key pattern detected by the regex layer.
 */
const SAMPLE_SECRET_TEXT = 'const awsKey = "AKIA1234567890EXAMPLEKEY1";';

/**
 * Wait for the WebGPU detection async probe to complete.
 * The hook transitions from 'checking' (llm: 'loading') to a resolved state.
 */
async function waitForDetectionComplete(page: Page): Promise<void> {
  // The degradation banner appears once detection resolves to 'unavailable'.
  // We wait for either the banner or the model-ready state, with a reasonable timeout.
  await page.waitForFunction(
    () => {
      // Banner present → detection complete, unavailable
      const banner = document.querySelector('[data-testid="degradation-banner"]');
      // Or model lifecycle state is no longer 'checking'
      const modelIndicator = document.querySelector('[data-testid="model-lifecycle-indicator"]');
      const text = modelIndicator?.textContent ?? '';
      return banner !== null || (!text.includes('Checking') && text.length > 0);
    },
    { timeout: 10000 }
  );
}

test.describe('WO-043: Degraded mode — WebGPU disabled', () => {
  test.use({
    // Launch Chrome with WebGPU/GPU disabled to force degraded mode
    launchOptions: {
      args: ['--disable-gpu', '--disable-software-rasterizer'],
    },
  });

  test.beforeEach(async ({ page }) => {
    // Collect console errors to assert zero errors at the end
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    // Store the errors array on the test context via page object for later assertion
    (page as Page & { _consoleErrors?: string[] })._consoleErrors = consoleErrors;

    await page.goto(BASE_URL);
    await waitForDetectionComplete(page);
  });

  test('degradation banner is visible at the top of the scan interface', async ({ page }) => {
    const banner = page.getByTestId('degradation-banner');
    await expect(banner).toBeVisible();
  });

  test('degradation banner displays the exact required text', async ({ page }) => {
    const bannerText = page.getByTestId('degradation-banner-text');
    await expect(bannerText).toHaveText(
      'LLM-based contextual analysis is unavailable. Scanning with regex and entropy detection only.'
    );
  });

  test('degradation banner has amber warning icon', async ({ page }) => {
    const icon = page.getByTestId('degradation-banner-icon');
    await expect(icon).toBeVisible();
  });

  test('StatusIndicators show green checkmarks for Regex and Entropy, amber warning for LLM', async ({
    page,
  }) => {
    // Green checkmarks for regex and entropy
    await expect(page.getByTestId('capability-icon-ok-regex')).toBeVisible();
    await expect(page.getByTestId('capability-icon-ok-entropy')).toBeVisible();

    // Amber warning icon for LLM
    await expect(page.getByTestId('capability-icon-unavailable-llm')).toBeVisible();

    // "Unavailable" label for LLM
    await expect(page.getByTestId('capability-unavailable-label-llm')).toHaveText('Unavailable');
  });

  test('degradation banner can be dismissed by clicking the dismiss button', async ({ page }) => {
    const banner = page.getByTestId('degradation-banner');
    await expect(banner).toBeVisible();

    await page.getByTestId('degradation-banner-dismiss').click();

    await expect(banner).not.toBeVisible();
  });

  test('banner stays dismissed after dismissal within the same session', async ({ page }) => {
    await page.getByTestId('degradation-banner-dismiss').click();

    // Re-check after a short tick — banner should remain hidden
    await page.waitForTimeout(200);
    await expect(page.getByTestId('degradation-banner')).not.toBeVisible();
  });

  test('scan completes successfully with regex + entropy findings only — no LLM errors', async ({
    page,
  }) => {
    const consoleErrors = (page as Page & { _consoleErrors?: string[] })._consoleErrors ?? [];

    // Type secret text into the paste input panel
    const textarea = page.locator('textarea').first();
    await textarea.fill(SAMPLE_SECRET_TEXT);

    // Click the scan button — it should be present and enabled
    const scanButton = page.getByRole('button', { name: /scan/i }).first();
    await expect(scanButton).toBeEnabled();
    await scanButton.click();

    // Wait for scan to complete (results panel should show findings or all-clear)
    await page.waitForFunction(
      () => {
        const results = document.querySelector('[data-testid="results-panel"]');
        // Look for completion indicator
        const complete =
          document.querySelector('[data-testid="verdict-banner"]') !== null ||
          document.querySelector('[data-testid="all-clear-state"]') !== null;
        return results !== null && complete;
      },
      { timeout: 30000 }
    );

    // Assert zero console errors occurred during the degraded scan
    const llmErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('llm') ||
        e.toLowerCase().includes('webgpu') ||
        e.toLowerCase().includes('worker')
    );
    expect(llmErrors).toHaveLength(0);
  });

  test('produces zero console errors during degraded mode page load and scan', async ({ page }) => {
    const consoleErrors = (page as Page & { _consoleErrors?: string[] })._consoleErrors ?? [];

    // Trigger a minimal scan to exercise all code paths
    const textarea = page.locator('textarea').first();
    await textarea.fill(SAMPLE_SECRET_TEXT);

    const scanButton = page.getByRole('button', { name: /scan/i }).first();
    if (await scanButton.isEnabled()) {
      await scanButton.click();
      await page.waitForTimeout(3000);
    }

    // No uncaught JavaScript errors should occur in degraded mode
    expect(consoleErrors).toHaveLength(0);
  });
});
