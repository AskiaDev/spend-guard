import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseCheckerWizard } from "./purchase-checker-wizard";

const pushSpy = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy }),
}));

function expectInvalidFieldDescribedBy(field: HTMLElement, errorText: RegExp) {
  const describedBy = field.getAttribute("aria-describedby");
  const errorIds = describedBy?.split(/\s+/) ?? [];
  const error = errorIds
    .map((id) => document.getElementById(id))
    .find((element) => errorText.test(element?.textContent ?? ""));

  expect(field).toHaveAttribute("aria-invalid", "true");
  expect(error).toBeTruthy();
  expect(error).toBeVisible();
  expect(error).toHaveAttribute("id");
  expect(error?.id).not.toBe("");
  expect(errorIds).toContain(error?.id);
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  field: RegExp,
  optionName: string
) {
  await user.click(screen.getByLabelText(field));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

async function completeStepOne(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/product name/i), "iPhone Pro Max 1TB");
  await user.type(screen.getByLabelText(/price/i), "170000");
  await chooseOption(user, /category/i, "Phone");
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

async function completeStepTwo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/reason for purchase/i), "work and family photos");
  await chooseOption(user, /urgency/i, "Can wait");
  await user.type(screen.getByLabelText(/best alternative/i), "keep current phone");
  await user.click(screen.getByRole("radio", { name: /yes, it still works/i }));
  await user.click(screen.getByRole("radio", { name: /no, this is personal use/i }));
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

async function completeWizardToPayment(user: ReturnType<typeof userEvent.setup>) {
  await completeStepOne(user);
  await completeStepTwo(user);
}

