"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { confirmLedgerEntriesAction } from "@/features/ledger/api/confirm-ledger-entries";
import { mapWithConcurrency } from "@/features/ledger/lib/map-with-concurrency";
import {
  LEDGER_CATEGORIES,
  type LedgerCandidate,
  type LedgerCategory,
  type ReviewedEntry,
} from "@/lib/schemas/ledger";
import { cn } from "@/lib/utils";

// ponytail: CONCURRENCY=3 matches the spec constraint (plan global §processing option A)
const CONCURRENCY = 3;

const ACCEPTED_FORMATS = "GCash, bank, or receipt images - PNG, JPEG, WebP, or PDF";

type Row = {
  sourceRef: string;
  status: "done" | "failed";
  selected: boolean;
  occurredAt: string;
  direction: "income" | "expense";
  amount: number;
  counterparty: string;
  category: LedgerCategory;
  confidence: number | null;
};

function toRow(fileName: string, candidate: LedgerCandidate, autoConfirm: boolean): Row {
  return {
    sourceRef: fileName,
    status: "done",
    selected: autoConfirm,
    occurredAt: candidate.occurredAt ?? "",
    direction: candidate.direction,
    amount: candidate.amount,
    counterparty: candidate.counterparty ?? "",
    category: candidate.category,
    confidence: candidate.confidence,
  };
}

function failedRow(fileName: string): Row {
  return {
    sourceRef: fileName,
    status: "failed",
    selected: false,
    occurredAt: "",
    direction: "expense",
    amount: 0,
    counterparty: "",
    category: "uncategorized",
    confidence: null,
  };
}

async function classifyFile(file: File): Promise<Row> {
  // Per-item isolation: any failure (non-ok OR a thrown fetch/parse error from
  // an offline or dropped connection) fails only this tile, never the batch.
  try {
    const body = new FormData();
    body.append("image", file);
    const response = await fetch("/api/ledger/classify", { method: "POST", body });
    if (!response.ok) {
      return failedRow(file.name);
    }
    const data = (await response.json()) as { candidate: LedgerCandidate; autoConfirm: boolean };
    return toRow(file.name, data.candidate, data.autoConfirm);
  } catch {
    return failedRow(file.name);
  }
}

