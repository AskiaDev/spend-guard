import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SelectableCard } from "./selectable-card";

it("reflects selected state and toggles on click", async () => {
  const onToggle = vi.fn();
  render(<SelectableCard label="Stop impulse purchases" selected={false} onToggle={onToggle} />);
  const card = screen.getByRole("checkbox", { name: /stop impulse/i });
  expect(card).toHaveAttribute("aria-checked", "false");
  await userEvent.click(card);
  expect(onToggle).toHaveBeenCalledOnce();
});
