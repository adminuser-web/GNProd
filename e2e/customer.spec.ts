import { test, expect } from '@playwright/test';

/**
 * Customer critical journey: browse → series → product → add to cart → checkout.
 * Uses resilient text/role selectors so it survives styling changes.
 */
test.describe('Customer purchase journey', () => {
  test('home → collection renders the five series', async ({ page }) => {
    await page.goto('/');
    await page.goto('/collection');
    await expect(page.getByRole('heading', { name: /the collection/i })).toBeVisible();
    for (const s of ['DEBUTANT', 'MILLENNIUM', 'LEGEND', 'ETERNAL', 'IMMORTAL']) {
      await expect(page.getByText(s, { exact: false }).first()).toBeVisible();
    }
  });

  test('open a product and add it to the cart', async ({ page }) => {
    await page.goto('/collection/debutant/debutant-standard');
    const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    // Cart drawer / count should reflect the addition.
    await expect(page.getByText(/your order|your build/i).first()).toBeVisible();
  });

  test('checkout shows the guest form + How it works (no login wall)', async ({ page }) => {
    await page.goto('/collection/debutant/debutant-standard');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.goto('/order');
    // The pay-later explainer and a usable Place Order CTA should be present.
    await expect(page.getByText(/how buying works/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /place order/i })).toBeVisible();
  });
});
