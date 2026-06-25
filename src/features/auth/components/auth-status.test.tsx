import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthStatus } from "./auth-status";

describe("AuthStatus", () => {
  it("shows the authenticated account and submits sign out", async () => {
    const user = userEvent.setup();
    const signOutAction = vi.fn(async () => undefined);
    render(
      <AuthStatus
        email="very.long.account.name.for.testing@example.com"
        signOutAction={signOutAction}
      />
    );

    expect(screen.getByText("very.long.account.name.for.testing@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("auth-status")).toHaveClass("flex", "min-w-0");
    expect(screen.getByTitle("very.long.account.name.for.testing@example.com")).toHaveClass(
      "min-w-0",
      "truncate"
    );

    // Open the account dropdown
    await user.click(screen.getByTestId("auth-status"));
    const signOutItem = await screen.findByRole("menuitem", { name: /sign out/i });
    expect(signOutItem).toBeInTheDocument();

    // Click sign out and assert the action fires
    await user.click(signOutItem);
    await waitFor(() => expect(signOutAction).toHaveBeenCalledOnce());
  });
});
