import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { CooldownSelector } from "./cooldown-selector";

it("selects strict", async () => {
  const onChange = vi.fn();
  render(<CooldownSelector value="balanced" onChange={onChange} />);
  await userEvent.click(screen.getByRole("radio", { name: /strict pause/i }));
  expect(onChange).toHaveBeenCalledWith("strict");
});
