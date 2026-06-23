import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptySnapshot } from "@/lib/storage/default-data";

const actions = vi.hoisted(() => ({
  load: vi.fn(),
  saveProfile: vi.fn(),
  saveCheck: vi.fn(),
  markStatus: vi.fn(),
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
  createCooldown: vi.fn(),
  deleteCooldown: vi.fn(),
  createReport: vi.fn(),
  saveVoice: vi.fn(),
}));

vi.mock("@/features/financial-profile/api/load-financial-workspace", () => ({
  loadFinancialWorkspaceAction: actions.load,
}));
vi.mock("@/features/financial-profile/api/save-financial-profile", () => ({
  saveFinancialProfileAction: actions.saveProfile,
}));
vi.mock("@/features/purchase-checker/api/save-purchase-check", () => ({
  savePurchaseCheckAction: actions.saveCheck,
  markPurchaseCheckStatusAction: actions.markStatus,
}));
vi.mock("@/features/goals/api/create-goal", () => ({
  createGoalAction: actions.createGoal,
  deleteGoalAction: actions.deleteGoal,
}));
vi.mock("@/features/cooldown/api/create-cooldown-item", () => ({
  createCooldownItemAction: actions.createCooldown,
  deleteCooldownItemAction: actions.deleteCooldown,
}));
vi.mock("@/features/reports/api/create-weekly-report", () => ({
  createWeeklyReportAction: actions.createReport,
}));
vi.mock("@/features/purchase-checker/api/save-voice-session", () => ({
  saveVoiceSessionAction: actions.saveVoice,
}));
import { useFinancialState } from "./use-financial-state";

