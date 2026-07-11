import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const SUPABASE_URL = env.supabaseUrl || 'https://placeholder.supabase.co';
const SUPABASE_KEY = env.supabaseAnonKey || 'placeholder-anon-key';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Posts ─────────────────────────────────────────────────────────────────────
export async function fetchPosts(city: string, type?: string, search?: string) {
  let q = supabase
    .from('posts')
    .select('*')
    .eq('city', city)
    .eq('is_active', true)
    .order('votes_count', { ascending: false });
  if (type) q = q.eq('type', type);
  if (search) q = q.ilike('title', `%${search}%`);
  const { data } = await q;
  return data ?? [];
}

export async function fetchEvents(city: string) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('city', city)
    .eq('type', 'event')
    .eq('is_active', true)
    .order('event_date', { ascending: true })
    .limit(5);
  return data ?? [];
}

export async function fetchMarketplace(city: string, category?: string) {
  let q = supabase
    .from('posts')
    .select('*')
    .eq('city', city)
    .eq('type', 'marketplace')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (category) q = q.eq('category', category);
  const { data } = await q;
  return data ?? [];
}

export async function createPost(payload: Record<string, unknown>) {
  const { data, error } = await supabase.from('posts').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ── Votes ─────────────────────────────────────────────────────────────────────
export async function toggleVote(postId: string, userId: string, currentlyVoted: boolean) {
  if (currentlyVoted) {
    await supabase.from('votes').delete().eq('post_id', postId).eq('user_id', userId);
  } else {
    await supabase.from('votes').insert({ post_id: postId, user_id: userId });
  }
}

// ── Comments ──────────────────────────────────────────────────────────────────
export async function fetchComments(postId: string) {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function addComment(postId: string, userId: string, body: string) {
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: userId, body });
  if (error) throw error;
}

// ── Local Info ────────────────────────────────────────────────────────────────
export async function fetchLocalInfo(city: string) {
  const { data } = await supabase
    .from('local_info')
    .select('*')
    .eq('city', city)
    .eq('is_active', true)
    .order('type');
  return data ?? [];
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function fetchAdminStats() {
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: posts }, { data: users }] = await Promise.all([
    supabase.from('posts').select('created_at').eq('is_active', true),
    supabase.from('profiles').select('created_at'),
  ]);
  return {
    totalUsers: users?.length ?? 0,
    newUsersThisMonth: users?.filter((u) => u.created_at > monthAgo).length ?? 0,
    totalPosts: posts?.length ?? 0,
    postsThisMonth: posts?.filter((p) => p.created_at > monthAgo).length ?? 0,
  };
}

export async function fetchAllUsers() {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}
