import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseCheckerWizard } from "./purchase-checker-wizard";

const pushSpy = vi.hoisted(() => vi.fn());
const prefetchSpy = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy, prefetch: prefetchSpy }),
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

async function completePurchaseStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/product name/i), "iPhone Pro Max 1TB");
  await user.type(screen.getByLabelText(/price/i), "170000");
  await user.click(screen.getByRole("button", { name: /continue/i }));
}

describe("PurchaseCheckerWizard", () => {
  beforeEach(() => {
    pushSpy.mockClear();
    prefetchSpy.mockClear();
  });

  it("keeps step one focused on purchase facts and does not analyze there", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn();

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    expect(screen.getByRole("heading", { name: /product details/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /analyze purchase/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/sale deadline/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/location/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expectInvalidFieldDescribedBy(screen.getByLabelText(/product name/i), /name the product/i);
    expectInvalidFieldDescribedBy(screen.getByLabelText(/price/i), /enter a positive price/i);
    expect(screen.queryByText(/choose a category/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/product name/i), "Phone");
    await user.type(screen.getByLabelText(/price/i), "170000");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("heading", { name: /decision details/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/reason for purchase/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/best alternative/i)).not.toBeInTheDocument();
  });

  it("routes enter-key submissions through the active step before analyzing", async () => {
    const onRunCheck = vi.fn().mockResolvedValue({});

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    const productName = screen.getByLabelText(/product name/i);
    const form = productName.closest("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);

    await waitFor(() => {
      expect(onRunCheck).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
      expectInvalidFieldDescribedBy(productName, /name the product/i);
    });

    await userEvent.type(productName, "iPhone Pro Max 1TB");
    await userEvent.type(screen.getByLabelText(/price/i), "170000");
    fireEvent.submit(form as HTMLFormElement);

    expect(await screen.findByRole("heading", { name: /decision details/i })).toBeInTheDocument();
    expect(onRunCheck).not.toHaveBeenCalled();
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("reveals financed payment fields only for financed payments", async () => {
    const user = userEvent.setup();

    render(<PurchaseCheckerWizard onRunCheck={vi.fn()} />);

    await completePurchaseStep(user);

    expect(screen.queryByLabelText(/down payment/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/monthly payment/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/term/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /installment/i }));

    expect(screen.getByLabelText(/down payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/monthly payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/term/i)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /cash/i }));

    expect(screen.queryByLabelText(/down payment/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/monthly payment/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/term/i)).not.toBeInTheDocument();
  });

  it("analyzes a cash purchase from the simplified flow", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockResolvedValue({});

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completePurchaseStep(user);
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));
    expect(onRunCheck).toHaveBeenCalledWith({
      itemName: "iPhone Pro Max 1TB",
      amount: 170000,
      urgency: "want",
      paymentMethod: "cash",
      currentAlternativeStillWorks: false,
      isIncomeGenerating: false,
    });
    expect(pushSpy).toHaveBeenCalledWith("/checker/result");
  });

  it("allows loan analysis with monthly payment and no term", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (value: unknown) => void = () => {};
    const analysis = new Promise((resolve) => {
      resolveAnalysis = resolve;
    });
    const onRunCheck = vi.fn(() => analysis);

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completePurchaseStep(user);
    await user.click(screen.getByRole("radio", { name: /loan/i }));
    await user.type(screen.getByLabelText(/monthly payment/i), "4500");
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));
    expect(onRunCheck).toHaveBeenCalledWith({
      itemName: "iPhone Pro Max 1TB",
      amount: 170000,
      urgency: "want",
      paymentMethod: "loan",
      monthlyPayment: 4500,
      currentAlternativeStillWorks: false,
      isIncomeGenerating: false,
    });
    expect(pushSpy).not.toHaveBeenCalled();

    resolveAnalysis({});

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith("/checker/result"));
  });

  it("requires monthly payment and term for installments", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockResolvedValue({});

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completePurchaseStep(user);
    await user.click(screen.getByRole("radio", { name: /installment/i }));
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    expect(onRunCheck).not.toHaveBeenCalled();
    expectInvalidFieldDescribedBy(
      screen.getByLabelText(/monthly payment/i),
      /enter the monthly payment/i
    );
    expectInvalidFieldDescribedBy(screen.getByLabelText(/term/i), /enter the payment term/i);
  });

  it("keeps optional category and risk context when provided", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockResolvedValue({});

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await user.type(screen.getByLabelText(/product name/i), "Standing desk");
    await user.type(screen.getByLabelText(/price/i), "18000");
    await chooseOption(user, /category/i, "Home");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await chooseOption(user, /urgency/i, "Need this month");
    await user.click(screen.getByRole("radio", { name: /yes, it still works/i }));
    await user.click(screen.getByRole("radio", { name: /yes, this can generate income/i }));
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));
    expect(onRunCheck).toHaveBeenCalledWith({
      itemName: "Standing desk",
      amount: 18000,
      category: "home",
      urgency: "need_this_month",
      paymentMethod: "cash",
      currentAlternativeStillWorks: true,
      isIncomeGenerating: true,
    });
  });

  it("shows saving and opening result states around a completed check", async () => {
    const user = userEvent.setup();
    let resolveSave: (value: unknown) => void = () => {};
    const save = new Promise((resolve) => {
      resolveSave = resolve;
    });
    const onRunCheck = vi.fn(() => save);

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completePurchaseStep(user);
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/saving check/i);
    expect(pushSpy).not.toHaveBeenCalled();

    resolveSave({});

    expect(await screen.findByRole("status")).toHaveTextContent(/opening result/i);
    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith("/checker/result"));
  });

  it("drops stale financed fields when switching back to cash before analysis", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockResolvedValue({});

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completePurchaseStep(user);
    await user.click(screen.getByRole("radio", { name: /installment/i }));
    await user.type(screen.getByLabelText(/monthly payment/i), "6000");
    await user.type(screen.getByLabelText(/term/i), "24");
    await user.click(screen.getByRole("radio", { name: /cash/i }));
    await user.click(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));
    expect(onRunCheck).toHaveBeenCalledWith({
      itemName: "iPhone Pro Max 1TB",
      amount: 170000,
      urgency: "want",
      paymentMethod: "cash",
      currentAlternativeStillWorks: false,
      isIncomeGenerating: false,
    });
  });

  it("runs one analysis when the final button is double-clicked", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: (value: unknown) => void = () => {};
    const analysis = new Promise((resolve) => {
      resolveAnalysis = resolve;
    });
    const onRunCheck = vi.fn(() => analysis);

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completePurchaseStep(user);
    await user.dblClick(screen.getByRole("button", { name: /analyze purchase/i }));

    await waitFor(() => expect(onRunCheck).toHaveBeenCalledTimes(1));

    resolveAnalysis({});

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith("/checker/result"));
  });

  it("shows a non-blaming error and keeps values when analysis is rejected", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn().mockRejectedValue(new Error("service unavailable"));

    render(<PurchaseCheckerWizard onRunCheck={onRunCheck} />);

    await completePurchaseStep(user);
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
    expect(screen.getByLabelText(/product name/i)).toHaveValue("iPhone Pro Max 1TB");
    expect(screen.getByLabelText(/price/i)).toHaveValue(170000);
  });
});
