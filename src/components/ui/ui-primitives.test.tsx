import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";
import { Card } from "./card";
import { Input, Label } from "./form-fields";
import { Progress } from "./progress";

describe("SpendGuard UI primitives", () => {
  it("gives the default button a 44px target and native disabled semantics", () => {
    render(<Button disabled>Analyzing…</Button>);

    const button = screen.getByRole("button", { name: "Analyzing…" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("h-11");
  });

  it("keeps labelled cards exposed as semantic regions", () => {
    render(<Card aria-label="Summary" />);

    expect(screen.getByRole("region", { name: "Summary" })).toBeInTheDocument();
  });

  it("binds labels to their form controls", () => {
    render(
      <>
        <Label htmlFor="price">Price</Label>
        <Input id="price" />
      </>
    );

    expect(screen.getByLabelText("Price")).toHaveAttribute("id", "price");
  });

  it("blocks sign and exponent keys for non-negative number inputs", () => {
    render(<Input aria-label="Amount" type="number" min="0" />);

    const amount = screen.getByLabelText("Amount");

    expect(fireEvent.keyDown(amount, { key: "-" })).toBe(false);
    expect(fireEvent.keyDown(amount, { key: "e" })).toBe(false);
  });

  it("sanitizes pasted non-negative number input before change handlers run", () => {
    const changedValues: string[] = [];
    const onChange = vi.fn((event: React.ChangeEvent<HTMLInputElement>) => {
      changedValues.push(event.currentTarget.value);
    });
    render(<Input aria-label="Amount" type="number" min="0" onChange={onChange} />);

    const amount = screen.getByLabelText("Amount") as HTMLInputElement;

    fireEvent.change(amount, { target: { value: "1e-2" } });

    expect(amount.value).toBe("12");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(changedValues).toEqual(["12"]);
  });

  it("exposes named progressbar semantics and a numeric value", () => {
    render(<Progress value={56} label="Emergency fund" />);

    expect(screen.getByRole("progressbar", { name: "Emergency fund" })).toHaveAttribute(
      "aria-valuenow",
      "56"
    );
  });

  it("clamps progress values to the supported numeric range", () => {
    render(
      <>
        <Progress value={-10} label="Lower bound" />
        <Progress value={120} label="Upper bound" />
      </>
    );

    expect(screen.getByRole("progressbar", { name: "Lower bound" })).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
    expect(screen.getByRole("progressbar", { name: "Upper bound" })).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
  });
});
