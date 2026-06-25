import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { financialSnapshotFixture } from "@/test/fixtures/financial-snapshot";
import type { FinancialProfile } from "@/types/finance";
import { SettingsPanel } from "./settings-panel";

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
    expect(screen.getByLabelText("Currency")).toHaveValue("PHP");
    expect(screen.getByLabelText("Monthly income")).toHaveValue(85000);
    expect(screen.getByLabelText("Current savings")).toHaveValue(120000);
    expect(screen.getByLabelText("Emergency fund target")).toHaveValue(180000);
    expect(screen.getByLabelText("Pay frequency")).toHaveValue("monthly");
    expect(screen.getByLabelText("Variable expenses")).toHaveValue(12000);
  });

  it("updates profile settings from the form", async () => {
    const user = userEvent.setup();
    const onUpdateProfile = vi.fn().mockResolvedValue(undefined);
    renderSettingsPanel({ onUpdateProfile });

    await user.clear(screen.getByLabelText("Monthly income"));
    await user.type(screen.getByLabelText("Monthly income"), "95000");
    await user.selectOptions(screen.getByLabelText("Pay frequency"), "weekly");
    await user.selectOptions(screen.getByLabelText("Currency"), "USD");
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

  it("requires confirmation before deleting financial data", async () => {
    const user = userEvent.setup();
    const onDeleteFinancialData = vi.fn().mockResolvedValue(undefined);
    renderSettingsPanel({ onDeleteFinancialData });

    await user.click(screen.getByRole("button", { name: "Delete Financial Data" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Confirm that you want to delete your financial data."
    );
    expect(onDeleteFinancialData).not.toHaveBeenCalled();

    await user.click(
      screen.getByLabelText(
        "I understand this deletes my financial data and keeps my login account."
      )
    );
    await user.click(screen.getByRole("button", { name: "Delete Financial Data" }));

    expect(onDeleteFinancialData).toHaveBeenCalledOnce();
  });

  it("deletes only voice transcripts after its own confirmation", async () => {
    const user = userEvent.setup();
    const onDeleteVoiceTranscripts = vi.fn().mockResolvedValue(undefined);
    const onDeleteFinancialData = vi.fn().mockResolvedValue(undefined);
    renderSettingsPanel({ onDeleteVoiceTranscripts, onDeleteFinancialData });

    await user.click(screen.getByRole("button", { name: "Delete Voice Transcripts" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Confirm that you want to delete your voice transcripts."
    );
    expect(onDeleteVoiceTranscripts).not.toHaveBeenCalled();

    await user.click(
      screen.getByLabelText("I understand this permanently deletes my saved voice transcripts.")
    );
    await user.click(screen.getByRole("button", { name: "Delete Voice Transcripts" }));

    expect(onDeleteVoiceTranscripts).toHaveBeenCalledOnce();
    expect(onDeleteFinancialData).not.toHaveBeenCalled();
  });
});
