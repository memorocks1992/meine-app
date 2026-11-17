-- Club positions: OpenStreetMap Nominatim, accessed 2026-11-17.
insert into public.clubs (slug, name, district, address, latitude, longitude, color)
values
  ('suess-war-gestern', 'Süß war gestern', 'Friedrichshain', 'Wühlischstraße 43', 52.5086027, 13.4610994, '#fb7185'),
  ('oxi', 'OXI', 'Lichtenberg', 'Wiesenweg 1–4', 52.5076121, 13.4749435, '#22d3ee')
on conflict (slug) do nothing;

-- Programme snapshot, accessed 2026-11-17:
-- https://www.konzertsuche.de/berlin/oxi
-- https://www.regioactive.de/location/berlin/oxi-5sdnkw9hVD
-- https://www.regioactive.de/location/berlin/suess-war-gestern-WX4byZ91X
-- https://www.nightlife030.de/de/events/the-unknown-2026-11-17/ (and dated event pages)
-- https://www.konzertsuche.de/konzert/lush-leah-marie-suess-war-gestern-27-november
-- https://www.konzertsuche.de/konzert/zuleta-m-miguel-silva-good-nelson-suess-war-gestern-21-november
-- https://www.konzertsuche.de/konzert/daniel-mata-crydebleich-buttchin-suess-war-gestern-28-november
-- https://www.konzertsuche.de/konzert/small-great-house-december-edition-oxi-5-dezember
-- https://events.musicofourdesire.com/de/event/3obg-oxi-nye-60-hours-party-berlin-germany
-- One row per club/date; multiple listings are combined. Where no end time was
-- published, the end is an estimate and is marked for visitors and admins.
insert into public.events
  (club_slug, event_date, event_time, event_end_date, event_end_time, description, djs, event_end_estimated)