function formatCategory(cat: LedgerCategory): string {
  return cat.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function ImportWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    // Reset so the same files can be re-selected after correction
    if (fileInputRef.current) fileInputRef.current.value = "";
    setBusy(true);
    setError(null);
    setRows([]);
    setDone(0);
    setTotal(list.length);

    const processed = await mapWithConcurrency(list, CONCURRENCY, async (file) => {
      const row = await classifyFile(file);
      setDone((value) => value + 1);
      setRows((current) => [...current, row]);
      return row;
    });

    setBusy(false);
    void processed;
  }

  function patch(index: number, change: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  async function handleConfirm() {
    const entries: ReviewedEntry[] = rows
      .filter((row) => row.selected && row.status === "done")
      .map((row) => ({
        occurredAt: row.occurredAt,
        direction: row.direction,
        amount: row.amount,
        counterparty: row.counterparty.trim() === "" ? null : row.counterparty.trim(),
        category: row.category,
        confidence: row.confidence,
        sourceRef: row.sourceRef,
      }));

    if (entries.length === 0) {
      setError("Select at least one transaction to save.");
      return;
    }

    if (entries.some((entry) => entry.occurredAt.trim() === "")) {
      setError("Some transactions are missing a date - add the date before saving.");
      return;
    }

    setBusy(true);
    const result = await confirmLedgerEntriesAction({ entries });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/");
  }

  const selectedCount = rows.filter((row) => row.selected && row.status === "done").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="grid gap-6">
      {/* Upload zone - the scan-bed card is the page's signature element */}
      <Card>
        <CardContent className="grid gap-4">
          <div
            aria-hidden="true"
            className={cn(
              "flex cursor-pointer flex-col items-center gap-3 rounded-[var(--radius)] border border-dashed border-primary/30 px-6 py-10 text-center transition-colors",
              "hover:border-primary/60 hover:bg-primary/5",
              busy && "pointer-events-none opacity-50"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-10 text-primary" aria-hidden="true" />
            <div className="grid gap-1">
              <p className="text-sm font-semibold text-foreground">Select screenshots to import</p>
              <p className="text-xs text-muted-foreground">{ACCEPTED_FORMATS}</p>
            </div>
          </div>

          {/* Hidden file input - sr-only keeps it in tab order for keyboard users */}
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            className="sr-only"
            aria-label="Select receipt images"
            aria-describedby="upload-format-hint"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            multiple
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {/* Accepted-formats hint for assistive tech - the visible copy above sits in an aria-hidden subtree */}
          <p id="upload-format-hint" className="sr-only">
            {ACCEPTED_FORMATS}
          </p>

          {/* Visible keyboard-accessible trigger */}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden="true" />
            Browse files
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {total > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Processed {done} of {total}
          </p>
          <Progress
            value={progress}
            label={`Upload progress: ${done} of ${total} processed`}
          />
        </div>
      ) : null}

      {/* Error */}
      {error ? (
        <div
          role="alert"
          className="rounded-control border border-risk/20 bg-risk/10 px-3 py-2 text-sm text-risk"
        >
          {error}
        </div>
      ) : null}

      {/* Review table */}
      {rows.length > 0 ? (
        <section aria-label="Review extracted transactions">
          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {(
                      [
                        "Save",
                        "Source",
                        "Date",
                        "Direction",
                        "Amount",
                        "Counterparty",
                        "Category",
                        "Confidence",
                      ] as const
                    ).map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-3 pb-2 pt-3 text-left text-[0.625rem] font-semibold uppercase tracking-normal text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.sourceRef + index}
                      className={cn(
                        "border-b border-border/50 last:border-0 transition-colors",
                        row.status === "failed" && "opacity-60"
                      )}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={row.status === "failed"}
                          aria-label={`Include ${row.sourceRef}`}
                          onChange={(e) => patch(index, { selected: e.target.checked })}
                          className="size-4 cursor-pointer accent-primary"
                        />
                      </td>
                      <td
                        className="max-w-[9rem] truncate px-3 py-2 text-xs text-muted-foreground"
                        title={row.sourceRef}
                      >
                        {row.sourceRef}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          value={row.occurredAt}
                          aria-label={`Date for ${row.sourceRef}`}
                          onChange={(e) => patch(index, { occurredAt: e.target.value })}
                          className="h-8 w-36 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={row.direction}
                          onValueChange={(v) =>
                            patch(index, { direction: v as Row["direction"] })
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            aria-label={`Direction for ${row.sourceRef}`}
                            className="w-full min-w-[6rem]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.amount}
                          aria-label={`Amount for ${row.sourceRef}`}
                          onChange={(e) => patch(index, { amount: Number(e.target.value) })}
                          className="h-8 w-24 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.counterparty}
                          aria-label={`Counterparty for ${row.sourceRef}`}
                          onChange={(e) => patch(index, { counterparty: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={row.category}
                          onValueChange={(v) => patch(index, { category: v as LedgerCategory })}
                        >
                          <SelectTrigger
                            size="sm"
                            aria-label={`Category for ${row.sourceRef}`}
                            className="w-full min-w-[8rem]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEDGER_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {formatCategory(cat)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {row.status === "failed" ? (
                          <span className="text-risk">Could not read - enter manually</span>
                        ) : row.confidence === null ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span className="tabular-nums text-foreground">
                            {Math.round(row.confidence * 100)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {/* Confirm */}
      {rows.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={busy}
            isLoading={busy}
            loadingText="Saving..."
            onClick={handleConfirm}
          >
            Save {selectedCount} transaction{selectedCount === 1 ? "" : "s"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
