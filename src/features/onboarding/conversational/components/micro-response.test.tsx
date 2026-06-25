import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { MicroResponse } from "./micro-response";

it("renders its message when shown", () => {
  render(
    <MicroResponse show>
      Got it. We will set up SpendGuard around pausing before you spend.
    </MicroResponse>
  );
  expect(screen.getByRole("status")).toHaveTextContent(/pausing before you spend/i);
});

it("renders nothing when hidden", () => {
  const { container } = render(<MicroResponse show={false}>hidden</MicroResponse>);
  expect(container).toBeEmptyDOMElement();
});
