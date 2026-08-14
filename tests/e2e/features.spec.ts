import { test, expect } from "@playwright/test";

test.describe("new feature routes auth protection", () => {
  test("redirects unauthenticated visitor from /templates to /sign-in", async ({ page }) => {
    await page.goto("/uz/templates");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects unauthenticated visitor from /message-templates to /sign-in", async ({ page }) => {
    await page.goto("/uz/message-templates");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects unauthenticated visitor from /settings/whitelabel to /sign-in", async ({ page }) => {
    await page.goto("/uz/settings/whitelabel");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });
});
