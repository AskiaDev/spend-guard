"use client";

import type { ReactNode } from "react";
import { PAY_FREQUENCY_LABELS } from "@/types/finance";
import { hasLabel, type OnboardingFormValues } from "../lib/onboarding-form";
import { VaultButton } from "./primitives/vault-button";

// ---- Helpers ----------------------------------------------------------------

const dash = "-";

/** Show a typed value or a quiet placeholder when the field is blank. */
function asText(value: string): string {
  return value.trim() === "" ? "Not set" : value.trim();
}

/** Format a money-ish string with its currency code, or a placeholder. */
function asAmount(value: string, currency: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "Not set";
  return `${currency} ${trimmed}`;
}

// ---- Section shell ----------------------------------------------------------

const cardStyle: React.CSSProperties = {
  borderRadius: "var(--vault-radius-card)",
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

function SectionCard({
  eyebrow,
  count,
  onEdit,
  children,
}: {
  eyebrow: string;
  count?: number;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="vault-surface" style={cardStyle}>
      <div style={cardHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="vault-eyebrow">{eyebrow}</span>
          {typeof count === "number" ? (
            <span
              aria-label={`${count} added`}
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "var(--vault-ink)",
                background: "var(--vault-accent)",
                borderRadius: 999,
                padding: "2px 8px",
                lineHeight: 1.4,
              }}
            >
              {count}
            </span>
          ) : null}
        </div>
        <VaultButton variant="ghost" onClick={onEdit}>
          Edit
        </VaultButton>
      </div>
      {children}
    </section>
  );
}

// ---- Definition grid (profile facts) ----------------------------------------

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 16,
        paddingBottom: 8,
        borderBottom: "1px solid color-mix(in srgb, var(--vault-border) 70%, transparent)",
      }}
    >
      <span style={{ fontSize: "0.78rem", color: "var(--vault-muted)" }}>{label}</span>
      <span
        className="vault-display"
        style={{
          fontSize: "0.92rem",
          fontWeight: 600,
          color: "var(--vault-text)",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ---- Empty + ledger rows ----------------------------------------------------

function EmptyLine({ text }: { text: string }) {
  return (
    <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--vault-muted)" }}>
      None added {dash} that{"’"}s okay.{" "}
      <span style={{ color: "color-mix(in srgb, var(--vault-text) 70%, transparent)" }}>{text}</span>
    </p>
  );
}

const ledgerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 12,
};

const ledgerName: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "var(--vault-text)",
  fontWeight: 600,
};

const ledgerMeta: React.CSSProperties = {
  fontSize: "0.74rem",
  color: "var(--vault-muted)",
  textAlign: "right",
  whiteSpace: "nowrap",
};

function LedgerList({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>;
}

// ---- Main component ---------------------------------------------------------

export function StepReview({
  values,
  onEdit,
}: {
  values: OnboardingFormValues;
  onEdit: (stepIndex: number) => void;
}) {
  const { currency } = values;
  const expenses = values.expenses.filter(hasLabel);
  const debts = values.debts.filter(hasLabel);
  const goals = values.goals.filter(hasLabel);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--vault-muted)", lineHeight: 1.5 }}>
        One last look before we seal the vault. Edit any section, or confirm to finish.
      </p>

      {/* Profile */}
      <SectionCard eyebrow="Your profile" onEdit={() => onEdit(0)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <FactRow label="Name" value={asText(values.fullName)} />
          <FactRow label="Currency" value={currency} />
          <FactRow
            label="Pay cycle"
            value={PAY_FREQUENCY_LABELS[values.payFrequency] ?? values.payFrequency}
          />
          <FactRow label="Monthly income" value={asAmount(values.monthlyIncome, currency)} />
          <FactRow
            label="Variable spend"
            value={asAmount(values.estimatedVariableExpenses, currency)}
          />
          <FactRow label="Current savings" value={asAmount(values.currentSavings, currency)} />
          <FactRow
            label="Emergency target"
            value={asAmount(values.emergencyFundTarget, currency)}
          />
        </div>
      </SectionCard>

      {/* Expenses */}
      <SectionCard eyebrow="Fixed expenses" count={expenses.length} onEdit={() => onEdit(1)}>
        {expenses.length === 0 ? (
          <EmptyLine text="You can add fixed expenses any time." />
        ) : (
          <LedgerList>
            {expenses.map((expense, index) => (
              <div key={`expense-${index}`} style={ledgerRow}>
                <span style={ledgerName}>{expense.label.trim()}</span>
                <span style={ledgerMeta}>
                  {asAmount(expense.amount, currency)} {dash} day {asText(expense.dueDay)}
                  {expense.isRecurring ? "" : " (one-off)"}
                </span>
              </div>
            ))}
          </LedgerList>
        )}
      </SectionCard>

      {/* Debts */}
      <SectionCard eyebrow="Debts" count={debts.length} onEdit={() => onEdit(1)}>
        {debts.length === 0 ? (
          <EmptyLine text="Add what you owe whenever you are ready." />
        ) : (
          <LedgerList>
            {debts.map((debt, index) => (
              <div key={`debt-${index}`} style={ledgerRow}>
                <span style={ledgerName}>{debt.label.trim()}</span>
                <span style={ledgerMeta}>
                  {asAmount(debt.outstandingBalance, currency)} balance {dash} pay{" "}
                  {asAmount(debt.minimumPayment, currency)}
                </span>
              </div>
            ))}
          </LedgerList>
        )}
      </SectionCard>

      {/* Goals */}
      <SectionCard eyebrow="Goals" count={goals.length} onEdit={() => onEdit(2)}>
        {goals.length === 0 ? (
          <EmptyLine text="Set a goal to track the path there." />
        ) : (
          <LedgerList>
            {goals.map((goal, index) => (
              <div key={`goal-${index}`} style={ledgerRow}>
                <span style={ledgerName}>{goal.label.trim()}</span>
                <span style={ledgerMeta}>
                  {asAmount(goal.savedAmount, currency)} of {asAmount(goal.targetAmount, currency)}{" "}
                  {dash} {asAmount(goal.monthlyContribution, currency)}/mo
                </span>
              </div>
            ))}
          </LedgerList>
        )}
      </SectionCard>
    </div>
  );
}
