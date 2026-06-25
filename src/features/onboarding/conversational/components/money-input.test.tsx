import { render, screen } from "@testing-library/react";
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
