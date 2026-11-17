import { createClient } from '@supabase/supabase-js';
import { JSDOM } from 'jsdom';
import { pathToFileURL } from 'node:url';

const SOURCE = 'https://clubost.de/';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const text = (element) => element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

export function parseClubOst(html) {
  const document = new JSDOM(html).window.document;
  const cards = [...document.querySelectorAll('.event-item')];
  if (!cards.length) throw new Error('Club OST calendar has no event cards; its format may have changed.');
  const events = [];
  for (const card of cards) {
    const title = text(card.querySelector('h3'));
    const dateText = text(card.querySelector('.event-info'));
    const dateMatch = dateText.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),\s*(\d{4})\s*\|/);
    const link = card.querySelector('a[href^="/event/"]')?.getAttribute('href');
    const month = dateMatch ? MONTHS.indexOf(dateMatch[1].slice(0, 3)) + 1 : 0;
    if (!title || !dateMatch || !month || !link || !/^\/event\/[a-f0-9-]+\/$/i.test(link)) {
      throw new Error('Club OST calendar contains an event with an unrecognizable title, date or URL.');
    }
    const date = `${dateMatch[3]}-${String(month).padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
    if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
      throw new Error(`Club OST calendar contains an invalid date: ${date}`);
    }
    const partial = title.match(/^\[FREE ENTRY TILL ((?:[01]\d|2[0-3]):[0-5]\d)\]/i);
    events.push({
      date,
      title,
      source: new URL(link, SOURCE).href,
      price: partial ? `Free entry until ${partial[1]}` : null,
      complete: false,
    });
  }
  return events;
}

export function matchPrices(officialEvents, storedEvents) {
  const byDate = new Map();
  for (const event of officialEvents) {
    const sameDate = byDate.get(event.date) ?? [];
    sameDate.push(event);
    byDate.set(event.date, sameDate);
  }
  return storedEvents.map((event) => {
    const sameDate = byDate.get(event.event_date) ?? [];
    const match = sameDate.length === 1 && sameDate[0].title === event.description ? sameDate[0] : null;
    return { event, match: match?.price ? match : null };
  });
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Club OST request failed: HTTP ${response.status}`);
  const officialEvents = parseClubOst(await response.text());
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: events, error } = await client.from('events')
    .select('id, event_date, description, entry_price_source')
    .eq('club_slug', 'club-ost')
    .gte('event_end_date', new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date()))
    .limit(1000);
  if (error) throw error;

  for (const { event, match } of matchPrices(officialEvents, events)) {
    if (event.entry_price_source && !event.entry_price_source.startsWith('https://clubost.de/event/')) continue;
    if (!match && !event.entry_price_source?.startsWith('https://clubost.de/event/')) continue;
    const values = match
      ? { entry_price: match.price, entry_price_complete: match.complete, entry_price_source: match.source, entry_price_checked_at: new Date().toISOString() }
      : { entry_price: null, entry_price_complete: false, entry_price_source: null, entry_price_checked_at: null };
    let update = client.from('events').update(values).eq('id', event.id).eq('description', event.description).eq('event_date', event.event_date);
    update = event.entry_price_source ? update.eq('entry_price_source', event.entry_price_source) : update.is('entry_price_source', null);
    const { data: updated, error: updateError } = await update.select('id');
    if (updateError) throw updateError;
    if (!updated.length) console.warn(`Event ${event.id} changed during import; skipped.`);
    else console.log(`Club OST ${event.event_date}: ${match ? 'price updated' : 'outdated price removed'}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('Club price import failed:', error);
    process.exitCode = 1;
  });
}
