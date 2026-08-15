import { test, expect } from "@playwright/test";

test.describe("sign-in page", () => {
  for (const locale of ["uz", "ru", "en"] as const) {
    test(`renders the Clerk sign-in form in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/sign-in`);
      await expect(
        page.locator("input[type='email'], input[name='identifier'], input[type='text']").first()
      ).toBeVisible({ timeout: 10000 });
    });
  }
});

test.describe("auth gate", () => {
  test("redirects an unauthenticated visitor from /dashboard to /sign-in", async ({ page }) => {
    await page.goto("/uz/dashboard");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects an unauthenticated visitor from /settings/accounts to /sign-in", async ({ page }) => {
    await page.goto("/uz/settings/accounts");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });
});
