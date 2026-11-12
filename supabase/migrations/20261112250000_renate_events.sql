-- Upcoming events and lineups from https://de.ra.co/clubs/8556, accessed 2026-11-12.
-- Multiple events on December 5 are combined into one row for that date.
insert into public.events as current_event (club_slug, event_date, description, djs)
values
  ('wilde-renate', '2026-11-13', 'Renate Klubnacht & Daytime with casadephunk, Carly Zeng & CREAM', 'Luminiah, elliephunk, Carly Zeng, Kontronatura, Yas Reven, Brahmski, Johana Jost, Mille (DE), Vanaenae'),
  ('wilde-renate', '2026-11-14', 'Renate Klubnacht & Daytime w/ xcuse:u x CRUSH, SNC, Mara Menace & Loveshack', 'Mustelide, Metrosoft, Maruwa, DCHM, SNC Crew, Mara Menace, Bekkler, EMIRA, exuvia, Bonzai Bonner, Charlie Vaux'),
  ('wilde-renate', '2026-11-20', 'Renate Klubnacht & Daytime with Black.Is, Moses Joses & HitYaWithThat', 'Denzel, Moses Joses, Hitomi (DE), Julion De''Angelo'),
  ('wilde-renate', '2026-11-21', 'Renate Klubnacht & Daytime with John Loveless & Jana Falcon, Mandel & ELSI', 'John Loveless, MLE (2), Space Drum Meditation, IDA, Esterne Moog, Mandel, Jana Falcon, CHUKWU, Twist Fire, Giuseppe Fava, Luca Elsi, Organza'),
  ('wilde-renate', '2026-11-27', 'Renate Klubnacht & Daytime with Queer Vinyl Night, Mark Gill & 23XI', 'Mark Gill, Murrin, Pascale Project, The Pedagogist, Talia Dorr, David Böning, Chris Ku, Tajik'),
  ('wilde-renate', '2026-11-28', 'Renate Klubnacht & Daytime with Flight Mode & GTI', 'GTI, Laylla Dane, Tactile, Sarahtonin, TS Kahuna, Vasco, Vio PRG, ilbroccolovolante, Eliott Litrowski, Kidcat, Leona Jacewska'),
  ('wilde-renate', '2026-12-04', 'Renate Klubnacht', 'DAHRAXT, Mystral, Tasha Safari, OLIV, charis, Klix'),
  ('wilde-renate', '2026-12-05', 'Renate Klubnacht & Daytime with FEUCHT X WITH US, HIR & Quatsch / FUNDRAISER: Protect The Dolls & Casa Kua', 'CHRANDY, Doctora Amor, Mars O10C, Femur, Julie Desire, Amphia, Khloe, Barbad'),
  ('wilde-renate', '2026-12-11', 'Renate Klubnacht & Daytime w/ WUB & Pleasure Patterns', null),
  ('wilde-renate', '2026-12-12', 'Renate Klubnacht & Daytime with Manolita, Dabbs Traxx & Slate', 'Amy Dabbs, Fabio Santos, Luis Ripa'),
  ('wilde-renate', '2026-12-18', 'Renate Klubnacht & Daytime with Pitaya Soundsystem x Zero Beghe Festival', 'Pitaya Soundsystem'),
  ('wilde-renate', '2026-12-19', 'Renate Klubnacht & Daytime with Riotvan', 'Jennifer Touch, Panthera Krause, Peter Invasion'),
  ('wilde-renate', '2026-12-25', 'Renate Klubnacht & Daytime w/ Apricots Jam', 'Alexandra, DJ Slim Fit, Enchanted Rhythms, metaverde, Hara Katsiki, Shimanski, DayVentura'),
  ('wilde-renate', '2026-12-26', 'Renate Klubnacht', null),
  ('wilde-renate', '2026-12-31', 'Renate NYE 60h w/ Skee Mask, Mattias El Mansouri, Rachel Noon, ferrari rot + more tba', 'Amy Dabbs, AAMIROO, Aalia Iraki, alizé.e, ATTA, ATZENPUNK, Camilla Rae, CEM, Christa K, DJ CHICHI, elliephunk, eric.a, ferrari rot, Florian Pas, groovyjuri, Huijari, JD Typo, karete bu, le0never, lex_shockwerk, Lush Lab, Lyo., Manolo, Maryisonacid, M A R, Matriark, MATRIX3K, Mattias El Mansouri, moe., nadia (npc), Okouru, Organza, Pino Peña, Rachel Noon, Rafush, Richie Beige, Rill, Robin Flux, Running Hot, SAM (9), SENERGI, Skee Mask, SKEW KREW, SOCIAL VLAD, Tino Machauer, Vio PRG, wallflower_, xupid, Ana Selina'),
  ('wilde-renate', '2027-01-28', 'House of Lunacy 11th Birthday - The House of Red Doors', null)
on conflict (club_slug, event_date) do update
set description = excluded.description,
    djs = coalesce(excluded.djs, current_event.djs),
    updated_at = now();
