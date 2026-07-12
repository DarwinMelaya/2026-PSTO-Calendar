-- Add telephone_number to contacts if the table was already created without it.
-- Run in Supabase SQL Editor

alter table public.contacts
  add column if not exists telephone_number text null;
