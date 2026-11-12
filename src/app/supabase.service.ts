import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

export interface PublicReport {
  id: string;
  club_slug: string;
  wait_minutes: number | null;
  entry_chance: number | null;
  mood: number | null;
  entry_range: string | null;
  created_at: string;
}

export interface NewReport {
  club_slug: string;
  visitor_id: string;
  wait_minutes: number | null;
  entry_chance: number | null;
  mood: number | null;
  entry_range: string | null;
}

export interface ClubEvent {
  id: string;
  club_slug: string;
  event_date: string;
  description: string;
  djs: string | null;
}

export interface ManagedClub {
  slug: string;
  name: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  color: string;
  is_active: boolean;
}

export interface LiveUpdate {
  datum: string;
  uhrzeit: string;
  text: string;
}

export interface ForumComment {
  id: string;
  post_id: string;
  author_name: string;
  body: string;
  created_at: string;
  like_count: number;
  liked_by_visitor: boolean;
}

export interface ForumPost {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
  comments: ForumComment[];
  like_count: number;
  liked_by_visitor: boolean;
}

export interface ForumPostPage {
  posts: ForumPost[];
  totalCount: number;
}

export interface ForumReport {
  id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  target_author: string;
  target_text: string;
  reason: string;
  created_at: string;
}

