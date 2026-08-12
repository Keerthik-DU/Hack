/**
 * WO-050: Automated zero-network-request verification during scan operations.
 *
 * Distinguishes page-load phase (network allowed) from scan-execution phase
 * (exactly zero outbound fetch/XHR/WebSocket/sendBeacon requests).
 *
 * Run:
 *   npm run build && npm run test:e2e:network
 *
 * Forge Shipping integration: forge-pipeline.yml stage `zero-network-e2e`
 * uses step `test:generic` and blocks promotion on failure.
 */

import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NetworkMonitor } from './helpers/network-monitor';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES = path.join(__dirname, 'fixtures');

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

async function waitForAppReady(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByTestId('scanner-page')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('paste-textarea')).toBeVisible();
  await expect(page.getByTestId('scan-button')).toBeVisible();

  await page.waitForFunction(
    () => {
      const banner = document.querySelector('[data-testid="degradation-banner"]');
      const modelIndicator = document.querySelector('[data-testid="model-lifecycle-indicator"]');
      const text = modelIndicator?.textContent ?? '';
      return banner !== null || (!text.toLowerCase().includes('checking') && text.length > 0);
    },
    { timeout: 15_000 }
  );
}

async function pasteInput(page: Page, text: string): Promise<void> {
  const textarea = page.getByTestId('paste-textarea');
  await textarea.fill(text);
}

async function waitForScanComplete(page: Page, timeout = 45_000): Promise<void> {
  await page.waitForFunction(
    () => {
      const phase = document.body.getAttribute('data-scan-phase');
      const completeUi =
        document.querySelector('[data-testid="verdict-banner"]') !== null ||
        document.querySelector('[data-testid="all-clear-state"]') !== null ||
        document.querySelector('[data-testid="scan-error-banner"]') !== null;
      const button = document.querySelector('[data-testid="scan-button"]');
      const label = button?.textContent ?? '';
      return phase === 'idle' && completeUi && !label.includes('Scanning');
    },
    { timeout }
  );
}

async function runScanWithMonitor(
  page: Page,
  fixtureText: string,
  testName: string,
  options?: { expectFindings?: boolean; expectAllClear?: boolean; extendedTimeout?: number }
): Promise<NetworkMonitor> {
  const monitor = new NetworkMonitor(page, testName);
  monitor.attach();

  await waitForAppReady(page);
  await pasteInput(page, fixtureText);

  const scanButton = page.getByTestId('scan-button');
  await expect(scanButton).toBeEnabled();

  await monitor.startScanPhase();
  await scanButton.click();
  await waitForScanComplete(page, options?.extendedTimeout ?? 45_000);
  await monitor.endScanPhase();

  monitor.assertZeroScanRequests();
  monitor.writeSummaryReport();

  if (options?.expectFindings) {
    await expect(page.getByTestId('verdict-banner')).toBeVisible();
    const findings = page.locator('[data-testid="findings-list"], [data-testid="finding-card"]');
    await expect(findings.first()).toBeVisible({ timeout: 10_000 });
  }

  if (options?.expectAllClear) {
    // Both verdict banner and all-clear state render for empty findings — assert all-clear.
    await expect(page.getByTestId('all-clear-state')).toBeVisible();
    await expect(page.getByTestId('verdict-banner')).toBeVisible();
  }

  const summary = monitor.getSummary();
  expect(summary.scanPhaseCount, 'scan-phase request count must be zero').toBe(0);
  expect(summary.loadPhaseCount, 'load-phase should record page assets').toBeGreaterThan(0);

  return monitor;
}

test.describe('WO-050: Zero network requests during scan operations', () => {
  test('clean text scan — zero network during scan phase', async ({ page }, testInfo) => {
    const clean = readFixture('clean-text.txt');
    expect(clean.length).toBeGreaterThanOrEqual(500);

    await runScanWithMonitor(page, clean, `${testInfo.titlePath.join(' > ')}`, {
      expectAllClear: true,
    });
  });

  test('secrets text scan — findings shown, zero network during scan', async ({
    page,
  }, testInfo) => {
    const secrets = readFixture('secrets-text.txt');
    expect(secrets).toContain('AKIAIOSFODNN7EXAMPLE');
    expect(secrets).toContain('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');

    await runScanWithMonitor(page, secrets, `${testInfo.titlePath.join(' > ')}`, {
      expectFindings: true,
    });
  });

  test('large input scan (>10K) — zero network during scan', async ({ page }, testInfo) => {
    const large = readFixture('large-input.txt');
    expect(large.length).toBeGreaterThan(10_000);

    await runScanWithMonitor(page, large, `${testInfo.titlePath.join(' > ')}`, {
      extendedTimeout: 60_000,
      expectAllClear: true,
    });
  });

  test('degraded mode (WebGPU unavailable) — banner visible, zero network', async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'gpu', {
        configurable: true,
        get: () => undefined,
      });
    });

    const monitor = new NetworkMonitor(page, `${testInfo.titlePath.join(' > ')}`);
    monitor.attach();

    await waitForAppReady(page);
    await expect(page.getByTestId('degradation-banner')).toBeVisible({ timeout: 15_000 });

    const clean = readFixture('clean-text.txt');
    await pasteInput(page, clean);

    const scanButton = page.getByTestId('scan-button');
    await expect(scanButton).toBeEnabled();
    await monitor.startScanPhase();
    await scanButton.click();
    await waitForScanComplete(page);
    await monitor.endScanPhase();

    monitor.assertZeroScanRequests();
    monitor.writeSummaryReport();
    expect(monitor.getSummary().scanPhaseCount).toBe(0);
  });

  test('error-path scan (empty / single char) — graceful, zero network', async ({
    page,
  }, testInfo) => {
    const monitor = new NetworkMonitor(page, `${testInfo.titlePath.join(' > ')}`);
    monitor.attach();

    await waitForAppReady(page);

    await pasteInput(page, '');
    const scanButton = page.getByTestId('scan-button');
    await expect(scanButton).toBeDisabled();

    await monitor.startScanPhase();
    await scanButton.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(250);
    await monitor.endScanPhase();
    monitor.assertZeroScanRequests();

    await pasteInput(page, 'x');
    await expect(scanButton).toBeEnabled();
    await monitor.startScanPhase();
    await scanButton.click();
    await waitForScanComplete(page);
    await monitor.endScanPhase();

    monitor.assertZeroScanRequests();
    monitor.writeSummaryReport();
    expect(monitor.getSummary().scanPhaseCount).toBe(0);
  });
});
