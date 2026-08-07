import { test, expect } from "@playwright/test";

test.describe("assistants (unauthenticated)", () => {
  test("redirects to sign-in from /assistants", async ({ page }) => {
    await page.goto("/uz/assistants");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects to sign-in from /approvals", async ({ page }) => {
    await page.goto("/uz/approvals");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });
});
