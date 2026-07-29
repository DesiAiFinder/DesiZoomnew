-- SECURITY FIX — run this in the Supabase SQL editor.
-- Safe to run more than once. Run the whole file in one go.
--
-- Problem: schema.sql has
--     create policy "Own profile update" on public.profiles
--       for update using (auth.uid() = id);
-- An UPDATE policy with USING but no WITH CHECK does not validate the NEW row,
-- and `authenticated` holds column-level UPDATE on every column of profiles.
-- So any signed-in user can run, with the public anon key:
--     supabase.from('profiles').update({ role: 'admin' }).eq('id', <their own id>)
-- ...and is_admin() then returns true, which grants them the "admins full
-- access" policy on every content table (payments, orders, refunds, users).

-- 1. Users may never write their own role.
--    This alone closes the escalation path.
revoke update (role) on public.profiles from authenticated, anon;

-- 2. Add the missing WITH CHECK so the updated row is validated too.
--    ALTER, not DROP+CREATE: no window where the table is unguarded, and no
--    "already exists" error on a re-run.
alter policy "Own profile update"
  on public.profiles
  using      (auth.uid() = id)
  with check (auth.uid() = id);


-- ── Verify ───────────────────────────────────────────────────────────────────
-- Run these after the above. Expected results in comments.

-- (a) Policy now has both clauses — qual AND with_check should both be set.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles';

-- (b) No UPDATE grant on the role column — should return zero rows.
select grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name   = 'profiles'
  and column_name  = 'role'
  and privilege_type = 'UPDATE'
  and grantee in ('authenticated', 'anon');

-- (c) Audit current admins. Demote anyone you did not promote yourself:
--     update public.profiles set role = 'user' where id = '<id>';
select id, role from public.profiles where role = 'admin';
