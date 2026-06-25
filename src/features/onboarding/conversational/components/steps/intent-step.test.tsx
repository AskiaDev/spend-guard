import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { IntentStep } from "./intent-step";

it("toggles an intent selection", async () => {
  const onChange = vi.fn();
  render(<IntentStep value={[]} onChange={onChange} />);
  await userEvent.click(screen.getByRole("checkbox", { name: /stop impulse purchases/i }));
  expect(onChange).toHaveBeenCalledWith(["stop_impulse"]);
});
