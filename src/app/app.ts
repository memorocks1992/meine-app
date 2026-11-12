import { afterNextRender, Component, computed, ElementRef, OnDestroy, PLATFORM_ID, signal, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import type { AdminReport, ClubEvent, ForumComment, ForumPost, ForumReport, LiveUpdate, ManagedClub, NewReport, PublicReport } from './supabase.service';
import type { User } from '@supabase/supabase-js';
import type * as Leaflet from 'leaflet';

interface Club {
  id: string;
  name: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  color: string;
  is_active?: boolean;
}

interface PartyNight {
  date: string;
  nextDay: string;
}

interface ReportDraft {
  waitMinutes: number | null;
  entryRange: string | null;
  entryChance: number | null;
  mood: number | null;
}

type ClubDataStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

const MAX_UPCOMING_EVENT_DAYS = 100;

export function getReportEventNotice(
  status: ClubDataStatus,
  hasEvent: boolean,
  clubName: string,
): string | null {
  if (status === 'ready' && !hasEvent) {
    return `There is currently no event registered for ${clubName}. Reports can only be submitted while an event is running.`;
  }
  if (status === 'loading' || status === 'idle') {
    return 'Event availability is still being checked. Please try again in a moment.';
  }
  if (status === 'error' || status === 'unconfigured') {
    return 'Event availability could not be verified. Please try again later.';
  }
  return null;
}

export interface ClubMetrics {
  waitMinutes: number | null;
  entryChance: number | null;
  mood: number | null;
  entryRange: string | null;
  count: number;
  source: 'live' | 'none';
}

const FORUM_POLICY_TERMS = [
  'arschloch', 'bastard', 'bitch', 'blödmann', 'cunt', 'dickhead', 'fuck', 'fucking',
  'hurensohn', 'idiot', 'moron', 'motherfucker', 'retard', 'schlampe', 'shit', 'slut',
  'spast', 'whore', 'wichser', 'wixer', 'hitler',
  'kill', 'murder', 'shoot', 'stab', 'bomb', 'umbringen', 'töten', 'erschießen', 'abstechen',
  'rape', 'molest', 'grooming', 'vergewaltig', 'missbrauch',
  'drogen', 'drugs', 'cocaine', 'kokain', 'heroin', 'meth', 'crack', 'ecstasy', 'mdma', 'ketamine', 'ketamin',
  'fentanyl', 'cannabis', 'marijuana', 'weed', 'haschisch', 'koks', 'gras', 'lsd',
];

const forumPolicyTermPattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:fuck\\s+you|${FORUM_POLICY_TERMS.join('|')})(?![\\p{L}\\p{N}])`,
  'iu',
);

export function getForumPolicyNotice(authorName: string, body: string): string | null {
  return forumPolicyTermPattern.test(`${authorName} ${body}`)
    ? 'This message may violate our Community Guidelines. Please remove insults, threats, abuse, and drug-related language.'
    : null;
}

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => replacements[character]);
}

function berlinParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
}

function partyNightDate(date: Date): Date {
  const parts = berlinParts(date);
  const night = new Date(Date.UTC(Number(parts['year']), Number(parts['month']) - 1, Number(parts['day'])));
  if (Number(parts['hour']) < 6) {
    night.setUTCDate(night.getUTCDate() - 1);
  }
  return night;
}

export function getPartyNightKey(date: Date): string {
  return partyNightDate(date).toISOString().slice(0, 10);
}

function berlinCalendarDate(date: Date, daysFromNow = 0): string {
  const parts = berlinParts(date);
  const calendarDate = new Date(Date.UTC(Number(parts['year']), Number(parts['month']) - 1, Number(parts['day'])));
  calendarDate.setUTCDate(calendarDate.getUTCDate() + daysFromNow);
  return calendarDate.toISOString().slice(0, 10);
}

export function getPartyNight(now: Date): PartyNight {
  const date = partyNightDate(now);
  const formatDate = (value: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(value);

  return {
    date: formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    nextDay: formatDate(new Date(date.getTime() + 86_400_000), { weekday: 'long' }),
  };
}

export function calculateClubMetrics(reports: PublicReport[], now: Date): ClubMetrics {
  const eventDate = berlinCalendarDate(now);
  const liveReports = reports.filter((report) => {
    const timestamp = new Date(report.created_at).getTime();
    return Number.isFinite(timestamp)
      && timestamp <= now.getTime()
      && berlinCalendarDate(new Date(timestamp)) === eventDate;
  });

  const source: ClubMetrics['source'] = liveReports.length ? 'live' : 'none';

  const average = (values: Array<number | null>): number | null => {
    const present = values.filter((value): value is number => value !== null);
    return present.length
      ? Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 10) / 10
      : null;
  };
  const priceCounts = new Map<string, number>();
  for (const report of liveReports) {
    if (report.entry_range) {
      priceCounts.set(report.entry_range, (priceCounts.get(report.entry_range) ?? 0) + 1);
    }
  }

  const entryRange = [...priceCounts.entries()]
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

  return {
    waitMinutes: average(liveReports.map((report) => report.wait_minutes)),
    entryChance: average(liveReports.map((report) => report.entry_chance)),
    mood: average(liveReports.map((report) => report.mood)),
    entryRange,
    count: liveReports.length,
    source,
  };
}

@Component({
  imports: [],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  @ViewChild('mapElement') private mapElement?: ElementRef<HTMLDivElement>;

  protected readonly selectedClub = signal<Club | null>(null);
  protected readonly partyNight = signal(getPartyNight(new Date()));
  protected readonly currentCalendarDate = signal(berlinCalendarDate(new Date()));
  protected readonly clubsWithEventsToday = signal<Set<string>>(new Set());
  protected readonly meterSegments = Array.from({ length: 10 }, (_, index) => index + 1);
  protected readonly waitOptions = [0, 10, 20, 30, 45, 60, 90, 120, 180, 210, 240];
  protected readonly entryRanges = ['Up to €10', '€10–15', '€15–20', '€20–30', '€30+'];
  protected readonly reportDraft = signal<ReportDraft>({
    waitMinutes: null,
    entryRange: null,
    entryChance: null,
    mood: null,
  });
  protected readonly reportReady = computed(() => {
    const draft = this.reportDraft();
    return draft.waitMinutes !== null
      || draft.entryRange !== null
      || draft.entryChance !== null
      || draft.mood !== null;
  });
  protected readonly reportOpen = signal(false);
  protected readonly reportEventNotice = signal<string | null>(null);
  protected readonly communityNoticeOpen = signal(true);
  protected readonly historyOpen = signal(false);
  protected readonly programOpen = signal(false);
  protected readonly reportStatus = signal<'idle' | 'submitting' | 'success' | 'error'>('idle');
  protected readonly reportError = signal<string | null>(null);
  protected readonly forumPosts = signal<ForumPost[]>([]);
  protected readonly forumPage = signal(1);
  protected readonly forumPageSize = 10;
  protected readonly forumTotalCount = signal(0);
  protected readonly openForumReply = signal<string | null>(null);
  protected readonly forumPageCount = computed(() => Math.ceil(this.forumTotalCount() / this.forumPageSize));
  protected readonly forumPageNumbers = computed(() =>
    Array.from({ length: this.forumPageCount() }, (_, index) => index + 1),
  );
  protected readonly forumReports = signal<ForumReport[]>([]);
  protected readonly forumStatus = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  protected readonly forumBusy = signal(false);
  protected readonly forumError = signal<string | null>(null);
  protected readonly forumNotice = signal<string | null>(null);
  protected readonly forumPolicyNotice = signal<string | null>(null);
  protected readonly forumDisclaimerAccepted = signal(false);
  protected readonly clubMetrics = signal<ClubMetrics | null>(null);
  protected readonly clubReports = signal<PublicReport[]>([]);
  protected readonly recentClubReports = computed(() => this.clubReports().slice(0, 15));
  protected readonly clubEvents = signal<ClubEvent[]>([]);
  protected readonly tonightEvent = computed(() => {
    return this.clubEvents().find((event) => event.event_date === this.currentCalendarDate()) ?? null;
  });
  protected readonly clubDataStatus = signal<ClubDataStatus>('idle');
  protected readonly adminOpen = signal(false);
  protected readonly adminUser = signal<User | null>(null);
  protected readonly adminBusy = signal(false);
  protected readonly adminError = signal<string | null>(null);
  protected readonly adminNotice = signal<string | null>(null);
  protected readonly adminTab = signal<'clubs' | 'events' | 'updates' | 'reports' | 'forum'>('clubs');
  protected readonly adminClubs = signal<ManagedClub[]>([]);
  protected readonly adminEvents = signal<ClubEvent[]>([]);
  protected readonly adminReports = signal<AdminReport[]>([]);
  protected readonly adminLiveUpdates = signal<LiveUpdate[]>([]);
  protected readonly liveUpdates = signal<LiveUpdate[]>([]);
  protected readonly editingClub = signal<ManagedClub | null>(null);
  protected readonly clubCount = computed(() => this.clubs().filter((club) => club.is_active !== false).length);
  protected readonly activeAdminClubs = computed(() => this.adminClubs().filter((club) => club.is_active));
  protected readonly backendConfigured: boolean;
  protected readonly clubs = signal<Club[]>([
    { id: 'berghain', name: 'Berghain', district: 'Friedrichshain', address: 'Am Wriezener Bahnhof', latitude: 52.5112, longitude: 13.4437, color: '#fb7185' },
    { id: 'sisyphos', name: 'Sisyphos', district: 'Rummelsburg', address: 'Hauptstraße 15', latitude: 52.4945, longitude: 13.4982, color: '#fbbf24' },
    { id: 'tresor', name: 'Tresor', district: 'Mitte', address: 'Köpenicker Straße 70', latitude: 52.5101, longitude: 13.4186, color: '#38bdf8' },
    { id: 'kitkatclub', name: 'KitKatClub', district: 'Mitte', address: 'Köpenicker Straße 76', latitude: 52.5095, longitude: 13.4198, color: '#c084fc' },
    { id: 'about-blank', name: 'about:blank', district: 'Friedrichshain', address: 'Markgrafendamm 24c', latitude: 52.503, longitude: 13.4693, color: '#4ade80' },
    { id: 'wilde-renate', name: 'Wilde Renate', district: 'Stralau', address: 'Alt-Stralau 70', latitude: 52.4985, longitude: 13.4667, color: '#fb923c' },
    { id: 'club-der-visionaere', name: 'Club der Visionäre', district: 'Treptow', address: 'Am Flutgraben 1', latitude: 52.4941, longitude: 13.4201, color: '#2dd4bf' },
    { id: 'ritter-butzke', name: 'Ritter Butzke', district: 'Kreuzberg', address: 'Ritterstraße 26', latitude: 52.502, longitude: 13.4107, color: '#f472b6' },
    { id: 'schwuz', name: 'SchwuZ', district: 'Neukölln', address: 'Rollbergstraße 26', latitude: 52.4814, longitude: 13.431, color: '#a3e635' },
    { id: 'rso-berlin', name: 'RSO.Berlin', district: 'Niederschöneweide', address: 'Schnellerstraße 137', latitude: 52.4558, longitude: 13.5105, color: '#818cf8' },
    { id: 'heidegluehen', name: 'Heideglühen', district: 'Moabit', address: 'Seestraße 1', latitude: 52.5413, longitude: 13.3405, color: '#f87171' },
    { id: 'club-ost', name: 'Club OST', district: 'Stralau', address: 'Alt-Stralau 1–2', latitude: 52.5001, longitude: 13.4718, color: '#e879f9' },
    { id: 'kater', name: 'Kater Blau', district: 'Friedrichshain', address: 'Holzmarktstraße 25', latitude: 52.5125, longitude: 13.4297, color: '#a78bfa' },
  ]);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly markers = new Map<string, Leaflet.Marker>();
  private readonly labelOffsets = new Map<string, readonly [number, number]>([
    ['berghain', [90, -80]],
    ['sisyphos', [160, 20]],
    ['tresor', [-170, -105]],
    ['kitkatclub', [-155, -25]],
    ['about-blank', [-50, 50]],
    ['wilde-renate', [195, 20]],
    ['club-der-visionaere', [-120, 100]],
    ['ritter-butzke', [-180, 35]],
    ['schwuz', [0, 70]],
    ['club-ost', [175, -75]],
    ['kater', [-110, -55]],
  ]);
  private readonly compactLabelOffsets = new Map<string, readonly [number, number]>([
    ['berghain', [2, -66]],
    ['sisyphos', [-16, -66]],
    ['tresor', [-54, -49]],
    ['kitkatclub', [-67, -15]],
    ['about-blank', [-19, 4]],
    ['wilde-renate', [0, 31]],
    ['club-der-visionaere', [-106, 43]],
    ['ritter-butzke', [-108, 12]],
    ['schwuz', [-24, 63]],
    ['rso-berlin', [-68, 6]],
    ['club-ost', [7, -150]],
    ['kater', [-32, -60]],
  ]);
  private leaflet?: typeof import('leaflet');
  private map?: Leaflet.Map;
  private destroyed = false;
  private compactLayout = false;
  private partyNightInterval?: ReturnType<typeof setInterval>;
  private readonly refreshPartyNight = () => {
    this.partyNight.set(getPartyNight(new Date()));
    const calendarDate = berlinCalendarDate(new Date());
    if (calendarDate !== this.currentCalendarDate()) {
      this.currentCalendarDate.set(calendarDate);
      this.clubsWithEventsToday.set(new Set());
      this.refreshClubIcons();
      void this.loadTodayEventClubs();
      const club = this.selectedClub();
      if (club) {
        this.clubMetrics.set(null);
        this.clubReports.set([]);
        void this.loadClubData(club);
      }
    }
  };
  private readonly handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.refreshPartyNight();
    }
  };
  private readonly handleResize = () => {
    this.compactLayout = (this.mapElement?.nativeElement.clientWidth ?? 0) < 600;
    this.map?.invalidateSize();
    this.refreshClubIcons();
  };

  constructor() {
    this.backendConfigured = this.supabase.isConfigured;
    afterNextRender(() => {
      this.partyNightInterval = setInterval(this.refreshPartyNight, 30_000);
      window.addEventListener('focus', this.refreshPartyNight);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      void this.restoreAdminSession();
      void this.loadPublicClubs();
      void this.loadPublicLiveUpdate();
      void this.loadTodayEventClubs();
      void this.initializeMap();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.handleResize);
      window.removeEventListener('focus', this.refreshPartyNight);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (this.partyNightInterval) {
      clearInterval(this.partyNightInterval);
    }
    this.map?.remove();
  }

  protected clearSelection(): void {
    this.selectClub(null);
  }

  protected toggleReport(): void {
    this.reportOpen.update((open) => !open);
    this.reportStatus.set('idle');
    this.reportError.set(null);
    this.reportEventNotice.set(null);
  }

  protected acknowledgeForumDisclaimer(): void {
    this.forumDisclaimerAccepted.set(true);
  }

  protected acknowledgeCommunityNotice(): void {
    this.communityNoticeOpen.set(false);
  }

  protected setWaitMinutes(waitMinutes: number): void {
    this.updateReportDraft({ waitMinutes });
  }

  protected setEntryRange(entryRange: string): void {
    this.updateReportDraft({ entryRange });
  }

  protected setEntryChance(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.updateReportDraft({ entryChance: value });
  }

  protected setMood(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.updateReportDraft({ mood: value });
  }

  protected isMeterActive(value: number | null, segment: number): boolean {
    return value !== null && segment <= value;
  }

  protected async submitReport(): Promise<void> {
    const club = this.selectedClub();
    if (!club || !this.reportReady() || this.reportStatus() === 'submitting') {
      return;
    }
    const eventNotice = getReportEventNotice(
      this.clubDataStatus(),
      this.tonightEvent() !== null,
      club.name,
    );
    if (eventNotice) {
      this.reportEventNotice.set(eventNotice);
      return;
    }
    this.reportEventNotice.set(null);
    this.reportStatus.set('submitting');
    this.reportError.set(null);

    try {
      const visitorId = this.supabase.getVisitorId();
      const draft = this.reportDraft();
      const report: NewReport = {
        club_slug: club.id,
        visitor_id: visitorId,
        wait_minutes: draft.waitMinutes,
        entry_chance: draft.entryChance,
        mood: draft.mood,
        entry_range: draft.entryRange,
      };
      await this.supabase.submitReport(report);
      this.reportStatus.set('success');
      this.reportDraft.set({ waitMinutes: null, entryChance: null, mood: null, entryRange: null });
      await this.loadClubData(club);
    } catch (error) {
      console.error('Unable to submit the anonymous club report.', error);
      this.reportStatus.set('error');
      this.reportError.set(this.getErrorMessage(error));
    }
  }

  protected async createForumPost(clubSlug: string, authorName: string, body: string, form: HTMLFormElement): Promise<void> {
    const author = authorName.trim();
    const text = body.trim();
    if (this.checkForumPolicy(author, text)) {
      return;
    }
    if (!author || !text || author.length > 40 || text.length > 2000) {
      this.forumError.set('Enter a name (up to 40 characters) and a post (up to 2,000 characters).');
      return;
    }

    this.forumBusy.set(true);
    this.forumError.set(null);
    this.forumNotice.set(null);
    try {
      await this.supabase.createForumPost(clubSlug, author, text);
      form.reset();
      this.forumNotice.set('Your post has been published.');
      this.forumPage.set(1);
      await this.loadForum(clubSlug, 1);
    } catch (error) {
      console.error('Unable to publish forum post.', error);
      this.forumError.set(this.getErrorMessage(error));
    } finally {
      this.forumBusy.set(false);
    }
  }

  protected async createForumComment(
    postId: string,
    authorName: string,
    body: string,
    form: HTMLFormElement,
  ): Promise<void> {
    const author = authorName.trim();
    const text = body.trim();
    if (this.checkForumPolicy(author, text)) {
      return;
    }
    if (!author || !text || author.length > 40 || text.length > 1000) {
      this.forumError.set('Enter a name (up to 40 characters) and a reply (up to 1,000 characters).');
      return;
    }

    this.forumBusy.set(true);
    this.forumError.set(null);
    this.forumNotice.set(null);
    try {
      await this.supabase.createForumComment(postId, author, text);
      form.reset();
      this.openForumReply.set(null);
      this.forumNotice.set('Your reply has been published.');
      const clubSlug = this.selectedClub()?.id;
      if (clubSlug) {
        await this.loadForum(clubSlug);
      }
    } catch (error) {
      console.error('Unable to publish forum reply.', error);
      this.forumError.set(this.getErrorMessage(error));
    } finally {
      this.forumBusy.set(false);
    }
  }

  protected async toggleForumLike(post: ForumPost): Promise<void> {
    this.forumBusy.set(true);
    this.forumError.set(null);
    try {
      await this.supabase.setForumLike(post.id, !post.liked_by_visitor);
      const clubSlug = this.selectedClub()?.id;
      if (clubSlug) {
        await this.loadForum(clubSlug);
      }
    } catch (error) {
      console.error(`Unable to update like for forum post ${post.id}.`, error);
      this.forumError.set(this.getErrorMessage(error));
    } finally {
      this.forumBusy.set(false);
    }
  }

  protected async toggleForumCommentLike(comment: ForumComment): Promise<void> {
    this.forumBusy.set(true);
    this.forumError.set(null);
    try {
      await this.supabase.setForumCommentLike(comment.id, !comment.liked_by_visitor);
      const clubSlug = this.selectedClub()?.id;
      if (clubSlug) {
        await this.loadForum(clubSlug);
      }
    } catch (error) {
      console.error(`Unable to update like for forum reply ${comment.id}.`, error);
      this.forumError.set(this.getErrorMessage(error));
    } finally {
      this.forumBusy.set(false);
    }
  }

  protected async loadForumPage(page: number): Promise<void> {
    const clubSlug = this.selectedClub()?.id;
    if (!clubSlug || page < 1 || page > this.forumPageCount() || page === this.forumPage()) {
      return;
    }
    this.forumPage.set(page);
    await this.loadForum(clubSlug, page);
  }

  protected toggleForumReply(postId: string): void {
    this.openForumReply.update((currentPostId) => currentPostId === postId ? null : postId);
    this.forumError.set(null);
  }

  protected async reportForumTarget(targetType: 'post' | 'comment', targetId: string): Promise<void> {
    if (!window.confirm(`Report this ${targetType} to the moderators?`)) {
      return;
    }
    const reason = window.prompt('Why are you reporting this content?', 'Inappropriate content');
    if (reason === null) {
      return;
    }

    const trimmedReason = reason.trim() || 'Inappropriate content';
    if (trimmedReason.length > 500) {
      this.forumError.set('The report reason must be 500 characters or fewer.');
      return;
    }

    this.forumBusy.set(true);
    this.forumError.set(null);
    this.forumNotice.set(null);
    try {
      await this.supabase.reportForumTarget(targetType, targetId, trimmedReason);
      this.forumNotice.set('Thank you. Your report has been sent to the moderators.');
    } catch (error) {
      console.error('Unable to report forum content.', error);
      this.forumError.set(this.getErrorMessage(error));
    } finally {
      this.forumBusy.set(false);
    }
  }

  protected formatForumTime(timestamp: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }

  protected async removeForumReportTarget(report: ForumReport): Promise<void> {
    if (!window.confirm(`Remove this reported ${report.target_type} and its replies?`)) {
      return;
    }
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      await this.supabase.deleteForumTarget(report);
      this.adminNotice.set('Reported forum content removed.');
      const clubSlug = this.selectedClub()?.id;
      await Promise.all([
        this.loadAdminForumReports(),
        ...(clubSlug ? [this.loadForum(clubSlug)] : []),
      ]);
    } catch (error) {
      console.error(`Unable to remove reported forum ${report.target_type}.`, error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async dismissForumReport(report: ForumReport): Promise<void> {
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      await this.supabase.dismissForumReport(report.id);
      this.adminNotice.set('Forum report dismissed.');
      await this.loadAdminForumReports();
    } catch (error) {
      console.error(`Unable to dismiss forum report ${report.id}.`, error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async signInAdmin(email: string, password: string): Promise<void> {
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      const user = await this.supabase.signInAdmin(email, password);
      this.adminUser.set(user);
      this.adminNotice.set('Admin access verified.');
      await this.loadAdminDashboard();
    } catch (error) {
      console.error('Admin sign-in failed.', error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async signOutAdmin(): Promise<void> {
    this.adminBusy.set(true);
    this.adminError.set(null);
    try {
      await this.supabase.signOutAdmin();
      this.adminUser.set(null);
      this.adminClubs.set([]);
      this.adminEvents.set([]);
      this.adminReports.set([]);
      this.adminLiveUpdates.set([]);
      this.forumReports.set([]);
      this.adminNotice.set('You have been signed out.');
    } catch (error) {
      console.error('Admin sign-out failed.', error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async selectAdminTab(tab: 'clubs' | 'events' | 'updates' | 'reports' | 'forum'): Promise<void> {
    this.adminTab.set(tab);
    this.adminError.set(null);
    if (tab === 'clubs') {
      this.editingClub.set(null);
    }
    if (tab === 'forum') {
      try {
        await this.loadAdminForumReports();
      } catch (error) {
        console.error('Unable to load forum moderation reports.', error);
        this.adminError.set(this.getErrorMessage(error));
      }
    }
  }

  protected editClub(club: ManagedClub): void {
    this.editingClub.set(club);
    this.adminTab.set('clubs');
  }

  protected async saveClub(
    slug: string,
    name: string,
    district: string,
    address: string,
    latitude: string,
    longitude: string,
    color: string,
  ): Promise<void> {
    this.adminNotice.set(null);
    const trimmedSlug = slug.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)
      || !name.trim()
      || !district.trim()
      || !address.trim()
      || !/^#[\da-f]{6}$/i.test(color)) {
      this.adminError.set('Complete every club field and use a lowercase URL-safe slug.');
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      this.adminError.set('Enter valid coordinates for the club.');
      return;
    }
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      await this.supabase.saveClub({
        slug: trimmedSlug,
        name: name.trim(),
        district: district.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        color,
        is_active: this.editingClub()?.is_active ?? true,
      });
      this.editingClub.set(null);
      this.adminNotice.set('Club saved.');
      await this.loadAdminDashboard();
    } catch (error) {
      console.error('Unable to save club.', error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async toggleClubActive(club: ManagedClub): Promise<void> {
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      await this.supabase.setClubActive(club.slug, !club.is_active);
      this.adminNotice.set(club.is_active ? 'Club hidden from visitors.' : 'Club is visible to visitors.');
      await this.loadAdminDashboard();
    } catch (error) {
      console.error(`Unable to update club ${club.slug}.`, error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async saveEvent(clubSlug: string, eventDate: string, description: string, djs: string): Promise<void> {
    this.adminNotice.set(null);
    if (!clubSlug || !description.trim()
      || eventDate < berlinCalendarDate(new Date())
      || eventDate > berlinCalendarDate(new Date(), MAX_UPCOMING_EVENT_DAYS)) {
      this.adminError.set(`Choose a club, add event details, and use a date within the next ${MAX_UPCOMING_EVENT_DAYS} days.`);
      return;
    }
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      await this.supabase.saveEvent({
        club_slug: clubSlug,
        event_date: eventDate,
        description: description.trim(),
        djs: djs.trim() || null,
      });
      this.adminNotice.set('Event saved.');
      await this.loadAdminDashboard();
      await this.loadTodayEventClubs();
      const selected = this.selectedClub();
      if (selected?.id === clubSlug) {
        await this.loadClubData(selected);
      }
    } catch (error) {
      console.error('Unable to save event.', error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async deleteEvent(event: ClubEvent): Promise<void> {
    if (!window.confirm(`Delete the event “${event.description}”?`)) {
      return;
    }
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      await this.supabase.deleteEvent(event.id);
      this.adminNotice.set('Event deleted.');
      await this.loadAdminDashboard();
      await this.loadTodayEventClubs();
    } catch (error) {
      console.error(`Unable to delete event ${event.id}.`, error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async postLiveUpdate(date: string, time: string, message: string, form: HTMLFormElement): Promise<void> {
    this.adminNotice.set(null);
    if (!date || !time || !message.trim()) {
      this.adminError.set('Enter a date, time, and text before publishing the update.');
      return;
    }
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      await this.supabase.createLiveUpdate({
        datum: date,
        uhrzeit: time,
        text: message.trim(),
      });
      form.reset();
      this.adminNotice.set('Live update published.');
      await this.loadAdminDashboard();
      await this.loadPublicLiveUpdate();
    } catch (error) {
      console.error('Unable to publish live update.', error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async deleteLiveUpdate(update: LiveUpdate): Promise<void> {
    if (!window.confirm(`Diesen Live-Update-Eintrag löschen? „${update.text}“`)) {
      return;
    }
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      await this.supabase.deleteLiveUpdate(update);
      this.adminNotice.set('Live update deleted.');
      await this.loadAdminDashboard();
      await this.loadPublicLiveUpdate();
    } catch (error) {
      console.error('Unable to delete live update.', error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected async deleteReport(report: AdminReport): Promise<void> {
    if (!window.confirm(`Remove this report for ${this.adminClubName(report.club_slug)}?`)) {
      return;
    }
    this.adminBusy.set(true);
    this.adminError.set(null);
    this.adminNotice.set(null);
    try {
      await this.supabase.deleteReport(report.id);
      this.adminNotice.set('Report removed.');
      await this.loadAdminDashboard();
    } catch (error) {
      console.error(`Unable to remove report ${report.id}.`, error);
      this.adminError.set(this.getErrorMessage(error));
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected formatLiveUpdateDate(dateValue: string): string {
    const date = new Date(`${dateValue}T12:00:00Z`);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Berlin',
    }).format(date);
  }

  protected formatLiveUpdateTime(timeValue: string): string {
    return timeValue.slice(0, 5);
  }

  protected formatReportTime(timestamp: string): string {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = Date.now() - date.getTime() >= 24 * 60 * 60 * 1000
      ? { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' };
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      ...options,
    }).format(date);
  }

  protected formatTimeAgo(timestamp: string): string {
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} d ago`;
  }

  protected describeReport(report: PublicReport): string {
    const details: string[] = [];
    if (report.wait_minutes !== null) {
      details.push(report.wait_minutes === 0 ? 'No wait' : `${report.wait_minutes} min wait`);
    }
    if (report.entry_chance !== null) {
      details.push(`Entry chance ${report.entry_chance}/10`);
    }
    if (report.mood !== null) {
      details.push(`Vibe ${report.mood}/10`);
    }
    if (report.entry_range) {
      details.push(report.entry_range);
    }
    return details.join(' · ');
  }

  protected formatEventDate(date: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(`${date}T12:00:00Z`));
  }

  protected adminClubName(slug: string): string {
    return this.adminClubs().find((club) => club.slug === slug)?.name ?? slug;
  }

  protected eventDateMinimum(): string {
    return berlinCalendarDate(new Date());
  }

  protected eventDateMaximum(): string {
    return berlinCalendarDate(new Date(), MAX_UPCOMING_EVENT_DAYS);
  }

  protected metricCaption(): string {
    switch (this.clubDataStatus()) {
      case 'loading':
        return 'Loading reports…';
      case 'error':
        return 'Data could not be loaded';
      case 'unconfigured':
        return 'Connect Supabase to see reports';
      case 'ready': {
        const metrics = this.clubMetrics();
        if (!metrics || metrics.source === 'none') return 'No data yet';
        return `${metrics.count} reports for this event`;
      }
      default:
        return 'No data yet';
    }
  }

  private async restoreAdminSession(): Promise<void> {
    if (!this.backendConfigured) {
      return;
    }
    try {
      this.adminUser.set(await this.supabase.getCurrentAdmin());
      if (this.adminUser()) {
        this.adminOpen.set(true);
        await this.loadAdminDashboard();
      }
    } catch (error) {
      console.error('Unable to restore the admin session.', error);
      this.adminError.set(this.getErrorMessage(error));
    }
  }

  private async loadAdminDashboard(): Promise<void> {
    try {
      const [clubs, events, reports, updates, forumReports] = await Promise.all([
        this.supabase.loadClubs(true),
        this.supabase.loadAdminEvents(),
        this.supabase.loadAdminReports(),
        this.supabase.loadLiveUpdates(100),
        this.supabase.loadForumReports(),
      ]);
      this.adminClubs.set(clubs);
      this.adminEvents.set(events);
      this.adminReports.set(reports);
      this.adminLiveUpdates.set(updates);
      this.forumReports.set(forumReports);
      this.clubs.set(clubs.filter((club) => club.is_active).map((club) => ({
        id: club.slug,
        name: club.name,
        district: club.district,
        address: club.address,
        latitude: club.latitude,
        longitude: club.longitude,
        color: club.color,
        is_active: club.is_active,
      })));
      this.refreshClubIcons();
      this.adminError.set(null);
    } catch (error) {
      console.error('Unable to load admin data.', error);
      this.adminError.set(this.getErrorMessage(error));
    }
  }

  private async loadPublicClubs(): Promise<void> {
    if (!this.backendConfigured) {
      return;
    }
    try {
      const clubs = await this.supabase.loadClubs();
      this.clubs.set(clubs.map((club) => ({
        id: club.slug,
        name: club.name,
        district: club.district,
        address: club.address,
        latitude: club.latitude,
        longitude: club.longitude,
        color: club.color,
        is_active: club.is_active,
      })));
      this.refreshClubIcons();
    } catch (error) {
      console.error('Unable to load public clubs.', error);
    }
  }

  private async loadPublicLiveUpdate(): Promise<void> {
    if (!this.backendConfigured) {
      return;
    }
    try {
      this.liveUpdates.set(await this.supabase.loadLiveUpdates());
    } catch (error) {
      console.error('Unable to load the public live update.', error);
    }
  }

  private async loadTodayEventClubs(): Promise<void> {
    if (!this.backendConfigured) {
      return;
    }
    const eventDate = this.currentCalendarDate();
    try {
      const clubsWithEvents = await this.supabase.loadClubSlugsWithEventsOn(eventDate);
      if (this.currentCalendarDate() !== eventDate) {
        return;
      }
      this.clubsWithEventsToday.set(new Set(clubsWithEvents));
      this.refreshClubIcons();
    } catch (error) {
      console.error(`Unable to load clubs with events on ${eventDate}.`, error);
    }
  }

  private async loadForum(clubSlug: string, page = this.forumPage()): Promise<void> {
    if (!this.backendConfigured) {
      this.forumStatus.set('idle');
      return;
    }

    this.forumStatus.set('loading');
    try {
      const result = await this.supabase.loadForumPosts(clubSlug, page, this.forumPageSize);
      if (this.selectedClub()?.id === clubSlug) {
        const pageCount = Math.ceil(result.totalCount / this.forumPageSize);
        const lastPage = Math.max(1, pageCount);
        if (page > lastPage) {
          this.forumPage.set(lastPage);
          await this.loadForum(clubSlug, lastPage);
          return;
        }
        this.forumPage.set(page);
        this.forumTotalCount.set(result.totalCount);
        this.forumPosts.set(result.posts);
        this.forumStatus.set('ready');
      }
    } catch (error) {
      console.error('Unable to load forum posts.', error);
      if (this.selectedClub()?.id === clubSlug) {
        this.forumStatus.set('error');
      }
    }
  }

  private async loadAdminForumReports(): Promise<void> {
    this.forumReports.set(await this.supabase.loadForumReports());
  }

  protected checkForumPolicy(authorName: string, body: string): boolean {
    const notice = getForumPolicyNotice(authorName, body);
    this.forumPolicyNotice.set(notice);
    if (notice) {
      this.forumError.set(null);
      this.forumNotice.set(null);
    }
    return notice !== null;
  }

  private async loadClubData(club: Club): Promise<void> {
    if (!this.backendConfigured) {
      this.clubDataStatus.set('unconfigured');
      return;
    }
    this.clubDataStatus.set('loading');
    const eventDate = this.currentCalendarDate();
    try {
      const events = await this.supabase.loadClubEvents(club.id);
      if (this.selectedClub()?.id !== club.id || this.currentCalendarDate() !== eventDate) {
        return;
      }
      this.clubEvents.set(events);
      const currentEvent = events.find((event) => event.event_date === eventDate);
      const reports = currentEvent
        ? await this.supabase.loadClubReports(club.id, currentEvent.id)
        : [];
      if (this.selectedClub()?.id !== club.id || this.currentCalendarDate() !== eventDate) {
        return;
      }
      this.clubReports.set(reports);
      this.clubMetrics.set(calculateClubMetrics(reports, new Date()));
      this.clubDataStatus.set('ready');
    } catch (error) {
      console.error(`Unable to load public data for ${club.name}.`, error);
      if (this.selectedClub()?.id === club.id) {
        this.clubDataStatus.set('error');
      }
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  private async initializeMap(): Promise<void> {
    const container = this.mapElement?.nativeElement;
    if (!isPlatformBrowser(this.platformId) || !container || this.destroyed) {
      return;
    }

    const leafletModule = await import('leaflet') as typeof import('leaflet') & {
      default?: typeof import('leaflet');
    };
    const leaflet = leafletModule.default ?? leafletModule;
    if (this.destroyed) {
      return;
    }
    this.leaflet = leaflet;
    this.compactLayout = container.clientWidth < 600;

    this.map = leaflet.map(container, {
      center: [52.51, 13.405],
      zoom: 11,
      minZoom: 9,
      maxZoom: 18,
      scrollWheelZoom: false,
    });

    leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    window.addEventListener('resize', this.handleResize);
    this.refreshClubIcons();
  }

  private createClubIcon(
    leaflet: typeof import('leaflet'),
    club: Club,
    selected: boolean,
  ): Leaflet.DivIcon {
    const [offsetX, offsetY] = this.compactLayout
      ? this.compactLabelOffsets.get(club.id) ?? [0, 0]
      : this.labelOffsets.get(club.id) ?? [0, 0];
    const hasEventToday = this.clubsWithEventsToday().has(club.id);
    const color = hasEventToday ? '#4ade80' : '#f87171';
    const name = escapeHtml(club.name);

    return leaflet.divIcon({
      className: 'club-map-icon',
      html: `<svg class="club-map-connector" viewBox="0 0 400 400" aria-hidden="true"><line x1="200" y1="200" x2="${200 + offsetX}" y2="${200 + offsetY}" style="stroke:${color}" /></svg><span class="club-map-anchor" style="--marker-color:${color}"></span><span class="club-map-label${selected ? ' is-selected' : ''}" style="--marker-color:${color};--label-x:${offsetX}px;--label-y:${offsetY}px"><span class="club-map-pin"></span>${name}</span>`,
      iconSize: [1, 1],
      iconAnchor: [0, 0],
    });
  }

  private selectClub(club: Club | null): void {
    if (this.selectedClub()?.id !== club?.id) {
      this.forumDisclaimerAccepted.set(false);
      this.reportOpen.set(false);
      this.historyOpen.set(false);
      this.programOpen.set(false);
      this.reportStatus.set('idle');
      this.reportError.set(null);
      this.reportEventNotice.set(null);
      this.reportDraft.set({
        waitMinutes: null,
        entryRange: null,
        entryChance: null,
        mood: null,
      });
      this.clubMetrics.set(null);
      this.clubReports.set([]);
      this.clubEvents.set([]);
      this.forumPosts.set([]);
      this.openForumReply.set(null);
      this.forumPage.set(1);
      this.forumTotalCount.set(0);
      this.forumError.set(null);
      this.forumNotice.set(null);
      this.forumStatus.set(club ? 'loading' : 'idle');
    }
    this.selectedClub.set(club);
    this.refreshClubIcons();
    if (club) {
      void this.loadClubData(club);
      void this.loadForum(club.id);
    } else {
      this.clubDataStatus.set('idle');
    }
  }

  private updateReportDraft(update: Partial<ReportDraft>): void {
    this.reportDraft.update((draft) => ({ ...draft, ...update }));
    this.reportStatus.set('idle');
    this.reportError.set(null);
  }

  private refreshClubIcons(): void {
    if (!this.leaflet || !this.map) {
      return;
    }

    const activeClubs = this.clubs().filter((club) => club.is_active !== false);
    const activeIds = new Set(activeClubs.map((club) => club.id));
    for (const [id, marker] of this.markers) {
      if (!activeIds.has(id)) {
        marker.removeFrom(this.map);
        this.markers.delete(id);
      }
    }

    if (this.selectedClub() && !activeIds.has(this.selectedClub()!.id)) {
      this.selectedClub.set(null);
      this.clubDataStatus.set('idle');
    }

    for (const club of activeClubs) {
      const marker = this.markers.get(club.id);
      if (marker) {
        marker.setLatLng([club.latitude, club.longitude]);
        marker.setIcon(this.createClubIcon(this.leaflet, club, club.id === this.selectedClub()?.id));
        marker.options.title = club.name;
        marker.options.alt = club.name;
        marker.getElement()?.setAttribute('title', club.name);
      } else {
        const newMarker = this.leaflet.marker([club.latitude, club.longitude], {
          icon: this.createClubIcon(this.leaflet, club, club.id === this.selectedClub()?.id),
          title: club.name,
          alt: club.name,
        }).addTo(this.map);
        newMarker.on('click', () => {
          const currentClub = this.clubs().find((item) => item.id === club.id);
          if (currentClub) {
            this.selectClub(this.selectedClub()?.id === currentClub.id ? null : currentClub);
          }
        });
        this.markers.set(club.id, newMarker);
      }
    }
  }

}
