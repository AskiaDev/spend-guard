import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CheckerSurface } from "./checker-surface";

// The embedded wizard + voice checkers call useRouter, which throws without an
// app-router provider. Mock next/navigation like the sibling component tests do;
// useSearchParams returns null so CheckerSurface's own null guard is exercised
// (this is the "renders without a provider" path from the task brief).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => null,
}));

describe("CheckerSurface", () => {
  it("shows the manual wizard by default and switches to voice", async () => {
    render(<CheckerSurface onRunCheck={vi.fn()} />);
    expect(screen.getByRole("tab", { name: /type/i })).toHaveAttribute("aria-selected", "true");
    // "Product details" also appears in the step progress, so target the wizard heading.
    expect(screen.getByRole("heading", { name: /product details/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: /speak/i }));
    expect(screen.getByText(/what you want to buy/i)).toBeInTheDocument();
  });
});
