"use client";

import { RotateCcw, TimerReset, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { CooldownItem, FinancialSnapshot } from "@/types/finance";

export function CooldownPanel({
  items,
  currency,
  onRemove,
}: {
  items: CooldownItem[];
  currency: FinancialSnapshot["profile"]["currency"];
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-amber-100 text-amber-800">
            <TimerReset className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>Cooldown</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-zinc-950">{item.itemName}</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  {formatCurrency(item.amount, currency)} · recheck{" "}
                  {new Date(item.recheckAt).toLocaleDateString()}
                </p>
              </div>
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
            <Button type="button" variant="secondary" size="sm" className="mt-4">
              <RotateCcw className="size-4" aria-hidden="true" />
              Recheck
            </Button>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-5 text-sm text-zinc-600">
            Cooldown items will appear after a purchase check.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
