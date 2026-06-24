import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CooldownPanel } from "@/features/cooldown";
import { DashboardOverview } from "@/features/dashboard";
import { DebtsPanel } from "@/features/debts";
import { ExpensesPanel } from "@/features/expenses";
import { GoalsPanel } from "@/features/goals";
import { PurchaseCheckerWizard, PurchaseResult } from "@/features/purchase-checker";
import { ReportsPanel } from "@/features/reports";
import { SettingsPanel } from "@/features/settings";
import { VoicePurchaseChecker } from "@/features/voice";
import { financialSnapshotFixture as defaultSnapshot } from "@/test/fixtures/financial-snapshot";
import { useFinancialStateContext } from "@/providers/financial-state-provider";
import {
  CooldownPageContent,
  DashboardPageContent,
  DebtsPageContent,
  ExpensesPageContent,
  GoalsPageContent,
  PurchaseCheckerPageContent,
  PurchaseResultPageContent,
  ReportsPageContent,
  SettingsPageContent,
  VoicePageContent,
} from "./page-adapters";

vi.mock("@/features/cooldown", () => ({
  CooldownPanel: vi.fn(() => <div data-testid="cooldown-panel" />),
}));

vi.mock("@/features/dashboard", () => ({
  DashboardOverview: vi.fn(() => <div data-testid="dashboard-overview" />),
}));

vi.mock("@/features/debts", () => ({
  DebtsPanel: vi.fn(() => <div data-testid="debts-panel" />),
}));

vi.mock("@/features/expenses", () => ({
  ExpensesPanel: vi.fn(() => <div data-testid="expenses-panel" />),
}));

vi.mock("@/features/goals", () => ({
  GoalsPanel: vi.fn(() => <div data-testid="goals-panel" />),
}));

vi.mock("@/features/purchase-checker", () => ({
  PurchaseCheckerWizard: vi.fn(() => <div data-testid="purchase-checker-wizard" />),
  PurchaseResult: vi.fn(({ check }: { check?: { itemName: string } }) => (
    <div data-testid="purchase-result">{check?.itemName ?? "Example decision"}</div>
  )),
}));

vi.mock("@/features/reports", () => ({
  ReportsPanel: vi.fn(() => <div data-testid="reports-panel" />),
}));

vi.mock("@/features/settings", () => ({
  SettingsPanel: vi.fn(() => <div data-testid="settings-panel" />),
}));

vi.mock("@/features/voice", () => ({
  VoicePurchaseChecker: vi.fn(() => <div data-testid="voice-purchase-checker" />),
}));

vi.mock("@/providers/financial-state-provider", () => ({
  useFinancialStateContext: vi.fn(),
}));

type FinancialState = ReturnType<typeof useFinancialStateContext>;

