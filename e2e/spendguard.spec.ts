import { expect, type Page, test } from "@playwright/test";

const e2eEmail = process.env.E2E_SUPABASE_EMAIL;
const e2ePassword = process.env.E2E_SUPABASE_PASSWORD;

// These journeys share one Supabase account and depend on order (onboarding must run and
// complete before the checks that need an onboarded account), so they must NOT run in parallel.
test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Set E2E_SUPABASE_EMAIL and E2E_SUPABASE_PASSWORD for a disposable confirmed Supabase test account."
  );

  await page.goto("/login");
  await page.getByLabel("Email").fill(e2eEmail!);
  await page.getByLabel("Password").fill(e2ePassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Onboarded users land on "/", un-onboarded users are routed to "/onboarding" — accept either,
  // just not the login page.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
});

async function expectNoHydrationSkeleton(page: Page) {
  await expect(page.getByRole("status", { name: "Loading local financial workspace..." })).toBeHidden();
}

async function completePurchaseWizard(page: Page, itemName = "iPhone Pro Max 1TB") {
  await page.getByLabel("Product name").fill(itemName);
  await page.getByLabel("Price").fill("170000");
  await page.getByLabel("Category").selectOption("phone");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Motivation" })).toBeVisible();
  await page.getByLabel("Reason for purchase").fill("Work camera and family photos");
  await page.getByLabel("Urgency").selectOption("can_wait");
  await page.getByLabel("Best alternative").fill("Keep current phone for six more months");
  // The Motivation step has two required radio groups — answer both, or Continue stays blocked.
  await page.getByRole("radio", { name: /no, it does not work/i }).check();
  await page.getByRole("radio", { name: /no, this is personal use/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible();
  await page.getByRole("radio", { name: /installment/i }).check();
  await page.getByLabel("Monthly payment").fill("6000");
  await page.getByLabel("Term (months)").fill("24");
  await page.getByRole("button", { name: "Analyze Purchase" }).click();
}

// Runs FIRST: onboarding requires an un-onboarded account, and seeding here gives the
// later journeys a known financial state. A pre-run reset clears prior data + sets
// onboarding_completed=false (the suite expects a disposable/reset account).
test("mobile onboarding keeps values through Back and updates dashboard amounts", async ({
  page,
}) => {
  test.setTimeout(90_000); // first dashboard load compiles the route + loads the remote workspace
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/onboarding");

  await expect(
    page.getByRole("heading", { level: 1, name: "Let’s set up SpendGuard for you" })
  ).toBeVisible();
  await expectNoHydrationSkeleton(page);

  await page.getByLabel("Monthly income").fill("90000");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Savings" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Monthly income")).toHaveValue("90000");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Current savings").fill("130000");
  await page.getByLabel("Emergency fund target").fill("240000");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Housing").fill("25000");
  await page.getByLabel("Utilities and internet").fill("7000");
  await page.getByLabel("Food and transport").fill("15000");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Debt name").fill("Credit card");
  await page.getByLabel("Outstanding balance").fill("40000");
  await page.getByLabel("Minimum monthly payment").fill("6000");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Phone upgrade fund").check();
  await page.getByLabel("Travel fund").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Review your setup" })).toBeVisible();
  await page.getByRole("button", { name: "Finish Setup" }).click();
  await expect(page.getByRole("button", { name: "Finish Setup" })).toBeEnabled();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Good morning, Miguel!" })).toBeVisible();
  // Wait for the financial workspace to finish loading from the remote before reading the cards.
  await expect(
    page.getByRole("status", { name: "Loading local financial workspace..." })
  ).toBeHidden({ timeout: 60_000 });
  await expect(page.getByLabel("Current Savings card")).toContainText("₱130,000");
  await expect(page.getByLabel("Monthly Expenses card")).toContainText("₱47,000");
  await expect(page.getByRole("heading", { name: "Phone upgrade fund" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Travel fund" })).toBeVisible();
});

test("desktop purchase journey saves a check, goal, and cooldown item", async ({ page }) => {
  test.setTimeout(60_000); // remote workspace reloads after each mutation can be slow
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/checker");

  await expect(page.getByRole("heading", { level: 1, name: "Purchase Checker" })).toBeVisible();
  await expectNoHydrationSkeleton(page);

  await completePurchaseWizard(page);

  await expect(page).toHaveURL(/\/checker\/result$/);
  // The exact verdict is data-dependent (it reflects the account's live finances), so assert
  // a verdict label renders rather than pinning a specific decision string.
  const summary = page.getByRole("region", { name: "Purchase summary" });
  await expect(summary).toBeVisible();
  await expect(
    summary.getByText(/Safe to buy|Buy with caution|Wait|Not recommended/i).first()
  ).toBeVisible();
  await expect(page.getByText("Lesson", { exact: true })).toBeVisible();

  // Confirm via the success status, not the button re-enabling: the action writes the row and
  // then reloads the whole workspace from the remote, so button state is a slow, flaky signal.
  await page.getByRole("button", { name: "Add to Goal" }).click();
  await expect(page.getByText("Goal created from this check.")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Add to Cooldown" }).click();
  await expect(page.getByText("Cooldown item created.")).toBeVisible({ timeout: 20_000 });

  await page.goto("/goals");
  await expect(page.getByRole("heading", { level: 1, name: "Savings goals" })).toBeVisible();
  await expect(
    page.getByRole("article", { name: "iPhone Pro Max 1TB goal" }).first()
  ).toBeVisible();

  await page.goto("/cooldown");
  await expect(page.getByRole("heading", { level: 1, name: "Cooldown / Wishlist" })).toBeVisible();
  await expect(
    page.getByRole("article", { name: "iPhone Pro Max 1TB cooldown item" }).first()
  ).toBeVisible();
});

test("voice review journey uses typed transcript fallback and reaches the result route", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/voice");

  await expect(
    page.getByRole("heading", { level: 1, name: "Voice Purchase Checker" })
  ).toBeVisible();
  await expectNoHydrationSkeleton(page);

  await page
    .getByLabel("Purchase transcript")
    .fill(
      "Can I buy an iPhone Pro Max 1TB for ₱170,000 on installment with a ₱50,000 down payment, 24 months at ₱6,000 per month? I can wait."
    );
  await page.getByRole("button", { name: "Review extracted details" }).click();

  await expect(page.getByRole("heading", { name: "Review extracted details" })).toBeVisible();
  await page.getByLabel("Product name").fill("iPhone Pro Max 1TB edited");
  await page.getByRole("button", { name: "Analyze purchase" }).click();

  await expect(page).toHaveURL(/\/checker\/result$/);
  await expect(page.getByRole("region", { name: "Purchase summary" })).toContainText(
    "iPhone Pro Max 1TB edited"
  );
});

test("cooldown recheck recomputes the decision and shows a trend", async ({ page }) => {
  test.setTimeout(60_000); // remote workspace reload after the mutation can be slow
  await page.setViewportSize({ width: 1440, height: 1000 });

  // Seed a cooldown item via the real check flow, then recheck it.
  await page.goto("/checker");
  await expectNoHydrationSkeleton(page);
  await completePurchaseWizard(page);
  await expect(page).toHaveURL(/\/checker\/result$/);
  await page.getByRole("button", { name: "Add to Cooldown" }).click();
  // Wait for the write to register before navigating, or it could be aborted in flight.
  await expect(page.getByText("Cooldown item created.")).toBeVisible({ timeout: 20_000 });

  await page.goto("/cooldown");
  await expect(page.getByRole("heading", { level: 1, name: "Cooldown / Wishlist" })).toBeVisible();
  await expectNoHydrationSkeleton(page);

  // The shared test account may hold several identical items across runs — scope to one.
  const item = page.getByRole("article", { name: "iPhone Pro Max 1TB cooldown item" }).first();
  await expect(item).toBeVisible();

  await item.getByRole("button", { name: /^Recheck/ }).click();

  const recheck = item.getByRole("status", { name: /^Recheck result for/ });
  await expect(recheck).toBeVisible();
  await expect(recheck).toContainText(
    /Looking better|About the same|Looking riskier|Today’s check/
  );
});

test("weekly report generates insights from saved data", async ({ page }) => {
  test.setTimeout(60_000); // report generation + remote workspace load can be slow
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/reports");
  await expectNoHydrationSkeleton(page);

  // First report for the week shows a Generate button; a regenerated week renders directly.
  const generate = page.getByRole("button", { name: "Generate Report" });
  if (await generate.isVisible().catch(() => false)) {
    await generate.click();
  }

  // Real, rule-derived insights render (P9), not static placeholders.
  await expect(page.getByText("Reference insights")).toBeVisible();
  await expect(page.getByText("Next Best Action")).toBeVisible();
});
