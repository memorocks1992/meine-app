import { JSDOM } from 'jsdom';
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

export const SOURCES = [
  { club: 'berghain', url: 'https://www.berghain.berlin/en/program/' },
  { club: 'ritter-butzke', url: 'https://club.ritterbutzke.com/events' },
];

const text = (element) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
let detailFetchFailed = false;

function berlinDate(now, offset = 0) {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + offset);
  return result.toISOString().slice(0, 10);
}

function validDate(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function validTime(time) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

function inWindow(date, now) {
  return validDate(date) && date >= berlinDate(now) && date <= berlinDate(now, 60);
}

export function collectByDate(entries, source) {
  const grouped = new Map();
  for (const entry of entries) {
    const list = grouped.get(entry.date) ?? [];
    list.push(entry);
    grouped.set(entry.date, list);
  }
  const result = [];
  for (const [date, events] of grouped) {
    if (events.some((event) => !event.title || !validTime(event.time))) {
      console.error(`${source.club} ${date}: missing title or start time; skipped entire date`);
      continue;
    }
    if (new Set(events.map((event) => event.time)).size > 1) {
      console.error(`${source.club} ${date}: multiple start times cannot be represented safely; skipped`);
      continue;
    }
    const description = [...new Set(events.map((event) => event.title))].join(' / ');
    if ([...description].length > 160) {
      console.error(`${source.club} ${date}: combined titles exceed 160 characters; skipped`);
      continue;
    }
    const artists = [...new Set(events.flatMap((event) => event.artists ?? []))].join(', ');
    if ([...artists].length > 160) {
      console.error(`${source.club} ${date}: lineup exceeds 160 characters; lineup omitted`);
    }
    result.push({
      p_club_slug: source.club,
      p_event_date: date,
      p_event_time: events.map((event) => event.time).sort()[0],
      p_description: description,
      p_djs: [...artists].length <= 160 && artists ? artists : null,
      p_source: source.url,
    });
  }
  return result;
}

export function parseBerghain(html, now = new Date()) {
  const document = new JSDOM(html).window.document;
  const cards = [...document.querySelectorAll('a.upcoming-event')];
  if (!cards.length) throw new Error('Berghain: no event cards found; calendar may have changed');
  const entries = [];
  for (const card of cards) {
    const heading = text(card.querySelector('p'));
    const match = heading.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
    if (!match) throw new Error('Berghain: event card has no recognizable date');
    const date = `${match[3]}-${match[2]}-${match[1]}`;
    if (!validDate(date)) throw new Error(`Berghain: invalid date ${date}`);
    if (!inWindow(date, now)) continue;
    const artists = [...card.querySelectorAll('h4 > span.font-bold')]
      .map((artist) => text(artist).replace(/,\s*$/, '')).filter(Boolean);
    entries.push({
      date,
      time: heading.match(/\bstart\s+(\d{2}:\d{2})\b/i)?.[1] ?? '',
      title: text(card.querySelector('h2')),
      artists,
    });
  }
  return collectByDate(entries, SOURCES[0]);
}

export function parseRitterListing(html, now = new Date()) {
  const document = new JSDOM(html).window.document;
  const links = [...document.querySelectorAll('.events-container a.event-link')];
  if (!links.length) throw new Error('Ritter Butzke: no event cards found; calendar may have changed');
  const entries = [];
  for (const link of links) {
    const url = new URL(link.getAttribute('href'), SOURCES[1].url);
    const match = url.pathname.match(/^\/event\/(\d{2})(\d{2})(\d{2})-/);
    if (url.origin !== new URL(SOURCES[1].url).origin || !match) {
      throw new Error('Ritter Butzke: unexpected event link');
    }
    const date = `20${match[3]}-${match[2]}-${match[1]}`;
    if (!validDate(date)) throw new Error(`Ritter Butzke: invalid date ${date}`);
    if (!inWindow(date, now)) continue;
    const container = link.closest('.col-md-6');
    entries.push({ date, url: url.href, title: text(container?.querySelector('h2')) });
  }
  return entries;
}

export function parseRitterStart(html) {
  const document = new JSDOM(html).window.document;
  const starts = [...document.querySelectorAll('h5')]
    .map((element) => text(element).match(/\bab\s+(\d{2}:\d{2})\b/i)?.[1])
    .filter(Boolean);
  return starts.length && starts.every((value) => value === starts[0]) ? starts[0] : '';
}

async function getHtml(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'QueueBerlinEventBot/1.0 (+https://www.queue-berlin.com/)' },
    signal: AbortSignal.timeout(20000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

async function collectRitter(now) {
  const listing = parseRitterListing(await getHtml(SOURCES[1].url), now);
  const entries = [];
  for (const entry of listing) {
    try {
      entries.push({ ...entry, time: parseRitterStart(await getHtml(entry.url)) });
    } catch (error) {
      detailFetchFailed = true;
      console.error(`Ritter Butzke ${entry.date}: ${error.message}`);
      entries.push({ ...entry, time: '' });
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return collectByDate(entries, SOURCES[1]);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const now = new Date();
  let client;
  if (!dryRun) {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (never expose the key in the browser)');
    }
    client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: clubs, error } = await client.from('clubs').select('slug, name').eq('is_active', true);
    if (error) throw error;
    const supported = new Set(SOURCES.map((source) => source.club));
    const unsupported = clubs.filter((club) => !supported.has(club.slug));
    console.warn(`Clubs without an automatic source: ${unsupported.map((club) => club.name).join(', ') || 'none'}`);
  }

  let failed = false;
  for (const source of SOURCES) {
    try {
      const events = source.club === 'berghain'
        ? parseBerghain(await getHtml(source.url), now)
        : await collectRitter(now);
      console.log(`${source.club}: ${events.length} candidate dates`);
      for (const event of events) {
        if (dryRun) {
          console.log(JSON.stringify(event));
          continue;
        }
        const { data, error } = await client.rpc('import_club_event', event);
        if (error) throw error;
        console.log(`${event.p_club_slug} ${event.p_event_date}: ${data}`);
      }
    } catch (error) {
      failed = true;
      console.error(`${source.club}: ${error.message}`);
    }
  }
  if (failed || detailFetchFailed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
