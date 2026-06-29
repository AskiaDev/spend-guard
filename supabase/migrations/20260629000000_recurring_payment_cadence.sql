alter table public.expenses
  add column if not exists payment_cadence text not null default 'monthly',
  add column if not exists next_due_date date;

alter table public.debts
  add column if not exists payment_cadence text not null default 'monthly',
  add column if not exists next_due_date date;

alter table public.expenses
  add constraint expenses_payment_cadence_check
    check (payment_cadence in ('monthly', 'biweekly')),
  add constraint expenses_biweekly_next_due_date_check
    check (payment_cadence <> 'biweekly' or next_due_date is not null);

alter table public.debts
  add constraint debts_payment_cadence_check
    check (payment_cadence in ('monthly', 'biweekly')),
  add constraint debts_biweekly_next_due_date_check
    check (payment_cadence <> 'biweekly' or next_due_date is not null);

-- Rollback, if needed:
-- alter table public.expenses
--   drop constraint if exists expenses_biweekly_next_due_date_check,
--   drop constraint if exists expenses_payment_cadence_check,
--   drop column if exists next_due_date,
--   drop column if exists payment_cadence;
-- alter table public.debts
--   drop constraint if exists debts_biweekly_next_due_date_check,
--   drop constraint if exists debts_payment_cadence_check,
--   drop column if exists next_due_date,
--   drop column if exists payment_cadence;
