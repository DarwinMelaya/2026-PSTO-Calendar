-- Allow viewer role on existing profiles table (run in Supabase SQL editor)
alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['admin'::text, 'user'::text, 'viewer'::text]));
