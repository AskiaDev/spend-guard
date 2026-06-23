alter table public.purchase_checks
  add column if not exists category text,
  add column if not exists sale_deadline date,
  add column if not exists location text,
  add column if not exists notes text,
  add column if not exists status text not null default 'checked',
  add column if not exists emergency_fund_progress numeric(5,4) not null default 0,
  add column if not exists debt_pressure numeric(7,4) not null default 0,
  add column if not exists goal_delay_months integer not null default 0,
  add column if not exists health_score integer not null default 0;

alter table public.purchase_checks
  add constraint purchase_checks_category_length
    check (category is null or (char_length(category) between 1 and 60)),
  add constraint purchase_checks_location_length
    check (location is null or char_length(location) <= 120),
  add constraint purchase_checks_notes_length
    check (notes is null or char_length(notes) <= 1000),
  add constraint purchase_checks_status_check
    check (status in ('checked', 'bought', 'skipped')),
  add constraint purchase_checks_emergency_fund_progress_range
    check (emergency_fund_progress >= 0 and emergency_fund_progress <= 1),
  add constraint purchase_checks_debt_pressure_nonnegative
    check (debt_pressure >= 0),
  add constraint purchase_checks_goal_delay_months_nonnegative
    check (goal_delay_months >= 0),
  add constraint purchase_checks_health_score_range
    check (health_score >= 0 and health_score <= 100);

-- Rollback, if needed:
-- alter table public.purchase_checks
--   drop constraint if exists purchase_checks_category_length,
--   drop constraint if exists purchase_checks_location_length,
--   drop constraint if exists purchase_checks_notes_length,
--   drop constraint if exists purchase_checks_status_check,
--   drop constraint if exists purchase_checks_emergency_fund_progress_range,
--   drop constraint if exists purchase_checks_debt_pressure_nonnegative,
--   drop constraint if exists purchase_checks_goal_delay_months_nonnegative,
--   drop constraint if exists purchase_checks_health_score_range,
--   drop column if exists health_score,
--   drop column if exists goal_delay_months,
--   drop column if exists debt_pressure,
--   drop column if exists emergency_fund_progress,
--   drop column if exists status,
--   drop column if exists notes,
--   drop column if exists location,
--   drop column if exists sale_deadline,
--   drop column if exists category;
