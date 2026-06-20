alter function public.set_updated_at() set search_path = public, pg_temp;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public;
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
  end if;
end;
$$;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "expenses_all_own" on public.expenses;
drop policy if exists "debts_all_own" on public.debts;
drop policy if exists "goals_all_own" on public.goals;
drop policy if exists "purchase_checks_all_own" on public.purchase_checks;
drop policy if exists "cooldown_items_all_own" on public.cooldown_items;
drop policy if exists "weekly_reports_all_own" on public.weekly_reports;
drop policy if exists "transactions_all_own" on public.transactions;
drop policy if exists "voice_sessions_all_own" on public.voice_sessions;

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

create index if not exists cooldown_items_source_check_id_idx
on public.cooldown_items(source_check_id);
