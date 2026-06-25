import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProgressPath } from "./progress-path";

it("exposes the current step position to assistive tech", () => {
  render(<ProgressPath current={3} total={14} />);

  const bar = screen.getByRole("progressbar");
  expect(bar).toHaveAttribute("aria-valuenow", "3");
  expect(bar).toHaveAttribute("aria-valuemax", "14");
});

it("fills the line proportionally to progress", () => {
  render(<ProgressPath current={7} total={14} />);

  const fill = screen.getByRole("progressbar").firstElementChild as HTMLElement;
  expect(fill.style.transform).toBe("scaleX(0.5)");
});
