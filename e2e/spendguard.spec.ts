import { expect, type Page, test } from "@playwright/test";

const e2eEmail = process.env.E2E_SUPABASE_EMAIL;
const e2ePassword = process.env.E2E_SUPABASE_PASSWORD;

test.beforeEach(async ({ page }) => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Set E2E_SUPABASE_EMAIL and E2E_SUPABASE_PASSWORD for a disposable confirmed Supabase test account."
  );

  await page.goto("/login");
  await page.getByLabel("Email").fill(e2eEmail!);
  await page.getByLabel("Password").fill(e2ePassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
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
  await page.getByRole("radio", { name: /no, this is personal use/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible();
  await page.getByRole("radio", { name: /installment/i }).check();
  await page.getByLabel("Monthly payment").fill("6000");
  await page.getByLabel("Term (months)").fill("24");
  await page.getByRole("button", { name: "Analyze Purchase" }).click();
}

test("desktop purchase journey saves a check, goal, and cooldown item", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/checker");

  await expect(page.getByRole("heading", { level: 1, name: "Purchase Checker" })).toBeVisible();
  await expectNoHydrationSkeleton(page);

  await completePurchaseWizard(page);

  await expect(page).toHaveURL(/\/checker\/result$/);
  await expect(page.getByText("Wait").first()).toBeVisible();
  await expect(
    page.getByText("Waiting would give your monthly plan more room and reduce pressure on your priorities.")
  ).toBeVisible();
  await expect(page.getByText("Lesson", { exact: true })).toBeVisible();

  const addToGoal = page.getByRole("button", { name: "Add to Goal" });
  await addToGoal.click();
  await expect(addToGoal).toBeEnabled();

  const addToCooldown = page.getByRole("button", { name: "Add to Cooldown" });
  await addToCooldown.click();
  await expect(addToCooldown).toBeEnabled();

  await page.goto("/goals");
  await expect(page.getByRole("heading", { level: 1, name: "Savings goals" })).toBeVisible();
  await expect(page.getByRole("article", { name: "iPhone Pro Max 1TB goal" })).toBeVisible();

  await page.goto("/cooldown");
  await expect(page.getByRole("heading", { level: 1, name: "Cooldown / Wishlist" })).toBeVisible();
  await expect(
    page.getByRole("article", { name: "iPhone Pro Max 1TB cooldown item" })
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

test("mobile onboarding keeps values through Back and updates dashboard amounts", async ({
  page,
}) => {
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
  await expect(page.getByLabel("Current Savings card")).toContainText("₱130,000");
  await expect(page.getByLabel("Monthly Expenses card")).toContainText("₱47,000");
  await expect(page.getByRole("heading", { name: "Phone upgrade fund" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Travel fund" })).toBeVisible();
});
