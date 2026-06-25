import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { BufferStep } from "./buffer-step";

it("selects a preset buffer", async () => {
  const onChange = vi.fn();
  render(<BufferStep value="" onChange={onChange} />);
  await userEvent.click(screen.getByRole("button", { name: /10,000/ }));
  expect(onChange).toHaveBeenCalledWith("10000");
});

it("marks only the matching preset as pressed", () => {
  render(<BufferStep value="10000" onChange={vi.fn()} />);
  expect(screen.getByRole("button", { name: /10,000/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: /5,000/ })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

it('maps "Not now" to "0"', async () => {
  const onChange = vi.fn();
  render(<BufferStep value="" onChange={onChange} />);
  await userEvent.click(screen.getByRole("button", { name: /not now/i }));
  expect(onChange).toHaveBeenCalledWith("0");
});

it("deselects every preset when a custom amount is typed", () => {
  render(<BufferStep value="7500" onChange={vi.fn()} />);
  for (const button of screen.getAllByRole("button")) {
    expect(button).toHaveAttribute("aria-pressed", "false");
  }
});
