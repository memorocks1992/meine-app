import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectByDate, parseBerghain, parseRitterListing, parseRitterStart, SOURCES } from './event-import.mjs';

const now = new Date('2026-11-17T12:00:00Z');

test('Berghain extracts events within the 60-day Berlin calendar window', () => {
  const html = `
    <a class="upcoming-event"><p>Thursday <span>19.11.2026</span> start 22:00</p>
      <h2>Heelix &amp; Friends</h2><h4><span class="font-bold">DJ A, </span><span class="font-bold">DJ B</span></h4>
    </a>
    <a class="upcoming-event"><p>Sunday <span>17.01.2027</span> start 20:00</p><h2>Outside</h2></a>`;
  const events = parseBerghain(html, now);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    p_club_slug: 'berghain', p_event_date: '2026-11-19', p_event_time: '22:00',
    p_description: 'Heelix & Friends', p_djs: 'DJ A, DJ B', p_source: SOURCES[0].url,
  });
});

test('malformed dates or changed calendar markup fail rather than invent events', () => {
  assert.throws(() => parseBerghain('<p>Empty</p>', now), /no event cards/);
  assert.throws(() => parseBerghain('<a class="upcoming-event"><p>31.02.2026</p></a>', now), /invalid date/);
  assert.throws(() => parseRitterListing('<p>Empty</p>', now), /no event cards/);
});

test('Ritter listing uses source date and validates detail start time', () => {
  const html = `<div class="events-container"><div class="col-md-6">
    <a class="event-link" href="/event/201126-Example"></a><h2>Example</h2>
    </div></div>`;
  assert.deepEqual(parseRitterListing(html, now), [{
    date: '2026-11-20', url: 'https://club.ritterbutzke.com/event/201126-Example', title: 'Example',
  }]);
  assert.equal(parseRitterStart('<h5>ab 22:00</h5><h5>ab 22:00</h5>'), '22:00');
  assert.equal(parseRitterStart('<h5>ab 22:00</h5><h5>ab 23:00</h5>'), '');
  assert.throws(() => parseRitterListing(
    '<div class="events-container"><a class="event-link" href="https://other.example/event/201126-x"></a></div>', now,
  ), /unexpected event link/);
});

test('same-day events are combined only if every start time is known and equal', () => {
  const items = [
    { date: '2026-11-20', title: 'One', time: '22:00' },
    { date: '2026-11-20', title: 'Two', time: '22:00' },
  ];
  assert.equal(collectByDate(items, SOURCES[1])[0].p_description, 'One / Two');
  assert.equal(collectByDate([items[0], { ...items[1], time: '23:00' }], SOURCES[1]).length, 0);
  assert.equal(collectByDate([items[0], { ...items[1], time: '' }], SOURCES[1]).length, 0);
});
