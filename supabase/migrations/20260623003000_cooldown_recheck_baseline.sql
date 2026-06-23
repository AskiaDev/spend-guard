-- Phase 6 — Cooldown completion.
-- Capture, at add-time, the baseline a recheck compares against (decision, risk score,
-- safe-to-spend) plus the decision-affecting purchase inputs, so `Recheck` can recompute
-- the §19 decision against a fresh snapshot and honestly report whether things improved.
-- Additive only: every column is nullable or defaulted, so existing rows stay valid.

alter table public.cooldown_items
  add column if not exists down_payment numeric(12,2),
  add column if not exists installment_months integer,
  add column if not exists monthly_payment numeric(12,2),
  add column if not exists is_income_generating boolean not null default false,
  add column if not exists current_alternative_still_works boolean not null default false,
  add column if not exists baseline_decision text,
  add column if not exists baseline_risk_score integer,
  add column if not exists baseline_safe_to_spend numeric(12,2);

alter table public.cooldown_items
  add constraint cooldown_items_down_payment_nonnegative
    check (down_payment is null or down_payment >= 0),
  add constraint cooldown_items_installment_months_positive
    check (installment_months is null or installment_months > 0),
  add constraint cooldown_items_monthly_payment_nonnegative
    check (monthly_payment is null or monthly_payment >= 0),
  add constraint cooldown_items_baseline_decision_check
    check (
      baseline_decision is null
      or baseline_decision in ('SAFE_TO_BUY', 'BUY_WITH_CAUTION', 'WAIT', 'NOT_RECOMMENDED')
    ),
  add constraint cooldown_items_baseline_risk_score_range
    check (baseline_risk_score is null or (baseline_risk_score between 0 and 100)),
  add constraint cooldown_items_baseline_safe_to_spend_nonnegative
    check (baseline_safe_to_spend is null or baseline_safe_to_spend >= 0);

-- Rollback, if needed:
-- alter table public.cooldown_items
--   drop constraint if exists cooldown_items_down_payment_nonnegative,
--   drop constraint if exists cooldown_items_installment_months_positive,
--   drop constraint if exists cooldown_items_monthly_payment_nonnegative,
--   drop constraint if exists cooldown_items_baseline_decision_check,
--   drop constraint if exists cooldown_items_baseline_risk_score_range,
--   drop constraint if exists cooldown_items_baseline_safe_to_spend_nonnegative,
--   drop column if exists baseline_safe_to_spend,
--   drop column if exists baseline_risk_score,
--   drop column if exists baseline_decision,
--   drop column if exists current_alternative_still_works,
--   drop column if exists is_income_generating,
--   drop column if exists monthly_payment,
--   drop column if exists installment_months,
--   drop column if exists down_payment;
