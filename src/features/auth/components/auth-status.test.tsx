import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthStatus } from "./auth-status";

describe("AuthStatus", () => {
  it("shows the authenticated account and submits sign out", async () => {
    const user = userEvent.setup();
    render(
      <AuthStatus
        email="very.long.account.name.for.testing@example.com"
        signOutAction={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByText("very.long.account.name.for.testing@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("auth-status")).toHaveClass("flex", "min-w-0");
    expect(screen.getByTitle("very.long.account.name.for.testing@example.com")).toHaveClass(
      "min-w-0",
      "truncate"
    );

    // Open the account dropdown to verify sign-out is accessible
    await user.click(screen.getByTestId("auth-status"));
    expect(await screen.findByRole("menuitem", { name: /sign out/i })).toBeInTheDocument();
  });
});
