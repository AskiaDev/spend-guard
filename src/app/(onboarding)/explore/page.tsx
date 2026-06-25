import type { Metadata } from "next";
import { ExploreSandbox } from "@/features/onboarding/conversational/components/explore-sandbox";

export const metadata: Metadata = { title: "Try SpendGuard | SpendGuard" };

export default function ExplorePage() {
  return <ExploreSandbox />;
}
