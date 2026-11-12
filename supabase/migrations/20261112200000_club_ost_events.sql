drop policy if exists "Anyone can read upcoming events" on public.events;
create policy "Anyone can read upcoming events"
on public.events for select to anon, authenticated
using (
  event_date between (now() at time zone 'Europe/Berlin')::date
    and (now() at time zone 'Europe/Berlin')::date + 100
);

-- Event titles and dates from clubost.de; DJ lineups cross-checked against RA.
-- Sources accessed 2026-11-12.
insert into public.events as current_event (club_slug, event_date, description, djs)
values
  ('club-ost', '2026-11-12', '[FREE ENTRY TILL 00:30] SAVORY', 'MIMI404, e.leptic'),
  ('club-ost', '2026-11-13', 'MIXMAG', 'Bobaz Lobster, Daniella da Silva, KLING&KLANG, LAURIX (DE), L.zwo, Per Pleks, THISO, Trancestrudel'),
  ('club-ost', '2026-11-14', '240KMH', 'doppeltes lottchen, testpress, George Radsport, Johannes Schuster, SUSKA, luke madness, Lukstarr, GM1 (IT), Paranormila'),
  ('club-ost', '2026-11-19', '[FREE ENTRY TILL 00:30] SAVORY', 'Lukr Range, WAN.1, TAUBE'),
  ('club-ost', '2026-11-20', 'ONYX', 'Paraçek, two girls one mom, HANÀ, KARISH, CARGO (DE) b2b Bruno Brero, SPÆCE, LOVI, LUI'),
  ('club-ost', '2026-11-21', 'EUPHORIK', 'Amøn FEAT Fronsi, DJ Banba, DTEXX, Filialleiter, Luciid, LSG, Nachtigaller, SIKXTO, TEZMA, Wieko'),
  ('club-ost', '2026-11-26', '[FREE ENTRY TILL 00:30] SAVORY', 'Hanne B, Cobb Douglas'),
  ('club-ost', '2026-11-27', 'MATTERMIND', 'Pawlowski, MATRAKK, Ephy Pinkman, DJ Achim Feuervogel, BISHALBACHT, MUGLI PROJECT, Dana Roosy, EZA (DE), Paranormila, TERRA TWIINS'),
  ('club-ost', '2026-11-28', 'DEVOTED', 'Athina, Ben Techy, Danilo Filipe, DJ HOTMAIL, @ELZIRA, In Furcht, jeanska, Joey (2), Kø:lab x special guest @VATOZ LOCOZ, SEKTOR69'),
  ('club-ost', '2026-12-04', 'ULTRA SOZIAL', 'KTK (DE), MKHXR, RIKHTER, SAIKA, Tham, Treibende Kraft'),
  ('club-ost', '2026-12-05', 'POLYAMOR', 'Diffrent, Antonym, Bitschu Batschu, Cleopard2000, VIVI909 b2b SATYS FYRE, Towic, Elotrance, Plattenlieferant, Talia Dorr'),
  ('club-ost', '2026-12-12', 'SLAVE TO THE RAVE', 'Beau Didier, CJ Bolland, Fish56Octagon (Techno Set), Huamaniser, Tigerhead, DJ Chromz, mixtress, Napes, Wittes, Soultrain MC aka TRAINAH'),
  ('club-ost', '2026-12-18', 'BLASPHEMY', 'Bollmann, BØĘRY, GWELD, Laviena, Rebekah'),
  ('club-ost', '2026-12-31', 'GEGEN X PRNCPTL X OST NYE 33H', '2THEMAX, KEMIK, ADAM MUNNINGS, DJ Petite, ALP (DE), Khloe, ANÍBAL, Djooke, Buday, Citizens Union, MVHY, Dj handbag, Dr. Rubinstein, Dgeral, Sparkly Pony, ENGALANAN, Twang, Hyperaktivist, Kiddy Smile, Laure Croft, Spikey Lee, Mar/us, Rakans, Rubén Secaduras, TOM CHIESA, Shadysnack, Spacer Woman, VINVAR'),
  ('club-ost', '2027-02-13', 'SLAVE TO THE RAVE', 'Chippy Nonstop, DJ Assault, DJ Fuckoff, DJ KILLING, Shirley Temper, softchaos, x3butterfly, Darius The Barbarian')
on conflict (club_slug, event_date) do update
set description = excluded.description,
    djs = coalesce(excluded.djs, current_event.djs),
    updated_at = now();