describe("PurchaseCheckerWizard", () => {
  beforeEach(() => {
    pushSpy.mockClear();
  });

  it("blocks Continue until product, positive price, and category exist", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn();

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("heading", { name: /product details/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/reason for purchase/i)).not.toBeInTheDocument();
    expectInvalidFieldDescribedBy(screen.getByLabelText(/product name/i), /name the product/i);
    expectInvalidFieldDescribedBy(screen.getByLabelText(/price/i), /enter a positive price/i);
    expectInvalidFieldDescribedBy(screen.getByLabelText(/category/i), /choose a category/i);

    await user.type(screen.getByLabelText(/product name/i), "iPhone Pro Max 1TB");
    await user.type(screen.getByLabelText(/price/i), "0");
    await chooseOption(user, /category/i, "Phone");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("heading", { name: /product details/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/reason for purchase/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText(/price/i));
    await user.type(screen.getByLabelText(/price/i), "170000");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("heading", { name: /motivation/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/reason for purchase/i)).toBeInTheDocument();
  });

  it("routes pre-analysis form submissions through active-step validation", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockResolvedValue({});

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    const productName = screen.getByLabelText(/product name/i);
    const stepOneForm = productName.closest("form");
    expect(stepOneForm).not.toBeNull();
    fireEvent.keyDown(productName, { code: "Enter", key: "Enter" });
    fireEvent.submit(stepOneForm as HTMLFormElement);

    await waitFor(() => {
      expect(onRunCheck).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
      expectInvalidFieldDescribedBy(productName, /name the product/i);
    });
    expect(screen.getByRole("heading", { name: /product details/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/reason for purchase/i)).not.toBeInTheDocument();
    expectInvalidFieldDescribedBy(screen.getByLabelText(/price/i), /enter a positive price/i);
    expectInvalidFieldDescribedBy(screen.getByLabelText(/category/i), /choose a category/i);

    await user.type(productName, "iPhone Pro Max 1TB");
    await user.type(screen.getByLabelText(/price/i), "170000");
    await chooseOption(user, /category/i, "Phone");
    fireEvent.keyDown(productName, { code: "Enter", key: "Enter" });
    fireEvent.submit(stepOneForm as HTMLFormElement);

    expect(await screen.findByRole("heading", { name: /motivation/i })).toBeInTheDocument();
    expect(onRunCheck).not.toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();

    const reason = screen.getByLabelText(/reason for purchase/i);
    const form = reason.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(onRunCheck).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
      expectInvalidFieldDescribedBy(reason, /add why you are considering/i);
    });
    expect(screen.getByRole("heading", { name: /motivation/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /payment/i })).not.toBeInTheDocument();
  });

  it("preserves reason, urgency, alternative, current-alternative, and income-generation choices across steps", async () => {
    const user = userEvent.setup();

    render(<PurchaseCheckerWizard onRunCheck={vi.fn()} />);

    await completeStepOne(user);
    await user.type(screen.getByLabelText(/reason for purchase/i), "work and family photos");
    await chooseOption(user, /urgency/i, "Can wait");
    await user.type(screen.getByLabelText(/best alternative/i), "keep current phone");
    await user.click(screen.getByRole("radio", { name: /yes, it still works/i }));
    await user.click(screen.getByRole("radio", { name: /no, this is personal use/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("heading", { name: /payment/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(screen.getByLabelText(/reason for purchase/i)).toHaveValue("work and family photos");
    expect(screen.getByLabelText(/urgency/i)).toHaveTextContent("Can wait");
    expect(screen.getByLabelText(/best alternative/i)).toHaveValue("keep current phone");
    expect(screen.getByRole("radio", { name: /yes, it still works/i })).toBeChecked();
    expect(screen.getByRole("radio", { name: /no, this is personal use/i })).toBeChecked();
  });

  it("links income-generation validation to the radio group", async () => {
    const user = userEvent.setup();

    render(<PurchaseCheckerWizard onRunCheck={vi.fn()} />);

    await completeStepOne(user);
    await user.type(screen.getByLabelText(/reason for purchase/i), "work and family photos");
    await user.type(screen.getByLabelText(/best alternative/i), "keep current phone");
    await user.click(screen.getByRole("radio", { name: /yes, it still works/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const incomeGroup = screen.getByRole("group", { name: /income generation/i });
    const error = screen.getByText(/choose whether this can generate income/i);
    const describedBy = incomeGroup.getAttribute("aria-describedby");

    expect(incomeGroup).toHaveAttribute("aria-invalid", "true");
    expect(error).toBeVisible();
    expect(error).toHaveAttribute("id");
    expect(error.id).not.toBe("");
    expect(describedBy?.split(/\s+/)).toContain(error.id);
  });

  it("links current-alternative validation to the radio group", async () => {
    const user = userEvent.setup();

    render(<PurchaseCheckerWizard onRunCheck={vi.fn()} />);

    await completeStepOne(user);
    await user.type(screen.getByLabelText(/reason for purchase/i), "work and family photos");
    await user.type(screen.getByLabelText(/best alternative/i), "keep current phone");
    await user.click(screen.getByRole("radio", { name: /no, this is personal use/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    const alternativeGroup = screen.getByRole("group", { name: /current alternative/i });
    const error = screen.getByText(/choose whether the current alternative still works/i);
    const describedBy = alternativeGroup.getAttribute("aria-describedby");

    expect(alternativeGroup).toHaveAttribute("aria-invalid", "true");
    expect(error).toBeVisible();
    expect(error).toHaveAttribute("id");
    expect(error.id).not.toBe("");
    expect(describedBy?.split(/\s+/)).toContain(error.id);
  });

  it("reveals installment fields for financed payments and hides them for cash", async () => {
    const user = userEvent.setup();

    render(<PurchaseCheckerWizard onRunCheck={vi.fn()} />);

    await completeWizardToPayment(user);

    expect(screen.getByRole("img", { name: "Person entering payment details" })).toHaveAttribute(
      "src",
      expect.stringContaining("payment-info.svg")
    );
    expect(screen.queryByLabelText(/down payment/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/monthly payment/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/term/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /installment/i }));

    expect(screen.getByLabelText(/down payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monthly payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/term/i)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /loan/i }));
    expect(screen.getByLabelText(/monthly payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/term/i)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /buy now, pay later/i }));
    expect(screen.getByLabelText(/monthly payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/term/i)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /cash/i }));

    expect(screen.queryByLabelText(/down payment/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/monthly payment/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/term/i)).not.toBeInTheDocument();
  });

  it("allows loan analysis with monthly payment and no term", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (value: unknown) => void = () => {};
    const analysis = new Promise((resolve) => {
      resolveAnalysis = resolve;
    });
    const onRunCheck = vi.fn(() => analysis);

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completeWizardToPayment(user);
    await user.click(screen.getByRole("radio", { name: /loan/i }));
    await user.type(screen.getByLabelText(/monthly payment/i), "4500");
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));
    expect(onRunCheck).toHaveBeenCalledWith({
      itemName: "iPhone Pro Max 1TB",
      amount: 170000,
      category: "phone",
      urgency: "can_wait",
      paymentMethod: "loan",
      monthlyPayment: 4500,
      currentAlternativeStillWorks: true,
      isIncomeGenerating: false,
    });
    expect(pushSpy).not.toHaveBeenCalled();

    resolveAnalysis({});

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith("/checker/result"));
  });

  it("drops stale financed fields when switching back to cash before analysis", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockResolvedValue({});

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completeWizardToPayment(user);
    await user.click(screen.getByRole("radio", { name: /installment/i }));
    await user.type(screen.getByLabelText(/monthly payment/i), "6000");
    await user.type(screen.getByLabelText(/term/i), "24");
    await user.click(screen.getByRole("radio", { name: /cash/i }));
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));
    expect(onRunCheck).toHaveBeenCalledWith({
      itemName: "iPhone Pro Max 1TB",
      amount: 170000,
      category: "phone",
      urgency: "can_wait",
      paymentMethod: "cash",
      currentAlternativeStillWorks: true,
      isIncomeGenerating: false,
    });
  });

  it("maps the wizard into PurchaseInput and navigates after analysis resolves", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (value: unknown) => void = () => {};
    const analysis = new Promise((resolve) => {
      resolveAnalysis = resolve;
    });
    const onRunCheck = vi.fn(() => analysis);

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completeWizardToPayment(user);
    await user.click(screen.getByRole("radio", { name: /installment/i }));
    await user.type(screen.getByLabelText(/down payment/i), "26000");
    await user.type(screen.getByLabelText(/monthly payment/i), "6000");
    await user.type(screen.getByLabelText(/term/i), "24");
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));
    expect(onRunCheck).toHaveBeenCalledWith({
      itemName: "iPhone Pro Max 1TB",
      amount: 170000,
      category: "phone",
      urgency: "can_wait",
      paymentMethod: "installment",
      downPayment: 26000,
      installmentMonths: 24,
      monthlyPayment: 6000,
      currentAlternativeStillWorks: true,
      isIncomeGenerating: false,
    });
    expect(pushSpy).not.toHaveBeenCalled();

    resolveAnalysis({});

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith("/checker/result"));
  });

  it("runs one analysis when the final button is double-clicked", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (value: unknown) => void = () => {};
    const analysis = new Promise((resolve) => {
      resolveAnalysis = resolve;
    });
    const onRunCheck = vi.fn(() => analysis);

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completeWizardToPayment(user);
    await user.dblClick(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));

    resolveAnalysis({});

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith("/checker/result"));
  });

  it("submits manual-check metadata fields with the analyzed purchase", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockResolvedValue({});

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await user.type(screen.getByLabelText(/product name/i), "Standing desk");
    await user.type(screen.getByLabelText(/price/i), "18000");
    await chooseOption(user, /category/i, "Home");
    // The date field is now a shadcn calendar popover: open it and pick a day.
    await user.click(screen.getByLabelText(/sale deadline/i));
    await user.click(within(await screen.findByRole("grid")).getByText("15"));
    const now = new Date();
    const expectedSaleDeadline = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
    await user.type(screen.getByLabelText(/location/i), "Makati showroom");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.type(screen.getByLabelText(/reason for purchase/i), "reduce back pain at work");
    await chooseOption(user, /urgency/i, "Need this month");
    await user.type(screen.getByLabelText(/best alternative/i), "use existing table");
    await user.type(screen.getByLabelText(/notes/i), "Ask if the store includes delivery.");
    await user.click(screen.getByRole("radio", { name: /no, it does not work/i }));
    await user.click(screen.getByRole("radio", { name: /yes, this can generate income/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));
    expect(onRunCheck).toHaveBeenCalledWith({
      itemName: "Standing desk",
      amount: 18000,
      category: "home",
      saleDeadline: expectedSaleDeadline,
      location: "Makati showroom",
      notes: "Ask if the store includes delivery.",
      urgency: "need_this_month",
      paymentMethod: "cash",
      currentAlternativeStillWorks: false,
      isIncomeGenerating: true,
    });
    expect(pushSpy).toHaveBeenCalledWith("/checker/result");
  });

  it("shows a non-blaming error and keeps values when analysis is rejected", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockRejectedValue(new Error("service unavailable"));

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completeWizardToPayment(user);
    await user.click(screen.getByRole("button", { name: /save draft/i }));
    const draftStatus = screen.getByRole("status");
    expect(draftStatus).toHaveTextContent(/draft saved in this form/i);
    expect(draftStatus).toHaveAttribute("aria-live", "polite");

    await user.click(screen.getByRole("radio", { name: /installment/i }));
    await user.type(screen.getByLabelText(/monthly payment/i), "6000");
    await user.type(screen.getByLabelText(/term/i), "24");
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We couldn’t analyze this purchase yet. Your details are still here—please try again."
    );
    expect(screen.getByLabelText(/monthly payment/i)).toHaveValue(6000);
    expect(screen.getByLabelText(/term/i)).toHaveValue(24);
    expect(pushSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/reason for purchase/i)).toHaveValue("work and family photos");

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/product name/i)).toHaveValue("iPhone Pro Max 1TB");
    expect(screen.getByLabelText(/price/i)).toHaveValue(170000);
    expect(screen.getByLabelText(/category/i)).toHaveTextContent("Phone");
  });
});
