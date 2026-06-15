-- Add Municipality and Type of Project to All Projects Monitoring.
-- Run in Supabase SQL Editor on existing databases.

alter table public.all_projects_monitoring
  add column if not exists municipality text null,
  add column if not exists project_type text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'all_projects_monitoring_project_type_check'
  ) then
    alter table public.all_projects_monitoring
      add constraint all_projects_monitoring_project_type_check check (
        project_type is null
        or project_type = any (
          array[
            'GIA'::text,
            'SETUP'::text,
            'CEST'::text,
            'SSCP'::text
          ]
        )
      );
  end if;
end $$;

create index if not exists all_projects_monitoring_project_type_idx
  on public.all_projects_monitoring (project_type);

create index if not exists all_projects_monitoring_municipality_idx
  on public.all_projects_monitoring (municipality);
