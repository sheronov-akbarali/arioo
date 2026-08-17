import { test, expect } from "@playwright/test";

const LOCALES = ["uz", "ru", "en"] as const;
const PAGES = ["", "/pricing", "/partners", "/legal/offer"];

// The real, translated hero headline per locale. Asserting on these (rather
// than only on the HTTP status) catches a page that renders but shows raw
// message keys like "hero.title" because the i18n wiring broke.
const HERO_TITLE: Record<(typeof LOCALES)[number], string> = {
  uz: "Biznesingiz uchun AI xodimni ishga oling",
  ru: "Наймите AI-сотрудника для своего бизнеса",
  en: "Hire an AI employee for your business",
};

for (const locale of LOCALES) {
  for (const page of PAGES) {
    test(`${locale}${page || "/"} renders without error`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(`/${locale}${page}`);
      expect(response?.status()).toBeLessThan(400);

      if (page === "") {
        const heading = browserPage.getByRole("heading", { level: 1 });
        await expect(heading).toBeVisible();
        await expect(heading).toHaveText(HERO_TITLE[locale]);
        await expect(heading).not.toContainText("hero.title");
      }
    });
  }
}

test("unknown legal document returns a localized 404 page", async ({ page }) => {
  const response = await page.goto("/uz/legal/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sahifa topilmadi");
  // The "back home" CTA is an <a> wrapped in Base UI's Button, which sets
  // role="button" — a known site-wide pattern, so query it by that role.
  await expect(page.getByRole("button", { name: "Bosh sahifaga qaytish" })).toBeVisible();
});

test("home page CTA scrolls to the lead form and it is fillable", async ({ page }) => {
  await page.goto("/uz");
  await page.getByRole("button", { name: "Konsultatsiya olish" }).first().click();
  await expect(page.locator("#lead-form")).toBeInViewport();
  await page.getByLabel("Ism").fill("Test Foydalanuvchi");
  await page.getByLabel("Telefon raqami").fill("+998901234567");
});

test("mobile menu exposes the pricing and partners links", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto("/uz");
  await page.getByRole("button", { name: "Menyu" }).click();
  await expect(page.getByRole("link", { name: "Hamkorlik dasturi" })).toBeVisible();
  await page.getByRole("link", { name: "Narxlash" }).click();
  await expect(page).toHaveURL(/\/uz\/pricing/);
});

test("language switcher changes the URL prefix", async ({ page }) => {
  await page.goto("/uz/pricing");
  await page.getByRole("button", { name: "RU" }).click();
  await expect(page).toHaveURL(/\/ru\/pricing/);
});

test("hero agent-flow diagram switches departments and expands node panels", async ({ page }) => {
  await page.goto("/uz");

  // Switching to the HR tab swaps the description text shown above the diagram.
  await page.getByRole("tab", { name: "HR" }).click();
  await expect(page.getByText("Arizalarni qayta ishlaydi, nomzodlarga javob beradi va suhbat rejalashtiradi.")).toBeVisible();

  // Clicking a source node opens its sample-data flyout.
  await page.getByRole("button", { name: "Veb-sayt Yangi lidlar" }).click();
  await expect(page.getByText("Aziz")).toBeVisible();

  // Clicking a system node opens its connection panel with the demo URL.
  await page.getByRole("button", { name: "CRM Bitimlar" }).click();
  await expect(page.getByText("crm.demo.arioo.uz")).toBeVisible();

  // Closing the panel via its × button hides the demo URL again.
  await page.getByRole("button", { name: "Yopish" }).click();
  await expect(page.getByText("crm.demo.arioo.uz")).not.toBeVisible();
});
