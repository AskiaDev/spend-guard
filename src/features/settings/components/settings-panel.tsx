"use client";

import { ShieldCheck, Trash2 } from "lucide-react";
import { gooeyToast } from "goey-toast";
import { useState, type FormEvent } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAY_FREQUENCIES, PAY_FREQUENCY_LABELS, type FinancialProfile } from "@/types/finance";

type SettingsFormValues = {
  currency: FinancialProfile["currency"];
  fullName: string;
  monthlyIncome: string;
  currentSavings: string;
  emergencyFundTarget: string;
  payFrequency: NonNullable<FinancialProfile["payFrequency"]>;
  estimatedVariableExpenses: string;
};

type SettingsFormErrors = Partial<Record<keyof SettingsFormValues, string>>;

const currencies: FinancialProfile["currency"][] = ["PHP", "USD", "EUR", "JPY", "SGD"];

export function SettingsPanel({
  profile,
  onUpdateProfile,
  onDeleteFinancialData,
  onDeleteVoiceTranscripts,
}: {
  profile: FinancialProfile;
  onUpdateProfile: (profile: FinancialProfile) => Promise<void>;
  onDeleteFinancialData: () => Promise<void>;
  onDeleteVoiceTranscripts: () => Promise<void>;
}) {
  const [formValues, setFormValues] = useState<SettingsFormValues>(() => toSettingsForm(profile));
  const [formErrors, setFormErrors] = useState<SettingsFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingTranscripts, setIsDeletingTranscripts] = useState(false);
  const formErrorMessages = Object.values(formErrors).filter(Boolean);

  function updateField<K extends keyof SettingsFormValues>(field: K, value: SettingsFormValues[K]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
    setMessage(null);
  }

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const parsed = parseSettingsForm(formValues, profile);

    if (!parsed.ok) {
      setFormErrors(parsed.errors);
      return;
    }

    setIsSaving(true);

    try {
      await onUpdateProfile(parsed.profile);
      gooeyToast.success("Settings saved");
      setFormErrors({});
    } catch {
      setMessage("We couldn't update your settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteData() {
    setIsDeleting(true);
    try {
      await onDeleteFinancialData();
      gooeyToast.success("Financial data deleted.");
    } catch {
      setMessage("We couldn't delete your financial data. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function deleteTranscripts() {
    setIsDeletingTranscripts(true);
    try {
      await onDeleteVoiceTranscripts();
      gooeyToast.success("Voice transcripts deleted.");
    } catch {
      setMessage("We couldn't delete your voice transcripts. Please try again.");
    } finally {
      setIsDeletingTranscripts(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-control bg-safe/10 text-safe">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Account baseline
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Settings
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Keep income, savings, currency, and pay cadence current for every decision.
            </p>
          </div>
        </div>
      </div>

      {message ? (
        <p
          role="alert"
          className="rounded-control border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        >
          {message}
        </p>
      ) : null}

      <Card aria-labelledby="settings-form-heading">
        <CardContent>
          <form className="grid gap-4" onSubmit={submitSettings} noValidate>
            <div>
              <h3 id="settings-form-heading" className="text-lg font-semibold text-foreground">
                Financial profile
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                These values feed safe-to-spend, health score, and funding guidance.
              </p>
            </div>

            {formErrorMessages.length > 0 ? (
              <div
                role="alert"
                className="rounded-control border border-risk/20 bg-red-50 px-3 py-2 text-sm text-risk"
              >
                <p className="font-semibold">Check the settings fields.</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {formErrorMessages.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="settings-full-name">Full name</Label>
                <Input
                  id="settings-full-name"
                  value={formValues.fullName}
                  onChange={(event) => updateField("fullName", event.target.value)}
                  aria-invalid={formErrors.fullName ? "true" : undefined}
                />
                <FieldError>{formErrors.fullName}</FieldError>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-currency">Currency</Label>
                <Select
                  value={formValues.currency}
                  onValueChange={(value) =>
                    updateField("currency", value as FinancialProfile["currency"])
                  }
                >
                  <SelectTrigger id="settings-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="settings-pay-frequency">Pay frequency</Label>
                <Select
                  value={formValues.payFrequency}
                  onValueChange={(value) =>
                    updateField("payFrequency", value as SettingsFormValues["payFrequency"])
                  }
                >
                  <SelectTrigger id="settings-pay-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_FREQUENCIES.map((frequency) => (
                      <SelectItem key={frequency} value={frequency}>
                        {PAY_FREQUENCY_LABELS[frequency]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MoneyField
                id="settings-monthly-income"
                label="Monthly income"
                value={formValues.monthlyIncome}
                error={formErrors.monthlyIncome}
                onChange={(value) => updateField("monthlyIncome", value)}
              />
              <MoneyField
                id="settings-current-savings"
                label="Current savings"
                value={formValues.currentSavings}
                error={formErrors.currentSavings}
                onChange={(value) => updateField("currentSavings", value)}
              />
              <MoneyField
                id="settings-emergency-target"
                label="Emergency fund target"
                value={formValues.emergencyFundTarget}
                error={formErrors.emergencyFundTarget}
                onChange={(value) => updateField("emergencyFundTarget", value)}
              />
              <MoneyField
                id="settings-variable-expenses"
                label="Variable expenses"
                value={formValues.estimatedVariableExpenses}
                error={formErrors.estimatedVariableExpenses}
                onChange={(value) => updateField("estimatedVariableExpenses", value)}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="submit" disabled={isSaving} isLoading={isSaving}>
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card aria-labelledby="delete-transcripts-heading">
        <CardContent className="grid gap-4">
          <div>
            <h3
              id="delete-transcripts-heading"
              className="text-lg font-semibold text-foreground"
            >
              Delete voice transcripts
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Remove every saved voice transcript from your account. Your other financial data and
              login stay as they are.
            </p>
          </div>
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="danger"
                  disabled={isDeletingTranscripts}
                  isLoading={isDeletingTranscripts}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete Voice Transcripts
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete voice transcripts?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes every saved voice transcript from your account. Your
                    financial data and login stay as they are.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void deleteTranscripts()}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      <Card aria-labelledby="delete-data-heading">
        <CardContent className="grid gap-4">
          <div>
            <h3 id="delete-data-heading" className="text-lg font-semibold text-foreground">
              Delete financial data
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              This clears SpendGuard profile, expense, debt, goal, check, cooldown, report, voice,
              and transaction rows for this login.
            </p>
          </div>
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="danger"
                  disabled={isDeleting}
                  isLoading={isDeleting}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete Financial Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete financial data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears your profile, expenses, debts, goals, and all related records. Your
                    login account remains active.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void deleteData()}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? "true" : undefined}
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

function toSettingsForm(profile: FinancialProfile): SettingsFormValues {
  return {
    currency: profile.currency,
    fullName: profile.fullName ?? "",
    monthlyIncome: String(profile.monthlyIncome),
    currentSavings: String(profile.currentSavings),
    emergencyFundTarget: String(profile.emergencyFundTarget),
    payFrequency: profile.payFrequency ?? "monthly",
    estimatedVariableExpenses: String(profile.estimatedVariableExpenses ?? 0),
  };
}

function parseSettingsForm(
  values: SettingsFormValues,
  currentProfile: FinancialProfile
):
  | { ok: true; profile: FinancialProfile }
  | { ok: false; errors: SettingsFormErrors } {
  const errors: SettingsFormErrors = {};
  const fullName = values.fullName.trim();
  const monthlyIncome = Number(values.monthlyIncome);
  const currentSavings = Number(values.currentSavings);
  const emergencyFundTarget = Number(values.emergencyFundTarget);
  const estimatedVariableExpenses = Number(values.estimatedVariableExpenses);

  if (fullName.length > 120) {
    errors.fullName = "Keep the name under 120 characters.";
  }

  if (values.monthlyIncome.trim() === "" || !Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
    errors.monthlyIncome = "Enter a positive monthly income.";
  }

  if (values.currentSavings.trim() === "" || !Number.isFinite(currentSavings) || currentSavings < 0) {
    errors.currentSavings = "Enter a positive current savings amount.";
  }

  if (
    values.emergencyFundTarget.trim() === "" ||
    !Number.isFinite(emergencyFundTarget) ||
    emergencyFundTarget < 0
  ) {
    errors.emergencyFundTarget = "Enter a positive emergency fund target.";
  }

  if (
    values.estimatedVariableExpenses.trim() === "" ||
    !Number.isFinite(estimatedVariableExpenses) ||
    estimatedVariableExpenses < 0
  ) {
    errors.estimatedVariableExpenses = "Enter positive variable expenses.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    profile: {
      currency: values.currency,
      fullName: fullName || undefined,
      monthlyIncome,
      currentSavings,
      emergencyFundTarget,
      emergencyBuffer: currentProfile.emergencyBuffer,
      cooldownPreference: currentProfile.cooldownPreference,
      payFrequency: values.payFrequency,
      estimatedVariableExpenses,
    },
  };
}
