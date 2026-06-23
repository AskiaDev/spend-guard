import { expect, test } from "@playwright/test";

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
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("manual purchase check can become a goal, cooldown item, and report", async ({ page }) => {
  const itemName = `Replacement keyboard ${Date.now()}`;


  await page.getByRole("button", { name: "Profile" }).click();
  await page.getByLabel("Monthly income").fill("90000");
  await page.getByLabel("Current savings").fill("180000");
  await page.getByLabel("Emergency target").fill("150000");
  await page.getByLabel("Fixed monthly expenses").fill("28000");
  await page.getByLabel("Debt minimums").fill("6000");
  await page.getByLabel("Goal contribution").fill("8000");
  await page.getByRole("button", { name: "Save profile" }).click();

  await page.getByRole("button", { name: "Can I Buy This?" }).click();
  await page.getByLabel("Purchase").fill(itemName);
  await page.getByLabel("Amount").fill("4500");
  await page.getByLabel("Urgency").selectOption("need_this_month");
  await page.getByRole("button", { name: "Check purchase" }).click();

  await expect(page.getByText("safe to buy")).toBeVisible();
  await expect(
    page.getByText("The purchase fits inside today's safe-to-spend amount.", { exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: "Convert to goal" }).click();
  await page.getByRole("button", { name: "Add cooldown" }).click();

  await page.getByRole("button", { name: "Goals" }).click();
  await expect(page.getByText(itemName)).toBeVisible();

  await page.getByRole("button", { name: "Cooldown" }).click();
  await expect(page.getByText(itemName)).toBeVisible();

  await page.getByRole("button", { name: "Reports" }).click();
  await page.getByRole("button", { name: "Generate report" }).click();
  await expect(page.getByText(/Health score is/i)).toBeVisible();
});

test("voice transcript parsing requires explicit confirmation", async ({ page }) => {
  await page.getByRole("button", { name: "Can I Buy This?" }).click();

  await page
    .getByLabel("Voice transcript")
    .fill("Can I buy a phone for 25k on installment, 12 months at 2500 per month? I can wait.");
  await page.getByRole("button", { name: "Parse transcript" }).click();

  await expect(page.getByText("Review the extracted fields before analysis.")).toBeVisible();
  await expect(page.getByText("₱25,000")).toBeVisible();
  await page.getByRole("button", { name: "Confirm fields" }).click();

  await expect(page.getByLabel("Purchase")).toHaveValue("phone");
  await expect(page.getByLabel("Amount")).toHaveValue("25000");
  await expect(page.getByLabel("Payment", { exact: true })).toHaveValue("installment");
});
