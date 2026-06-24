-- Cross-user RLS isolation test (PRD §22-25 / Phase 11).
--
-- Proves that an authenticated user CANNOT read or delete another user's rows,
-- exercising the real per-user RLS policies (`*_all_own`, `profiles_*_own`).
--
-- SAFETY: rollback-only. The whole test is ONE anonymous DO block that ends with
--   `raise exception 'RLS_ISOLATION_OK'`
-- so a successful run ABORTS its own transaction and persists nothing — safe to
-- run against the remote (even production) project. It never issues COMMIT.
--
-- Interpreting the result (run via the Supabase MCP `execute_sql`):
--   * error message contains 'RLS_ISOLATION_OK'  -> PASS (all assertions held, rolled back)
--   * error message contains 'RLS FAIL: ...'      -> FAIL (an isolation guarantee broke)
--   * any other error                             -> test setup problem, fix and re-run
--
-- Seeded ids are fixed sentinels; the rollback removes them regardless.

do $$
declare
  user_a uuid := '0badf00d-0000-4000-a000-0000000000aa';
  user_b uuid := '0badf00d-0000-4000-b000-0000000000bb';
  visible int;
  deleted int;
begin
  -- Seed as the privileged session role: two users, and rows owned by user A.
  insert into auth.users (id, aud, role, email)
  values (user_a, 'authenticated', 'authenticated', 'rls-a@example.test'),
         (user_b, 'authenticated', 'authenticated', 'rls-b@example.test')
  on conflict (id) do nothing;

  insert into public.profiles (user_id, currency, monthly_income, current_savings, emergency_fund_target)
  values (user_a, 'PHP', 1, 1, 1)
  on conflict (user_id) do nothing;
  insert into public.expenses (user_id, label, amount, due_day)
  values (user_a, 'Rent', 1000, 15);
  insert into public.voice_sessions (user_id, transcript)
  values (user_a, 'user A private transcript');

  -- Become authenticated user B (drives auth.uid() through the JWT claim).
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into visible from public.voice_sessions where user_id = user_a;
  assert visible = 0, format('RLS FAIL: user B read %s of user A voice_sessions', visible);
  select count(*) into visible from public.profiles where user_id = user_a;
  assert visible = 0, format('RLS FAIL: user B read %s of user A profiles', visible);
  select count(*) into visible from public.expenses where user_id = user_a;
  assert visible = 0, format('RLS FAIL: user B read %s of user A expenses', visible);

  -- B tries to delete A's transcript: RLS must scope the delete to B's own rows (0).
  with d as (delete from public.voice_sessions where user_id = user_a returning 1)
  select count(*) into deleted from d;
  assert deleted = 0, format('RLS FAIL: user B deleted %s of user A voice_sessions', deleted);

  -- Owner A must still see its own (undeleted) transcript.
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into visible from public.voice_sessions where user_id = user_a;
  assert visible = 1, format('RLS FAIL: owner A sees %s of own voice_sessions (expected 1)', visible);
  reset role;

  -- All guarantees held. Force a rollback so nothing persists.
  raise exception 'RLS_ISOLATION_OK';
end $$;
