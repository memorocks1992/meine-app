import test from 'node:test';
import assert from 'node:assert/strict';
import { matchPrices, parseClubOst } from './club-price-import.mjs';

const card = (title, date, id = '1234-abcd') => `<div class="event-item"><a href="/event/${id}/"><h3>${title}</h3></a><div class="event-info">${date} | 11 p.m.</div></div>`;

test('extracts a partial price without claiming later entry is free', () => {
  const [event] = parseClubOst(card('[FREE ENTRY TILL 00:30] SAVORY', 'Nov. 19, 2026'));
  assert.equal(event.date, '2026-11-19');
  assert.equal(event.price, 'Free entry until 00:30');
  assert.equal(event.complete, false);
  assert.equal(event.source, 'https://clubost.de/event/1234-abcd/');
});

test('does not assume free entry without its conditions or invent unknown prices', () => {
  const events = parseClubOst(card('[FREE ENTRY] PARTY', 'Nov. 19, 2026') + card('ONYX', 'Nov. 20, 2026'));
  assert.equal(events[0].price, null);
  assert.equal(events[1].price, null);
});

test('requires a single exact official event title and date', () => {
  const official = parseClubOst(card('[FREE ENTRY TILL 00:30] PARTY', 'Nov. 19, 2026'));
  const stored = [{ id: '1', event_date: '2026-11-19', description: '[FREE ENTRY TILL 00:30] PARTY' }];
  assert.ok(matchPrices(official, stored)[0].match);
  assert.equal(matchPrices(official, [{ ...stored[0], description: 'PARTY / OTHER' }])[0].match, null);
  assert.equal(matchPrices([...official, { ...official[0], title: 'OTHER' }], stored)[0].match, null);
});

test('fails explicitly when the source format changes', () => {
  assert.throws(() => parseClubOst('<main></main>'), /no event cards/);
  assert.throws(() => parseClubOst(card('[FREE ENTRY] PARTY', 'unexpected')), /unrecognizable/);
});
