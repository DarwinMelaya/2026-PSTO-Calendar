-- Add approval workflow for user-submitted CTO entries (run in Supabase SQL Editor)

alter table public.cto_entries
  add column if not exists status text not null default 'approved';

alter table public.cto_entries
  add column if not exists rejection_reason text null;

alter table public.cto_entries
  add column if not exists reviewed_at timestamp with time zone null;

alter table public.cto_entries
  drop constraint if exists cto_entries_status_check;

alter table public.cto_entries
  add constraint cto_entries_status_check check (
    status = any (array['pending'::text, 'approved'::text, 'rejected'::text])
  );

create index if not exists cto_entries_status_idx on public.cto_entries (status);
