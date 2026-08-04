import { test, expect } from "@playwright/test";

const LOCALES = ["uz", "ru", "en"] as const;
const PAGES = ["", "/pricing", "/partners", "/legal/offer"];

for (const locale of LOCALES) {
  for (const page of PAGES) {
    test(`${locale}${page || "/"} renders without error`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(`/${locale}${page}`);
      expect(response?.status()).toBeLessThan(400);
    });
  }
}

test("home page CTA scrolls to the lead form and it is fillable", async ({ page }) => {
  await page.goto("/uz");
  await page.getByRole("button", { name: "Konsultatsiya olish" }).first().click();
  await expect(page.locator("#lead-form")).toBeInViewport();
  await page.getByLabel("Ism").fill("Test Foydalanuvchi");
  await page.getByLabel("Telefon raqami").fill("+998901234567");
});

test("language switcher changes the URL prefix", async ({ page }) => {
  // waitUntil: "networkidle" lets the client finish hydrating before we
  // interact. Without it, the pricing page's client hydration briefly
  // discards and rebuilds the DOM subtree (see known hydration-mismatch
  // issue in src/lib/pricing-data.ts formatUZS), which can swallow a click
  // that lands mid-rebuild and made this test flaky.
  await page.goto("/uz/pricing", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "RU" }).click();
  await expect(page).toHaveURL(/\/ru\/pricing/);
});
