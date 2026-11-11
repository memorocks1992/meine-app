create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  author_name varchar(40) not null check (length(btrim(author_name)) between 1 and 40),
  body varchar(2000) not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  visitor_id uuid not null,
  author_name varchar(40) not null check (length(btrim(author_name)) between 1 and 40),
  body varchar(1000) not null check (length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.forum_likes (
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, visitor_id)
);

create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.forum_posts (id) on delete cascade,
  comment_id uuid references public.forum_comments (id) on delete cascade,
  reason varchar(500) not null default 'Inhalt melden',
  created_at timestamptz not null default now(),
  constraint forum_reports_one_target check (
    (post_id is not null and comment_id is null)
    or (post_id is null and comment_id is not null)
  )
);

create index if not exists forum_posts_created_at_idx
  on public.forum_posts (created_at desc);
create index if not exists forum_comments_post_created_idx
  on public.forum_comments (post_id, created_at);
create index if not exists forum_reports_created_at_idx
  on public.forum_reports (created_at desc);

alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_likes enable row level security;
alter table public.forum_reports enable row level security;

drop policy if exists "Anyone can read forum posts" on public.forum_posts;
create policy "Anyone can read forum posts"
on public.forum_posts for select to anon, authenticated
using (true);

drop policy if exists "Anyone can create forum posts" on public.forum_posts;
create policy "Anyone can create forum posts"
on public.forum_posts for insert to anon, authenticated
with check (true);

drop policy if exists "Admins can delete forum posts" on public.forum_posts;
create policy "Admins can delete forum posts"
on public.forum_posts for delete to authenticated
using ((select public.is_queue_admin()));

drop policy if exists "Anyone can read forum comments" on public.forum_comments;
create policy "Anyone can read forum comments"
on public.forum_comments for select to anon, authenticated
using (true);

drop policy if exists "Anyone can create forum comments" on public.forum_comments;
create policy "Anyone can create forum comments"
on public.forum_comments for insert to anon, authenticated
with check (true);

drop policy if exists "Admins can delete forum comments" on public.forum_comments;
create policy "Admins can delete forum comments"
on public.forum_comments for delete to authenticated
using ((select public.is_queue_admin()));

drop policy if exists "Anyone can like forum posts" on public.forum_likes;
create policy "Anyone can like forum posts"
on public.forum_likes for insert to anon, authenticated
with check (true);

drop policy if exists "Anyone can remove forum likes" on public.forum_likes;
create policy "Anyone can remove forum likes"
on public.forum_likes for delete to anon, authenticated
using (true);

drop policy if exists "Anyone can report forum content" on public.forum_reports;
create policy "Anyone can report forum content"
on public.forum_reports for insert to anon, authenticated
with check (true);

drop policy if exists "Admins can review forum reports" on public.forum_reports;
create policy "Admins can review forum reports"
on public.forum_reports for select to authenticated
using ((select public.is_queue_admin()));

drop policy if exists "Admins can dismiss forum reports" on public.forum_reports;
create policy "Admins can dismiss forum reports"
on public.forum_reports for delete to authenticated
using ((select public.is_queue_admin()));

create or replace function public.get_forum_post_likes(post_ids uuid[], viewer_id uuid)
returns table (post_id uuid, like_count bigint, liked_by_viewer boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select requested.post_id,
         count(likes.visitor_id)::bigint,
         coalesce(bool_or(likes.visitor_id = viewer_id), false)
  from unnest(post_ids) as requested(post_id)
  left join public.forum_likes as likes on likes.post_id = requested.post_id
  group by requested.post_id;
$$;

revoke all on function public.get_forum_post_likes(uuid[], uuid) from public;
grant execute on function public.get_forum_post_likes(uuid[], uuid) to anon, authenticated;

grant select (id, author_name, body, created_at)
  on public.forum_posts to anon, authenticated;
grant select (id, post_id, author_name, body, created_at)
  on public.forum_comments to anon, authenticated;
grant insert (visitor_id, author_name, body)
  on public.forum_posts to anon, authenticated;
grant insert (post_id, visitor_id, author_name, body)
  on public.forum_comments to anon, authenticated;
grant delete on public.forum_posts, public.forum_comments to authenticated;
grant insert, delete on public.forum_likes to anon, authenticated;
grant insert (post_id, comment_id, reason) on public.forum_reports to anon, authenticated;
grant select, delete on public.forum_reports to authenticated;
