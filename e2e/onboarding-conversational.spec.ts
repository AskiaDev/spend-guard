import { expect, test, type Page } from "@playwright/test";

// Use reduced motion so the GuardianHeroPlayer animation is skipped and the
// verdict reveal animates instantly (no Remotion player in CI).
test.use({ contextOptions: { reducedMotion: "reduce" } });

// Serial: these journeys share ONE Supabase account and depend on order, so
// they must NOT run in parallel.
test.describe.configure({ mode: "serial" });

// EXTERNAL PRE-CONDITION (matches e2e/spendguard.spec.ts):
// This suite expects a DISPOSABLE, confirmed Supabase test account that has been
// reset to UN-ONBOARDED (onboarding_completed = false, profile/rows cleared)
// BEFORE the run. There is no programmatic reset endpoint in this codebase, so
// the reset is an external step (harness/CI seed).
//
// Two scenarios here each COMPLETE onboarding. With a single pre-run reset (the
// project convention - see spendguard.spec.ts), only the FIRST onboarding-
// completing scenario meets a fresh account; the second then finds the account
// already onboarded. The helper below detects that (login lands on "/" instead
// of "/onboarding") and SKIPS rather than timing out, so the file never
// self-collides. Reset the account again between the two to run both fully.

const e2eEmail = process.env.E2E_SUPABASE_EMAIL;
const e2ePassword = process.env.E2E_SUPABASE_PASSWORD;

// Upper bound on the optional-step walk in the skip path. The conversational
// wizard has 14 steps; a generous ceiling means adding a step later cannot
// silently truncate the walk (the loop breaks early on its own anyway).
const MAX_STEP_WALK = 20;

// ---- helpers ----------------------------------------------------------------

/** One of the four verdict words the engine can emit. */
const VERDICT_PATTERN =
  /Safe to buy\.|Buy with caution\.|Waiting is the safer move\.|Not recommended right now\./;

/** Log in via /login and wait until the browser has left the login page. */
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Onboarded users land on "/", un-onboarded users on "/onboarding" - accept
  // either, just not the login page.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
}

/**
 * Log in, then guarantee we are sitting on the onboarding flow. If the shared
 * account is ALREADY onboarded (no reset happened before this test), the app
 * redirects to "/", so we skip this onboarding-completing scenario with a clear
 * message instead of timing out waiting for /onboarding that will never appear.
 */
async function loginAndReachOnboarding(page: Page, email: string, password: string) {
  await login(page, email, password);
  if (!page.url().includes("/onboarding")) {
    test.skip(
      true,
      "Account is already onboarded (no reset before this test). Reset onboarding_completed=false to run this onboarding-completing scenario.",
    );
  }
  // Confirm the welcome screen actually rendered before interacting.
  await expect(page.getByText("Before you buy, ask SpendGuard.")).toBeVisible({
    timeout: 15_000,
  });
}

