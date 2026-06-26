import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { financialSnapshotFixture } from "@/test/fixtures/financial-snapshot";
import type { FinancialProfile } from "@/types/finance";
import { SettingsPanel } from "./settings-panel";

vi.mock("goey-toast", () => ({ gooeyToast: { success: vi.fn(), error: vi.fn() } }));

import { gooeyToast } from "goey-toast";

function renderSettingsPanel({
  profile = financialSnapshotFixture.profile,
  onUpdateProfile = vi.fn().mockResolvedValue(undefined),
  onDeleteFinancialData = vi.fn().mockResolvedValue(undefined),
  onDeleteVoiceTranscripts = vi.fn().mockResolvedValue(undefined),
}: {
  profile?: FinancialProfile;
  onUpdateProfile?: (profile: FinancialProfile) => Promise<void>;
  onDeleteFinancialData?: () => Promise<void>;
  onDeleteVoiceTranscripts?: () => Promise<void>;
} = {}) {
  return render(
    <SettingsPanel
      profile={profile}
      onUpdateProfile={onUpdateProfile}
      onDeleteFinancialData={onDeleteFinancialData}
      onDeleteVoiceTranscripts={onDeleteVoiceTranscripts}
    />
  );
}

describe("SettingsPanel", () => {
  it("renders the current profile values", () => {
    renderSettingsPanel();

    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(screen.getByLabelText("Full name")).toHaveValue("Askia");
    // Radix Select triggers display the selected label as text content
    expect(screen.getByLabelText("Currency")).toHaveTextContent("PHP");
    expect(screen.getByLabelText("Monthly income")).toHaveValue(85000);
    expect(screen.getByLabelText("Current savings")).toHaveValue(120000);
    expect(screen.getByLabelText("Emergency fund target")).toHaveValue(180000);
    expect(screen.getByLabelText("Pay frequency")).toHaveTextContent("Monthly");
    expect(screen.getByLabelText("Variable expenses")).toHaveValue(12000);
  });

  it("updates profile settings from the form", async () => {
    const user = userEvent.setup();
    const onUpdateProfile = vi.fn().mockResolvedValue(undefined);
    renderSettingsPanel({ onUpdateProfile });

    await user.clear(screen.getByLabelText("Monthly income"));
    await user.type(screen.getByLabelText("Monthly income"), "95000");

    // Radix Select: click trigger to open, then click the option
    await user.click(screen.getByLabelText("Pay frequency"));
    await user.click(await screen.findByRole("option", { name: "Weekly" }));

    await user.click(screen.getByLabelText("Currency"));
    await user.click(await screen.findByRole("option", { name: "USD" }));

    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(onUpdateProfile).toHaveBeenCalledWith({
      currency: "USD",
      fullName: "Askia",
      monthlyIncome: 95_000,
      currentSavings: 120_000,
      emergencyFundTarget: 180_000,
      emergencyBuffer: 36_000,
      cooldownPreference: "balanced",
      payFrequency: "weekly",
      estimatedVariableExpenses: 12_000,
    });
  });

  it("shows save toast on successful settings update", async () => {
    const user = userEvent.setup();
    const onUpdateProfile = vi.fn().mockResolvedValue(undefined);
    renderSettingsPanel({ onUpdateProfile });

    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(onUpdateProfile).toHaveBeenCalledOnce();
    expect(gooeyToast.success).toHaveBeenCalledWith("Settings saved");
  });

  it("blocks invalid profile input with accessible errors", async () => {
    const user = userEvent.setup();
    const onUpdateProfile = vi.fn().mockResolvedValue(undefined);
    renderSettingsPanel({ onUpdateProfile });

    await user.clear(screen.getByLabelText("Monthly income"));
    await user.type(screen.getByLabelText("Monthly income"), "-1");
    await user.clear(screen.getByLabelText("Current savings"));
    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Enter a positive monthly income.");
    expect(alert).toHaveTextContent("Enter a positive current savings amount.");
    expect(onUpdateProfile).not.toHaveBeenCalled();
  });

  it("deletes financial data through AlertDialog confirm", async () => {
    const user = userEvent.setup();
    const onDeleteFinancialData = vi.fn().mockResolvedValue(undefined);
    renderSettingsPanel({ onDeleteFinancialData });

    await user.click(screen.getByRole("button", { name: /Delete Financial Data/i }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(onDeleteFinancialData).toHaveBeenCalledOnce();
    expect(gooeyToast.success).toHaveBeenCalledWith("Financial data deleted.");
  });

  it("cancels financial data deletion when dialog is dismissed", async () => {
    const user = userEvent.setup();
    const onDeleteFinancialData = vi.fn().mockResolvedValue(undefined);
    renderSettingsPanel({ onDeleteFinancialData });

    await user.click(screen.getByRole("button", { name: /Delete Financial Data/i }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(onDeleteFinancialData).not.toHaveBeenCalled();
  });

  it("deletes only voice transcripts through its own AlertDialog", async () => {
    const user = userEvent.setup();
    const onDeleteVoiceTranscripts = vi.fn().mockResolvedValue(undefined);
    const onDeleteFinancialData = vi.fn().mockResolvedValue(undefined);
    renderSettingsPanel({ onDeleteVoiceTranscripts, onDeleteFinancialData });

    await user.click(screen.getByRole("button", { name: /Delete Voice Transcripts/i }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(onDeleteVoiceTranscripts).toHaveBeenCalledOnce();
    expect(onDeleteFinancialData).not.toHaveBeenCalled();
    expect(gooeyToast.success).toHaveBeenCalledWith("Voice transcripts deleted.");
  });
});
