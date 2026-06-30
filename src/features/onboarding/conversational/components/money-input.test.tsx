import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { MoneyInput } from "./money-input";

it("shows the currency and emits typed value", async () => {
  const onChange = vi.fn();
  render(<MoneyInput id="income" label="Monthly income" value="" onChange={onChange} currency="PHP" />);
  expect(screen.getByText("PHP")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("Monthly income"), "5");
  expect(onChange).toHaveBeenCalledWith("5");
});

it("only emits non-negative numeric values", () => {
  const onChange = vi.fn();
  render(<MoneyInput id="income" label="Monthly income" value="" onChange={onChange} currency="PHP" />);

  fireEvent.change(screen.getByLabelText("Monthly income"), { target: { value: "-12e.3.4" } });

  expect(onChange).toHaveBeenCalledWith("12.34");
});
