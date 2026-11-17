-- Club sources for the first group: 20261117160000_verified_club_addresses.sql.
-- Berghain's official address has no house number:
-- https://www.berghain.berlin/en/contact/
-- Additional addresses:
-- https://www.berlin.de/en/tickets/search/venues/renate-314919b8-ca93-4a68-a332-3f7dd20a8072/
-- https://www.berlin.de/en/clubs/9689902-4469452-heidegluehen.en.html
-- https://www.visitberlin.de/en/suss-war-gestern
-- https://www.berlin.de/en/clubs/8871834-4469452-oxi.en.html
-- Update only the original short address, preserving admin edits.
update public.clubs as club
set address = verified.address
from (values
  ('berghain', 'Am Wriezener Bahnhof', 'Am Wriezener Bahnhof, 10243 Berlin'),
  ('sisyphos', 'Hauptstraße 15', 'Hauptstraße 15, 10317 Berlin'),
  ('tresor', 'Köpenicker Straße 70', 'Köpenicker Straße 70, 10179 Berlin'),
  ('kitkatclub', 'Köpenicker Straße 76', 'Köpenicker Straße 76, 10179 Berlin'),
  ('about-blank', 'Markgrafendamm 24c', 'Markgrafendamm 24c, 10245 Berlin'),
  ('wilde-renate', 'Alt-Stralau 70', 'Alt-Stralau 70, 10245 Berlin'),
  ('club-der-visionaere', 'Am Flutgraben 1', 'Am Flutgraben 1, 12435 Berlin'),
  ('ritter-butzke', 'Ritterstraße 26', 'Ritterstraße 24–27, 10969 Berlin'),
  ('schwuz', 'Rollbergstraße 26', 'Rollbergstraße 26, 12053 Berlin'),
  ('rso-berlin', 'Schnellerstraße 137', 'Schnellerstraße 137, 12439 Berlin'),
  ('heidegluehen', 'Seestraße 1', 'Seestraße 1, 13353 Berlin'),
  ('club-ost', 'Alt-Stralau 1–2', 'Alt-Stralau 1–2, 10245 Berlin'),
  ('kater', 'Holzmarktstraße 25', 'Holzmarktstraße 25, 10243 Berlin'),
  ('suess-war-gestern', 'Wühlischstraße 43', 'Wühlischstraße 43, 10245 Berlin'),
  ('oxi', 'Wiesenweg 1–4', 'Wiesenweg 1–4, 10365 Berlin')
) as verified(slug, previous_address, address)
where club.slug = verified.slug and club.address = verified.previous_address;
