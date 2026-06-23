alter table public.purchase_checks
  add column if not exists down_payment numeric(12,2),
  add column if not exists is_income_generating boolean not null default false,
  add column if not exists current_alternative_still_works boolean not null default false,
  add column if not exists risk_score integer not null default 0,
  add column if not exists savings_after_purchase numeric(12,2) not null default 0,
  add column if not exists cooldown_days integer not null default 0;

alter table public.purchase_checks
  add constraint purchase_checks_down_payment_nonnegative
    check (down_payment is null or down_payment >= 0),
  add constraint purchase_checks_risk_score_range
    check (risk_score >= 0 and risk_score <= 100),
  add constraint purchase_checks_cooldown_days_nonnegative
    check (cooldown_days >= 0);

update public.purchase_checks
set cooldown_days = case
  when amount < 2000 then 1
  when amount < 10000 then 3
  when amount < 50000 then 7
  else 30
end
where cooldown_days = 0;

-- Rollback, if needed:
-- alter table public.purchase_checks
--   drop constraint if exists purchase_checks_down_payment_nonnegative,
--   drop constraint if exists purchase_checks_risk_score_range,
--   drop constraint if exists purchase_checks_cooldown_days_nonnegative,
--   drop column if exists cooldown_days,
--   drop column if exists savings_after_purchase,
--   drop column if exists risk_score,
--   drop column if exists current_alternative_still_works,
--   drop column if exists is_income_generating,
--   drop column if exists down_payment;
