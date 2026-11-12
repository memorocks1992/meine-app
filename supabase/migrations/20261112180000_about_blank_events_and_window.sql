alter table public.events
  alter column djs type text using djs::text;

drop policy if exists "Anyone can read upcoming events" on public.events;
create policy "Anyone can read upcoming events"
on public.events for select to anon, authenticated
using (
  event_date between (now() at time zone 'Europe/Berlin')::date
    and (now() at time zone 'Europe/Berlin')::date + 90
);

-- Events and lineups from https://de.ra.co/promoters/13285, accessed 2026-11-12.
insert into public.events as current_event (club_slug, event_date, description, djs)
values
  ('about-blank', '2026-11-21', '://BLANKS GIVING', 'Fasme, SORAYA*, Pino Peña, MATHILDA (2), Hanna Baertig, DJ ZBB, Miss Take, CHOREOPHILA, Schorli, DJ ritalino, Alex.Do, fr. JPLA, Rodmin, Erik Jäähalli, THNTS, Vy Tran, vanX, K1KO, Lena Brumby'),
  ('about-blank', '2026-11-28', '://situationship: Expeditions x golden times', 'Danté, Jamaica Suk, Juan Evangelista, Aamir, Annina, Barbara Preisinger, Stiefel One'),
  ('about-blank', '2026-11-29', '://glühweingarten x msnt festival / rsnzrflxn', 'Kyçyc, Nivrambo'),
  ('about-blank', '2026-12-04', '★ LOWKEY STARS ☆', 'Alexander Pohl, Amin Fallaha, Anna Kasyan, CEEE, Charlotte Lion, DjRundfunk, DJ YumYum, fiber.optyik, Florelle, J4NNICH, Justus Hildebrand, KANIKA, Mariposa x Lyra, mer.ve, Noxumi, preSchuRR, PURPLX, Shandy (RU), Stolzenberg, Tenacious T, *Tia*, TONKS'),
  ('about-blank', '2026-12-06', '://glühweingarten x groovity music market', null),
  ('about-blank', '2026-12-13', '://glühweingarten x letzte wiese', 'Vornelinks'),
  ('about-blank', '2026-12-20', '//glühweingarten x chouchou & friends', null),
  ('about-blank', '2026-12-24', '://blank with benefits - merry cricis', null),
  ('about-blank', '2026-12-31', 'BLANK AFTER TOMORROW (57h NYE)', 'Bailey Ibbs, karete bu, Robert Owens, Dea (6), Ness, Medha, Kalipo, Hang Aoki'),
  ('about-blank', '2027-01-23', 'Blank Winter Holidays (30 Stunden nonstop)', 'a:tok, Anna Haleta, Barbara Hofmann, DJ Eivissa, evah, fr. JPLA, Irakli, Jessamine, Lena Brumby, Lauer, Marie Lung, karete bu, Portable, SKALA, SORAYA*, Stephanie Sykes, Stype, Sven Weisemann, Wasn & Wunderwaffel, HKS97, Alice in Flames')
on conflict (club_slug, event_date) do update
set description = excluded.description,
    djs = coalesce(excluded.djs, current_event.djs),
    updated_at = now();
