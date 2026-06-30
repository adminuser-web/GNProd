import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility scan (axe-core) on key public pages. Fails on serious/critical
 * WCAG violations. Run in CI after the E2E job.
 */
const PAGES = ['/', '/collection', '/collection/debutant', '/collection/debutant/debutant-standard', '/contact'];

for (const path of PAGES) {
  test(`a11y: ${path} has no serious/critical violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    // Attach details for the report when it fails.
    if (serious.length) {
      console.log(JSON.stringify(serious.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2));
    }
    expect(serious, `serious/critical a11y violations on ${path}`).toEqual([]);
  });
}
