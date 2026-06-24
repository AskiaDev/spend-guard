import type { Metadata } from "next";
import { OnboardingWizard } from "@/features/onboarding/vault/components/onboarding-wizard";

export const metadata: Metadata = { title: "Welcome | SpendGuard" };

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
