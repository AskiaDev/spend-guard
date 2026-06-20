"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Select } from "@/components/ui/form-fields";
import { financialProfileSchema } from "@/lib/schemas/finance";
import { createId } from "@/lib/utils";
import type { FinancialSnapshot } from "@/types/finance";
import type { z } from "zod";

const onboardingSchema = financialProfileSchema.extend({
  fixedExpenses: financialProfileSchema.shape.monthlyIncome,
  debtMinimums: financialProfileSchema.shape.monthlyIncome,
  goalContribution: financialProfileSchema.shape.monthlyIncome,
});

type OnboardingFormInput = z.input<typeof onboardingSchema>;
type OnboardingFormOutput = z.output<typeof onboardingSchema>;

interface OnboardingSetupProps {
  snapshot: FinancialSnapshot;
  isHydrated: boolean;
  onSave: (payload: FinancialSnapshot) => Promise<void>;
}

export function OnboardingSetup({ snapshot, isHydrated, onSave }: OnboardingSetupProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormInput, unknown, OnboardingFormOutput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      currency: snapshot.profile.currency,
      monthlyIncome: snapshot.profile.monthlyIncome,
      currentSavings: snapshot.profile.currentSavings,
      emergencyFundTarget: snapshot.profile.emergencyFundTarget,
      fixedExpenses: snapshot.expenses.reduce((total, expense) => total + expense.amount, 0),
      debtMinimums: snapshot.debts.reduce((total, debt) => total + debt.minimumPayment, 0),
      goalContribution: snapshot.goals.reduce(
        (total, goal) => total + goal.monthlyContribution,
        0
      ),
    },
  });

  const submit = handleSubmit(async (values) => {
    const parsed = financialProfileSchema.parse(values);
    await onSave({
      profile: parsed,
      expenses: [
        {
          id: createId("expense"),
          label: "Fixed monthly expenses",
          amount: Number(values.fixedExpenses),
          dueDay: 1,
          isRecurring: true,
        },
      ],
      debts:
        Number(values.debtMinimums) > 0
          ? [
              {
                id: createId("debt"),
                label: "Debt minimums",
                outstandingBalance: Number(values.debtMinimums) * 8,
                minimumPayment: Number(values.debtMinimums),
                dueDay: 15,
                interestRate: 0.24,
              },
            ]
          : [],
      goals:
        Number(values.goalContribution) > 0
          ? [
              {
                id: createId("goal"),
                label: "Primary savings goal",
                targetAmount: parsed.emergencyFundTarget,
                savedAmount: parsed.currentSavings,
                monthlyContribution: Number(values.goalContribution),
                targetDate: "2026-12-31",
                priority: "high",
              },
            ]
          : [],
    });
  });

  return (
    <Card className="border-zinc-300">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-800">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div>
          <CardTitle>Financial Profile</CardTitle>
          <p className="mt-1 text-sm text-zinc-600">
            Local-first profile used by deterministic purchase checks.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" {...register("currency")}>
              <option value="PHP">PHP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
              <option value="SGD">SGD</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="monthlyIncome">Monthly income</Label>
            <Input id="monthlyIncome" type="number" min="0" {...register("monthlyIncome")} />
            <FieldError>{errors.monthlyIncome?.message}</FieldError>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currentSavings">Current savings</Label>
            <Input id="currentSavings" type="number" min="0" {...register("currentSavings")} />
            <FieldError>{errors.currentSavings?.message}</FieldError>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emergencyFundTarget">Emergency target</Label>
            <Input
              id="emergencyFundTarget"
              type="number"
              min="0"
              {...register("emergencyFundTarget")}
            />
            <FieldError>{errors.emergencyFundTarget?.message}</FieldError>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="fixedExpenses">Fixed monthly expenses</Label>
            <Input id="fixedExpenses" type="number" min="0" {...register("fixedExpenses")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="debtMinimums">Debt minimums</Label>
            <Input id="debtMinimums" type="number" min="0" {...register("debtMinimums")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="goalContribution">Goal contribution</Label>
            <Input
              id="goalContribution"
              type="number"
              min="0"
              {...register("goalContribution")}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={!isHydrated || isSubmitting}>
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