// ---------------------------------------------------------------------------
// Scenario 1: Skip path (runs FIRST - the canonical minimal completion)
// Only income + savings (the two required fields) are filled; every optional
// step is skipped.  Onboarding should still complete and reach the summary.
// This runs first so it gets the freshly-reset account.
// ---------------------------------------------------------------------------
test("skip path: income + savings only is enough to reach the summary", async ({ page }) => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Set E2E_SUPABASE_EMAIL and E2E_SUPABASE_PASSWORD to a confirmed Supabase test account.",
  );

  test.setTimeout(90_000);

  await loginAndReachOnboarding(page, e2eEmail!, e2ePassword!);

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

  // Skip every remaining optional step (variable-spend, buffer, commitments,
  // debts, goals, cooldown) until we reach the first-check or summary.
  for (let i = 0; i < MAX_STEP_WALK; i++) {
    const enterBtn = page.getByRole("button", { name: /enter spendguard/i });
    const seeGuardrailBtn = page.getByRole("button", { name: /see your guardrail/i });
    const gotItBtn = page.getByRole("button", { name: /got it, let's go/i });
    const skipBtn = page.getByRole("button", { name: /skip for now/i });
    const continueBtn = page.getByRole("button", { name: /continue/i });

    // Reached the summary - done walking.
    if (await enterBtn.isVisible({ timeout: 2_000 }).catch(() => false)) break;
    // First-check verdict is showing - advance to summary.
    if (await seeGuardrailBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await seeGuardrailBtn.click();
      break;
    }
    // Interstitials use "Got it, let's go".
    if (await gotItBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await gotItBtn.click();
      continue;
    }
    // Prefer Skip on optional steps (this includes skipping the first-check).
    if (await skipBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await skipBtn.click();
      continue;
    }
    // Fallback for any required step (should not occur after savings).
    if (await continueBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await continueBtn.click();
    }
  }

  // The summary is reached.
  await expect(page.getByRole("button", { name: /enter spendguard/i })).toBeVisible({
    timeout: 15_000,
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Happy path
// welcome -> Set up my guardrail -> (intent skipped) -> (pain-points skipped)
// -> setup-intro -> income -> savings -> variable-spend (skip) -> buffer preset
// -> commitments (add one) -> debts (skip) -> goals (skip) -> cooldown (pick)
// -> Continue (saves) -> first-check -> verdict -> summary -> Enter SpendGuard
//
// Runs second; on a single shared account (one pre-run reset) the skip path
// already completed onboarding, so loginAndReachOnboarding SKIPS this cleanly.
// Reset the account before this test to run it fully (it exercises every input
// kind: money fields, a preset, the commitment builder, and a radio group).
// ---------------------------------------------------------------------------
test("happy path: full conversational onboarding completes and reaches the app", async ({
  page,
}) => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Set E2E_SUPABASE_EMAIL and E2E_SUPABASE_PASSWORD to a confirmed Supabase test account.",
  );

  test.setTimeout(90_000);

  await loginAndReachOnboarding(page, e2eEmail!, e2ePassword!);

  // -- Welcome screen --
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
  await expect(page.getByText("How much do you have saved right now?")).toBeVisible({
    timeout: 10_000,
  });
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
  // The empty state renders an "Add your first expense" action; later rows use
  // "+ Add another expense". Click whichever is present to append a row.
  const addFirstBtn = page.getByRole("button", { name: /add your first expense/i });
  const addAnotherBtn = page.getByRole("button", { name: /\+ add another expense/i });
  if (await addFirstBtn.isVisible().catch(() => false)) {
    await addFirstBtn.click();
  } else {
    await addAnotherBtn.click();
  }
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
  // Continue saves the profile (may take a moment on a cold server).
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

  // Advance to summary.
  await page.getByRole("button", { name: /see your guardrail/i }).click();

  // -- Summary --
  await expect(page.getByText("Enter SpendGuard")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /enter spendguard/i }).click();

  // Should land on the app home.
  await page.waitForURL((url) => !url.pathname.startsWith("/onboarding"), {
    timeout: 20_000,
  });
  await expect(page).toHaveURL("/");
});

// ---------------------------------------------------------------------------
// Scenario 3: Explore path
// welcome -> "I just want to explore" -> /explore sandbox -> run a check ->
// see a verdict -> "Set up my real guardrail" -> back to /onboarding
// ---------------------------------------------------------------------------
test("explore: sandbox check shows a verdict and real-guardrail CTA returns to /onboarding", async ({
  page,
}) => {
  // The explore sandbox is unauthenticated - no Supabase creds required. We
  // navigate to /onboarding to reach the welcome screen.
  await page.goto("/onboarding");

  // If onboarding is auth-gated in this environment, the app redirects to
  // /login - skip gracefully rather than asserting against the wrong page.
  // waitForURL surfaces a racy redirect deterministically.
  await page
    .waitForURL((url) => url.pathname.includes("/onboarding") || url.pathname.includes("/login"), {
      timeout: 15_000,
    })
    .catch(() => {
      /* fall through to the URL check below */
    });
  if (page.url().includes("/login")) {
    test.skip(
      true,
      "Onboarding is auth-gated in this environment - cannot reach the welcome screen without credentials.",
    );
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
// After an onboarding-completing scenario ran first on this account, visiting
// /onboarding must redirect to /. (The skip path runs first and completes
// onboarding, so the account is onboarded by the time this runs.)
// ---------------------------------------------------------------------------
test("gate: onboarded user visiting /onboarding is redirected to /", async ({ page }) => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Set E2E_SUPABASE_EMAIL and E2E_SUPABASE_PASSWORD to a confirmed Supabase test account.",
  );

  test.setTimeout(30_000);

  await login(page, e2eEmail!, e2ePassword!);

  // Force-navigate to /onboarding - the layout guard should redirect an
  // onboarded account to /.
  await page.goto("/onboarding");
  await page.waitForURL(/^http:\/\/127\.0\.0\.1:3100\/$/, { timeout: 20_000 });
  await expect(page).toHaveURL("/");
});