describe("page adapters", () => {
  let financialState: FinancialState;

  beforeEach(() => {
    vi.clearAllMocks();

    financialState = {
      snapshot: defaultSnapshot,
      checks: [
        {
          id: "check_latest",
          createdAt: "2026-06-20T00:00:00.000Z",
          itemName: "Laptop",
          amount: 45000,
          urgency: "can_wait",
          paymentMethod: "cash",
          decision: "WAIT",
          riskScore: 50,
          safeToSpend: 20000,
          monthlyFreeCashFlow: 10000,
          savingsAfterPurchase: 75000,
          cooldownDays: 7,
          advisorText: "Wait before buying.",
          reasons: ["Purchase exceeds safe-to-spend."],
        },
      ],
      cooldownItems: [
        {
          id: "cooldown_laptop",
          itemName: "Laptop",
          amount: 45000,
          urgency: "can_wait",
          paymentMethod: "cash",
          addedAt: "2026-06-20T00:00:00.000Z",
          recheckAt: "2026-06-27T00:00:00.000Z",
          sourceCheckId: "check_latest",
        },
      ],
      weeklyReports: [
        {
          id: "report_current",
          createdAt: "2026-06-20T00:00:00.000Z",
          weekStart: "2026-06-15",
          summary: "Spending remained within plan.",
          healthScore: 82,
          safeToSpend: 20000,
        },
      ],
      isHydrated: true,
      metrics: {
        safeToSpend: 20000,
        monthlyFreeCashFlow: 10000,
        healthScore: 82,
      },
      replaceFinancialSetup: vi.fn(),
      runPurchaseCheck: vi.fn(),
      addGoalFromCheck: vi.fn(),
      addGoalFromCooldown: vi.fn(),
      createGoal: vi.fn(),
      createExpense: vi.fn(),
      updateExpense: vi.fn(),
      deleteExpense: vi.fn(),
      createDebt: vi.fn(),
      updateDebt: vi.fn(),
      deleteDebt: vi.fn(),
      updateProfileSettings: vi.fn(),
      deleteFinancialData: vi.fn(),
      deleteVoiceTranscripts: vi.fn(),
      addCooldownFromCheck: vi.fn(),
      markPurchaseCheckStatus: vi.fn(),
      removeCooldownItem: vi.fn(),
      deleteGoal: vi.fn(),
      generateWeeklyReport: vi.fn(),
      confirmVoiceDraft: vi.fn(),
      refresh: vi.fn(),
      error: null,
    };
    vi.mocked(useFinancialStateContext).mockReturnValue(financialState);
  });

  it("passes dashboard state slices without replacing their identities", () => {
    render(<DashboardPageContent />);

    expect(screen.getByTestId("dashboard-overview")).toBeInTheDocument();
    expect(DashboardOverview).toHaveBeenCalledOnce();

    const props = vi.mocked(DashboardOverview).mock.calls[0][0];
    expect(props.snapshot).toBe(financialState.snapshot);
    expect(props.checks).toBe(financialState.checks);
    expect(props.metrics).toBe(financialState.metrics);
  });

  it("passes the purchase-check mutation to the checker wizard", () => {
    render(<PurchaseCheckerPageContent />);

    expect(screen.getByTestId("purchase-checker-wizard")).toBeInTheDocument();
    expect(PurchaseCheckerWizard).toHaveBeenCalledOnce();

    const props = vi.mocked(PurchaseCheckerWizard).mock.calls[0][0];
    expect(props.onRunCheck).toBe(financialState.runPurchaseCheck);
  });

  it("waits for hydration before passing the exact purchase-check mutation to voice", () => {
    vi.mocked(useFinancialStateContext).mockReturnValue({
      ...financialState,
      isHydrated: false,
    });
    const { rerender } = render(<VoicePageContent />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading local financial workspace..."
    );
    expect(VoicePurchaseChecker).not.toHaveBeenCalled();

    vi.mocked(useFinancialStateContext).mockReturnValue(financialState);
    rerender(<VoicePageContent />);

    expect(screen.queryByText("Loading local financial workspace...")).not.toBeInTheDocument();
    expect(screen.getByTestId("voice-purchase-checker")).toBeInTheDocument();
    expect(VoicePurchaseChecker).toHaveBeenCalledOnce();
    expect(vi.mocked(VoicePurchaseChecker).mock.calls[0][0].onRunCheck).toBe(
      financialState.runPurchaseCheck
    );
  });

  it("reactively passes the latest check and exact result callback identities", () => {
    const initialState = {
      ...financialState,
      checks: [],
    };
    vi.mocked(useFinancialStateContext).mockReturnValue(initialState);
    const { rerender } = render(<PurchaseResultPageContent />);

    expect(screen.getByTestId("purchase-result")).toBeInTheDocument();
    expect(screen.getByText("Example decision")).toBeInTheDocument();
    expect(PurchaseResult).toHaveBeenCalledOnce();

    const initialProps = vi.mocked(PurchaseResult).mock.calls[0][0];
    expect(initialProps.check).toBeUndefined();
    expect(initialProps.currency).toBe(initialState.snapshot.profile.currency);
    expect(initialProps.onAddGoal).toBe(initialState.addGoalFromCheck);
    expect(initialProps.onAddCooldown).toBe(initialState.addCooldownFromCheck);
    expect(initialProps.onMarkStatus).toBe(initialState.markPurchaseCheckStatus);

    const latestCheck = financialState.checks[0];
    const updatedState = {
      ...initialState,
      checks: [latestCheck],
    };
    vi.mocked(useFinancialStateContext).mockReturnValue(updatedState);
    rerender(<PurchaseResultPageContent />);

    expect(screen.queryByText("Example decision")).not.toBeInTheDocument();
    expect(screen.getByText(latestCheck.itemName)).toBeInTheDocument();
    expect(PurchaseResult).toHaveBeenCalledTimes(2);
    const updatedProps = vi.mocked(PurchaseResult).mock.calls[1][0];
    expect(updatedProps.check).toBe(latestCheck);
    expect(updatedProps.currency).toBe(updatedState.snapshot.profile.currency);
    expect(updatedProps.onAddGoal).toBe(updatedState.addGoalFromCheck);
    expect(updatedProps.onAddCooldown).toBe(updatedState.addCooldownFromCheck);
    expect(updatedProps.onMarkStatus).toBe(updatedState.markPurchaseCheckStatus);
  });

  it("passes goals state and callback identities", () => {
    render(<GoalsPageContent />);

    expect(screen.getByTestId("goals-panel")).toBeInTheDocument();
    expect(GoalsPanel).toHaveBeenCalledOnce();

    const props = vi.mocked(GoalsPanel).mock.calls[0][0];
    expect(props.snapshot).toBe(financialState.snapshot);
    expect(props.monthlyFreeCashFlow).toBe(financialState.metrics.monthlyFreeCashFlow);
    expect(props.onCreateGoal).toBe(financialState.createGoal);
    expect(props.onDeleteGoal).toBe(financialState.deleteGoal);
  });

  it("passes expense state and callback identities", () => {
    render(<ExpensesPageContent />);

    expect(screen.getByTestId("expenses-panel")).toBeInTheDocument();
    expect(ExpensesPanel).toHaveBeenCalledOnce();

    const props = vi.mocked(ExpensesPanel).mock.calls[0][0];
    expect(props.expenses).toBe(financialState.snapshot.expenses);
    expect(props.currency).toBe(financialState.snapshot.profile.currency);
    expect(props.onCreateExpense).toBe(financialState.createExpense);
    expect(props.onUpdateExpense).toBe(financialState.updateExpense);
    expect(props.onDeleteExpense).toBe(financialState.deleteExpense);
  });

  it("passes debt state and callback identities", () => {
    render(<DebtsPageContent />);

    expect(screen.getByTestId("debts-panel")).toBeInTheDocument();
    expect(DebtsPanel).toHaveBeenCalledOnce();

    const props = vi.mocked(DebtsPanel).mock.calls[0][0];
    expect(props.debts).toBe(financialState.snapshot.debts);
    expect(props.currency).toBe(financialState.snapshot.profile.currency);
    expect(props.onCreateDebt).toBe(financialState.createDebt);
    expect(props.onUpdateDebt).toBe(financialState.updateDebt);
    expect(props.onDeleteDebt).toBe(financialState.deleteDebt);
  });

  it("passes cooldown state and callback identities", () => {
    render(<CooldownPageContent />);

    expect(screen.getByTestId("cooldown-panel")).toBeInTheDocument();
    expect(CooldownPanel).toHaveBeenCalledOnce();

    const props = vi.mocked(CooldownPanel).mock.calls[0][0];
    expect(props.items).toBe(financialState.cooldownItems);
    expect(props.currency).toBe(financialState.snapshot.profile.currency);
    expect(props.snapshot).toBe(financialState.snapshot);
    expect(props.onRemove).toBe(financialState.removeCooldownItem);
    expect(props.onConvertToGoal).toBe(financialState.addGoalFromCooldown);
  });

  it("passes report state and callback identities", () => {
    render(<ReportsPageContent />);

    expect(screen.getByTestId("reports-panel")).toBeInTheDocument();
    expect(ReportsPanel).toHaveBeenCalledOnce();

    const props = vi.mocked(ReportsPanel).mock.calls[0][0];
    expect(props.reports).toBe(financialState.weeklyReports);
    expect(props.currency).toBe(financialState.snapshot.profile.currency);
    expect(props.onGenerateReport).toBe(financialState.generateWeeklyReport);
  });

  it("passes settings state and callback identities", () => {
    render(<SettingsPageContent />);

    expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
    expect(SettingsPanel).toHaveBeenCalledOnce();

    const props = vi.mocked(SettingsPanel).mock.calls[0][0];
    expect(props.profile).toBe(financialState.snapshot.profile);
    expect(props.onUpdateProfile).toBe(financialState.updateProfileSettings);
    expect(props.onDeleteFinancialData).toBe(financialState.deleteFinancialData);
    expect(props.onDeleteVoiceTranscripts).toBe(financialState.deleteVoiceTranscripts);
  });

});

