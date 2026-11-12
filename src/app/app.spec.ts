import { TestBed } from '@angular/core/testing';
import { App, calculateClubMetrics, getForumPolicyNotice, getPartyNight, getReportEventNotice } from './app';
import type { PublicReport } from './supabase.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the Queue Berlin brand in English', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('QUEUE BERLIN');
    expect(compiled.querySelector('#map-title')?.textContent).toContain("Where's the party?");
  });

  it('should link to the Queue Berlin Instagram account from the footer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const link = (fixture.nativeElement as HTMLElement).querySelector('.instagram-link');

    expect(link?.getAttribute('aria-label')).toBe('Queue Berlin on Instagram');
    expect(link?.querySelector('svg')).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('https://www.instagram.com/queueberlin/');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });

  it('should keep the party night on the previous date before 6 a.m. in Berlin', () => {
    const partyNight = getPartyNight(new Date('2026-11-10T05:59:00+01:00'));

    expect(partyNight.date).toBe('Monday, 9 November 2026');
    expect(partyNight.nextDay).toBe('Tuesday');
  });

  it('should switch to the current date at 6 a.m. in Berlin', () => {
    const partyNight = getPartyNight(new Date('2026-11-10T06:00:00+01:00'));

    expect(partyNight.date).toBe('Tuesday, 10 November 2026');
  });

  it('should use Berlin time when the local date differs from the UTC date', () => {
    const partyNight = getPartyNight(new Date('2026-11-09T23:30:00Z'));

    expect(partyNight.date).toBe('Monday, 9 November 2026');
  });

  it('should apply the 6 a.m. cutoff during Berlin daylight saving time', () => {
    const beforeCutoff = getPartyNight(new Date('2026-07-17T03:59:00Z'));
    const atCutoff = getPartyNight(new Date('2026-07-17T04:00:00Z'));

    expect(beforeCutoff.date).toBe('Thursday, 16 July 2026');
    expect(atCutoff.date).toBe('Friday, 17 July 2026');
  });

  it('should prevent reports when no event is registered for the club', () => {
    expect(getReportEventNotice('ready', false, 'Berghain')).toBe(
      'There is currently no event registered for Berghain. Reports can only be submitted while an event is running.',
    );
    expect(getReportEventNotice('ready', true, 'Berghain')).toBeNull();
  });

  it('should not allow reports until event availability is known', () => {
    expect(getReportEventNotice('loading', false, 'Berghain')).toContain('still being checked');
    expect(getReportEventNotice('error', false, 'Berghain')).toContain('could not be verified');
  });

  it('should flag prohibited forum language in posts, replies, and display names', () => {
    expect(getForumPolicyNotice('', 'This is a threat to kill someone.')).toContain('Community Guidelines');
    expect(getForumPolicyNotice('Cocaine Fan', 'Hello everyone')).toContain('Community Guidelines');
    for (const term of ['Hitler', 'Drogen', 'Drugs', 'Ketamin', 'Kokain', 'Fuck you', 'Fuck', 'Kill']) {
      expect(getForumPolicyNotice('', `Please block ${term}.`)).toContain('Community Guidelines');
    }
    expect(getForumPolicyNotice('', 'Have a nice evening')).toBeNull();
  });

  it('should average live reports from the last three hours', () => {
    const now = new Date('2026-11-10T21:00:00+01:00');
    const reports: PublicReport[] = [
      { id: '1', club_slug: 'berghain', wait_minutes: 20, entry_chance: 6, mood: 8, entry_range: '€15–20', created_at: '2026-11-10T20:30:00+01:00' },
      { id: '2', club_slug: 'berghain', wait_minutes: 40, entry_chance: 8, mood: 6, entry_range: '€15–20', created_at: '2026-11-10T19:30:00+01:00' },
    ];

    expect(calculateClubMetrics(reports, now)).toEqual({
      waitMinutes: 30,
      entryChance: 7,
      mood: 7,
      entryRange: '€15–20',
      count: 2,
      source: 'live',
    });
  });

  it('should fall back to reports from the same party-night weekday and time', () => {
    const now = new Date('2026-11-10T21:00:00+01:00');
    const reports: PublicReport[] = [
      { id: '1', club_slug: 'berghain', wait_minutes: 50, entry_chance: 4, mood: null, entry_range: '€20–30', created_at: '2026-11-03T20:30:00+01:00' },
      { id: '2', club_slug: 'berghain', wait_minutes: 120, entry_chance: 2, mood: 3, entry_range: '€30+', created_at: '2026-11-03T18:00:00+01:00' },
    ];

    expect(calculateClubMetrics(reports, now)).toEqual({
      waitMinutes: 50,
      entryChance: 4,
      mood: null,
      entryRange: '€20–30',
      count: 1,
      source: 'historical',
    });
  });
});
