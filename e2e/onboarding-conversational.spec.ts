import { expect, test, type Page } from "@playwright/test";

// Use reduced motion so the GuardianHeroPlayer animation is skipped and the
// verdict reveal animates instantly (no Remotion player in CI).
test.use({ contextOptions: { reducedMotion: "reduce" } });

// Serial: tests build on each other (happy path completes onboarding; gate
// test asserts the redirect that only exists after completion).
test.describe.configure({ mode: "serial" });

const e2eEmail = process.env.E2E_SUPABASE_EMAIL;
const e2ePassword = process.env.E2E_SUPABASE_PASSWORD;

// ---- helpers ----------------------------------------------------------------

/** One of the four verdict words the engine can emit. */
const VERDICT_PATTERN =
  /Safe to buy\.|Buy with caution\.|Waiting is the safer move\.|Not recommended right now\./;

/**
 * Log in via /login and wait until the browser has left the login page.
 * Skips the test (with a clear message) if credentials are absent.
 */
async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
}

// ---------------------------------------------------------------------------
// Scenario 1: Happy path
// welcome -> Set up my guardrail -> (intent skipped) -> (pain-points skipped)
// -> setup-intro -> income -> savings -> variable-spend (skip) -> buffer preset
// -> commitments (add one) -> debts (skip) -> goals (skip) -> cooldown (pick)
// -> Continue (saves) -> first-check -> verdict -> summary -> Enter SpendGuard
// ---------------------------------------------------------------------------
test("happy path: full conversational onboarding completes and reaches the app", async ({
  page,
}) => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Set E2E_SUPABASE_EMAIL and E2E_SUPABASE_PASSWORD to a confirmed Supabase test account.",
  );

  test.setTimeout(90_000);

  await loginAs(page, e2eEmail!, e2ePassword!);

  // After login, an un-onboarded account lands on /onboarding.
  await page.waitForURL(/\/onboarding/, { timeout: 20_000 });

  // -- Welcome screen --
  await expect(page.getByText("Before you buy, ask SpendGuard.")).toBeVisible();
  await page.getByRole("button", { name: /set up my guardrail/i }).click();

  // -- Intent (optional) - skip --
  await page.getByRole("button", { name: /skip for now/i }).click();

  // -- Pain-points (optional) - skip --
  await page.getByRole("button", { name: /skip for now/i }).click();

  // -- Setup-intro (interstitial) --
  await expect(page.getByText("Let's build your spending guardrail.")).toBeVisible();
  await page.getByRole("button", { name: /got it, let's go/i }).click();

  // -- Income (required) --
  await expect(page.getByText("What comes in each month?")).toBeVisible();
  await page.getByLabel("Monthly income").fill("50000");
  await page.getByRole("button", { name: /continue/i }).click();

  // -- Savings (required) --
  await expect(page.getByText("How much do you have saved right now?")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("Current savings").fill("20000");
  await page.getByRole("button", { name: /continue/i }).click();

  // -- Variable spend (optional) - skip --
  await page.getByRole("button", { name: /skip for now/i }).click();

  // -- Buffer preset - pick "5,000" --
  await expect(page.getByText("How much should stay protected, no matter what?")).toBeVisible();
  await page.getByRole("button", { name: "5,000", exact: true }).click();
  await page.getByRole("button", { name: /continue/i }).click();

  // -- Commitments - add one entry then continue --
  await expect(page.getByText("What money is already spoken for?")).toBeVisible();
  // The empty-state "Add your first expense" action or the "+ Add another expense" button
  // both append a row. The empty state renders an actionLabel button first.
  const addFirstBtn = page.getByRole("button", { name: /add your first expense/i });
  const addAnotherBtn = page.getByRole("button", { name: /\+ add another expense/i });
  if (await addFirstBtn.isVisible()) {
    await addFirstBtn.click();
  } else {
    await addAnotherBtn.click();
  }
  // Fill the first (and only) row that appeared
  await page.getByLabel("Expense label").first().fill("Rent");
  await page.getByLabel("Expense amount").first().fill("15000");
  await page.getByRole("button", { name: /continue/i }).click();

  // -- Debts (optional) - skip --
  await page.getByRole("button", { name: /skip for now/i }).click();

  // -- Goals (optional) - skip --
  await page.getByRole("button", { name: /skip for now/i }).click();

  // -- Cooldown - pick "Balanced pause" --
  await expect(page.getByText("How firm do you want your pause to be?")).toBeVisible();
  await page.getByRole("radio", { name: /balanced pause/i }).click();
  // Continue saves the profile (may take a moment on cold server)
  await page.getByRole("button", { name: /continue/i }).click();

  // -- First-check - run a sample check --
  await expect(page.getByText("What are you thinking of buying?")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel(/what is it\?/i).fill("Wireless headphones");
  await page.getByLabel(/price/i).fill("3000");
  await page.getByRole("button", { name: /check if i can buy this/i }).click();

  // The verdict reveal (role="status") shows one of the four verdict strings.
  await expect(page.getByRole("status")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(VERDICT_PATTERN)).toBeVisible();

  // Advance to summary
  await page.getByRole("button", { name: /see your guardrail/i }).click();

  // -- Summary --
  await expect(page.getByText("Enter SpendGuard")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /enter spendguard/i }).click();

  // Should land on the app home
  await page.waitForURL((url) => !url.pathname.startsWith("/onboarding"), {
    timeout: 20_000,
  });
  await expect(page).toHaveURL("/");
});

// ---------------------------------------------------------------------------
// Scenario 2: Skip path
// Only income + savings (the two required fields) are filled; every optional
// step is skipped.  Onboarding should still complete and reach the summary.
// ---------------------------------------------------------------------------
test("skip path: income + savings only is enough to reach the summary", async ({ page }) => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Set E2E_SUPABASE_EMAIL and E2E_SUPABASE_PASSWORD to a confirmed Supabase test account.",
  );

  test.setTimeout(90_000);

  await loginAs(page, e2eEmail!, e2ePassword!);
  await page.waitForURL(/\/onboarding/, { timeout: 20_000 });

  // Welcome -> set up
  await page.getByRole("button", { name: /set up my guardrail/i }).click();

  // Skip intent + pain-points
  await page.getByRole("button", { name: /skip for now/i }).click();
  await page.getByRole("button", { name: /skip for now/i }).click();

  // Setup-intro
  await page.getByRole("button", { name: /got it, let's go/i }).click();

  // Income (required)
  await page.getByLabel("Monthly income").fill("30000");
  await page.getByRole("button", { name: /continue/i }).click();

  // Savings (required)
  await page.getByLabel("Current savings").fill("5000");
  await page.getByRole("button", { name: /continue/i }).click();

  // Skip all optional steps until we hit first-check or summary
  // variable-spend, buffer, commitments, debts, goals, cooldown - all skippable
  for (let i = 0; i < 6; i++) {
    const skipBtn = page.getByRole("button", { name: /skip for now/i });
    const continueBtn = page.getByRole("button", { name: /continue/i });
    const gotItBtn = page.getByRole("button", { name: /got it, let's go/i });
    const seeGuardrailBtn = page.getByRole("button", { name: /see your guardrail/i });
    const enterBtn = page.getByRole("button", { name: /enter spendguard/i });

    // Stop if we already reached summary
    if (await enterBtn.isVisible({ timeout: 2_000 }).catch(() => false)) break;
    // Stop if verdict is showing (first-check done)
    if (await seeGuardrailBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await seeGuardrailBtn.click();
      break;
    }
    // Interstitials use "Got it, let's go"
    if (await gotItBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await gotItBtn.click();
      continue;
    }
    // Prefer Skip on optional steps
    if (await skipBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await skipBtn.click();
      continue;
    }
    // Required steps - should not happen in this loop but continue as fallback
    if (await continueBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await continueBtn.click();
    }
  }

  // Summary or first-check-done -> summary
  const seeGuardrailFinal = page.getByRole("button", { name: /see your guardrail/i });
  if (await seeGuardrailFinal.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await seeGuardrailFinal.click();
  }

  // The first-check can also be skipped entirely
  const skipFirstCheck = page.getByRole("button", { name: /skip for now/i });
  if (await skipFirstCheck.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await skipFirstCheck.click();
  }

  // Summary is reached
  await expect(page.getByRole("button", { name: /enter spendguard/i })).toBeVisible({
    timeout: 15_000,
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Explore path
// welcome -> "I just want to explore" -> /explore sandbox -> run a check ->
// see a verdict -> "Set up my real guardrail" -> back to /onboarding
// ---------------------------------------------------------------------------
test("explore: sandbox check shows a verdict and real-guardrail CTA returns to /onboarding", async ({
  page,
}) => {
  // The explore sandbox is unauthenticated - no Supabase creds required.
  // We navigate directly to /onboarding to reach the welcome screen.
  // An unauthenticated visit to /onboarding is publicly accessible (onboarding
  // does not require auth in the middleware).
  await page.goto("/onboarding");

  // If we get redirected to /login (authenticated-only guard), skip gracefully.
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    test.skip(true, "Onboarding requires auth in this environment - cannot test explore without credentials.");
  }

  // Welcome screen
  await expect(page.getByText("Before you buy, ask SpendGuard.")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /i just want to explore/i }).click();

  // Should land on /explore
  await page.waitForURL(/\/explore/, { timeout: 15_000 });

  // Sandbox form
  await page.getByLabel(/what is it\?/i).fill("Sneakers");
  await page.getByLabel(/price/i).fill("5000");
  await page.getByRole("button", { name: /check if i can buy this/i }).click();

  // Verdict
  await expect(page.getByRole("status")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(VERDICT_PATTERN)).toBeVisible();

  // CTA to real setup
  await page.getByRole("button", { name: /set up my real guardrail/i }).click();
  await page.waitForURL(/\/onboarding/, { timeout: 15_000 });
  await expect(page).toHaveURL(/\/onboarding/);
});

// ---------------------------------------------------------------------------
// Scenario 4: Gate
// After finishing onboarding (scenario 1 ran first, setting onboarding_completed
// on the test account), visiting /onboarding must redirect to /.
// ---------------------------------------------------------------------------
test("gate: onboarded user visiting /onboarding is redirected to /", async ({ page }) => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Set E2E_SUPABASE_EMAIL and E2E_SUPABASE_PASSWORD to a confirmed Supabase test account.",
  );

  test.setTimeout(30_000);

  await loginAs(page, e2eEmail!, e2ePassword!);

  // Onboarded users land directly on / after login.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });

  // Force-navigate to /onboarding - the layout guard should redirect.
  await page.goto("/onboarding");
  await page.waitForURL(/^http:\/\/127\.0\.0\.1:3100\/$/, { timeout: 20_000 });
  await expect(page).toHaveURL("/");
});
