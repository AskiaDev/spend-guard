"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  ChevronRight,
  House,
  ShieldCheck,
  ShoppingBag,
  Target,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";
import { Donut } from "./donut";
import { useReveal } from "./motion";

const STEPS = [
  { n: "01", title: "Add the purchase", desc: "Tell us what you want to buy.", icon: ShoppingBag },
  {
    n: "02",
    title: "Check protected money",
    desc: "We review what's already spoken for.",
    icon: ShieldCheck,
  },
  {
    n: "03",
    title: "See safe-to-spend & tradeoff",
    desc: "We calculate what's safe and show the tradeoff.",
    icon: Target,
  },
  {
    n: "04",
    title: "Get a verdict",
    desc: "You get a plain-language verdict you can trust.",
    icon: ShieldCheck,
  },
] as const;

const PROTECT = [
  { icon: House, label: "Bills", amount: "₱1,450.00", chip: "bg-positive text-white" },
  { icon: ShieldCheck, label: "Debt", amount: "₱1,200.00", chip: "bg-negative text-white" },
  { icon: Target, label: "Goals", amount: "₱600.00", chip: "bg-warning text-ink" },
  {
    icon: ShieldCheck,
    label: "Emergency Buffer",
    amount: "₱1,500.00",
    chip: "bg-positive text-white",
  },
] as const;

const peso = (v: number) => `₱${Math.round(v).toLocaleString("en-PH")}.00`;

export function HowItWorks() {
  const { flow, beat } = useReveal();

  return (
    <section id="how" className="mx-auto w-full max-w-[1680px] scroll-mt-6">
      <div className="ledger-sheet flex min-h-[calc(100svh-1.5rem)] flex-col gap-8 px-6 py-7 sm:min-h-[calc(100svh-2.5rem)] sm:px-10 sm:py-9">
        <header className="flex justify-end border-b border-hair pb-6">
          <span className="font-ledger text-xs uppercase tracking-[0.14em] text-ink sm:text-sm">
            <span className="text-ink-faint">04</span> / How it works
          </span>
        </header>

        <motion.div {...flow} className="flex flex-1 flex-col justify-center gap-8 py-2">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Left: the conversation + the four steps */}
            <div className="space-y-4">
              <motion.div {...beat}>
                <h2 className="font-poster text-[clamp(2.5rem,4.6vw,4.5rem)] uppercase leading-[0.86] tracking-[-0.005em] text-ink">
                  How it <span className="text-brand-dark">works</span>
                </h2>
                <p className="mt-3 font-ledger text-sm text-ink-soft">
                  A quick conversation before you commit.
                </p>
              </motion.div>

              <motion.div {...beat} className="card-paper flex items-start gap-3 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                  <User className="size-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-ledger text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                      You
                    </span>
                    <span className="font-ledger text-[11px] text-ink-faint">11:42 AM</span>
                  </div>
                  <p className="mt-1 font-medium text-ink">Can I buy these headphones for ₱6,590?</p>
                </div>
              </motion.div>

              <motion.div {...beat} className="card-slate flex items-start gap-3 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand font-poster text-base leading-none text-ink">
                  SG
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-ledger text-[11px] font-bold uppercase tracking-[0.12em] text-brand">
                      SpendGuard
                    </span>
                    <span className="font-ledger text-[11px] text-ink-inverse/50">11:42 AM</span>
                  </div>
                  <p className="mt-1 font-medium text-ink-inverse">
                    Let&apos;s check what money is already spoken for.
                  </p>
                </div>
              </motion.div>

              <div className="relative space-y-3 pl-7 pt-1">
                <span
                  aria-hidden="true"
                  className="absolute bottom-5 left-[7px] top-5 w-px border-l border-dashed border-hair-strong"
                />
                {STEPS.map(({ n, title, desc, icon: Icon }) => (
                  <motion.div
                    key={n}
                    {...beat}
                    className="card-paper relative flex items-center gap-3.5 p-3.5"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -left-[25px] top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-brand-dark ring-4 ring-paper"
                    />
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-hair bg-paper-soft text-brand-dark">
                      <Icon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-hair font-ledger text-xs font-bold text-ink">
                      {n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-ledger text-sm font-bold uppercase tracking-[0.04em] text-ink">
                        {title}
                      </p>
                      <p className="mt-0.5 text-sm leading-snug text-ink-soft">{desc}</p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-ink-faint" strokeWidth={2.5} />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: what we found -> safe-to-spend -> verdict */}
            <div className="space-y-5">
              <motion.div {...beat} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
                  <ArrowRight className="size-4" strokeWidth={2.5} />
                </span>
                <span className="font-ledger text-sm font-bold uppercase tracking-[0.12em] text-ink">
                  Here&apos;s what we found
                </span>
              </motion.div>

              <motion.div {...beat}>
                <p className="font-ledger text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                  Protected money
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PROTECT.map(({ icon: Icon, label, amount, chip }) => (
                    <div
                      key={label}
                      className="card-paper flex flex-col items-center gap-2 p-4 text-center"
                    >
                      <span
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-full",
                          chip,
                        )}
                      >
                        <Icon className="size-5" strokeWidth={2.25} />
                      </span>
                      <span className="text-sm leading-tight text-ink-soft">{label}</span>
                      <span className="font-ledger text-sm font-bold text-ink">{amount}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-hair pt-3">
                  <span className="font-ledger text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Total protected
                  </span>
                  <span className="font-ledger text-lg font-bold text-ink">₱4,750.00</span>
                </div>
              </motion.div>

              <motion.div
                {...beat}
                className="card-slate flex items-center justify-between gap-4 p-6"
              >
                <div className="min-w-0">
                  <p className="font-ledger text-xs font-semibold uppercase tracking-[0.12em] text-ink-inverse/70">
                    Safe-to-spend
                  </p>
                  <CountUp
                    to={1840}
                    format={peso}
                    className="mt-2 block font-poster text-[clamp(2.1rem,3.2vw,3.25rem)] leading-none text-brand"
                  />
                  <p className="mt-3 max-w-[16rem] text-sm leading-snug text-ink-inverse/65">
                    Your flexible money after protecting what matters.
                  </p>
                </div>
                <Donut percent={22} />
              </motion.div>

              <motion.div {...beat} className="card-paper flex items-center gap-5 p-6">
                <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-positive text-white">
                  <ShieldCheck className="size-8" strokeWidth={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-ledger text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Verdict
                  </p>
                  <p className="mt-1 font-poster text-2xl uppercase leading-none text-positive">
                    Buy with confidence
                  </p>
                  <p className="mt-2 text-sm leading-snug text-ink-soft">
                    This purchase fits within your plan. You&apos;re still on track.
                  </p>
                </div>
                <ChevronRight className="size-6 shrink-0 text-ink-faint" strokeWidth={2.5} />
              </motion.div>
            </div>
          </div>

          <motion.div
            {...beat}
            className="card-paper flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"
          >
            <div className="flex items-center gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
                <ArrowRight className="size-4" strokeWidth={2.5} />
              </span>
              <span className="font-ledger text-sm text-ink">
                It&apos;s your money. Make every decision count.
              </span>
            </div>
            <a
              href="/signup"
              className="group flex items-center gap-3 self-start font-ledger text-sm font-bold uppercase tracking-[0.06em] text-ink sm:self-auto"
            >
              See it in action
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-ink transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="size-4" strokeWidth={2.5} />
              </span>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
