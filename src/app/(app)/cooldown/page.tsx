import type { Metadata } from "next";
import { CooldownPageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Cooldown / Wishlist | SpendGuard",
};

export default function CooldownPage() {
  return (
    <PageFrame
      eyebrow="Pause before buying"
      title="Cooldown / Wishlist"
      description="Sort paused wants, recheck risk, and convert the right items into savings goals."
    >
      <CooldownPageContent />
    </PageFrame>
  );
}
