"use client";

import { gooeyToast } from "goey-toast";
import {
  Minus,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/finance/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exampleOnlyPurchaseReferences } from "@/features/reference-data";
import { getCooldownDays } from "@/lib/calculations/cooldown";
import {
  recheckCooldownItem,
  type CooldownDecisionTrend,
  type CooldownRecheckResult,
} from "@/lib/calculations/cooldown-recheck";
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

const trendPresentation: Record<
  CooldownDecisionTrend,
  { label: string; surface: string; icon: string; Icon: ComponentType<{ className?: string }> }
> = {
  improved: {
    label: "Looking better",
    surface: "border-safe/30 bg-safe/5",
    icon: "text-safe",
    Icon: TrendingUp,
  },
  unchanged: {
    label: "About the same",
    surface: "border-caution/30 bg-caution/5",
    icon: "text-caution",
    Icon: Minus,
  },
  worsened: {
    label: "Looking riskier",
    surface: "border-risk/30 bg-risk/5",
    icon: "text-risk",
    Icon: TrendingDown,
  },
  unknown: {
    label: "Today's check",
    surface: "border-border bg-muted/30",
    icon: "text-muted-foreground",
    Icon: Sparkles,
  },
};

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
  snapshot,
  onRemove,
  onConvertToGoal,
}: {
  items: CooldownItem[];
  currency: FinancialSnapshot["profile"]["currency"];
  snapshot: FinancialSnapshot;
  onRemove: (id: string) => Promise<void>;
  onConvertToGoal: (item: CooldownItem) => Promise<unknown> | unknown;
}) {
  const [activeTab, setActiveTab] = useState<CooldownTab>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recheck");
  const visibleItems = useMemo(
    () => sortCooldownItems(filterCooldownItems(items, activeTab), sortMode),
    [activeTab, items, sortMode]
  );
  const activeTabId = getTabId(activeTab);

  return (
    <div className="grid gap-5">
      {/* ponytail: Tabs wraps the header card; TabsContent unused — panel is a single shared div below */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CooldownTab)}>
        <div className="grid gap-4 rounded-card border border-border bg-card glass p-5 shadow-card">
          <div className="flex items-start gap-3">
            <div className="grid size-11 place-items-center rounded-control bg-caution/10 text-caution">
              <TimerReset className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Cooldown list
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                Paused purchases
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Recheck a paused want to see if your money moved in its favor, or turn it into a
                goal.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <TabsList
              aria-label="Cooldown views"
              className="flex h-auto w-auto gap-2 overflow-x-auto rounded-none bg-transparent p-0 pb-1"
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  id={getTabId(tab.id)}
                  aria-controls={itemsPanelId}
                  className={cn(
                    "h-10 flex-none shrink-0 rounded-control px-4 text-sm font-semibold ring-1 ring-border transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:ring-primary data-[state=active]:shadow-none",
                    "data-[state=inactive]:bg-card data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-muted/20"
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="grid gap-1">
              <Label
                htmlFor="sort-select"
                className="text-xs font-semibold uppercase tracking-normal text-muted-foreground"
              >
                Sort cooldown items
              </Label>
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                <SelectTrigger
                  id="sort-select"
                  className="h-11 rounded-control border-border bg-card text-sm font-medium text-foreground"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recheck">Recheck date</SelectItem>
                  <SelectItem value="amount-desc">Amount high to low</SelectItem>
                  <SelectItem value="amount-asc">Amount low to high</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Tabs>

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
                snapshot={snapshot}
                onRemove={onRemove}
                onConvertToGoal={onConvertToGoal}
              />
            ))}
            {visibleItems.length === 0 ? (
              <Card className="lg:col-span-2">
                <CardContent>
                  <p className="rounded-control border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
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
        <p className="mt-1 text-muted-foreground">
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
            <p className="text-sm leading-6 text-muted-foreground">
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
  snapshot,
  onRemove,
  onConvertToGoal,
}: {
  item: CooldownItem;
  currency: CurrencyCode;
  snapshot: FinancialSnapshot;
  onRemove: (id: string) => Promise<void>;
  onConvertToGoal: (item: CooldownItem) => Promise<unknown> | unknown;
}) {
  const [recheck, setRecheck] = useState<CooldownRecheckResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isConverted, setIsConverted] = useState(false);
  const cooldownDays = getCooldownDays(item.amount);

  async function handleConvert() {
    setIsConverting(true);

    try {
      await onConvertToGoal(item);
      setIsConverted(true);
      gooeyToast.success(`${item.itemName} added to goals`);
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <article
      aria-label={`${item.itemName} cooldown item`}
      className="grid gap-5 rounded-card border border-border bg-card glass p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Cooldown item
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {item.itemName}
          </h3>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatCurrency(item.amount, currency)}
          </p>
        </div>
        <StatusBadge decision={item.baselineDecision ?? getCooldownDecision(item)} />
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <CooldownFact label="Risk">Risk: {formatUrgency(item.urgency)}</CooldownFact>
        <CooldownFact label="Cooldown">
          {cooldownDays}-day hold · recheck {formatLongDate(parseDisplayDate(item.recheckAt))}
        </CooldownFact>
        <CooldownFact label="Payment">{formatPaymentMethod(item.paymentMethod)}</CooldownFact>
        <CooldownFact label="Source">
          {item.sourceCheckId ? "Created from a saved check" : "Manually tracked want"}
        </CooldownFact>
      </dl>

      {recheck ? (
        <RecheckResult itemName={item.itemName} currency={currency} recheck={recheck} />
      ) : null}

      {isConverted ? (
        <p role="status" className="text-sm font-medium text-safe">
          Added to your goals. Track it from the Goals page.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Recheck ${item.itemName}`}
          onClick={() => setRecheck(recheckCooldownItem(item, snapshot))}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Recheck
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Convert ${item.itemName} to Goal`}
          disabled={isConverting || isConverted}
          onClick={() => void handleConvert()}
        >
          <Target className="size-4" aria-hidden="true" />
          {isConverting ? "Adding..." : "Convert to Goal"}
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
          onClick={async () => {
            await onRemove(item.id);
            gooeyToast.success(`${item.itemName} removed`);
          }}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

function RecheckResult({
  itemName,
  currency,
  recheck,
}: {
  itemName: string;
  currency: CurrencyCode;
  recheck: CooldownRecheckResult;
}) {
  const trend = trendPresentation[recheck.decisionTrend];
  const TrendIcon = trend.Icon;
  const delta = recheck.safeToSpendDelta;

  return (
    <div
      role="status"
      aria-label={`Recheck result for ${itemName}`}
      className={cn("grid gap-3 rounded-control border p-4", trend.surface)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendIcon className={cn("size-4 shrink-0", trend.icon)} />
          {trend.label}
        </span>
        <StatusBadge decision={recheck.current.decision} />
      </div>

      {delta === null ? (
        <p className="text-sm leading-6 text-muted-foreground">
          No saved result from when you added this, so only today&apos;s check is shown.
        </p>
      ) : (
        <p className="text-sm leading-6 text-foreground">
          Safe-to-spend{" "}
          <span className={cn("font-semibold", delta >= 0 ? "text-safe" : "text-risk")}>
            {delta >= 0 ? "up" : "down"} {formatCurrency(Math.abs(delta), currency)}
          </span>{" "}
          since you added this.
        </p>
      )}

      {recheck.current.reasons.length > 0 ? (
        <ul className="grid gap-1.5 text-sm leading-5 text-muted-foreground">
          {recheck.current.reasons.map((reason, index) => (
            <li key={index} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function getTabId(tab: CooldownTab) {
  return `cooldown-tab-${tab}`;
}

function CooldownFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-control border border-border bg-muted/30 p-3">
      <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </dt>
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
