import { expect, type Page, test } from "@playwright/test";

const routes = [
  { path: "/", slug: "dashboard", heading: "Good morning, Miguel!" },
  { path: "/checker", slug: "checker", heading: "Purchase Checker" },
  { path: "/checker/result", slug: "checker-result", heading: "Purchase Checker" },
  { path: "/voice", slug: "voice", heading: "Voice Purchase Checker" },
  { path: "/goals", slug: "goals", heading: "Savings goals" },
  { path: "/cooldown", slug: "cooldown", heading: "Cooldown / Wishlist" },
  { path: "/reports", slug: "reports", heading: "Weekly Advisor Report" },
  { path: "/onboarding", slug: "onboarding", heading: "Let’s set up SpendGuard for you" },
] as const;

const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }));

  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.bodyClientWidth);
  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.documentClientWidth);
}

for (const route of routes) {
  for (const viewport of viewports) {
    test(`${route.slug} has no horizontal overflow at ${viewport.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route.path);

      await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.screenshot({
        fullPage: true,
        path: testInfo.outputPath(`${route.slug}-${viewport.name}.png`),
      });
    });
  }
}
