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

  test("redirects to sign-in from an assistant's ai tab", async ({ page }) => {
    await page.goto("/uz/assistants/some-agent-id/ai");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects to sign-in from an assistant's calls tab", async ({ page }) => {
    await page.goto("/uz/assistants/some-agent-id/calls");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects to sign-in from /statistics/marketing", async ({ page }) => {
    await page.goto("/uz/statistics/marketing");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });
});
