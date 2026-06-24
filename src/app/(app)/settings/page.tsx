import type { Metadata } from "next";
import { SettingsPageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Settings | SpendGuard",
};

export default function SettingsPage() {
  return (
    <PageFrame
      eyebrow="Profile controls"
      title="Settings"
      description="Update your financial baseline and manage the data stored for your account."
    >
      <SettingsPageContent />
    </PageFrame>
  );
}
