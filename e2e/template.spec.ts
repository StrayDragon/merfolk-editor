import { expect, test } from '@playwright/test';

test('smoke loads editor UI', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.toolbar-title')).toHaveText('Merfolk Editor');
  await expect(page.locator('textarea[placeholder="Enter Mermaid flowchart code..."]')).toBeVisible();
  await expect(page.locator('.interactive-canvas')).toBeVisible();

  const buttonCount = await page.locator('.toolbar .toolbar-btn').count();
  expect(buttonCount).toBeGreaterThan(3);
});
