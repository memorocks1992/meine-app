create table if not exists public.clubs (
  slug text primary key,
  name text not null,
  district text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  color text not null,
  is_active boolean not null default true
);

insert into public.clubs (slug, name, district, address, latitude, longitude, color)
values
  ('berghain', 'Berghain', 'Friedrichshain', 'Am Wriezener Bahnhof', 52.5112, 13.4437, '#fb7185'),
  ('sisyphos', 'Sisyphos', 'Rummelsburg', 'Hauptstraße 15', 52.4945, 13.4982, '#fbbf24'),
  ('tresor', 'Tresor', 'Mitte', 'Köpenicker Straße 70', 52.5101, 13.4186, '#38bdf8'),
  ('kitkatclub', 'KitKatClub', 'Mitte', 'Köpenicker Straße 76', 52.5095, 13.4198, '#c084fc'),
  ('about-blank', 'about:blank', 'Friedrichshain', 'Markgrafendamm 24c', 52.503, 13.4693, '#4ade80'),
  ('wilde-renate', 'Wilde Renate', 'Stralau', 'Alt-Stralau 70', 52.4985, 13.4667, '#fb923c'),
  ('club-der-visionaere', 'Club der Visionäre', 'Treptow', 'Am Flutgraben 1', 52.4941, 13.4201, '#2dd4bf'),
  ('ritter-butzke', 'Ritter Butzke', 'Kreuzberg', 'Ritterstraße 26', 52.502, 13.4107, '#f472b6'),
  ('schwuz', 'SchwuZ', 'Neukölln', 'Rollbergstraße 26', 52.4814, 13.431, '#a3e635'),
  ('rso-berlin', 'RSO.Berlin', 'Niederschöneweide', 'Schnellerstraße 137', 52.4558, 13.5105, '#818cf8'),
  ('heidegluehen', 'Heideglühen', 'Moabit', 'Seestraße 1', 52.5413, 13.3405, '#f87171'),
  ('club-ost', 'Club OST', 'Stralau', 'Alt-Stralau 1–2', 52.5001, 13.4718, '#e879f9')
on conflict (slug) do nothing;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  club_slug text not null references public.clubs (slug) on update cascade on delete restrict,
  visitor_id uuid not null,
  wait_minutes integer check (wait_minutes in (0, 10, 20, 30, 45, 60, 90, 120, 180, 210, 240)),
  entry_chance smallint check (entry_chance between 1 and 10),
  mood smallint check (mood between 1 and 10),
  entry_range text check (entry_range in ('Up to €10', '€10–15', '€15–20', '€20–30', '€30+')),
  created_at timestamptz not null default now(),
  constraint reports_have_at_least_one_value check (
    wait_minutes is not null
    or entry_chance is not null
    or mood is not null
    or entry_range is not null
  )
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  club_slug text not null references public.clubs (slug) on update cascade on delete cascade,
  event_date date not null,
  description varchar(160) not null,
  updated_at timestamptz not null default now(),
  unique (club_slug, event_date)
);

create table if not exists public.live_updates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('warning', 'info')),
  message varchar(240) not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_queue_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_queue_admin() from public;
grant execute on function public.is_queue_admin() to authenticated;
grant execute on function public.is_queue_admin() to anon;

create or replace function public.enforce_report_cooldown()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.clubs
    where slug = new.club_slug and is_active
  ) then
    raise exception 'Reports are not accepted for this club.'
      using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.club_slug || ':' || new.visitor_id::text, 0)
  );

  if exists (
    select 1
    from public.reports
    where club_slug = new.club_slug
      and visitor_id = new.visitor_id
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Please wait 10 minutes before reporting this club again.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_report_cooldown() from public, anon, authenticated;

drop trigger if exists reports_enforce_cooldown on public.reports;
create trigger reports_enforce_cooldown
before insert on public.reports
for each row execute function public.enforce_report_cooldown();

alter table public.clubs enable row level security;
alter table public.admin_users enable row level security;
alter table public.reports enable row level security;
alter table public.events enable row level security;
alter table public.live_updates enable row level security;

drop policy if exists "Anyone can read active clubs" on public.clubs;
create policy "Anyone can read active clubs"
on public.clubs for select to anon, authenticated
using (is_active or (select public.is_queue_admin()));

drop policy if exists "Admins manage clubs" on public.clubs;
create policy "Admins manage clubs"
on public.clubs for all to authenticated
using ((select public.is_queue_admin()))
with check ((select public.is_queue_admin()));

drop policy if exists "Admins can read their own role" on public.admin_users;
create policy "Admins can read their own role"
on public.admin_users for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Visitors can submit reports" on public.reports;
create policy "Visitors can submit reports"
on public.reports for insert to anon, authenticated
with check (true);

drop policy if exists "Admins can review reports" on public.reports;
create policy "Admins can review reports"
on public.reports for select to authenticated
using ((select public.is_queue_admin()));

drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports"
on public.reports for delete to authenticated
using ((select public.is_queue_admin()));

drop policy if exists "Anyone can read upcoming events" on public.events;
create policy "Anyone can read upcoming events"
on public.events for select to anon, authenticated
using (
  event_date between (now() at time zone 'Europe/Berlin')::date
    and (now() at time zone 'Europe/Berlin')::date + 31
);

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events"
on public.events for all to authenticated
using ((select public.is_queue_admin()))
with check ((select public.is_queue_admin()));

drop policy if exists "Anyone can read recent live updates" on public.live_updates;
create policy "Anyone can read recent live updates"
on public.live_updates for select to anon, authenticated
using (created_at > now() - interval '30 days');

drop policy if exists "Admins manage live updates" on public.live_updates;
create policy "Admins manage live updates"
on public.live_updates for all to authenticated
using ((select public.is_queue_admin()))
with check ((select public.is_queue_admin()));

create or replace view public.public_reports
with (security_barrier = true, security_invoker = false)
as
select id, club_slug, wait_minutes, entry_chance, mood, entry_range, created_at
from public.reports;

grant select on public.clubs to anon, authenticated;
grant select on public.admin_users to authenticated;
grant insert on public.reports to anon, authenticated;
grant select, delete on public.reports to authenticated;
grant select on public.public_reports to anon, authenticated;
grant select on public.events, public.live_updates to anon, authenticated;
grant insert, update, delete on public.clubs, public.events, public.live_updates to authenticated;
