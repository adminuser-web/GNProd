import { test, expect } from '@playwright/test';

/**
 * Auth guards: protected pages must redirect unauthenticated users to /login.
 * (RLS is the real boundary — proven in tests/rls — this checks the UI guard.)
 */
test.describe('Auth route guards', () => {
  for (const path of ['/admin/dashboard', '/admin/orders', '/my-orders']) {
    test(`unauthenticated visit to ${path} redirects to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('textbox', { name: /email/i }).first()).toBeVisible();
  });
});
