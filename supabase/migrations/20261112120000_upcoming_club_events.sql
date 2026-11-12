-- Event snapshot for the 31-day public event window as of 2026-11-12.
-- Sources: official calendars at berghain.berlin/de/program/,
-- tresorberlin.com/club/events/, club.ritterbutzke.com/events, and renate.cc.
-- Resident Advisor blocks direct access here; listings for the other clubs
-- could not be retrieved. No dates or lineups are inferred for those clubs.
-- The schema allows one row per club and date, so same-day events are combined.
-- DJ lineups are selective where the published full lineup exceeds varchar(160).

insert into public.events as current_event (club_slug, event_date, description, djs)
values
  ('berghain', '2026-11-13', '9000 Dreams @Panorama Bar', 'Avalon Emerson, Jex Opolis, regularfantasy, Salute, TSVI'),
  ('berghain', '2026-11-14', 'FC SNAX UNiTED / Klubnacht', 'Beste Hira, Efdemin, Lolsnake; Ian Pooley Live, Alinka, Bryan Kessler, Cinthie'),
  ('berghain', '2026-11-18', 'West-Eastern Divan Festival: Musik von Mark Simpson & Pierre Boulez', null),
  ('berghain', '2026-11-19', 'Heelix @Säule', 'Abo Abo & Marco Maldarella Live, Innersha Live, Midori, Seta Loto, vp allowed'),
  ('berghain', '2026-11-20', 'REEF', 'Darwin, DJ Storm, Esposito, Mala, Carl Luis, Ila Brugal, Mad Professor, ophélie, Sun People'),
  ('berghain', '2026-11-21', 'Klubnacht', 'Tunegirl Live, JakoJako, Kasper Marott, Paula Koski, Reka Zalan, Ron Albrecht, Stefan Goldmann, Takaaki Itoh; Dj Split, Nathalie Seres'),
  ('berghain', '2026-11-26', 'The Sound Of @Säule', 'Vera Grace Live, Carlotta Jacobi, Connor Wall, Obscur'),
  ('berghain', '2026-11-27', 'Love On The Rocks @Panorama Bar', 'Danilo Plessow aka MCDE, Giammarco Orsini, Pancratio, PARAMIDA, Simone De Kunovich, Stella Zekri'),
  ('berghain', '2026-11-28', 'Klubnacht', 'Aöcram, Denise Rabe, Fabian Garrido, Ignez, Kwartz, Mari Sakurai, Sandrien; Abajour, Budino, Katy De Jesus, Ketiov, Massimiliano Pagliara'),
  ('berghain', '2026-12-03', 'Hyper Real @Säule', 'Iarna Live, Kutmah, MA SHA, Opium Hum, Zut Zut'),
  ('berghain', '2026-12-04', 'Your Love @Panorama Bar', 'Kalypso Bang Live, Lakuti, NM DJ, Tama Sumo, Yvonne Turner'),
  ('berghain', '2026-12-05', 'Klubnacht', 'DJ Maria., DJ Rush, Fadi Mohem, Kr!z, Kyle Geiger, Ogazón, Red Rooms, BASHKKA, Brennan, Derrick Carter, Ferg, Fiedel, Rosie Ama, Tal Fussman'),
  ('berghain', '2026-12-10', 'weeeirdos @Säule', 'DJ Skin, Fumi, James Newmarch, Lolsnake, Voicedrone'),
  ('berghain', '2026-12-11', 'Time Passages @Panorama Bar', 'Binh, Craig Richards, Leo Leal, Sandrien, Skatman'),
  ('berghain', '2026-12-12', 'Geburtstags Klubnacht', 'Blawan Live, Akua, Andy Martin, Cecilia Tosh, Christian AB, Decoder, Emily Jeanne, Joel Mull, Stranger, Zvrra'),

  ('tresor', '2026-11-13', 'Tresor meets DJ Bone: FURTHER', 'LYZA, madwoman, Mark Williams, DAIYAH, Yeti Mind Tricks, DJ Bone'),
  ('tresor', '2026-11-14', 'Tresor Klubnacht', 'UVB, Cecilia Tosh, James Ruskin, NEUX, Nat Wendell, Hamish & Toby, JAXX TMS'),
  ('tresor', '2026-11-16', 'Singularity', 'YONG YING, BLACK ANTHEM RESTORE, Yazzus, Mohajer'),
  ('tresor', '2026-11-18', 'Tresor New Faces hosted by ENIGMA', 'KEROSENE, Adriano, DAHRAXT, Miss Italia'),
  ('tresor', '2026-11-20', 'Tresor meets Rhythm Section', 'Anna Haleta, Mary Yuzovskaya, Adriana Lopez, JANEIN, Session Victim, Scarlett O''Malley, Bradley Zero, MLE'),
  ('tresor', '2026-11-21', 'Tresor x RA25', null),
  ('tresor', '2026-11-23', 'Singularity', 'Sue Léwig, Inverse Element, Keepsakes, Milena Adamis'),
  ('tresor', '2026-11-25', 'Tresor New Faces hosted by Lowpass', 'Schwarzmalerei, Astrover, Morten B., Agnes Stark, Enzio Etchaberri'),
  ('tresor', '2026-11-27', 'Tresor meets DJ Stingray 313', 'DJ Spit, Huey Mnemonic, Manni Dee, Nene H, DJ Stingray 313, Nala Brown, Viikatory'),
  ('tresor', '2026-11-28', 'Tresor invites Surgeon', 'Beatrice, Ireen Amnes, Lady Starlight, Surgeon, Erika, Telephones'),
  ('tresor', '2026-11-30', 'Singularity', 'Danny Wabbit, Parisha, Ruslan Mays, The Muffin Man'),
  ('tresor', '2026-12-02', 'Tresor New Faces hosted by Grab The Groove', 'AHURA, Alexey Dunchyk, Cynthia Matisse, Scheermann, evah'),
  ('tresor', '2026-12-04', 'Tresor: The Continuous Present', 'Adlas, Any Mello, HAMY, Lee Gamble, Cashu, Skee Mask, Yushh'),
  ('tresor', '2026-12-05', 'Tresor Klubnacht', 'Charlton, Cressida, Laura van Hal, Sunil Sharpe, Eric Cloutier, XDB'),
  ('tresor', '2026-12-09', 'Tresor New Faces hosted by Playhaus', 'Julien Charles, Neutran, STAANA, V€$T MANNIE, Bridontknow'),
  ('tresor', '2026-12-11', 'Tresor meets Bailey Ibbs', 'Bailey Ibbs, Elisa Bee, JKS, Mosai, LDS, Poly Chain, Plant43'),
  ('tresor', '2026-12-12', 'Tresor Klubnacht', 'MAEDON, Quiet Husband, Psyk & ORBE, Soraya, Clé, Eva Be, Erik Luebs, Tapirus'),

  ('ritter-butzke', '2026-11-13', 'Bunte Träumerei w/ Marten Lou', 'Marten Lou'),
  ('ritter-butzke', '2026-11-14', 'Monkey Safari - YDKWTD - (All Night Long) Album Release Party', 'Monkey Safari'),
  ('ritter-butzke', '2026-11-20', 'Worakls / Mollono.Bass', 'Worakls, Mollono.Bass'),
  ('ritter-butzke', '2026-11-21', 'Alan Fitzpatrick / Klangkarussell pres. Bias Beach', 'Alan Fitzpatrick, Klangkarussell'),
  ('ritter-butzke', '2026-11-27', 'Soupherb vs psYsq', 'Soupherb, psYsq'),
  ('ritter-butzke', '2026-11-28', 'Cosmic Gate / Lexy & K-Paul (live) / Oliver Huntemann', 'Cosmic Gate, Lexy & K-Paul, Oliver Huntemann'),
  ('ritter-butzke', '2026-12-04', 'KOLLEGIAL pres. by BSTHP - w/ Felix Raphael [hybrid LiVE] and many more', 'Felix Raphael'),
  ('ritter-butzke', '2026-12-05', 'MICHAEL CANITROT / DON DIABLO', 'Michael Canitrot, Don Diablo'),
  ('ritter-butzke', '2026-12-11', 'Eskalation', 'Die Gebrüder Brett, KaaCee KomaCasper, Justin Prince, SAGEZZA'),

  ('wilde-renate', '2026-11-13', 'Our House: Afterwork / Klubnacht w/ Carly Zeng & CREAM', 'Luminiah, mitsumemo, J!NG, Touché, elliephunk, Carly Zeng, Kontronatura, Yas Reven, Brahmski, enna.i, Johana Jost, Mille'),
  ('wilde-renate', '2026-11-14', 'Open Decks w/ xcuse:u x CRUSH / Renate Klubnacht', 'Crush Collective, xcuse:u, CRUSH, MUSTELIDE, Metrosoft, Maruwa, DCHM, SNC Crew, Mara Menace, Bekkler, EMIRA, exuvia, Bonzai Bonner, Broccoli b2b Charlie Vaux'),
  ('wilde-renate', '2026-11-20', 'Vinyl Market & Scratching Workshop / Klubnacht', 'DJ EF, Hityawitthat, Space Drum Meditation, IDA, Esterne Moog, Mandel, Jana Falcon, CHUKWU, Twist Fire, Giuseppe Fava, Luca Elsi, Organza'),
  ('wilde-renate', '2026-11-21', 'Our House: John Loveless & Friends / Klubnacht', null),
  ('wilde-renate', '2026-11-27', 'Our House: Queer Vinyl Night / Klubnacht', 'Mark Gill, Murrin, Pascale Project, The Pedagogist, Talia Dorr, David Böning, Chris Ku, Tajik'),
  ('wilde-renate', '2026-11-28', 'Our House: Flight Mode / Klubnacht w/ GTI', 'GTI, Laylla Dane, Tactile, Sarahtonin, TS Kahuna, Vasco, Vio PRG, ilbroccolovolante, Eliott Litrowski, Kidcat, Leona Jacewska'),
  ('wilde-renate', '2026-12-04', 'Our House Is Your House: More TBA', null)
on conflict (club_slug, event_date) do update
set description = excluded.description,
    djs = coalesce(excluded.djs, current_event.djs),
    updated_at = now();
