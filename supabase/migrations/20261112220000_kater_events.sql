insert into public.clubs (slug, name, district, address, latitude, longitude, color)
values ('kater', 'Kater Blau', 'Friedrichshain', 'Holzmarktstraße 25, 10243 Berlin', 52.5125, 13.4297, '#a78bfa')
on conflict (slug) do update
set name = excluded.name;

-- Upcoming events and lineups from https://de.ra.co/clubs/99161, accessed 2026-11-12.
-- Multiple events on November 20 are combined into one row for that date.
insert into public.events as current_event (club_slug, event_date, description, djs)
values
  ('kater', '2026-11-12', 'Hot Mess with eveava', 'eveava'),
  ('kater', '2026-11-13', 'Tipping Point', 'Frida Darko, Sahra Bass, Ciao 3lla, Fabian Krooss, FLAVE, Urem, Francis FF'),
  ('kater', '2026-11-14', 'Katernacht with Enrica Falqui, Rio Tashan, Ed Davenport, Sanaz + more', 'Ed Davenport, Enrica Falqui, New Digital Fidelity, James Lotion, Rio Tashan, Sanaz, Sara Miller, BUSSI, ONNI, Phil XO'),
  ('kater', '2026-11-19', 'Hot Mess with FLINTA* CLUB DECK', 'CATAWR, Marie Chain, Pilar Jordan'),
  ('kater', '2026-11-20', 'WENN ES HELL WIRD (Nenn'' ich es Aufgang oder Untergang) - Ein Solo Musiktheater / Mystic Creatures', 'Aio, Bonnie Spacey, Konfusia, Maurice Mino, Taberia, Naicet, Elias Goldmund, Horst Haller, HOVR, Just Emma, Nina Hepburn, R3NATA, Daya Pruna'),
  ('kater', '2026-11-21', 'Katernacht with Per Hammar, Alison Swing, Phonk D + more', 'GTI, Hanna Baertig, Per Hammar, Alison Swing, Phonk D, Robin Flux, Snow (DE), manque, Ventura, Vero Standke, Kotelett, Reza Jalilian, Gabs Leyton'),
  ('kater', '2026-11-26', 'Hot Mess with nuarrrrr', 'nuarrrrr'),
  ('kater', '2026-11-27', 'NEST with Mood II Swing, Gallegos, Sherø + more', 'Bézier, Esther Dune, Gallegos, Evan Tail, Mood II Swing, Qualia Trax, Sherø, FatAles'),
  ('kater', '2026-11-28', '49 Katzen... tanzen auf''m Tisch', 'Argia, Borella, Britta Arnold, Chris Schwarzwälder, ELIF, Frankey & Sandrino, Gespona, Hardt Antoine, Landikhan, Jonathan Kaspar, MANTi, Mira, Remcord, Robin Dey, Sven Dohse, Toto Chiavetta, Upercent, Acid Pauli, AVEM, Caleesi, Sarah Kreis, Damian Lazarus, Geju, Gina Sabatini, GONGULL, Kassian, Last Men On Earth, LENI (DE), Maglia, Martin Cozar, meera, Meltem Yazar, MĪMĪ x FY, Bandulera, Erna (FR), LISA TBA, Mila Stern, ZE:NA, alko, Christine Benz, Franca, Kotoe, Jake the Rapper, Joséphine de Retour, Julie Saint Germain, Justin Shaffer, UrbnMowgli, Rakäthe, Mimi Love, Sutsche, Viken Arman'),
  ('kater', '2026-12-04', 'Kater x 30 Years of Moodmusic', 'Filippo Moscatello, Sasse, Jepe, Stella Stellar, Wewerka, Amine K, babxi, Kristin Velvet, miAs'),
  ('kater', '2026-12-05', 'Katernacht with Lea Lisa, Monty Luke, Mike Shannon, Sabine Hoffmann + more', 'Mike Shannon, Monty Luke, Sabine Hoffmann, Balthazar Martinez, Lea Lisa, Manolo. (DE), Vanaenae, Simml, Sinamin, Karl Kobs'),
  ('kater', '2026-12-10', 'Shebanese à la Kater', 'der Ackermann, HANNAHHANSEN'),
  ('kater', '2026-12-11', 'coconut concepts: 5 Years Anniversary', 'Papa Nugs, DJ SWISHERMAN, KIM SWIM, Talia Dorr, Carl Bergé'),
  ('kater', '2026-12-12', 'Rebellion der Träumer* x Skalar', 'Aio, Baba The Knife, Annett Gapstream, Bonnie Ford, DONT BLINK, Pauli Pocket, TraumaMia, DJ Nebelmaschine, Etzo, Lily Lillemor, Horst Haller, Katzengold, lisa luka, pulli, tadoh, Roman Adam, Tvísker, Urem, patte, KLATTE, Anna Schreit, bīsu, Carlo Bonanza, Francis FF, Ciao 3lla, Kotoe'),
  ('kater', '2026-12-18', 'Kater x Multinotes', 'Michael Mayer, Peter Schumann, Sascha Cawa, Kanykei, Lehar, Lis Sarroca'),
  ('kater', '2026-12-19', 'Kater x Feel Festival', 'Annyrock, ENNIO, KONZ, ALKARLINE, MATHILDA (2), ATTA (GER), Almost Famous, Carluschka, Catz ''N Dogz, Discopapi, KVLR, fbi (1), Sabu!, The Jakob Sister'),
  ('kater', '2026-12-31', 'Kater: SHINING IN THE DARK', null)
on conflict (club_slug, event_date) do update
set description = excluded.description,
    djs = coalesce(excluded.djs, current_event.djs),
    updated_at = now();
