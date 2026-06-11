-- Run this in Supabase SQL Editor if you get:
-- null value in column "extension_request_3mo" violates not-null constraint
--
-- Converts extension_request_3mo from boolean NOT NULL to nullable date (month/year).

alter table public.all_projects_monitoring
  alter column extension_request_3mo drop default;

alter table public.all_projects_monitoring
  alter column extension_request_3mo drop not null;

alter table public.all_projects_monitoring
  alter column extension_request_3mo type date
  using null::date;
