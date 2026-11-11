create extension if not exists pg_cron with schema pg_catalog;

alter table public.forum_posts
  add column if not exists club_slug text;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'forum_posts'
      and constraint_name = 'forum_posts_club_slug_fkey'
  ) then
    alter table public.forum_posts
      add constraint forum_posts_club_slug_fkey
      foreign key (club_slug) references public.clubs (slug) on delete cascade;
  end if;
end;
$$;

create index if not exists forum_posts_club_created_at_idx
  on public.forum_posts (club_slug, created_at desc);

drop policy if exists "Anyone can read forum posts" on public.forum_posts;
create policy "Anyone can read forum posts"
on public.forum_posts for select to anon, authenticated
using (
  club_slug is not null
  and created_at > now() - interval '24 hours'
);

drop policy if exists "Anyone can create forum posts" on public.forum_posts;
create policy "Anyone can create forum posts"
on public.forum_posts for insert to anon, authenticated
with check (
  club_slug is not null
  and exists (
    select 1 from public.clubs
    where slug = forum_posts.club_slug and is_active
  )
);

drop policy if exists "Anyone can read forum comments" on public.forum_comments;
create policy "Anyone can read forum comments"
on public.forum_comments for select to anon, authenticated
using (
  created_at > now() - interval '24 hours'
  and exists (
    select 1
    from public.forum_posts
    where id = forum_comments.post_id
      and club_slug is not null
      and created_at > now() - interval '24 hours'
  )
);

drop policy if exists "Anyone can create forum comments" on public.forum_comments;
create policy "Anyone can create forum comments"
on public.forum_comments for insert to anon, authenticated
with check (
  exists (
    select 1
    from public.forum_posts
    where id = forum_comments.post_id
      and club_slug is not null
      and created_at > now() - interval '24 hours'
  )
);

drop policy if exists "Anyone can like forum posts" on public.forum_likes;
create policy "Anyone can like forum posts"
on public.forum_likes for insert to anon, authenticated
with check (
  exists (
    select 1
    from public.forum_posts
    where id = forum_likes.post_id
      and club_slug is not null
      and created_at > now() - interval '24 hours'
  )
);

drop policy if exists "Anyone can report forum content" on public.forum_reports;
create policy "Anyone can report forum content"
on public.forum_reports for insert to anon, authenticated
with check (
  (post_id is not null and exists (
    select 1 from public.forum_posts
    where id = forum_reports.post_id
      and club_slug is not null
      and created_at > now() - interval '24 hours'
  ))
  or
  (comment_id is not null and exists (
    select 1 from public.forum_comments
    where id = forum_reports.comment_id
      and created_at > now() - interval '24 hours'
  ))
);

grant select (club_slug) on public.forum_posts to anon, authenticated;
grant insert (club_slug) on public.forum_posts to anon, authenticated;

create or replace function public.delete_expired_forum_messages()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.forum_comments
  where created_at <= now() - interval '24 hours';

  delete from public.forum_posts
  where created_at <= now() - interval '24 hours';
end;
$$;

revoke all on function public.delete_expired_forum_messages() from public, anon, authenticated;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'forum-expire-messages'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'forum-expire-messages',
    '*/5 * * * *',
    'select public.delete_expired_forum_messages();'
  );
end;
$$;
