"use client";

import { MoreHorizontal, RotateCcw, Target, TimerReset, Trash2 } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";

import { StatusBadge } from "@/components/finance/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { exampleOnlyPurchaseReferences } from "@/features/reference-data";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  CooldownItem,
  CurrencyCode,
  FinancialSnapshot,
  PurchaseDecision,
  PurchaseUrgency,
} from "@/types/finance";

type CooldownTab = "all" | "waiting" | "wishlist";
type SortMode = "recheck" | "amount-desc" | "amount-asc";

const tabs: Array<{ id: CooldownTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting" },
  { id: "wishlist", label: "Wishlist" },
];

const itemsPanelId = "cooldown-items-panel";

const exampleCards = exampleOnlyPurchaseReferences.map((label, index) => ({
  id: `example_${index}`,
  label,
  amount: index === 0 ? 4200 : 36000,
  decision: index === 0 ? "BUY_WITH_CAUTION" : "WAIT",
})) satisfies Array<{
  id: string;
  label: string;
  amount: number;
  decision: PurchaseDecision;
}>;

export function CooldownPanel({
  items,
  currency,
  onRemove,
}: {
  items: CooldownItem[];
  currency: FinancialSnapshot["profile"]["currency"];
  onRemove: (id: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<CooldownTab>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recheck");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visibleItems = useMemo(
    () => sortCooldownItems(filterCooldownItems(items, activeTab), sortMode),
    [activeTab, items, sortMode]
  );
  const activeTabId = getTabId(activeTab);

  function selectTab(tab: CooldownTab, focusIndex?: number) {
    setActiveTab(tab);

    if (focusIndex !== undefined) {
      tabRefs.current[focusIndex]?.focus();
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = tabs.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = index === lastIndex ? 0 : index + 1;
    }

    if (event.key === "ArrowLeft") {
      nextIndex = index === 0 ? lastIndex : index - 1;
    }

    if (event.key === "Home") {
      nextIndex = 0;
    }

    if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      selectTab(tabs[nextIndex].id, nextIndex);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-control bg-caution/10 text-caution">
            <TimerReset className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted">
              Cooldown list
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Paused purchases
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Sort wants by recheck date and keep the next safe decision visible before buying.
            </p>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div
            role="tablist"
            aria-label="Cooldown views"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                id={getTabId(tab.id)}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={itemsPanelId}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className={cn(
                  "h-10 shrink-0 rounded-control px-4 text-sm font-semibold ring-1 ring-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  activeTab === tab.id
                    ? "bg-primary text-white ring-primary"
                    : "bg-surface text-foreground hover:bg-slate-50"
                )}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-normal text-muted">
            Sort cooldown items
            <select
              value={sortMode}
              className="h-11 rounded-control border border-border bg-surface px-3 text-sm font-medium normal-case tracking-normal text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="recheck">Recheck date</option>
              <option value="amount-desc">Amount high to low</option>
              <option value="amount-asc">Amount low to high</option>
            </select>
          </label>
        </div>
      </div>

      <div
        id={itemsPanelId}
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={activeTabId}
        className="grid gap-4"
      >
        {items.length === 0 ? (
          <ExampleItems currency={currency} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleItems.map((item) => (
              <CooldownItemCard
                key={item.id}
                item={item}
                currency={currency}
                onRemove={onRemove}
              />
            ))}
            {visibleItems.length === 0 ? (
              <Card className="lg:col-span-2">
                <CardContent>
                  <p className="rounded-control border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted">
                    No cooldown items match this view yet.
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ExampleItems({ currency }: { currency: CurrencyCode }) {
  return (
    <section aria-labelledby="example-items-heading" className="grid gap-4">
      <div className="rounded-card border border-caution/30 bg-caution/10 px-4 py-3 text-sm">
        <p id="example-items-heading" className="font-semibold text-caution">
          Example items
        </p>
        <p className="mt-1 text-muted">
          Sample only — these are not your saved cooldown items.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {exampleCards.map((example) => (
          <article
            key={example.id}
            aria-label={`${example.label} example item`}
            className="grid gap-4 rounded-card border border-dashed border-border bg-muted/30 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">{example.label}</h3>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatCurrency(example.amount, currency)}
                </p>
              </div>
              <StatusBadge decision={example.decision} />
            </div>
            <p className="text-sm leading-6 text-muted">
              Reference card only. Run a purchase check to create a real cooldown item.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CooldownItemCard({
  item,
  currency,
  onRemove,
}: {
  item: CooldownItem;
  currency: CurrencyCode;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <article
      aria-label={`${item.itemName} cooldown item`}
      className="grid gap-5 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted">
            Cooldown item
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {item.itemName}
          </h3>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatCurrency(item.amount, currency)}
          </p>
        </div>
        <StatusBadge decision={getCooldownDecision(item)} />
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <CooldownFact label="Risk">Risk: {formatUrgency(item.urgency)}</CooldownFact>
        <CooldownFact label="Cooldown">
          Cooldown: recheck {formatLongDate(parseDisplayDate(item.recheckAt))}
        </CooldownFact>
        <CooldownFact label="Payment">{formatPaymentMethod(item.paymentMethod)}</CooldownFact>
        <CooldownFact label="Source">
          {item.sourceCheckId ? "Created from a saved check" : "Manually tracked want"}
        </CooldownFact>
      </dl>

      <p className="rounded-control bg-muted/40 px-3 py-2 text-xs leading-5 text-muted">
        Recheck and goal conversion are coming soon. Remove remains available.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Recheck ${item.itemName}`}
          disabled
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Recheck
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Convert ${item.itemName} to Goal`}
          disabled
        >
          <Target className="size-4" aria-hidden="true" />
          Convert to Goal
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`More actions for ${item.itemName}`}
          disabled
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove ${item.itemName}`}
          onClick={() => void onRemove(item.id)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

function getTabId(tab: CooldownTab) {
  return `cooldown-tab-${tab}`;
}

function CooldownFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-control border border-border bg-muted/30 p-3">
      <dt className="text-xs font-semibold uppercase tracking-normal text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{children}</dd>
    </div>
  );
}

function filterCooldownItems(items: CooldownItem[], activeTab: CooldownTab) {
  if (activeTab === "wishlist") {
    return items.filter((item) => item.urgency === "want");
  }

  if (activeTab === "waiting") {
    return items.filter((item) => item.urgency !== "want");
  }

  return items;
}

function sortCooldownItems(items: CooldownItem[], sortMode: SortMode) {
  const sortedItems = [...items];

  if (sortMode === "amount-desc") {
    return sortedItems.sort((first, second) => second.amount - first.amount);
  }

  if (sortMode === "amount-asc") {
    return sortedItems.sort((first, second) => first.amount - second.amount);
  }

  return sortedItems.sort(
    (first, second) =>
      parseDisplayDate(first.recheckAt).getTime() - parseDisplayDate(second.recheckAt).getTime()
  );
}

function getCooldownDecision(item: CooldownItem): PurchaseDecision {
  if (item.urgency === "need_now") {
    return "BUY_WITH_CAUTION";
  }

  return "WAIT";
}

function formatUrgency(urgency: PurchaseUrgency) {
  const labels = {
    need_now: "Needed now",
    need_this_month: "Needed this month",
    can_wait: "Can wait",
    want: "Want",
  };

  return labels[urgency];
}

function formatPaymentMethod(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

const dateComponentPattern = /^(\d{4})-(\d{2})-(\d{2})/;

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function parseDisplayDate(value: string) {
  const dateComponentMatch = dateComponentPattern.exec(value);

  if (dateComponentMatch) {
    const [, year, month, day] = dateComponentMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}
