-- Task instruction/reference photos (run once in Supabase SQL Editor)

insert into storage.buckets (id, name, public)
values ('task-instruction-images', 'task-instruction-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read task instruction images" on storage.objects;
drop policy if exists "Anon insert task instruction images" on storage.objects;
drop policy if exists "Anon update task instruction images" on storage.objects;
drop policy if exists "Anon delete task instruction images" on storage.objects;

create policy "Public read task instruction images"
  on storage.objects for select
  using (bucket_id = 'task-instruction-images');

create policy "Anon insert task instruction images"
  on storage.objects for insert
  with check (bucket_id = 'task-instruction-images');

create policy "Anon update task instruction images"
  on storage.objects for update
  using (bucket_id = 'task-instruction-images');

create policy "Anon delete task instruction images"
  on storage.objects for delete
  using (bucket_id = 'task-instruction-images');
