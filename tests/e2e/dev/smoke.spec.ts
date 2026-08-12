import { test, expect } from '@playwright/test';

test.describe('WO-070: dev post-deploy smoke', () => {
  test('app shell loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
  });
});
