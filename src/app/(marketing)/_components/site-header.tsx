import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brandmark } from "./brandmark";

type NavItem = { label: string; href: string; badge?: string };

const NAV: NavItem[] = [
  { label: "Product", href: "#product", badge: "New" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" },
];

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-soft";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-6 border-b border-hair px-6 py-5 sm:px-8">
      <Link href="/" className={`${focusRing} rounded-md`}>
        <Brandmark showTagline />
      </Link>

      <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
        {NAV.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`flex items-center gap-1.5 font-ledger text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:text-brand-dark ${focusRing} rounded`}
          >
            {item.label}
            {item.badge ? (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold leading-none text-ink">
                {item.badge}
              </span>
            ) : null}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className={`hidden font-ledger text-xs uppercase tracking-[0.06em] text-ink transition-colors hover:text-brand-dark sm:inline ${focusRing} rounded`}
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className={`group inline-flex items-center gap-2 rounded-full bg-brand py-1.5 pl-5 pr-1.5 font-ledger text-xs font-bold uppercase tracking-[0.06em] text-ink transition-colors hover:bg-brand-soft ${focusRing}`}
        >
          Get started
          <span className="flex size-8 items-center justify-center rounded-full bg-ink text-paper transition-transform group-hover:translate-x-0.5">
            <ArrowRight className="size-4" strokeWidth={2.5} />
          </span>
        </Link>
      </div>
    </header>
  );
}
