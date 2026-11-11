create table if not exists public.forum_comment_likes (
  comment_id uuid not null references public.forum_comments (id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, visitor_id)
);

alter table public.forum_comment_likes enable row level security;

drop policy if exists "Anyone can like recent forum comments" on public.forum_comment_likes;
create policy "Anyone can like recent forum comments"
on public.forum_comment_likes for insert to anon, authenticated
with check (
  exists (
    select 1
    from public.forum_comments as comments
    join public.forum_posts as posts on posts.id = comments.post_id
    where comments.id = forum_comment_likes.comment_id
      and comments.created_at > now() - interval '24 hours'
      and posts.created_at > now() - interval '24 hours'
  )
);

drop policy if exists "Visitors can remove their forum comment likes" on public.forum_comment_likes;
create policy "Visitors can remove their forum comment likes"
on public.forum_comment_likes for delete to anon, authenticated
using (true);

create or replace function public.get_forum_comment_likes(comment_ids uuid[], viewer_id uuid)
returns table (comment_id uuid, like_count bigint, liked_by_viewer boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select requested.comment_id,
         count(likes.visitor_id)::bigint,
         coalesce(bool_or(likes.visitor_id = viewer_id), false)
  from unnest(comment_ids) as requested(comment_id)
  left join public.forum_comment_likes as likes on likes.comment_id = requested.comment_id
  group by requested.comment_id;
$$;

revoke all on function public.get_forum_comment_likes(uuid[], uuid) from public;
grant execute on function public.get_forum_comment_likes(uuid[], uuid) to anon, authenticated;

grant insert (comment_id, visitor_id) on public.forum_comment_likes to anon, authenticated;
grant delete on public.forum_comment_likes to anon, authenticated;
