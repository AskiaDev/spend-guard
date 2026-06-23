import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuthActionState } from "../api/auth-result";
import { AuthForm } from "./auth-form";

describe("AuthForm", () => {
  it("shows a confirmation-link failure supplied by the route", () => {
    render(
      <AuthForm
        mode="login"
        action={vi.fn()}
        notice="The confirmation link is invalid or expired. Request a new signup email."
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/invalid or expired/i);
  });

  it("shows a signup error returned by the server action", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<AuthActionState> => ({
      status: "error",
      message: "Email address is invalid.",
    }));

    render(<AuthForm mode="signup" action={action} />);

    await user.type(screen.getByLabelText(/email/i), "invalid@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email address is invalid.");
  });

  it("shows confirmation instructions after signup", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (): Promise<AuthActionState> => ({
      status: "check_email",
      message: "Check your email to confirm your account, then sign in.",
    }));

    render(<AuthForm mode="signup" action={action} />);

    await user.type(screen.getByLabelText(/email/i), "person@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/check your email/i);
  });
});