describe("useFinancialState Supabase mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.load.mockResolvedValue({
      ok: true,
      data: {
        snapshot: emptySnapshot,
        checks: [],
        cooldownItems: [],
        weeklyReports: [],
      },
    });
    actions.saveProfile.mockResolvedValue({ ok: true, data: null });
    actions.saveCheck.mockResolvedValue({
      ok: true,
      data: {
        id: "4fd8e28f-798a-4d71-b279-3ea9473c9ba3",
        createdAt: "2026-06-20T02:00:00.000Z",
      },
    });
    actions.markStatus.mockResolvedValue({ ok: true, data: null });
    actions.createGoal.mockResolvedValue({ ok: true, data: null });
    actions.deleteGoal.mockResolvedValue({ ok: true, data: null });
    actions.createCooldown.mockResolvedValue({ ok: true, data: null });
    actions.deleteCooldown.mockResolvedValue({ ok: true, data: null });
    actions.createReport.mockResolvedValue({ ok: true, data: null });
    actions.saveVoice.mockResolvedValue({ ok: true, data: null });
  });

  it("hydrates a new account from Supabase by default", async () => {
    const { result } = renderHook(() => useFinancialState());

    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(actions.load).toHaveBeenCalledTimes(1);
    expect(result.current.snapshot).toEqual(emptySnapshot);
    expect(result.current.error).toBeNull();
  });

  it("surfaces a remote hydration failure", async () => {
    actions.load.mockResolvedValue({ ok: false, error: "Unable to load your financial workspace." });

    const { result } = renderHook(() => useFinancialState());

    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.error).toBe("Unable to load your financial workspace.");
  });

  it("routes active financial workflows through authenticated actions", async () => {
    const { result } = renderHook(() => useFinancialState());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    const setup = {
      profile: {
        currency: "PHP" as const,
        monthlyIncome: 90_000,
        currentSavings: 180_000,
        emergencyFundTarget: 150_000,
      },
      expenses: [
        { id: "expense-1", label: "Rent", amount: 28_000, dueDay: 1, isRecurring: true },
      ],
      debts: [],
      goals: [],
    };

    await act(async () => result.current.replaceFinancialSetup(setup));
    expect(actions.saveProfile).toHaveBeenCalledWith(setup);

    let savedCheck: Awaited<ReturnType<typeof result.current.runPurchaseCheck>> | undefined;
    await act(async () => {
      savedCheck = await result.current.runPurchaseCheck({
        itemName: "Phone",
        amount: 25_000,
        category: "phone",
        saleDeadline: "2026-07-15",
        location: "Makati showroom",
        notes: "Ask if delivery is included.",
        urgency: "can_wait",
        paymentMethod: "cash",
      });
    });

    expect(savedCheck?.check.id).toBe("4fd8e28f-798a-4d71-b279-3ea9473c9ba3");
    expect(actions.saveCheck).toHaveBeenCalledWith(
      expect.objectContaining({ itemName: "Phone" }),
      expect.objectContaining({ decision: "WAIT", cooldownDays: 7 })
    );

    await act(async () => {
      await result.current.createGoal({
        label: "Camera upgrade",
        targetAmount: 60_000,
        savedAmount: 10_000,
        monthlyContribution: 8_000,
        targetDate: "2026-12-15",
        priority: "high",
      });
      await result.current.addGoalFromCheck(savedCheck!.check);
      await result.current.addCooldownFromCheck(savedCheck!.check);
      await result.current.markPurchaseCheckStatus(savedCheck!.check, "bought");
      await result.current.deleteGoal("goal-1");
      await result.current.removeCooldownItem("cooldown-1");
      await result.current.generateWeeklyReport();
      await result.current.confirmVoiceDraft({
        transcript: "Can I buy a phone for 25k?",
        itemName: "phone",
        amount: 25_000,
        urgency: "want",
        paymentMethod: "cash",
        requiresConfirmation: true,
        confidence: 0.74,
      });
    });

    expect(actions.createGoal).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Camera upgrade" })
    );
    expect(actions.createGoal).toHaveBeenCalledWith(expect.objectContaining({ label: "Phone" }));
    expect(actions.createCooldown).toHaveBeenCalledWith(
      expect.objectContaining({ sourceCheckId: savedCheck?.check.id })
    );
    expect(actions.markStatus).toHaveBeenCalledWith(savedCheck?.check.id, "bought");
    expect(actions.deleteGoal).toHaveBeenCalledWith("goal-1");
    expect(actions.deleteCooldown).toHaveBeenCalledWith("cooldown-1");
    expect(actions.createReport).toHaveBeenCalledWith(
      expect.objectContaining({ healthScore: expect.any(Number) })
    );
    expect(actions.saveVoice).toHaveBeenCalledWith({
      transcript: "Can I buy a phone for 25k?",
      extractedFields: expect.objectContaining({ itemName: "phone" }),
    });
  });

  it("keeps the last remote mutation error visible", async () => {
    actions.saveProfile.mockResolvedValue({ ok: false, error: "Unable to save your profile." });
    const { result } = renderHook(() => useFinancialState());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    await act(async () => {
      await result.current.replaceFinancialSetup({
        profile: emptySnapshot.profile,
        expenses: [],
        debts: [],
        goals: [],
      });
    });

    expect(result.current.error).toBe("Unable to save your profile.");
  });

  it("surfaces failures from each remote workflow", async () => {
    const { result } = renderHook(() => useFinancialState());
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    const check = {
      id: "4fd8e28f-798a-4d71-b279-3ea9473c9ba3",
      itemName: "Phone",
      amount: 25_000,
      urgency: "want" as const,
      paymentMethod: "cash" as const,
      createdAt: "2026-06-20T02:00:00.000Z",
      decision: "WAIT" as const,
      riskScore: 50,
      safeToSpend: 0,
      monthlyFreeCashFlow: 0,
      savingsAfterPurchase: 0,
      emergencyProgress: 0,
      debtPressure: 0,
      goalDelayMonths: 0,
      healthScore: 0,
      cooldownDays: 30,
      status: "checked" as const,
      advisorText: "Wait.",
      reasons: ["This would exceed today's safe-to-spend amount."],
    };

    actions.saveCheck.mockResolvedValueOnce({ ok: false, error: "Check failed." });
    await act(async () => {
      await expect(
        result.current.runPurchaseCheck({
          itemName: "Phone",
          amount: 25_000,
          urgency: "want",
          paymentMethod: "cash",
        })
      ).rejects.toThrow("Check failed.");
    });
    expect(result.current.error).toBe("Check failed.");

    const failures = [
      [actions.createCooldown, () => result.current.addCooldownFromCheck(check), "Cooldown failed."],
      [
        actions.deleteCooldown,
        () => result.current.removeCooldownItem("cooldown-1"),
        "Delete cooldown failed.",
      ],
      [actions.createReport, () => result.current.generateWeeklyReport(), "Report failed."],
    ] as const;

    for (const [mock, operation, message] of failures) {
      mock.mockResolvedValueOnce({ ok: false, error: message });
      await act(async () => {
        await operation();
      });
      expect(result.current.error).toBe(message);
    }

    actions.createGoal.mockResolvedValueOnce({ ok: false, error: "Goal failed." });
    await act(async () => {
      await expect(
        result.current.createGoal({
          label: "Camera upgrade",
          targetAmount: 60_000,
          savedAmount: 10_000,
          monthlyContribution: 8_000,
          priority: "high",
        })
      ).rejects.toThrow("Goal failed.");
    });
    expect(result.current.error).toBe("Goal failed.");

    actions.createGoal.mockResolvedValueOnce({ ok: false, error: "Goal failed." });
    await act(async () => {
      await expect(result.current.addGoalFromCheck(check)).rejects.toThrow("Goal failed.");
    });
    expect(result.current.error).toBe("Goal failed.");

    actions.deleteGoal.mockResolvedValueOnce({ ok: false, error: "Delete goal failed." });
    await act(async () => {
      await expect(result.current.deleteGoal("goal-1")).rejects.toThrow("Delete goal failed.");
    });
    expect(result.current.error).toBe("Delete goal failed.");

    actions.markStatus.mockResolvedValueOnce({ ok: false, error: "Status failed." });
    await act(async () => {
      await expect(result.current.markPurchaseCheckStatus(check, "skipped")).rejects.toThrow(
        "Status failed."
      );
    });
    expect(result.current.error).toBe("Status failed.");

    actions.saveVoice.mockResolvedValueOnce({ ok: false, error: "Voice failed." });
    await act(async () => {
      await result.current.confirmVoiceDraft({
        transcript: "Phone for 25k",
        requiresConfirmation: true,
        confidence: 0.4,
      });
    });
    expect(result.current.error).toBe("Voice failed.");
  });
});
