import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/goals" }));

describe("AppShell", () => {
  it("marks the matching desktop and mobile destination as current", () => {
    render(
      <AppShell>
        <h1>Goals content</h1>
      </AppShell>
    );

    expect(screen.getAllByRole("link", { name: "Goals" })).toHaveLength(2);
    for (const link of screen.getAllByRole("link", { name: "Goals" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }

    const currentLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(currentLinks).toHaveLength(2);
    for (const link of currentLinks) {
      expect(link).toHaveAccessibleName("Goals");
    }
    expect(screen.getByRole("link", { name: "Debts" })).not.toHaveAttribute("aria-current");
  });

  it("renders the shell landmarks and child content once", () => {
    render(
      <AppShell>
        <h1>Goals content</h1>
      </AppShell>
    );

    expect(screen.getByRole("img", { name: "SpendGuard" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Dashboard" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Purchase Checker" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Voice Check" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Goals" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Cooldown" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Home" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Checker" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Voice" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "More" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Debts" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Reports" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Settings" })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { name: "Goals content" })).toHaveLength(1);
  });
});
