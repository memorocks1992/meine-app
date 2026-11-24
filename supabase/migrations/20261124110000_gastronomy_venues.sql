alter table public.clubs
  add column if not exists category text not null default 'club',
  add column if not exists menu_url text;

alter table public.clubs
  add constraint clubs_category_check
  check (category in ('club', 'gastronomy', 'other'));

insert into public.clubs (
  slug, name, district, address, latitude, longitude, color, category, menu_url
)
values
  ('zagros-gemuesekebap', 'ZAGROS Gemüsekebap', 'Kreuzberg', 'Skalitzer Straße 100, 10997 Berlin', 52.4996514, 13.4283848, '#f5bb55', 'gastronomy', 'https://www.ubereats.com/de/store/zagros-gemuse-kebap/spsL3h59Vv22VMw2Bcwogg'),
  ('mustafa-gemuese-kebap', 'Mustafa’s Gemüse Kebap', 'Kreuzberg', 'Mehringdamm 33, 10961 Berlin', 52.493485, 13.3885619, '#f5bb55', 'gastronomy', 'https://speisekarte.menu/restaurants/berlin/mustafas-gemuese-kebap-4/menu'),
  ('oggis-gemuesekebab', 'Oggi’s Gemüsekebab', 'Mitte', 'Döberitzer Straße 1, 10557 Berlin', 52.5294618, 13.3688309, '#f5bb55', 'gastronomy', 'https://intravel.net/de/berlin/restaurants-cafes/oggis-gemusekebab'),
  ('nhas-city-chicken', 'Nhas City Chicken', 'Mitte', 'Torstraße 125, 10119 Berlin', 52.5298592, 13.4004233, '#f5bb55', 'gastronomy', 'https://citychickennhas.de/menu')
on conflict (slug) do update
set name = excluded.name,
    district = excluded.district,
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    color = excluded.color,
    category = excluded.category,
    menu_url = excluded.menu_url;

create index if not exists reports_gastronomy_wait_created_idx
  on public.reports (club_slug, created_at desc)
  where event_id is null;

create or replace function public.assign_report_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  venue_category text;
  berlin_now timestamp without time zone := now() at time zone 'Europe/Berlin';
begin
  select category
  into venue_category
  from public.clubs
  where slug = new.club_slug
    and is_active;

  if venue_category is null then
    raise exception 'Reports are only accepted for active locations.'
      using errcode = 'P0001';
  end if;

  if venue_category = 'gastronomy' then
    new.event_id := null;
    return new;
  end if;

  select event.id
  into new.event_id
  from public.events as event
  where event.club_slug = new.club_slug
    and event.event_date + event.event_time <= berlin_now
    and event.event_end_date + event.event_end_time > berlin_now
  order by event.event_date desc, event.event_time desc
  limit 1;

  if new.event_id is null then
    raise exception 'Reports are only accepted while a scheduled event is running.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.assign_report_event() from public, anon, authenticated;

drop trigger if exists reports_assign_event on public.reports;
create trigger reports_assign_event
before insert on public.reports
for each row execute function public.assign_report_event();