values
  ('suess-war-gestern', '2026-11-17', '20:00', '2026-11-18', '02:00', 'THE UNKNOWN', null, false),
  ('suess-war-gestern', '2026-11-20', '22:00', '2026-11-21', '07:00', 'Freitag ist süss', 'CATAWR, Pilar Jordan, ONNI, Emir Kaynak, Thomas Haak', false),
  ('suess-war-gestern', '2026-11-21', '22:00', '2026-11-22', '07:00', 'Samstag ist süsser / Not Stereo INVITES x Süss War Gestern', 'Zuleta M, Miguel Silva, Good Nelson, Steffi', true),
  ('suess-war-gestern', '2026-11-24', '20:00', '2026-11-25', '02:00', 'THE UNKNOWN', 'Dicso_Muzek', false),
  ('suess-war-gestern', '2026-11-27', '22:00', '2026-11-28', '07:00', 'Freitag ist süss', 'Leah Marie', false),
  ('suess-war-gestern', '2026-11-28', '22:00', '2026-11-29', '07:00', 'Konfettiparty & süss', 'Daniel Mata, crydebleich, BUTTCHIN', false),
  ('suess-war-gestern', '2026-12-01', '20:00', '2026-12-02', '02:00', 'THE UNKNOWN', null, false),
  ('suess-war-gestern', '2026-12-02', '20:30', '2026-12-02', '23:00', 'Spoken Shots Slam', null, true),
  ('suess-war-gestern', '2026-12-08', '20:00', '2026-12-09', '02:00', 'THE UNKNOWN', null, false),
  ('suess-war-gestern', '2026-12-15', '20:00', '2026-12-16', '02:00', 'THE UNKNOWN', null, false),
  ('suess-war-gestern', '2026-12-22', '20:00', '2026-12-23', '02:00', 'THE UNKNOWN', null, false),
  ('suess-war-gestern', '2026-12-29', '20:00', '2026-12-30', '02:00', 'THE UNKNOWN', null, false),
  ('suess-war-gestern', '2027-01-02', '19:00', '2027-01-03', '06:00', 'THE UNKNOWN', null, true),
  ('suess-war-gestern', '2027-01-05', '20:00', '2027-01-06', '02:00', 'THE UNKNOWN', null, false),
  ('suess-war-gestern', '2027-01-12', '20:00', '2027-01-13', '02:00', 'THE UNKNOWN', null, false),
  ('suess-war-gestern', '2027-01-19', '20:00', '2027-01-20', '02:00', 'THE UNKNOWN', null, false),
  ('oxi', '2026-11-17', '23:00', '2026-11-18', '08:00', 'encore.une.fois / TUESDAY TECHNO RAVE', 'Gary Beck, BLACK ANTHEM RESTORE, IRAKLI, SIMA', false),
  ('oxi', '2026-11-20', '22:00', '2026-11-21', '09:00', '8 YEARS Keyi Magazine x OXI / DECOY', 'Regal, Matrixxman, bbecks, Eyesdice, DJ T-1000, Ultra Instincts, Sorcery, Benjamin Damage, Obscure Shape, VOID, Shakti, Yuzo Iwata, Egregore, Reka, Moderna, Ricardo Castro, Miro Von, HASLA, Berlin Bunny, Paty Vapor, Ludmila Houben', true),
  ('oxi', '2026-11-21', '23:00', '2026-11-22', '08:00', 'Dabbs Traxx', 'Jeremy Sylvester, Amy Dabbs, Natalie Robinson, Marc Brauner, Anna Schreit, Anjawah', true),
  ('oxi', '2026-11-24', '23:00', '2026-11-25', '08:00', 'encore.une.fois / TUESDAY TECHNO RAVE', 'Stephanie Sykes, Inverse Element, YASS CHÄTTMANN, LNZ.', true),
  ('oxi', '2026-11-27', '23:00', '2026-11-28', '08:00', 'smile.', 'Norman Weber, Monokultur, Pascal Fischer, Franko Muçaj', true),
  ('oxi', '2026-11-28', '23:00', '2026-11-29', '08:00', 'Mesken at OXI', 'Monile, Rakim Under, Anaté, CHUKWU, Mati Amoretti, oulcan, barkın', true),
  ('oxi', '2026-12-04', '18:00', '2026-12-05', '06:00', 'Glove X-MAS Market Dance Edition', 'DJ Discostoff, DJ SPORTSCHUH, ELZIRA, Flex on Trax, Khaøz, Kimberly, Segun, TEZMA, tokenbeats, Treibende Kraft, TTT', true),
  ('oxi', '2026-12-05', '22:00', '2026-12-06', '10:00', 'Small Great House: Season Closing 2026', 'Nat Wendell, Mike Starr, Nephews, Luca Olivotto, Quadrakey, MADAM, Lavan, Cosmic Cherry, ICTV, Shabi, Eva Crystaltips, Malte Süß, Siggatunez, Jan Ketel', false),
  ('oxi', '2026-12-11', '23:00', '2026-12-12', '08:00', 'OXI GROOVE AFFAIR / Toy Tonics presents ITALOMANIA', 'Daniel Wang, Luca Averna', true),
  ('oxi', '2026-12-12', '23:00', '2026-12-13', '06:00', 'GiB & Hakke: The Final Edition of Nu-GABBERZ', null, true),
  ('oxi', '2026-12-18', '23:00', '2026-12-19', '08:00', 'OXI presents: Garage Girls x Layers', 'dj sweet6teen, DJ Eivissa, FRAENZ, Franziska Berns, KENZA, Lara Fein, Rachel Noon', true),
  ('oxi', '2026-12-19', '23:00', '2026-12-20', '08:00', 'silikon', 'Two Dots, Amo, Dollushka, XIMA, DJ Gianni, Slaymira, Carotin, Johænsson, Alexa Fluor', false),
  ('oxi', '2026-12-29', '23:00', '2026-12-30', '08:00', 'encore.une.fois / TUESDAY TECHNO RAVE / NYE EDITION', 'Answer Code Request', true),
  ('oxi', '2026-12-31', '22:00', '2027-01-03', '10:00', 'OXI NYE - 60 Hours', '1morning, AGY3NA, Cheriii, Flemish.Fetish, Costanza, Demuja, DRAMA SOURCE ARTIFACTS, Emanuele Barilli, Eva Crystaltips, Luca Olivotto, Fafi Abdel Nour, Hitam, Ina Kacz, Immy, Joyce Muniz, Kevin Saunderson, Kr!z, Malte Süß, Michael Lane, Marco Shuttle, Marie Lung, Meggy, Nephews, Siggatunez, Richard Gregory, Robin RB, Session Victim, Shabi, Sven Weisemann, Space Drum Meditation, Still Agua, tINI, Tasha, Vera Logdanidi, WINDFUHR', false)
on conflict (club_slug, event_date) do nothing;
