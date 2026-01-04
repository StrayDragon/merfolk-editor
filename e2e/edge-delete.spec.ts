import { expect, test } from '@playwright/test';

test('delete edge removes it from code and canvas', async ({ page }) => {
  await page.goto('/');

  const code = `flowchart TB
  A["A"]
  B["B"]`;

  const textarea = page.locator('textarea');
  await textarea.fill(code);

  await page.waitForSelector('svg');
  await page.waitForFunction(() => document.querySelectorAll('svg g.node').length === 2);

  await page.evaluate(() => {
    const node = Array.from(document.querySelectorAll('svg g.node')).find((el) =>
      el.textContent?.includes('A')
    );
    node?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await page.waitForSelector('svg g.node-overlay-group g[data-node-id]');

  await page.evaluate(() => {
    const port = document.querySelector('svg g.node-overlay-group g[data-node-id]');
    port?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await page.waitForSelector('select#target-node option[value="B"]', { state: 'attached' });
  await page.locator('#target-node').selectOption('B');
  await page.locator('.dialog-footer .btn-primary').click();

  await expect(textarea).toHaveValue(/@-->/);

  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        'svg path[data-edge="true"], svg path.flowchart-link, svg g.edgePaths path, svg .edgePath path'
      ).length > 0
  );

  await page.evaluate(() => {
    const path = document.querySelector(
      'svg path[data-edge="true"], svg path.flowchart-link, svg g.edgePaths path, svg .edgePath path'
    );
    path?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await page.waitForSelector('.edge-toolbar button.danger');

  await page.evaluate(() => {
    const button = document.querySelector('.edge-toolbar button.danger');
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  await expect(textarea).not.toHaveValue(/-->/);

  await expect(
    page.locator(
      'svg path[data-edge="true"], svg path.flowchart-link, svg g.edgePaths path, svg .edgePath path'
    )
  ).toHaveCount(0);
});
