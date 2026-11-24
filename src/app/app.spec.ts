import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App, calculateClubMetrics, getCurrentClubEvent, getForumPolicyNotice, getFreshEventPrice, getPartyNight, getReportEventNotice, getReportOutliers, isValidEventInterval } from './app';
import { SupabaseService, type PublicReport } from './supabase.service';

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

  it('hides a live update at 48 hours and loads the next one', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
    try {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      Object.defineProperty(app, 'backendConfigured', { value: true });
      const service = TestBed.inject(SupabaseService);
      const update = { id: 'first', datum: '2026-11-21', uhrzeit: '12:00', text: 'First', created_at: '2026-11-21T12:00:01Z', category: 'club' as const };
      const next = { id: 'second', datum: '2026-11-20', uhrzeit: '12:00', text: 'Second', created_at: '2026-11-22T12:00:00Z', category: 'club' as const };
      const load = vi.spyOn(service, 'loadLiveUpdates').mockImplementation(async (_limit, category) =>
        category === 'club'
          ? Date.now() < Date.parse(update.created_at) + 48 * 60 * 60 * 1000 ? [update] : [next]
          : [],
      );

      await app['loadPublicLiveUpdate']();
      expect(app['liveUpdates']()).toEqual([update]);
      await vi.advanceTimersByTimeAsync(999);
      expect(app['liveUpdates']()).toEqual([update]);
      await vi.advanceTimersByTimeAsync(1);
      expect(load.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(app['liveUpdates']()).toEqual([next]);
      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not show an expired live update returned by the backend', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
    try {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      Object.defineProperty(app, 'backendConfigured', { value: true });
      vi.spyOn(TestBed.inject(SupabaseService), 'loadLiveUpdates').mockResolvedValue([{
        id: 'expired', datum: '2026-11-23', uhrzeit: '12:00', text: 'Expired', created_at: '2026-11-21T12:00:00Z',
      }]);
      await app['loadPublicLiveUpdate']();
      expect(app['liveUpdates']()).toEqual([]);
      fixture.destroy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets visitors select and clear a ten-minute wait time without selecting one by default', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app['selectedClub'].set({
      id: 'berghain', name: 'Berghain', district: 'Friedrichshain',
      address: 'Am Wriezener Bahnhof', latitude: 52.5112, longitude: 13.4437, color: '#fb7185',
    });

    app['reportOpen'].set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const slider = element.querySelector<HTMLInputElement>('input[aria-label="Wait time in minutes"]')!;
    expect([slider.min, slider.max, slider.step]).toEqual(['0', '240', '10']);
    expect(slider.getAttribute('aria-valuetext')).toBe('Not selected');
    expect(app['reportReady']()).toBe(false);
    element.querySelector<HTMLButtonElement>('.wait-action')!.click();
    fixture.detectChanges();
    expect(app['reportDraft']().waitMinutes).toBe(0);
    expect(app['reportReady']()).toBe(true);
    slider.value = '50';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(app['reportDraft']().waitMinutes).toBe(50);
    expect(slider.getAttribute('aria-valuetext')).toBe('50 minutes');
    element.querySelector<HTMLButtonElement>('.wait-action')!.click();
    fixture.detectChanges();
    expect(app['reportDraft']().waitMinutes).toBeNull();
    expect(app['reportReady']()).toBe(false);
    fixture.destroy();
  });

  it('shows restaurant menu and wait-time reporting without club-only details', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app['selectedClub'].set({
      id: 'nhas-city-chicken', name: 'Nhas City Chicken', district: 'Mitte',
      address: 'Torstraße 125, 10119 Berlin', latitude: 52.5298592, longitude: 13.4004233,
      color: '#f5bb55', category: 'gastronomy', menu_url: 'https://citychickennhas.de/menu',
    });
    app['clubDataStatus'].set('ready');
    app['reportOpen'].set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.night-bar')).toBeNull();
    expect(element.querySelector('.event-value')).toBeNull();
    expect(element.querySelector('.club-metrics')).toBeNull();
    expect(element.querySelector('.restaurant-menu')?.textContent).toContain('Crispy Wings');
    const menuItems = Array.from(element.querySelectorAll('.restaurant-menu li'));
    expect(menuItems.map((item) => [
      item.querySelector('span')?.textContent?.trim(),
      item.querySelector('.restaurant-menu-price')?.textContent?.trim(),
    ])).toEqual([
      ['Half-chicken menu: Classic', '€15.90'],
      ['Half-chicken menu: Spezial', '€17.90'],
      ['Crispy Wings (6 pieces)', '€7.90'],
      ['Chicken bites (6 pieces)', '€8.90'],
      ['Chicken wraps', 'from €6.90'],
    ]);
    expect(element.querySelector('input[aria-label="Wait time in minutes"]')).not.toBeNull();
    expect(element.querySelector('input[aria-label="Door Odds from 1 to 10"]')).toBeNull();
    expect(element.querySelector('#entry-price')).toBeNull();
    expect(app['reportReady']()).toBe(false);
    app['reportDraft'].update((draft) => ({ ...draft, mood: 8 }));
    expect(app['reportReady']()).toBe(false);
    app['setWaitMinutes'](20);
    expect(app['reportReady']()).toBe(true);
    fixture.destroy();
  });

  it('loads and submits restaurant wait reports without requiring a club event', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    Object.defineProperty(app, 'backendConfigured', { value: true });
    const service = TestBed.inject(SupabaseService);
    vi.spyOn(service, 'loadWaitReports').mockResolvedValue([]);
    const loadEvents = vi.spyOn(service, 'loadClubEvents').mockResolvedValue([]);
    vi.spyOn(service, 'getVisitorId').mockReturnValue('visitor');
    const submit = vi.spyOn(service, 'submitReport').mockResolvedValue();
    const restaurant = {
      id: 'mustafa-gemuese-kebap', name: 'Mustafa’s Gemüse Kebap', district: 'Kreuzberg',
      address: 'Mehringdamm 33, 10961 Berlin', latitude: 52.493485, longitude: 13.3885619,
      color: '#f5bb55', category: 'gastronomy' as const,
      menu_url: 'https://speisekarte.menu/restaurants/berlin/mustafas-gemuese-kebap-4/menu',
    };
    app['selectedClub'].set(restaurant);
    app['clubDataStatus'].set('ready');
    app['reportOpen'].set(true);
    app['setWaitMinutes'](30);

    await app['submitReport']();

    expect(loadEvents).not.toHaveBeenCalled();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      club_slug: restaurant.id,
      wait_minutes: 30,
      entry_chance: null,
      mood: null,
      entry_range: null,
    }));
    expect(app['reportStatus']()).toBe('success');
    fixture.destroy();
  });

  it('accepts a whole euro amount of at most two digits and rejects invalid input', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app['selectedClub'].set({
      id: 'berghain', name: 'Berghain', district: 'Friedrichshain',
      address: 'Am Wriezener Bahnhof', latitude: 52.5112, longitude: 13.4437, color: '#fb7185',
    });
    app['reportOpen'].set(true);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#entry-price')!;
    expect(input.maxLength).toBe(2);
    expect(app['reportReady']()).toBe(false);
    for (const [value, expected] of [['0', '€0'], ['25', '€25'], ['99', '€99'], ['05', '€5']]) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(app['reportDraft']().entryRange).toBe(expected);
      expect(app['reportReady']()).toBe(true);
    }
    app['setWaitMinutes'](10);
    for (const value of ['100', '-1', '1.5', 'ab']) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(app['reportReady']()).toBe(false);
      expect(input.getAttribute('aria-invalid')).toBe('true');
    }
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(app['reportDraft']().entryRange).toBeNull();
    expect(app['reportReady']()).toBe(true);
    fixture.destroy();
  });

  it('submits the exact price and clears it after success', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T22:00:00Z'));
    try {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const service = TestBed.inject(SupabaseService);
      vi.spyOn(service, 'loadClubReports').mockResolvedValue([]);
      vi.spyOn(service, 'loadClubEvents').mockResolvedValue([]);
      vi.spyOn(service, 'getVisitorId').mockReturnValue('visitor');
      const submit = vi.spyOn(service, 'submitReport').mockResolvedValue();
      app['selectedClub'].set({
        id: 'berghain', name: 'Berghain', district: 'Friedrichshain',
        address: 'Am Wriezener Bahnhof', latitude: 52.5112, longitude: 13.4437, color: '#fb7185',
      });
      app['clubEvents'].set([{
        id: 'event', club_slug: 'berghain', event_date: '2026-11-17', event_time: '22:00:00',
        event_end_date: '2026-11-18', event_end_time: '06:00:00', description: 'Event', djs: null,
      }]);
      app['currentTime'].set(new Date());
      app['clubDataStatus'].set('ready');
      app['reportOpen'].set(true);
      fixture.detectChanges();
      const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#entry-price')!;
      input.value = '25';
      input.dispatchEvent(new Event('input'));
      await app['submitReport']();
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ entry_range: '€25' }));
      expect(app['entryPriceInput']()).toBe('');
      expect(app['reportDraft']().entryRange).toBeNull();

      app['clubEvents'].set([{
        id: 'event', club_slug: 'berghain', event_date: '2026-11-17', event_time: '22:00:00',
        event_end_date: '2026-11-18', event_end_time: '06:00:00', description: 'Event', djs: null,
        entry_price: '€20', entry_price_complete: true, entry_price_source: 'https://example.com',
        entry_price_checked_at: new Date().toISOString(),
      }]);
      input.value = '25';
      input.dispatchEvent(new Event('input'));
      app['setWaitMinutes'](10);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('#entry-price')).toBeNull();
      app['entryPriceInput'].set('invalid');
      expect(app['reportReady']()).toBe(true);
      await app['submitReport']();
      expect(submit).toHaveBeenLastCalledWith(expect.objectContaining({ entry_range: null, wait_minutes: 10 }));

      app['entryPriceInput'].set('25');
      app['selectClub'](null);
      expect(app['entryPriceInput']()).toBe('');
      expect(app['reportDraft']().entryRange).toBeNull();
      fixture.destroy();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it('warns only at the agreed thresholds using recent same-event per-field medians', () => {
    const now = new Date('2026-11-17T22:00:00Z');
    const reports: PublicReport[] = [10, 20, 30].map((wait, index) => ({
      id: `${index}`, club_slug: 'berghain', event_id: 'event', wait_minutes: wait,
      entry_range: '€10–15', entry_chance: 1, mood: 1, created_at: '2026-11-17T21:00:00Z',
    }));
    expect(getReportOutliers({ waitMinutes: 109, entryRange: '€15–20' }, reports, 'event', now)).toEqual([]);
    expect(getReportOutliers({ waitMinutes: 110, entryRange: '€20–30' }, reports, 'event', now)).toHaveLength(2);
    expect(getReportOutliers({ waitMinutes: null, entryRange: '€21' }, reports, 'event', now)).toHaveLength(1);
    expect(getReportOutliers({ waitMinutes: null, entryRange: '€20' }, reports, 'event', now)).toEqual([]);
    expect(getReportOutliers({ waitMinutes: 110, entryRange: '€20–30' }, reports.slice(0, 2), 'event', now)).toEqual([]);
    const unrelated = [
      ...reports.slice(0, 2),
      { ...reports[2], event_id: 'other' },
      { ...reports[2], created_at: '2026-11-17T20:59:59Z' },
      { ...reports[2], created_at: '2026-11-17T22:00:01Z' },
      { ...reports[2], created_at: 'invalid' },
    ];
    expect(getReportOutliers({ waitMinutes: 110, entryRange: '€20–30' }, unrelated, 'event', now)).toEqual([]);
    const missingPrice = reports.map((report, index) => ({ ...report, entry_range: index ? null : report.entry_range }));
    expect(getReportOutliers({ waitMinutes: null, entryRange: '€30+' }, missingPrice, 'event', now)).toEqual([]);
  });

  it('asks before submitting an outlier and accepts explicit confirmation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T22:00:00Z'));
    try {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const service = TestBed.inject(SupabaseService);
      const reports: PublicReport[] = [10, 20, 30].map((wait, index) => ({
        id: `${index}`, club_slug: 'berghain', event_id: 'event', wait_minutes: wait,
        entry_range: '€10–15', entry_chance: null, mood: null, created_at: '2026-11-17T21:55:00Z',
      }));
      vi.spyOn(service, 'loadClubReports').mockResolvedValue(reports);
      vi.spyOn(service, 'getVisitorId').mockReturnValue('visitor');
      const submit = vi.spyOn(service, 'submitReport').mockResolvedValue();
      app['selectedClub'].set({
        id: 'berghain', name: 'Berghain', district: 'Friedrichshain',
        address: 'Am Wriezener Bahnhof', latitude: 52.5112, longitude: 13.4437, color: '#fb7185',
      });
      app['clubEvents'].set([{
        id: 'event', club_slug: 'berghain', event_date: '2026-11-17', event_time: '22:00:00',
        event_end_date: '2026-11-18', event_end_time: '06:00:00', description: 'Event', djs: null,
      }]);
      app['currentTime'].set(new Date());
      app['clubDataStatus'].set('ready');
      app['reportOpen'].set(true);
      app['reportDraft'].set({ waitMinutes: 110, entryRange: '€20–30', entryChance: null, mood: null });
      await app['submitReport']();
      fixture.detectChanges();
      expect(submit).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.report-outlier-warning')?.textContent).toContain('Does this look right?');
      expect(app['reportWarnings']()).toHaveLength(2);
      app['setWaitMinutes'](120);
      expect(app['reportWarnings']()).toEqual([]);
      await app['submitReport']();
      expect(app['reportWarnings']()).toHaveLength(2);
      vi.spyOn(service, 'loadClubEvents').mockResolvedValue([]);
      await app['submitReport'](true);
      expect(submit).toHaveBeenCalledOnce();
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ wait_minutes: 120, entry_range: '€20–30' }));
      fixture.destroy();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it('does not submit when comparison data cannot be loaded', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T22:00:00Z'));
    try {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const service = TestBed.inject(SupabaseService);
      vi.spyOn(service, 'loadClubReports').mockRejectedValue(new Error('Network unavailable'));
      const submit = vi.spyOn(service, 'submitReport').mockResolvedValue();
      vi.spyOn(console, 'error').mockImplementation(() => {});
      app['selectedClub'].set({
        id: 'berghain', name: 'Berghain', district: 'Friedrichshain',
        address: 'Am Wriezener Bahnhof', latitude: 52.5112, longitude: 13.4437, color: '#fb7185',
      });
      app['clubEvents'].set([{
        id: 'event', club_slug: 'berghain', event_date: '2026-11-17', event_time: '22:00:00',
        event_end_date: '2026-11-18', event_end_time: '06:00:00', description: 'Event', djs: null,
      }]);
      app['clubDataStatus'].set('ready');
      app['reportOpen'].set(true);
      app['reportDraft'].set({ waitMinutes: 10, entryRange: null, entryChance: null, mood: null });
      await app['submitReport']();
      expect(submit).not.toHaveBeenCalled();
      expect(app['reportError']()).toContain('Could not check or submit');
      fixture.destroy();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it('allows events starting on New Year’s Eve to last up to 72 hours', () => {
    expect(isValidEventInterval('2026-12-31', '22:00', '2027-01-03', '10:00')).toBe(true);
    expect(isValidEventInterval('2026-12-31', '22:00', '2027-01-03', '22:00')).toBe(true);
    expect(isValidEventInterval('2026-12-31', '22:00', '2027-01-03', '22:01')).toBe(false);
    expect(isValidEventInterval('2026-12-30', '22:00', '2027-01-02', '10:00')).toBe(false);
    expect(isValidEventInterval('2026-11-14', '22:00', '2026-11-16', '06:00')).toBe(true);
    expect(isValidEventInterval('2026-11-14', '22:00', '2026-11-16', '06:01')).toBe(false);
    expect(isValidEventInterval('2026-12-31', '22:00', '2026-12-31', '21:00')).toBe(false);
  });

  it('should render the Queue Berlin brand in English', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('QUEUE BERLIN');
    expect(compiled.querySelector('#map-title')?.textContent).toContain('Berlin is calling. Where to?');
  });

  it('should leave the header right side empty', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.topbar-actions')).toBeNull();
    expect(compiled.querySelector('.topbar-tagline')).toBeNull();
    expect(compiled.querySelector('.forum-nav')).toBeNull();
    expect(compiled.querySelector('.admin-toggle')).toBeNull();
    expect(compiled.querySelector('.preview-badge')).toBeNull();
  });

  it('should show a short German queue motto below the brand name at eyebrow size', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const motto = compiled.querySelector<HTMLElement>('.motto');
    const tonightLabel = compiled.querySelector<HTMLElement>('.night-bar .eyebrow');

    expect(motto?.textContent).toContain('In Berlin, da steht man an.');
    expect(motto?.parentElement?.classList.contains('brand-copy')).toBe(true);
    expect(motto?.previousElementSibling?.classList.contains('brand-name')).toBe(true);
    expect(getComputedStyle(motto!).fontSize).toBe(getComputedStyle(tonightLabel!).fontSize);
  });

  it('should let the party night date scroll with the page', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const nightBar = (fixture.nativeElement as HTMLElement).querySelector('.night-bar');

    expect(nightBar).not.toBeNull();
    expect(getComputedStyle(nightBar!).position).toBe('static');
  });

  it('should show the offline live-update state when there are no updates', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.ticker')?.classList.contains('offline')).toBe(true);
    expect(compiled.querySelector('.ticker p')?.textContent).toContain('Offline. No current updates');
    expect(compiled.querySelector('.live-indicator-dot')).not.toBeNull();
  });

  it('updates the footer community text for the selected category', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const footerText = () => (fixture.nativeElement as HTMLElement).querySelector('.footer-brand span:last-child')?.textContent?.trim();
    expect(footerText()).toBe("Community for Berlin's club scene");
    fixture.componentInstance['setMapCategory']('gastronomy');
    fixture.detectChanges();
    expect(footerText()).toBe("Community for Berlin's food scene");
    fixture.componentInstance['setMapCategory']('club');
    fixture.detectChanges();
    expect(footerText()).toBe("Community for Berlin's club scene");
    fixture.destroy();
  });

  it('should show the live update for the selected map category only', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    app['liveUpdates'].set([
      { id: 'club-update', datum: '2026-11-25', uhrzeit: '20:00', text: 'Club update', created_at: '2026-11-25T19:00:00Z', category: 'club' },
      { id: 'food-update', datum: '2026-11-25', uhrzeit: '20:00', text: 'Food update', created_at: '2026-11-25T19:00:00Z', category: 'gastronomy' },
    ]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.ticker p')?.textContent).toContain('Club update');
    app['setMapCategory']('gastronomy');
    fixture.detectChanges();
    expect(compiled.querySelector('.ticker p')?.textContent).toContain('Food update');
    app['liveUpdates'].set([{
      id: 'club-update', datum: '2026-11-25', uhrzeit: '20:00', text: 'Club update', created_at: '2026-11-25T19:00:00Z', category: 'club',
    }]);
    fixture.detectChanges();
    expect(compiled.querySelector('.ticker p')?.textContent).toContain('Offline. No current updates');
    fixture.destroy();
  });

  it('should show a dismissible community information banner', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.community-notice')?.textContent).toContain('No reports, no live information.');

    compiled.querySelector<HTMLButtonElement>('.community-notice-dismiss')?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.community-notice')).toBeNull();
  });

  it('opens the report form without implying that it opens the forum', () => {
    const fixture = TestBed.createComponent(App);
    fixture.componentInstance['selectedClub'].set({
      id: 'berghain', name: 'Berghain', district: 'Friedrichshain',
      address: 'Am Wriezener Bahnhof, 10243 Berlin', latitude: 52.5112, longitude: 13.4437, color: '#fb7185',
    });

    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector<HTMLButtonElement>('.report-toggle')!;
    expect(toggle.textContent).toContain('Share your report');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(element.querySelector('.forum-section')).not.toBeNull();
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.report-section')).not.toBeNull();
    expect(element.querySelector('.forum-section')).not.toBeNull();
    fixture.destroy();
  });

  it('uses a fresh complete event price and hides the price report, but retains partial and stale reporting', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const now = new Date('2026-11-19T23:15:00+01:00');
      app['currentTime'].set(now);
      app['selectedClub'].set({
        id: 'club-ost', name: 'Club OST', district: 'Stralau',
        address: 'Alt-Stralau 1–2, 10245 Berlin', latitude: 52.5001, longitude: 13.4718, color: '#e879f9',
      });
      const event = {
        id: 'event', club_slug: 'club-ost', event_date: '2026-11-19', event_time: '23:00:00',
        event_end_date: '2026-11-20', event_end_time: '06:00:00', description: 'SAVORY', djs: null,
        entry_price: '€20 at the door', entry_price_complete: true, entry_price_source: 'https://clubost.de/event/123/',
        entry_price_checked_at: now.toISOString(),
      };
      app['clubEvents'].set([event]);
      app['reportOpen'].set(true);
      app['reportDraft'].set({ waitMinutes: null, entryChance: null, mood: null, entryRange: '€20–30' });
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('.entry-metric strong')?.textContent).toContain('€20 at the door');
      expect(element.querySelector('#entry-price')).toBeNull();
      expect(app['reportReady']()).toBe(false);
      expect(element.querySelector('.entry-metric a')?.getAttribute('href')).toBe(event.entry_price_source);

      app['clubEvents'].set([{ ...event, entry_price: 'Free entry until 00:30', entry_price_complete: false }]);
      fixture.detectChanges();
      expect(element.querySelector('.entry-metric')?.textContent).toContain('Other entry prices unknown');
      expect(element.querySelector('#entry-price')).not.toBeNull();
      expect(app['reportReady']()).toBe(true);

      app['clubEvents'].set([{ ...event, entry_price_checked_at: '2026-11-16T22:00:00Z' }]);
      fixture.detectChanges();
      expect(element.querySelector('.entry-metric strong')?.textContent).not.toContain('€20 at the door');
      expect(element.querySelector('#entry-price')).not.toBeNull();
      expect(getFreshEventPrice({ ...event, entry_price_checked_at: '2026-11-20T00:00:00Z' }, now)).toBeNull();
      fixture.destroy();
  });

  it('reveals and copies the selected club address', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      const fixture = TestBed.createComponent(App);
      fixture.componentInstance['selectedClub'].set({
        id: 'berghain', name: 'Berghain', district: 'Friedrichshain',
        address: 'Am Wriezener Bahnhof, 10243 Berlin', latitude: 52.5112, longitude: 13.4437, color: '#fb7185',
      });
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      const toggle = element.querySelector<HTMLButtonElement>('.address-toggle')!;
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(element.querySelector('.club-address')).toBeNull();

      toggle.click();
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(element.querySelector('.club-address')?.textContent).toContain('Am Wriezener Bahnhof, 10243 Berlin');
      element.querySelector<HTMLButtonElement>('.address-copy')!.click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(writeText).toHaveBeenCalledWith('Am Wriezener Bahnhof, 10243 Berlin');
      expect(element.querySelector('.address-copy-status')?.textContent).toContain('Address copied.');

      toggle.click();
      fixture.detectChanges();
      expect(element.querySelector('.club-address')).toBeNull();
      fixture.destroy();
    } finally {
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', originalClipboard);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
  });

  it('shows a manual-copy instruction if clipboard access fails', async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    try {
      const fixture = TestBed.createComponent(App);
      fixture.componentInstance['selectedClub'].set({
        id: 'berghain', name: 'Berghain', district: 'Friedrichshain',
        address: 'Am Wriezener Bahnhof, 10243 Berlin', latitude: 52.5112, longitude: 13.4437, color: '#fb7185',
      });
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      element.querySelector<HTMLButtonElement>('.address-toggle')!.click();
      fixture.detectChanges();
      element.querySelector<HTMLButtonElement>('.address-copy')!.click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(element.querySelector('.address-copy-status')?.textContent).toContain('select and copy it manually');
      fixture.destroy();
    } finally {
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', originalClipboard);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
    }
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

  it('should keep an event visible until its configured end date and time', () => {
    const saturdayEvent = {
      id: 'saturday',
      club_slug: 'berghain',
      event_date: '2026-11-14',
      event_time: '22:00:00',
      event_end_date: '2026-11-16',
      event_end_time: '06:00:00',
      description: 'Saturday event',
      djs: null,
    };
    const events = [saturdayEvent];

    expect(getCurrentClubEvent(events, new Date('2026-11-14T22:00:00+01:00'))).toBe(saturdayEvent);
    expect(getCurrentClubEvent(events, new Date('2026-11-16T05:59:00+01:00'))).toBe(saturdayEvent);
    expect(getCurrentClubEvent(events, new Date('2026-11-16T06:00:00+01:00'))).toBeNull();
  });

  it('should select a later event when its time interval overlaps an earlier event', () => {
    const saturdayEvent = { id: 'saturday', club_slug: 'berghain', event_date: '2026-11-14', event_time: '22:00:00', event_end_date: '2026-11-16', event_end_time: '06:00:00', description: 'Saturday event', djs: null };
    const sundayEvent = { id: 'sunday', club_slug: 'berghain', event_date: '2026-11-15', event_time: '20:00:00', event_end_date: '2026-11-16', event_end_time: '06:00:00', description: 'Sunday event', djs: null };

    expect(getCurrentClubEvent([saturdayEvent, sundayEvent], new Date('2026-11-15T21:00:00+01:00'))).toBe(sundayEvent);
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

  it('should average recent wait reports while averaging other metrics for the event day', () => {
    const now = new Date('2026-11-10T21:00:00+01:00');
    const reports: PublicReport[] = [
      { id: '1', club_slug: 'berghain', event_id: 'event-1', wait_minutes: 20, entry_chance: 6, mood: 8, entry_range: '€15–20', created_at: '2026-11-10T20:30:00+01:00' },
      { id: '2', club_slug: 'berghain', event_id: 'event-1', wait_minutes: 40, entry_chance: 8, mood: 6, entry_range: '€15–20', created_at: '2026-11-10T16:30:00+01:00' },
      { id: '3', club_slug: 'berghain', event_id: 'event-0', wait_minutes: 200, entry_chance: 1, mood: 1, entry_range: '€30+', created_at: '2026-11-09T23:30:00+01:00' },
    ];

    expect(calculateClubMetrics(reports, now)).toEqual({
      waitMinutes: 20,
      entryChance: 7,
      mood: 7,
      entryRange: '€15–20',
      latestWaitReportAt: '2026-11-10T20:30:00+01:00',
      latestWaitMinutes: 20,
      count: 2,
      source: 'live',
    });
  });

  it('should keep reports from earlier days of the same event interval', () => {
    const now = new Date('2026-11-15T21:00:00+01:00');
    const reports: PublicReport[] = [
      { id: '1', club_slug: 'berghain', event_id: 'weekend-event', wait_minutes: 20, entry_chance: 6, mood: 8, entry_range: '€15–20', created_at: '2026-11-14T23:30:00+01:00' },
      { id: '2', club_slug: 'berghain', event_id: 'weekend-event', wait_minutes: 40, entry_chance: 8, mood: 6, entry_range: '€15–20', created_at: '2026-11-15T20:30:00+01:00' },
      { id: '3', club_slug: 'berghain', event_id: 'another-event', wait_minutes: 200, entry_chance: 1, mood: 1, entry_range: '€30+', created_at: '2026-11-15T20:00:00+01:00' },
    ];

    expect(calculateClubMetrics(reports, now, 'weekend-event')).toEqual({
      waitMinutes: 40,
      entryChance: 7,
      mood: 7,
      entryRange: '€15–20',
      latestWaitReportAt: '2026-11-15T20:30:00+01:00',
      latestWaitMinutes: 40,
      count: 2,
      source: 'live',
    });
  });

  it('should not use reports from a previous event day', () => {
    const now = new Date('2026-11-10T21:00:00+01:00');
    const reports: PublicReport[] = [
      { id: '1', club_slug: 'berghain', event_id: 'event-1', wait_minutes: 50, entry_chance: 4, mood: null, entry_range: '€20–30', created_at: '2026-11-03T20:30:00+01:00' },
      { id: '2', club_slug: 'berghain', event_id: 'event-2', wait_minutes: 120, entry_chance: 2, mood: 3, entry_range: '€30+', created_at: '2026-11-03T18:00:00+01:00' },
    ];

    expect(calculateClubMetrics(reports, now)).toEqual({
      waitMinutes: null,
      entryChance: null,
      mood: null,
      entryRange: null,
      latestWaitReportAt: null,
      latestWaitMinutes: null,
      count: 0,
      source: 'none',
    });
  });

  it('should average only wait reports from the last hour and retain the latest report', () => {
    const now = new Date('2026-11-10T21:00:00+01:00');
    const reports: PublicReport[] = [
      { id: '1', club_slug: 'berghain', event_id: 'event-1', wait_minutes: 10, entry_chance: 6, mood: 8, entry_range: '€15–20', created_at: '2026-11-10T19:59:00+01:00' },
      { id: '2', club_slug: 'berghain', event_id: 'event-1', wait_minutes: 30, entry_chance: 8, mood: 6, entry_range: '€15–20', created_at: '2026-11-10T20:00:00+01:00' },
      { id: '3', club_slug: 'berghain', event_id: 'event-1', wait_minutes: 70, entry_chance: 8, mood: 6, entry_range: '€15–20', created_at: '2026-11-10T20:01:00+01:00' },
    ];

    expect(calculateClubMetrics(reports, now, 'event-1')).toMatchObject({
      waitMinutes: 50,
      latestWaitReportAt: '2026-11-10T20:01:00+01:00',
      latestWaitMinutes: 70,
    });
  });

  it('should not show a stale wait average when there are no reports in the last hour', () => {
    const now = new Date('2026-11-10T21:00:00+01:00');
    const reports: PublicReport[] = [
      { id: '1', club_slug: 'berghain', event_id: 'event-1', wait_minutes: 45, entry_chance: 6, mood: 8, entry_range: '€15–20', created_at: '2026-11-10T19:30:00+01:00' },
    ];

    expect(calculateClubMetrics(reports, now, 'event-1')).toMatchObject({
      waitMinutes: null,
      latestWaitReportAt: '2026-11-10T19:30:00+01:00',
      latestWaitMinutes: 45,
      count: 1,
      source: 'live',
    });
  });
});
