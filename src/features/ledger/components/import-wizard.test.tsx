import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { financialWorkspaceKeys } from "@/features/financial-profile/api/financial-workspace-query";
import { confirmLedgerEntriesAction } from "@/features/ledger/api/confirm-ledger-entries";
import { ledgerKeys } from "@/features/ledger/api/ledger-queries";
import { ImportWizard } from "./import-wizard";

vi.mock("@/features/ledger/api/confirm-ledger-entries", () => ({
  confirmLedgerEntriesAction: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

  return { invalidateSpy };
}

describe("ImportWizard", () => {
  it("saves checked transactions without redirecting away from import", async () => {
    vi.mocked(confirmLedgerEntriesAction).mockResolvedValue({
      ok: true,
      data: { inserted: 1 },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          candidate: {
            occurredAt: "2026-05-02",
            direction: "expense",
            amount: 11.15,
            counterparty: "Lunch",
            category: "food",
            confidence: 0.91,
          },
          autoConfirm: true,
        })
      )
    );

    const { invalidateSpy } = renderWithQueryClient(<ImportWizard />);

    const file = new File(["receipt"], "receipt.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Select receipt images"), {
      target: { files: [file] },
    });

    await screen.findByRole("row", { name: /receipt\.png/i });
    fireEvent.click(screen.getByRole("button", { name: "Save 1 transaction" }));

    await waitFor(() =>
      expect(confirmLedgerEntriesAction).toHaveBeenCalledWith({
        entries: [
          {
            occurredAt: "2026-05-02",
            direction: "expense",
            amount: 11.15,
            counterparty: "Lunch",
            category: "food",
            confidence: 0.91,
            sourceRef: "receipt.png",
          },
        ],
      })
    );

    expect(await screen.findByRole("status")).toHaveTextContent("Saved 1 transaction.");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ledgerKeys.transactions() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: financialWorkspaceKeys.workspace() });
  });
});
