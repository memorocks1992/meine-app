alter table public.live_updates
  add column if not exists category text not null default 'club';

alter table public.live_updates
  drop constraint if exists live_updates_category_check;

alter table public.live_updates
  add constraint live_updates_category_check
  check (category in ('club', 'gastronomy'));

create index if not exists live_updates_category_created_at_idx
  on public.live_updates (category, created_at desc);

drop policy if exists "Expired live updates are hidden" on public.live_updates;
create policy "Expired live updates are hidden"
on public.live_updates as restrictive for select to anon, authenticated
using (
  created_at > now() - interval '48 hours'
  or (select public.is_queue_admin())
);
