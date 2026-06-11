-- Run in Supabase SQL Editor if realignment_approved column still exists.
-- "With Approved Request for Realignment" is a group label only; 1st/2nd remain as checks.

alter table public.all_projects_monitoring
  drop column if exists realignment_approved;
