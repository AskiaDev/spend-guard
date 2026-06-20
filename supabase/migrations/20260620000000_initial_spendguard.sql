create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null default 'PHP',
  monthly_income numeric(12,2) not null check (monthly_income >= 0),
  current_savings numeric(12,2) not null check (current_savings >= 0),
  emergency_fund_target numeric(12,2) not null check (emergency_fund_target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null check (amount >= 0),
  due_day integer not null check (due_day between 1 and 31),
  is_recurring boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  outstanding_balance numeric(12,2) not null check (outstanding_balance >= 0),
  minimum_payment numeric(12,2) not null check (minimum_payment >= 0),
  due_day integer not null check (due_day between 1 and 31),
  interest_rate numeric(5,4) check (interest_rate is null or interest_rate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  target_amount numeric(12,2) not null check (target_amount >= 0),
  saved_amount numeric(12,2) not null default 0 check (saved_amount >= 0),
  monthly_contribution numeric(12,2) not null default 0 check (monthly_contribution >= 0),
  target_date date,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.purchase_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  urgency text not null check (urgency in ('need_now', 'need_this_month', 'can_wait', 'want')),
  payment_method text not null check (payment_method in ('cash', 'installment', 'credit_card', 'loan', 'bnpl')),
  installment_months integer check (installment_months is null or installment_months > 0),
  monthly_payment numeric(12,2) check (monthly_payment is null or monthly_payment >= 0),
  decision text not null check (decision in ('SAFE_TO_BUY', 'BUY_WITH_CAUTION', 'WAIT', 'NOT_RECOMMENDED')),
  safe_to_spend numeric(12,2) not null check (safe_to_spend >= 0),
  monthly_free_cash_flow numeric(12,2) not null,
  advisor_text text not null,
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.cooldown_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  urgency text not null check (urgency in ('need_now', 'need_this_month', 'can_wait', 'want')),
  payment_method text not null check (payment_method in ('cash', 'installment', 'credit_card', 'loan', 'bnpl')),
  source_check_id uuid references public.purchase_checks(id) on delete set null,
  added_at timestamptz not null default now(),
  recheck_at timestamptz not null
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary text not null,
  health_score integer not null check (health_score between 0 and 100),
  safe_to_spend numeric(12,2) not null check (safe_to_spend >= 0),
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transcript text not null,
  extracted_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();
create trigger debts_set_updated_at before update on public.debts
for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.debts enable row level security;
alter table public.goals enable row level security;
alter table public.purchase_checks enable row level security;
alter table public.cooldown_items enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.transactions enable row level security;
alter table public.voice_sessions enable row level security;

create index expenses_user_id_idx on public.expenses(user_id);
create index debts_user_id_idx on public.debts(user_id);
create index goals_user_id_idx on public.goals(user_id);
create index purchase_checks_user_id_created_at_idx on public.purchase_checks(user_id, created_at desc);
create index cooldown_items_user_id_recheck_at_idx on public.cooldown_items(user_id, recheck_at);
create index cooldown_items_source_check_id_idx on public.cooldown_items(source_check_id);
create index weekly_reports_user_id_created_at_idx on public.weekly_reports(user_id, created_at desc);
create index transactions_user_id_created_at_idx on public.transactions(user_id, created_at desc);
create index voice_sessions_user_id_created_at_idx on public.voice_sessions(user_id, created_at desc);

create policy "profiles_select_own" on public.profiles
for select using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.profiles
for insert with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "profiles_delete_own" on public.profiles
for delete using ((select auth.uid()) = user_id);

create policy "expenses_all_own" on public.expenses
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "debts_all_own" on public.debts
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_all_own" on public.goals
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "purchase_checks_all_own" on public.purchase_checks
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cooldown_items_all_own" on public.cooldown_items
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weekly_reports_all_own" on public.weekly_reports
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transactions_all_own" on public.transactions
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "voice_sessions_all_own" on public.voice_sessions
for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
