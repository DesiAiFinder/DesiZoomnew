import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

// ── Posts ─────────────────────────────────────────────────────────────────────
export async function fetchPosts(city: string, type?: string, search?: string) {
  let q = supabase
    .from('posts')
    .select('*')
    .eq('city', city)
    .eq('is_active', true)
    .order('votes_count', { ascending: false })
    .limit(30);

  if (type && type !== 'all') q = q.eq('type', type);
  if (search) q = q.ilike('title', `%${search}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function fetchEvents(city: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('type', 'event')
    .eq('city', city)
    .eq('is_active', true)
    .order('event_date', { ascending: true })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMarketplace(city: string, category?: string) {
  let q = supabase
    .from('posts')
    .select('*')
    .eq('type', 'marketplace')
    .eq('city', city)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (category && category !== 'All') q = q.eq('category', category);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createPost(payload: Record<string, unknown>) {
  const { error } = await supabase.from('posts').insert(payload);
  if (error) throw error;
}

// ── Votes ─────────────────────────────────────────────────────────────────────
export async function toggleVote(postId: string, userId: string, voted: boolean) {
  if (voted) {
    await supabase.from('votes').delete().eq('post_id', postId).eq('user_id', userId);
  } else {
    await supabase.from('votes').insert({ post_id: postId, user_id: userId });
  }
}

// ── Comments ──────────────────────────────────────────────────────────────────
export async function fetchComments(postId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addComment(postId: string, userId: string, body: string) {
  const { error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, body });
  if (error) throw error;
}

// ── Local Info ────────────────────────────────────────────────────────────────
export async function fetchLocalInfo() {
  const { data, error } = await supabase
    .from('local_info')
    .select('*')
    .eq('is_active', true)
    .order('type');
  if (error) throw error;
  return data ?? [];
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function fetchAdminStats() {
  const [usersRes, postsRes] = await Promise.all([
    supabase.from('profiles').select('id, created_at'),
    supabase.from('posts').select('id, created_at'),
  ]);

  const users = usersRes.data ?? [];
  const posts = postsRes.data ?? [];
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    totalUsers: users.length,
    newUsersThisMonth: users.filter((u) => u.created_at > monthAgo).length,
    totalPosts: posts.length,
    postsThisMonth: posts.filter((p) => p.created_at > monthAgo).length,
  };
}

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
