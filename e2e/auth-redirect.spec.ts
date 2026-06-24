import { expect, test } from "@playwright/test";

// Intentionally NO login: a fresh, unauthenticated context must be bounced off
// protected routes by the middleware (`src/proxy.ts`) + the `(app)` layout guard.
// Each Playwright test gets a clean context (no stored auth), so this is genuinely
// unauthenticated without any sign-out step.

const protectedRoutes = ["/", "/settings", "/cooldown"] as const;

for (const route of protectedRoutes) {
  test(`unauthenticated visit to ${route} is redirected to /login`, async ({ page }) => {
    await page.goto(route);

    await page.waitForURL(/\/login(\?|$)/);
    await expect(page).toHaveURL(/\/login/);
    // The login screen — not the protected page — is what renders.
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
}
