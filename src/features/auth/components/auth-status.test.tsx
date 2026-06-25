import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthStatus } from "./auth-status";

describe("AuthStatus", () => {
  it("shows the authenticated account and submits sign out", () => {
    render(
      <AuthStatus
        email="very.long.account.name.for.testing@example.com"
        signOutAction={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByText("very.long.account.name.for.testing@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toHaveAttribute("type", "submit");
    expect(screen.getByTestId("auth-status")).toHaveClass("grid", "min-w-0");
    expect(screen.getByTitle("very.long.account.name.for.testing@example.com")).toHaveClass(
      "min-w-0",
      "truncate"
    );
  });
});
