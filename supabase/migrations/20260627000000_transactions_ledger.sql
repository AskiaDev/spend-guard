-- Evolve the (currently unused) transactions table into the slice-1 ledger.
-- RLS policy "transactions_all_own" already exists from 20260620000000_initial_spendguard.sql.

alter table public.transactions
  add column if not exists occurred_at  date,
  add column if not exists direction    text,
  add column if not exists category     text,
  add column if not exists counterparty text,
  add column if not exists source       text,
  add column if not exists source_ref   text,
  add column if not exists confidence   numeric,
  add column if not exists status       text not null default 'confirmed',
  add column if not exists raw_extract  jsonb;

alter table public.transactions
  add constraint transactions_direction_chk
    check (direction is null or direction in ('income', 'expense'));

alter table public.transactions
  add constraint transactions_status_chk
    check (status in ('pending_review', 'confirmed'));

create index if not exists transactions_user_status_occurred_idx
  on public.transactions (user_id, status, occurred_at);
