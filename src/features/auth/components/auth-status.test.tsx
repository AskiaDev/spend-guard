import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthStatus } from "./auth-status";

describe("AuthStatus", () => {
  it("shows the authenticated account and submits sign out", () => {
    render(
      <AuthStatus
        email="person@example.com"
        signOutAction={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByText("person@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toHaveAttribute("type", "submit");
  });
});
