import { test, expect } from "@playwright/test";

test.describe("sign-in page", () => {
  for (const locale of ["uz", "ru", "en"] as const) {
    test(`renders provider buttons in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/sign-in`);
      await expect(page.getByRole("link", { name: /google|Google/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /github|GitHub/i })).toBeVisible();
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
