-- Task completion proof photos (run once in Supabase SQL Editor)

insert into storage.buckets (id, name, public)
values ('task-completion-proofs', 'task-completion-proofs', true)
on conflict (id) do nothing;

drop policy if exists "Public read task completion proofs" on storage.objects;
drop policy if exists "Anon insert task completion proofs" on storage.objects;
drop policy if exists "Anon update task completion proofs" on storage.objects;
drop policy if exists "Anon delete task completion proofs" on storage.objects;

create policy "Public read task completion proofs"
  on storage.objects for select
  using (bucket_id = 'task-completion-proofs');

create policy "Anon insert task completion proofs"
  on storage.objects for insert
  with check (bucket_id = 'task-completion-proofs');

create policy "Anon update task completion proofs"
  on storage.objects for update
  using (bucket_id = 'task-completion-proofs');

create policy "Anon delete task completion proofs"
  on storage.objects for delete
  using (bucket_id = 'task-completion-proofs');
