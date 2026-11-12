-- Upcoming events and lineups from https://de.ra.co/clubs/10546, accessed 2026-11-12.
-- Multiple events on November 15 and 29 are combined into one row per date.
insert into public.events as current_event (club_slug, event_date, description, djs)
values
  ('kitkatclub', '2026-11-12', 'PSYCHO Uniform', 'Ari Denaro, NIKO INCRAVALLE'),
  ('kitkatclub', '2026-11-13', 'GEGEN SPORTS', 'BOYCA, Buday, Cristian Marras, IVRA, Juan Cernadas, Schacke, androgienia, g3kko, PLATTER, AAguilAA, Byron Yeates, CHRANDY, Citizens Union, Liad Krispin, Lucas Abadi'),
  ('kitkatclub', '2026-11-15', 'Nachspiel / Nacktfleisch - Berlin Queer Naked Party (All Genders)', 'Onkel Tom, Spikey Lee, Sina XX, K-H1, SIMZ (DE)'),
  ('kitkatclub', '2026-11-16', 'Electric Monday@KitKat', 'Frankie Flowerz, Ricardo Rodriguez'),
  ('kitkatclub', '2026-11-18', 'SYMBIOTIKKA at KitKat Club Berlin meets Salty Pleasure', 'DJ Jordan, Flakka (2), Miss Pin, Kjar'),
  ('kitkatclub', '2026-11-19', 'SEVEN SINS: NOVEMBER SIN', 'rubi*, Cryptofauna'),
  ('kitkatclub', '2026-11-20', 'The Mystic Rose meets EAT STATIC & 30 Jahre COSMIC WALKERS', 'Chris Zippel, Der Loth'),
  ('kitkatclub', '2026-11-22', 'Nachspiel', null),
  ('kitkatclub', '2026-11-23', 'Electric Monday@KitKat', 'Miguel Silva, Raysoo, Ricardo Rodriguez, Frankie Flowerz'),
  ('kitkatclub', '2026-11-25', 'SYMBIOTIKKA at KitKat Club', 'Grace Thompson, LOVRA, Ebicake, DJ Jordan'),
  ('kitkatclub', '2026-11-26', 'Unity', null),
  ('kitkatclub', '2026-11-27', 'PiepShow - BirthdayPiep', 'Tim Hagemann, Joey (2), Crystal O, Doram, Bonq, Chris Bekker, Tobias Sommer, Flow TNTS, DJ Francis, PADERKID, DJILL, KEN (DE)'),
  ('kitkatclub', '2026-11-29', 'Nachspiel / Dirty Thirty - Akuuji Bday Bash', 'MARCEL db, Marvel Gold, Somaphon'),
  ('kitkatclub', '2026-11-30', 'Electric Monday@Kitkat', 'Bert, Frankov, Frankie Flowerz, Ricardo Rodriguez'),
  ('kitkatclub', '2026-12-03', 'Unity', null),
  ('kitkatclub', '2026-12-04', 'Four Play', null),
  ('kitkatclub', '2026-12-07', 'Electric Monday @Kitkat', 'Diego Montiel, Xminder, Frankie Flowerz, Ricardo Rodriguez'),
  ('kitkatclub', '2026-12-18', 'PiepShow - DecemberPiep', null)
on conflict (club_slug, event_date) do update
set description = excluded.description,
    djs = coalesce(excluded.djs, current_event.djs),
    updated_at = now();
