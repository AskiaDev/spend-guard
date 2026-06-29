alter table public.expenses
  add column if not exists second_due_day integer;

alter table public.debts
  add column if not exists second_due_day integer;

alter table public.expenses
  drop constraint if exists expenses_payment_cadence_check,
  drop constraint if exists expenses_second_due_day_check,
  drop constraint if exists expenses_semi_monthly_second_due_day_check;

alter table public.expenses
  add constraint expenses_payment_cadence_check
    check (payment_cadence in ('monthly', 'semi_monthly', 'biweekly')),
  add constraint expenses_second_due_day_check
    check (second_due_day is null or second_due_day between 1 and 31),
  add constraint expenses_semi_monthly_second_due_day_check
    check (payment_cadence <> 'semi_monthly' or (second_due_day is not null and second_due_day <> due_day));

alter table public.debts
  drop constraint if exists debts_payment_cadence_check,
  drop constraint if exists debts_second_due_day_check,
  drop constraint if exists debts_semi_monthly_second_due_day_check;

alter table public.debts
  add constraint debts_payment_cadence_check
    check (payment_cadence in ('monthly', 'semi_monthly', 'biweekly')),
  add constraint debts_second_due_day_check
    check (second_due_day is null or second_due_day between 1 and 31),
  add constraint debts_semi_monthly_second_due_day_check
    check (payment_cadence <> 'semi_monthly' or (second_due_day is not null and second_due_day <> due_day));

notify pgrst, 'reload schema';

-- Rollback, if needed:
-- alter table public.expenses
--   drop constraint if exists expenses_semi_monthly_second_due_day_check,
--   drop constraint if exists expenses_second_due_day_check,
--   drop constraint if exists expenses_payment_cadence_check,
--   add constraint expenses_payment_cadence_check
--     check (payment_cadence in ('monthly', 'biweekly')),
--   drop column if exists second_due_day;
-- alter table public.debts
--   drop constraint if exists debts_semi_monthly_second_due_day_check,
--   drop constraint if exists debts_second_due_day_check,
--   drop constraint if exists debts_payment_cadence_check,
--   add constraint debts_payment_cadence_check
--     check (payment_cadence in ('monthly', 'biweekly')),
--   drop column if exists second_due_day;
