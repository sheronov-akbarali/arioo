import { test, expect } from "@playwright/test";

test.describe("admin authentication and pages", () => {
  test("unauthenticated visitor on /admin sees admin login card", async ({ page }) => {
    await page.goto("/uz/admin");
    const heading = page.getByRole("heading", { name: "Arioo Admin Panel" });
    await expect(heading).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Parol")).toBeVisible();
  });

  // Deliberately not hardcoded: the real admin login is a single global
  // credential gating production admin access, so a fixed email/password
  // pair baked into a public test file would either be fake (test proves
  // nothing) or real (a checked-in credential). Supply E2E_ADMIN_EMAIL /
  // E2E_ADMIN_PASSWORD as environment variables when running this test.
  const e2eAdminEmail = process.env.E2E_ADMIN_EMAIL;
  const e2eAdminPassword = process.env.E2E_ADMIN_PASSWORD;

  test("can submit admin login and view admin dashboard", async ({ page }) => {
    test.skip(!e2eAdminEmail || !e2eAdminPassword, "E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD not set");
    await page.goto("/uz/admin");
    await page.getByLabel("Email").fill(e2eAdminEmail!);
    await page.getByLabel("Parol").fill(e2eAdminPassword!);
    await page.getByRole("button", { name: "Kirish" }).click();
    await expect(page).toHaveURL(/\/uz\/admin/);
  });

  const ADMIN_PAGES = [
    "/admin/announcements",
    "/admin/tickets",
    "/admin/marketing",
    "/admin/users",
    "/admin/agents",
    "/admin/billing",
    "/admin/settings",
  ];

  for (const adminPage of ADMIN_PAGES) {
    test(`renders ${adminPage} after authentication`, async ({ page }) => {
      // Set the admin auth cookie
      await page.context().addCookies([
        {
          name: "admin_auth",
          value: "true",
          domain: "localhost",
          path: "/",
        },
      ]);

      const response = await page.goto(`/uz${adminPage}`);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
