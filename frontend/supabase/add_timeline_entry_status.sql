-- Add explicit status to timeline entries (run in Supabase SQL Editor)
alter table public.project_timeline_entries
  add column if not exists status text not null default 'update'::text;

alter table public.project_timeline_entries
  drop constraint if exists project_timeline_entries_status_check;

alter table public.project_timeline_entries
  add constraint project_timeline_entries_status_check check (
    status = any (
      array[
        'update'::text,
        'issue'::text,
        'resolved'::text
      ]
    )
  );

-- Backfill from remarks (matches inferEntryStatus in projectTimeline.js)
update public.project_timeline_entries
set status = 'issue'
where remarks ~* '(problem|issue|delay|concern|failed|error|stuck|cannot|unable|pending|blocked|hindi|walang)';

update public.project_timeline_entries
set status = 'resolved'
where remarks ~* '(resolved|fixed|completed|approved|solution|naayos|done|finished|success|implemented|signed)'
  and status = 'update';
