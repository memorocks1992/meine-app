insert into public.clubs (
  slug, name, district, address, latitude, longitude, color, category, menu_url
)
values
  ('rueyam-schoenhauser-allee', 'Rüyam Gemüse Kebab', 'Prenzlauer Berg', 'Schönhauser Allee 44a, 10435 Berlin', 52.5405338, 13.4125814, '#f5bb55', 'gastronomy', 'https://rueyam.de/#food'),
  ('zeit-fuer-brot-eberswalder', 'Zeit für Brot', 'Prenzlauer Berg', 'Eberswalder Straße 26, 10437 Berlin', 52.5413255, 13.4115081, '#f5bb55', 'gastronomy', 'https://zeitfuerbrot.com/en/menu')
on conflict (slug) do nothing;
