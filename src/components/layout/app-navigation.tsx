"use client";

import {
  CircleDollarSign,
  FileText,
  House,
  Menu,
  ReceiptText,
  SearchCheck,
  Settings,
  Target,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const primaryNavigation = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: House },
  { href: "/checker", label: "Purchase Checker", mobileLabel: "Checker", icon: SearchCheck },
  { href: "/goals", label: "Goals", mobileLabel: "Goals", icon: Target },
  { href: "/cooldown", label: "Cooldown", mobileLabel: "More", icon: Menu },
] as const;

const secondaryNavigation = [
  { href: "/expenses", label: "Expenses", icon: ReceiptText },
  { href: "/debts", label: "Debts", icon: CircleDollarSign },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

type NavigationItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
};

function isCurrentPath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href.includes("#")) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function DesktopNavigationLink({ item }: { item: NavigationItem }) {
  const pathname = usePathname();
  const isCurrent = isCurrentPath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isCurrent ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "flex h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold text-muted-foreground transition hover:bg-white/5 hover:text-foreground",
        isCurrent && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function MobileNavigationLink({ item }: { item: (typeof primaryNavigation)[number] }) {
  const pathname = usePathname();
  const isCurrent = isCurrentPath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={isCurrent ? "page" : undefined}
      aria-label={item.mobileLabel}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control px-1 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-white/5 hover:text-foreground",
        isCurrent && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="max-w-full truncate">{item.mobileLabel}</span>
    </Link>
  );
}

export function AppDesktopNavigation() {
  return (
    <nav aria-label="Desktop primary navigation" className="grid gap-1">
      {primaryNavigation.map((item) => (
        <DesktopNavigationLink key={item.href} item={item} />
      ))}

      <div className="my-3 h-px bg-border" />

      {secondaryNavigation.map((item) => (
        <DesktopNavigationLink key={item.href} item={item} />
      ))}
    </nav>
  );
}

export function AppMobileNavigation() {
  return (
    <nav
      aria-label="Mobile primary navigation"
      className="glass fixed inset-x-0 bottom-0 z-40 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="mx-auto flex max-w-md gap-1">
        {primaryNavigation.map((item) => (
          <MobileNavigationLink key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}
