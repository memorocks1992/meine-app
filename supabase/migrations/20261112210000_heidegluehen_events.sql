-- Event dates from the November preview and lineup for #41 from the official
-- weekly update at heidegluehen.berlin, accessed 2026-11-12.
insert into public.events as current_event (club_slug, event_date, description, djs)
values
  ('heidegluehen', '2026-11-14', 'Heideglühen #41', 'Dan Shake, Boris Werner, Oracy, jiyun kim, Markus Sommer'),
  ('heidegluehen', '2026-11-21', 'Heideglühen #42', null),
  ('heidegluehen', '2026-11-28', 'Heideglühen #43', null)
on conflict (club_slug, event_date) do update
set description = excluded.description,
    djs = coalesce(excluded.djs, current_event.djs),
    updated_at = now();
