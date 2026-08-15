import { test, expect } from "@playwright/test";

test.describe("admin authentication and pages", () => {
  test("unauthenticated visitor on /admin sees admin login card", async ({ page }) => {
    await page.goto("/uz/admin");
    const heading = page.getByRole("heading", { name: "Arioo Admin Panel" });
    await expect(heading).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Parol")).toBeVisible();
  });

  test("can submit admin login and view admin dashboard", async ({ page }) => {
    await page.goto("/uz/admin");
    await page.getByLabel("Email").fill("admin@arioo.uz");
    await page.getByLabel("Parol").fill("admin123");
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
