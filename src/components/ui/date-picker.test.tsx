import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "./date-picker";

function ControlledDatePicker({
  initialValue = "",
  onChange,
}: {
  initialValue?: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <DatePicker
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("DatePicker", () => {
  it("shows the placeholder when empty and a formatted local date when set", () => {
    const { rerender } = render(
      <DatePicker value="" onChange={() => {}} placeholder="Pick a date" />
    );
    expect(
      screen.getByRole("button", { name: /pick a date/i })
    ).toBeInTheDocument();

    // A date-only string renders by its calendar date, with no timezone off-by-one.
    rerender(<DatePicker value="2026-12-31" onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: /Dec 31, 2026/ })
    ).toBeInTheDocument();
  });

  it("emits YYYY-MM-DD and opens on the selected month when a day is picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // Seed a value so the calendar opens on Dec 2026 regardless of the system clock.
    render(<ControlledDatePicker initialValue="2026-12-10" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Dec 10, 2026/ }));
    const grid = await screen.findByRole("grid");
    await user.click(within(grid).getByText("15"));

    expect(onChange).toHaveBeenCalledWith("2026-12-15");
  });
});
