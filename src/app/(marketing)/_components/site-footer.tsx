import { ChevronDown, Fingerprint, Globe, Lock } from "lucide-react";
import { Brandmark } from "./brandmark";
import { Grain } from "./grain";

type Col = { title: string; links: { label: string; href: string }[] };

const COLUMNS: Col[] = [
  {
    title: "Product",
    links: [
      { label: "How It Works", href: "#how" },
      { label: "Features", href: "#product" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
];

// lucide dropped brand glyphs - inline simple-icons paths (24x24, currentColor).
const SOCIALS = [
  {
    name: "X",
    href: "#",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    name: "LinkedIn",
    href: "#",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  {
    name: "Instagram",
    href: "#",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    name: "YouTube",
    href: "#",
    path: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto w-full max-w-[1680px]">
      <div
        className="relative overflow-hidden rounded-[28px] border border-slate-line px-6 py-12 sm:px-10 sm:py-14"
        style={{
          background:
            "radial-gradient(circle at 88% 8%, rgba(184,242,12,0.07), transparent 38%), linear-gradient(160deg, #101412 0%, #090b0a 100%)",
        }}
      >
        <Grain />

        <div className="relative grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_2fr]">
          {/* Brand + privacy */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Brandmark inverse />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-inverse/60">
              We reveal the true cost of purchases before you buy, so you can spend smarter and live
              better.
            </p>
            <div className="mt-6 flex items-start gap-3">
              <Lock className="size-5 shrink-0 text-brand" strokeWidth={2} />
              <div>
                <p className="text-sm font-semibold text-brand">Your data stays private.</p>
                <p className="text-sm text-ink-inverse/60">We don&apos;t sell your data. Ever.</p>
              </div>
            </div>
          </div>

          {/* Nav columns */}
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="font-ledger text-xs font-bold uppercase tracking-[0.12em] text-brand">
                {col.title}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-ink-inverse/60 transition-colors hover:text-brand"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Priority + follow */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="rounded-2xl border border-slate-line p-5">
              <div className="flex items-start gap-3">
                <Fingerprint className="size-8 shrink-0 text-brand" strokeWidth={1.5} />
                <div>
                  <p className="font-semibold text-brand">Your clarity is our priority.</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-inverse/60">
                    We analyze numbers, not people. No tracking. No profiling. Just clear decisions.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <p className="font-ledger text-xs font-bold uppercase tracking-[0.12em] text-ink-inverse/50">
                Follow us
              </p>
              <div className="mt-3 flex gap-2.5">
                {SOCIALS.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    aria-label={s.name}
                    className="flex size-9 items-center justify-center rounded-full border border-slate-line text-ink-inverse/70 transition-colors hover:border-brand hover:text-brand"
                  >
                    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-line pt-6 sm:flex-row">
          <p className="font-ledger text-xs text-ink-inverse/50">
            &copy; {year} SpendGuard Inc. All rights reserved.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-line px-3 py-1.5 font-ledger text-xs text-ink-inverse/70 transition-colors hover:border-hair-strong"
          >
            <Globe className="size-4" strokeWidth={2} />
            English (US)
            <ChevronDown className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </footer>
  );
}
