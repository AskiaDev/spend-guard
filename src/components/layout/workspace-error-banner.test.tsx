import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFinancialStateContext } from "@/providers/financial-state-provider";
import { WorkspaceErrorBanner } from "./workspace-error-banner";

vi.mock("@/providers/financial-state-provider", () => ({
  useFinancialStateContext: vi.fn(),
}));

const refresh = vi.fn();

function mockWorkspaceState(
  overrides: Partial<ReturnType<typeof useFinancialStateContext>> = {}
) {
  vi.mocked(useFinancialStateContext).mockReturnValue({
    error: null,
    refresh,
    isHydrated: true,
    isFetching: false,
    isLoading: false,
    isStale: false,
    hasWorkspaceData: true,
    isWorkspaceEmpty: false,
    ...overrides,
  } as ReturnType<typeof useFinancialStateContext>);
}

describe("WorkspaceErrorBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceState();
  });

  it("shows a background refetch status while keeping stale data visible", () => {
    mockWorkspaceState({ isFetching: true, isStale: true });

    render(<WorkspaceErrorBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Refreshing financial workspace..."
    );
  });

  it("shows a stale-data retry state when cached workspace data is old", () => {
    mockWorkspaceState({ isStale: true });

    render(<WorkspaceErrorBanner />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing saved financial workspace data."
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeVisible();
  });
});
