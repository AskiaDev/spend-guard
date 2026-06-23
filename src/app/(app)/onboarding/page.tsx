import type { Metadata } from "next";
import { OnboardingPageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Onboarding | SpendGuard",
};

export default function OnboardingPage() {
  return (
    <PageFrame
      eyebrow="Financial setup"
      title="Let’s set up SpendGuard for you"
      description="Walk through income, savings, expenses, debt, and goals before local checks start guiding purchases."
    >
      <OnboardingPageContent />
    </PageFrame>
  );
}
