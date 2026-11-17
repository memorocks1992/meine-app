drop trigger if exists protect_manual_event_changes on public.events;
drop function if exists public.protect_manual_event_changes();
drop function if exists public.import_club_event(text, date, time without time zone, text, text, text);
drop table if exists public.event_import_suppressions;

alter table public.events
  drop column if exists import_source,
  drop column if exists import_end_estimated;
