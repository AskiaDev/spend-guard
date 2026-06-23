alter table public.profiles
  add column full_name text,
  add column pay_frequency text not null default 'monthly',
  add column estimated_variable_expenses numeric(12,2) not null default 0,
  add column onboarding_completed boolean not null default false;

alter table public.profiles
  add constraint profiles_full_name_length
    check (full_name is null or char_length(full_name) <= 120),
  add constraint profiles_pay_frequency_check
    check (pay_frequency in ('monthly', 'semi_monthly', 'biweekly', 'weekly')),
  add constraint profiles_estimated_variable_expenses_check
    check (estimated_variable_expenses >= 0);

update public.profiles
set onboarding_completed = true
where onboarding_completed = false;

-- Rollback:
-- alter table public.profiles
--   drop constraint if exists profiles_full_name_length,
--   drop constraint if exists profiles_pay_frequency_check,
--   drop constraint if exists profiles_estimated_variable_expenses_check,
--   drop column if exists onboarding_completed,
--   drop column if exists estimated_variable_expenses,
--   drop column if exists pay_frequency,
--   drop column if exists full_name;
