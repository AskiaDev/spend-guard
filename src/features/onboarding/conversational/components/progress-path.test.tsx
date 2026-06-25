import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProgressPath } from "./progress-path";

it("marks the current step", () => {
  render(
    <ProgressPath
      steps={[
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ]}
      currentIndex={1}
    />
  );
  expect(screen.getByText("B").closest("[data-active]")).toHaveAttribute("data-active", "true");
});
