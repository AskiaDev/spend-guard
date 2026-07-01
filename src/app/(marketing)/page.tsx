import type { Metadata } from "next";
import { BenefitsSection } from "./_components/benefits-section";
import { FaqSection } from "./_components/faq-section";
import { FinalCta } from "./_components/final-cta";
import { Hero } from "./_components/hero";
import { HowItWorks } from "./_components/how-it-works";
import { ProblemSection } from "./_components/problem-section";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import { SolutionSection } from "./_components/solution-section";

export const metadata: Metadata = {
  title: "SpendGuard - See the real tradeoff before you buy",
  description:
    "SpendGuard separates protected money from safe-to-spend money so you can make clearer purchase decisions without shame.",
};

export default function LandingPage() {
  return (
    <main className="space-y-5 p-3 sm:p-5">
      <section className="ledger-sheet mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-[1680px] flex-col overflow-hidden rounded-[28px] border border-hair bg-paper-soft/60 sm:min-h-[calc(100svh-2.5rem)]">
        <SiteHeader />
        <Hero />
      </section>

      <ProblemSection />

      <SolutionSection />

      <HowItWorks />

      <BenefitsSection />

      <FaqSection />

      <FinalCta />

      <SiteFooter />
    </main>
  );
}
