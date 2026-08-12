import { test, expect } from '@playwright/test';

test.describe('WO-070: production smoke', () => {
  test('privacy badge / shell visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    const badge = page.getByText(/local only/i);
    if (await badge.count()) {
      await expect(badge.first()).toBeVisible();
    }
  });
});
