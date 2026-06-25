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

it("arrow keys move selection and focus", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<CooldownSelector value="light" onChange={onChange} />);

  const light = screen.getByRole("radio", { name: /light pause/i });
  const balanced = screen.getByRole("radio", { name: /balanced pause/i });

  light.focus();
  expect(light).toHaveFocus();

  await user.keyboard("{ArrowDown}");
  expect(onChange).toHaveBeenCalledWith("balanced");
  // ARIA radiogroup: arrow nav must move DOM focus to the new option.
  expect(balanced).toHaveFocus();
});

it("arrow up from the first option wraps to the last", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<CooldownSelector value="light" onChange={onChange} />);

  const light = screen.getByRole("radio", { name: /light pause/i });
  const strict = screen.getByRole("radio", { name: /strict pause/i });

  light.focus();
  await user.keyboard("{ArrowUp}");
  expect(onChange).toHaveBeenCalledWith("strict");
  expect(strict).toHaveFocus();
});
