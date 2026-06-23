import type { Metadata } from "next";
import { VoicePageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Voice Purchase Checker | SpendGuard",
};

export default function VoicePurchaseCheckerPage() {
  return (
    <PageFrame
      eyebrow="Hands-free input"
      title="Voice Purchase Checker"
      description="Capture or paste a purchase request, confirm the extracted fields, and run the same local check."
    >
      <VoicePageContent />
    </PageFrame>
  );
}
