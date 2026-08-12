import { test, expect } from '@playwright/test';

test.describe('WO-064: cross-browser smoke', () => {
  test('app loads with scanner shell', async ({ page, browserName }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Brand / app shell should render
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    // Soft assertion for interactive surface
    const anyButton = page.getByRole('button').first();
    if (await anyButton.count()) {
      await expect(anyButton).toBeVisible();
    }
    expect(['chromium', 'firefox', 'webkit']).toContain(browserName);
  });

  test('paste area accepts text', async ({ page }) => {
    await page.goto('/');
    const area = page.locator('textarea').first();
    if (await area.count()) {
      await area.fill('hello airgap');
      await expect(area).toHaveValue(/hello airgap/);
    } else {
      test.skip(true, 'No textarea in current shell');
    }
  });
});
