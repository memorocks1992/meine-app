-- Club website checks, 17 November 2026. Preserve addresses changed by an admin.
-- Berghain: https://www.berghain.berlin/en/
-- Sisyphos: https://www.sisyphos-berlin.net/pages/impressum
-- Tresor: https://tresorberlin.com/privacy/
-- KitKatClub: https://www.kitkatclub.org/Impressum.html
-- about:blank: https://aboutblank.li/feiern/
-- Club der Visionäre: https://clubdervisionaere.com/impressum/
-- Ritter Butzke: https://club.ritterbutzke.com/kontakt
-- SchwuZ: https://www.schwuz.de/en/event/buttcocks-6/
-- RSO: https://rso.berlin/program/220605
-- Club OST: https://clubost.de/
-- Kater: https://www.katerclub.de/contact/
update public.clubs as club
set address = verified.address
from (values
  ('berghain', 'Am Wriezener Bahnhof', 'Am Wriezener Bahnhof, 10243 Berlin'),
  ('sisyphos', 'Hauptstraße 15', 'Hauptstraße 15, 10317 Berlin'),
  ('tresor', 'Köpenicker Straße 70', 'Köpenicker Straße 70, 10179 Berlin'),
  ('kitkatclub', 'Köpenicker Straße 76', 'Köpenicker Straße 76, 10179 Berlin'),
  ('about-blank', 'Markgrafendamm 24c', 'Markgrafendamm 24c, 10245 Berlin'),
  ('club-der-visionaere', 'Am Flutgraben 1', 'Am Flutgraben 1, 12435 Berlin'),
  ('ritter-butzke', 'Ritterstraße 26', 'Ritterstraße 24–27, 10969 Berlin'),
  ('schwuz', 'Rollbergstraße 26', 'Rollbergstraße 26, 12053 Berlin'),
  ('rso-berlin', 'Schnellerstraße 137', 'Schnellerstraße 137, 12439 Berlin'),
  ('club-ost', 'Alt-Stralau 1–2', 'Alt-Stralau 1–2, 10245 Berlin'),
  ('kater', 'Holzmarktstraße 25', 'Holzmarktstraße 25, 10243 Berlin')
) as verified(slug, previous_address, address)
where club.slug = verified.slug and club.address = verified.previous_address;
