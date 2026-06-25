alter table public.profiles
  add column if not exists emergency_buffer numeric not null default 0,
  add column if not exists cooldown_preference text not null default 'balanced'
    check (cooldown_preference in ('light', 'balanced', 'strict')),
  add column if not exists intent text[] not null default '{}',
  add column if not exists spending_pain_points text[] not null default '{}';