export type AdminReport = PublicReport;

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private clientPromise?: Promise<SupabaseClient>;
  readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = Boolean(environment.supabaseUrl && environment.supabaseAnonKey);
  }

  async loadClubReports(clubSlug: string): Promise<PublicReport[]> {
    const client = await this.requireClient();
    const { data, error } = await client
      .from('public_reports')
      .select('id, club_slug, wait_minutes, entry_chance, mood, entry_range, created_at')
      .eq('club_slug', clubSlug)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async loadClubEvents(clubSlug: string): Promise<ClubEvent[]> {
    const client = await this.requireClient();
    const { data, error } = await client
      .from('events')
      .select('id, club_slug, event_date, description, djs')
      .eq('club_slug', clubSlug)
      .order('event_date', { ascending: true })
      .limit(32);

    if (error) {
      throw error;
    }

    return data ?? [];
  }

  async loadClubs(includeInactive = false): Promise<ManagedClub[]> {
    const client = await this.requireClient();
    let query = client
      .from('clubs')
      .select('slug, name, district, address, latitude, longitude, color, is_active')
      .order('name');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async loadLiveUpdates(limit = 1): Promise<LiveUpdate[]> {
    const client = await this.requireClient();
    const { data, error } = await client
      .from('live_updates')
      .select('datum, uhrzeit, text')
      .order('datum', { ascending: false })
      .order('uhrzeit', { ascending: false })
      .limit(limit);
    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async loadAdminReports(): Promise<AdminReport[]> {
    const client = await this.requireClient();
    const { data, error } = await client
      .from('reports')
      .select('id, club_slug, wait_minutes, entry_chance, mood, entry_range, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async loadAdminEvents(): Promise<ClubEvent[]> {
    const client = await this.requireClient();
    const { data, error } = await client
      .from('events')
      .select('id, club_slug, event_date, description, djs')
      .order('event_date', { ascending: true })
      .limit(100);
    if (error) {
      throw error;
    }
    return data ?? [];
  }

  async saveClub(club: ManagedClub): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.from('clubs').upsert(club, { onConflict: 'slug' });
    if (error) {
      throw error;
    }
  }

  async setClubActive(slug: string, isActive: boolean): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.from('clubs').update({ is_active: isActive }).eq('slug', slug);
    if (error) {
      throw error;
    }
  }

  async saveEvent(event: Pick<ClubEvent, 'club_slug' | 'event_date' | 'description' | 'djs'>): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.from('events').upsert(event, { onConflict: 'club_slug,event_date' });
    if (error) {
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.from('events').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }

  async createLiveUpdate(update: LiveUpdate): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.from('live_updates').insert(update);
    if (error) {
      throw error;
    }
  }

  async deleteLiveUpdate(update: LiveUpdate): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client
      .from('live_updates')
      .delete()
      .eq('datum', update.datum)
      .eq('uhrzeit', update.uhrzeit)
      .eq('text', update.text);
    if (error) {
      throw error;
    }
  }

  async deleteReport(id: string): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.from('reports').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }

  async submitReport(report: NewReport): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client
      .from('reports')
      .insert(report);

    if (error) {
      throw error;
    }
  }

  async loadForumPosts(clubSlug: string, page: number, pageSize: number): Promise<ForumPostPage> {
    const client = await this.requireClient();
    const visitorId = this.getVisitorId();
    const start = (page - 1) * pageSize;
    const { data: posts, count, error: postsError } = await client
      .from('forum_posts')
      .select('id, author_name, body, created_at', { count: 'exact' })
      .eq('club_slug', clubSlug)
      .order('created_at', { ascending: false })
      .range(start, start + pageSize - 1);
    if (postsError) {
      throw postsError;
    }

    const postRows = posts ?? [];
    if (!postRows.length) {
      return { posts: [], totalCount: count ?? 0 };
    }
    const postIds = postRows.map((post) => post.id);
    const [commentsResult, likesResult] = await Promise.all([
      client
        .from('forum_comments')
        .select('id, post_id, author_name, body, created_at')
        .in('post_id', postIds)
        .order('created_at', { ascending: true }),
      client.rpc('get_forum_post_likes', { post_ids: postIds, viewer_id: visitorId }),
    ]);
    if (commentsResult.error) {
      throw commentsResult.error;
    }
    if (likesResult.error) {
      throw likesResult.error;
    }

    const commentsByPost = new Map<string, ForumComment[]>();
    for (const comment of commentsResult.data ?? []) {
      const comments = commentsByPost.get(comment.post_id) ?? [];
      comments.push({
        ...comment,
        like_count: 0,
        liked_by_visitor: false,
      });
      commentsByPost.set(comment.post_id, comments);
    }
    const likesByPost = new Map<string, { like_count: number; liked_by_viewer: boolean }>();
    for (const like of likesResult.data ?? []) {
      likesByPost.set(like.post_id, {
        like_count: like.like_count,
        liked_by_viewer: like.liked_by_viewer,
      });
    }

    const commentRows = commentsResult.data ?? [];
    const commentLikeResult = commentRows.length
      ? await client.rpc('get_forum_comment_likes', {
        comment_ids: commentRows.map((comment) => comment.id),
        viewer_id: visitorId,
      })
      : { data: [], error: null };
    if (commentLikeResult.error) {
      throw commentLikeResult.error;
    }

    const likesByComment = new Map<string, { like_count: number; liked_by_viewer: boolean }>();
    for (const like of commentLikeResult.data ?? []) {
      likesByComment.set(like.comment_id, {
        like_count: like.like_count,
        liked_by_viewer: like.liked_by_viewer,
      });
    }

    const forumPosts = postRows.map((post) => {
      const likes = likesByPost.get(post.id);
      const comments = (commentsByPost.get(post.id) ?? []).map((comment) => {
        const commentLikes = likesByComment.get(comment.id);
        return {
          ...comment,
          like_count: commentLikes?.like_count ?? 0,
          liked_by_visitor: commentLikes?.liked_by_viewer ?? false,
        };
      });
      return {
        ...post,
        comments,
        like_count: likes?.like_count ?? 0,
        liked_by_visitor: likes?.liked_by_viewer ?? false,
      };
    });
    return { posts: forumPosts, totalCount: count ?? 0 };
  }

  async createForumPost(clubSlug: string, authorName: string, body: string): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.from('forum_posts').insert({
      club_slug: clubSlug,
      author_name: authorName,
      body,
      visitor_id: this.getVisitorId(),
    });
    if (error) {
      throw error;
    }
  }

  async createForumComment(postId: string, authorName: string, body: string): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.from('forum_comments').insert({
      post_id: postId,
      author_name: authorName,
      body,
      visitor_id: this.getVisitorId(),
    });
    if (error) {
      throw error;
    }
  }

  async setForumLike(postId: string, liked: boolean): Promise<void> {
    const client = await this.requireClient();
    const query = client.from('forum_likes');
    const result = liked
      ? await query.insert({ post_id: postId, visitor_id: this.getVisitorId() })
      : await query.delete().eq('post_id', postId).eq('visitor_id', this.getVisitorId());
    if (result.error) {
      throw result.error;
    }
  }

  async setForumCommentLike(commentId: string, liked: boolean): Promise<void> {
    const client = await this.requireClient();
    const visitorId = this.getVisitorId();
    const query = client.from('forum_comment_likes');
    const result = liked
      ? await query.insert({ comment_id: commentId, visitor_id: visitorId })
      : await query.delete().eq('comment_id', commentId).eq('visitor_id', visitorId);
    if (result.error) {
      throw result.error;
    }
  }

  async reportForumTarget(targetType: 'post' | 'comment', targetId: string, reason: string): Promise<void> {
    const client = await this.requireClient();
    const target = targetType === 'post' ? { post_id: targetId } : { comment_id: targetId };
    const { error } = await client.from('forum_reports').insert({ ...target, reason });
    if (error) {
      throw error;
    }
  }

  async loadForumReports(): Promise<ForumReport[]> {
    const client = await this.requireClient();
    const { data, error } = await client
      .from('forum_reports')
      .select('id, post_id, comment_id, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      throw error;
    }

    const reports = data ?? [];
    const postIds = [...new Set(reports.map((report) => report.post_id).filter((id): id is string => Boolean(id)))];
    const commentIds = [...new Set(reports.map((report) => report.comment_id).filter((id): id is string => Boolean(id)))];
    const postContent = new Map<string, { author_name: string; body: string }>();
    const commentContent = new Map<string, { author_name: string; body: string }>();
    if (postIds.length) {
      const { data: posts, error: postsError } = await client
        .from('forum_posts')
        .select('id, author_name, body')
        .in('id', postIds);
      if (postsError) {
        throw postsError;
      }
      for (const post of posts ?? []) {
        postContent.set(post.id, { author_name: post.author_name, body: post.body });
      }
    }
    if (commentIds.length) {
      const { data: comments, error: commentsError } = await client
        .from('forum_comments')
        .select('id, author_name, body')
        .in('id', commentIds);
      if (commentsError) {
        throw commentsError;
      }
      for (const comment of comments ?? []) {
        commentContent.set(comment.id, { author_name: comment.author_name, body: comment.body });
      }
    }

    return reports.map((report) => {
      const targetId = report.post_id ?? report.comment_id;
      if (!targetId) {
        throw new Error(`Forum report ${report.id} has no target.`);
      }
      const content = (report.post_id ? postContent : commentContent).get(targetId);
      return {
        id: report.id,
        target_type: report.post_id ? 'post' as const : 'comment' as const,
        target_id: targetId,
        target_author: content?.author_name ?? 'Unknown author',
        target_text: content?.body ?? 'Content unavailable',
        reason: report.reason,
        created_at: report.created_at,
      };
    });
  }

  async deleteForumTarget(report: ForumReport): Promise<void> {
    const client = await this.requireClient();
    const result = report.target_type === 'post'
      ? await client.from('forum_posts').delete().eq('id', report.target_id)
      : await client.from('forum_comments').delete().eq('id', report.target_id);
    const { error } = result;
    if (error) {
      throw error;
    }
  }

  async dismissForumReport(reportId: string): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.from('forum_reports').delete().eq('id', reportId);
    if (error) {
      throw error;
    }
  }

  getVisitorId(): string {
    if (!this.browser) {
      throw new Error('Reports can only be submitted from a browser.');
    }

    const key = 'queue-berlin-visitor-id';
    const existing = window.localStorage.getItem(key);
    if (existing) {
      return existing;
    }

    const visitorId = window.crypto.randomUUID();
    window.localStorage.setItem(key, visitorId);
    return visitorId;
  }

  async getCurrentAdmin(): Promise<User | null> {
    const client = await this.requireClient();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) {
      throw sessionError;
    }
    if (!sessionData.session) {
      return null;
    }

    const { data, error } = await client.auth.getUser();
    if (error) {
      throw error;
    }
    if (!data.user) {
      return null;
    }

    const admin = await this.requireAdminRole(client, data.user);
    if (!admin) {
      await client.auth.signOut();
      return null;
    }

    return admin;
  }

  async signInAdmin(email: string, password: string): Promise<User> {
    const client = await this.requireClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    if (!data.user) {
      throw new Error('Sign-in completed without a user account.');
    }

    let admin: User | null;
    try {
      admin = await this.requireAdminRole(client, data.user);
    } catch (error) {
      await client.auth.signOut();
      throw error;
    }
    if (!admin) {
      await client.auth.signOut();
      throw new Error('This account does not have Queue Berlin admin access.');
    }
    return admin;
  }

  async signOutAdmin(): Promise<void> {
    const client = await this.requireClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
  }

  private async requireAdminRole(client: SupabaseClient, user: User): Promise<User | null> {
    const { data, error } = await client
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? user : null;
  }

  private requireClient(): Promise<SupabaseClient> {
    if (!this.browser || !this.isConfigured) {
      throw new Error('Supabase is not configured. Add the project URL and publishable key first.');
    }

    this.clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }),
    );
    return this.clientPromise;
  }
}
