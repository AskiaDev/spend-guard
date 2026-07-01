"use client";

import {
  Activity,
  ArrowRight,
  MessageCircle,
  MessageCircleQuestion,
  ScanLine,
  Scale,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Grain } from "./grain";
import { useReveal, useRise } from "./motion";

// Honest to the product: no bank connection - users upload CSV/statements,
// analyzed with OCR. Vocabulary borrowed from the rest of the page
// (protected money / safe-to-spend / tradeoff / verdict / without shame).
const FAQS = [
  {
    icon: ShieldCheck,
    q: "Is my data secure?",
    a: "Absolutely. Your upload is encrypted, never sold, and never shared. You decide what stays private, and you can delete it anytime.",
  },
  {
    icon: ScanLine,
    q: "How does SpendGuard analyze my finances?",
    a: "You upload your bank history as a CSV or a photo of a statement. SpendGuard reads it with OCR, then separates protected money from what is genuinely safe to spend.",
  },
  {
    icon: Scale,
    q: "Will SpendGuard tell me what I can't buy?",
    a: "Never. We show the real tradeoff and a clear verdict, without shame. The decision always stays yours.",
  },
  {
    icon: Upload,
    q: "Do you connect to my bank?",
    a: "No. There is no login and no live link to your bank. You upload a CSV or statement and we read it with OCR, so your credentials never leave your hands.",
  },
  {
    icon: Activity,
    q: "What if I have irregular income?",
    a: "SpendGuard is built for it. It reads your real cash flow from what you upload, so freelancers and variable earners still get an accurate safe-to-spend.",
  },
] as const;

// Signature: the glowing lime speech-bubble that "speaks" - the one bold element.
function QuestionBubble() {
  return (
    <div className="relative" aria-hidden="true">
      <span className="absolute -top-2 -right-1 h-4 w-[3px] rotate-[30deg] rounded-full bg-brand/80" />
      <span className="absolute -top-4 right-3 h-5 w-[3px] rounded-full bg-brand/60" />
      <span className="absolute top-2 -right-4 h-4 w-[3px] rotate-[70deg] rounded-full bg-brand/70" />
      <MessageCircleQuestion
        className="size-28 text-brand drop-shadow-[0_0_26px_rgba(184,242,12,0.5)] sm:size-32"
        strokeWidth={1.5}
      />
    </div>
  );
}

export function FaqSection() {
  const { flow, beat } = useReveal(0.3);
  const reveal = useRise(0.2);

  return (
    <section
      id="faq"
      className="mx-auto w-full max-w-[1680px] scroll-mt-6 overflow-hidden rounded-[28px] border border-hair bg-paper-soft/60"
    >
      {/* Dark band: eyebrow + poster headline + the speech-bubble signature */}
      <div
        className="relative overflow-hidden px-6 pt-8 pb-28 sm:px-10 sm:pt-12 sm:pb-32"
        style={{
          background:
            "radial-gradient(circle at 85% 12%, rgba(184,242,12,0.10), transparent 42%), linear-gradient(160deg, #101412 0%, #090b0a 100%)",
        }}
      >
        <Grain />

        <div className="relative flex items-center gap-4">
          <span className="font-ledger text-xs uppercase tracking-[0.14em] text-ink-inverse sm:text-sm">
            <span className="text-brand">06</span> / FAQ
          </span>
          <span className="h-px flex-1 bg-slate-line" />
        </div>

        <motion.div {...flow} className="relative mt-10 flex items-end justify-between gap-6">
          <div>
            <motion.h2
              {...beat}
              className="font-poster text-[clamp(3.25rem,9vw,6.5rem)] leading-[0.82] tracking-[-0.01em] text-ink-inverse uppercase"
            >
              FAQ
            </motion.h2>
            <motion.p
              {...beat}
              className="mt-4 font-poster text-[clamp(1.5rem,3.6vw,2.5rem)] leading-[0.95] text-brand uppercase"
            >
              Answers that
              <br />
              bring confidence.
            </motion.p>
          </div>
          <motion.div {...beat} className="mb-2 hidden shrink-0 sm:block">
            <QuestionBubble />
          </motion.div>
        </motion.div>
      </div>

      {/* Paper card overlapping up into the dark band */}
      <div className="relative z-[2] px-4 sm:px-8">
        <motion.div
          {...reveal}
          className="ledger-sheet -mt-16 overflow-hidden rounded-[20px] border border-hair bg-paper-soft/95 shadow-[0_24px_60px_rgba(10,10,8,0.28)] sm:-mt-20"
        >
          <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
            {FAQS.map(({ icon: Icon, q, a }, i) => (
              <AccordionItem
                key={q}
                value={`item-${i}`}
                className="border-hair px-4 last:border-b-0 sm:px-6"
              >
                <AccordionTrigger className="gap-4 py-5 text-left text-base font-semibold text-ink hover:no-underline [&>svg]:text-ink-faint">
                  <span className="flex items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft/35 text-brand-dark">
                      <Icon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="leading-snug">{q}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-6 pl-[3.75rem] font-ledger text-sm leading-relaxed text-ink-soft">
                  {a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>

      {/* Still need help - dark closing bar */}
      <div className="px-4 pt-6 pb-4 sm:px-8 sm:pb-6">
        <motion.a
          {...reveal}
          href="/signup"
          className="group flex items-center justify-between gap-4 rounded-[18px] border border-slate-line px-6 py-6 sm:px-8"
          style={{
            background:
              "radial-gradient(circle at 90% 20%, rgba(184,242,12,0.10), transparent 45%), linear-gradient(135deg, #101412 0%, #090b0a 100%)",
          }}
        >
          <span className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-brand/40 text-brand">
              <MessageCircle className="size-5" strokeWidth={2} />
            </span>
            <span>
              <span className="block font-poster text-xl tracking-wide text-ink-inverse uppercase sm:text-2xl">
                Still need help?
              </span>
              <span className="mt-0.5 block font-ledger text-sm text-ink-inverse/60">
                We&apos;re just a message away.
              </span>
            </span>
          </span>
          <ArrowRight
            className="size-6 shrink-0 text-ink-inverse transition-transform duration-300 group-hover:translate-x-1"
            strokeWidth={2}
          />
        </motion.a>
      </div>
    </section>
  );
}
