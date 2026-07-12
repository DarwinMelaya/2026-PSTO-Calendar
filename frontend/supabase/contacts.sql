-- Migration for EXISTING public.contacts table
-- Run this in Supabase SQL Editor (safe to re-run)

-- 1) Add organization / association
alter table public.contacts
  add column if not exists organization text null;

-- 2) Add mobile_numbers array
alter table public.contacts
  add column if not exists mobile_numbers text[] null default '{}';

-- 3) Copy old single mobile_number into mobile_numbers, then drop legacy column
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'contacts'
      and column_name = 'mobile_number'
  ) then
    update public.contacts
    set mobile_numbers = array[trim(mobile_number)]
    where mobile_number is not null
      and trim(mobile_number) <> ''
      and (mobile_numbers is null or cardinality(mobile_numbers) = 0);

    alter table public.contacts drop column mobile_number;
  end if;
end $$;

-- 4) Indexes
create index if not exists contacts_name_idx on public.contacts using btree (name);
create index if not exists contacts_category_idx on public.contacts using btree (category);
create index if not exists contacts_organization_idx on public.contacts using btree (organization);
create index if not exists contacts_created_at_idx on public.contacts using btree (created_at desc);

-- Optional: keep RLS disabled + grants (same as before)
alter table public.contacts disable row level security;
grant select, insert, update, delete on public.contacts to anon, authenticated;
