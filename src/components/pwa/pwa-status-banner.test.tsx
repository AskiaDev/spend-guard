import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PwaStatusBanner } from "./pwa-status-banner";

describe("PwaStatusBanner", () => {
  it("shows an offline read-only status", () => {
    render(<PwaStatusBanner isOnline={false} updateReady={false} />);

    expect(screen.getByRole("status")).toHaveTextContent("Offline");
    expect(screen.getByRole("status")).toHaveTextContent("New saves are paused");
  });

  it("lets the user apply a waiting service worker update", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();

    render(<PwaStatusBanner isOnline updateReady onReload={onReload} />);

    await user.click(screen.getByRole("button", { name: "Reload now" }));

    expect(onReload).toHaveBeenCalledOnce();
  });
});
