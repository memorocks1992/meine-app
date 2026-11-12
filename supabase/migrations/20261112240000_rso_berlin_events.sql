-- Upcoming events and lineups from https://de.ra.co/clubs/185172, accessed 2026-11-12.
insert into public.events as current_event (club_slug, event_date, description, djs)
values
  ('rso-berlin', '2026-11-13', 'Sachsentrance', 'DJ GUESTLIST, Anna Ullrich, snoritz, The Jakob Sister, Sabu!, RaverPik, kichererbsenstampf, Atreo'),
  ('rso-berlin', '2026-11-14', 'XTRUDE x Mount Kimbie x Polar Inertia w/ Eric Cloutier, OK Williams, Olivia Mendez Mathys Lenne', 'Mor Elian, Mount Kimbie, OK Williams, Or:la, Dajusch, Eric Cloutier, Olivia Mendez, Mathys Lenne, OPH, A Strange Wedding, Blu Aloé, Polar Inertia'),
  ('rso-berlin', '2026-11-20', 'RSO: YEAR FIVE w/ Function, Stef Mendesidis, Tasha b2b Deetron, CEM, Maara, Stenny (Live)', 'Answer Code Request, CEM, Deano, Deetron, Tasha, DJ TOOL, Ellen Allien, Function, Henning Baer, Inox Traxx, Hyperaktivist, Jesse G, Mary Lake, Remco Beekwilder, RUIZ OSC1, Stef Mendesidis, Toobris, Xiorro, 131bpm, Anna Z., Dangermami, Julie Desire, Maara, Olympe4000, Sepehr, Stenny'),
  ('rso-berlin', '2026-11-27', 'Selected x Fluid w/ PRADA2000, Panteros666, George Radsport & Keyklau', 'CAIVA, Frederic., Panteros666, PRADA2000, Keyklau'),
  ('rso-berlin', '2026-11-28', 'XTRUDE w/ Antigone, Peryl (Live), Lars Huismann, Newa, STEYA, Bambi, oma totem', 'Ana Rs, Antigone, Lars Huismann, LPV, Ndrx, Newa, Peryl, Shaleen, STEYA, Audrey Danza, Bambi (FR), oma totem'),
  ('rso-berlin', '2026-12-04', 'Plasma: 6 Years Femme Bass Mafia with Introspekt, Logan, EMA, Kontronatura, Flore b2b Dangermami', 'EMA (1), Flore, Dangermami, Genoe, Introspekt, Kontronatura, Logan_olm'),
  ('rso-berlin', '2026-12-05', 'XTRUDE x palicavonzvreca x Juicy Gang Records w/ Loktibrada b2b Rumenige, DJ MELL G', 'AYLIN IDAH, François X, Gareth Wild, Anabel Arroyo, Kerrie, Loktibrada, The Advent, The Lady Machine, VSK, Anthony Rother, DJ ASS TITS, DJ MELL G, Newinfluenzer'),
  ('rso-berlin', '2026-12-11', 'MONTAGE presents BAUGRUPPE90 [All Night Long]', 'BAUGRUPPE90'),
  ('rso-berlin', '2026-12-12', 'XTRUDE x SEXYRECS X OPUS', 'Chontane, HUJUS, DJ ANGEL (fr), Kaiser (K S R), Laure Croft, Matrixxman, Marco Bailey, Sept, Nina Farrina, Regent, VNTM, Danté, LUISELLE, NASTYA NVRSLP'),
  ('rso-berlin', '2026-12-18', 'SERAFINA ALL NIGHT LONG INVITES', 'Serafina, Conntex, DJ Hyperdrive, L-AUX, zwilling.'),
  ('rso-berlin', '2026-12-19', 'HEISSS I 30 hours', 'Cirkle, Elvin, Eoin DJ, Fafi Abdel Nour, Idu Berg, Mython, Jelena, Jessie Granqvist, Justine Perry, Paula Koski, Mathys Lenne, Temudo, Vysion, Schicktanz'),
  ('rso-berlin', '2026-12-25', 'RSO.XMAS with Frederic., Echoes Of October, Tizian b2b Lukr Range', 'Echoes Of October, Frederic., Lukr Range, TiZiAN (DE)'),
  ('rso-berlin', '2026-12-26', 'WE ARE NOT ALONE', 'CRAVO, Dr. Rubinstein, Ellen Allien, Quest, Roll Dann, slin, Sons Of Hidden, Magda, OLHA, Tom Peters'),
  ('rso-berlin', '2026-12-31', 'RSO: NULL RESET — NYE 82HR WEEKENDER', 'Adiel, Akua, Alarico, AMORAL, Daria Kolosova, Disguised, Elli Acula, Freddy K, Grace Dahl, Haruka, Ignez, Kim She, MARRØN, Nastia Reigel, Phil Berg, Rebecca Delle Piane, Xiorro, Setaoc Mass, Henning Baer, DINA, Philipp Drube, DJ Spit, Hervé, JASSS, Josey Rebelle, KENZA, Lawrence Lee, LOVEFOXY, RONI, Miley Serious, NIKS, Pariah, Pureblast, VEL (MA), Bae Blade, DJ AYA, MCMLXXXV, Schacke'),
  ('rso-berlin', '2027-01-23', 'CTM 2027: Transmuting', 'Debit, Spekki Webu, ABADIR, eid55558.55')
on conflict (club_slug, event_date) do update
set description = excluded.description,
    djs = coalesce(excluded.djs, current_event.djs),
    updated_at = now();
