import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const SUPABASE_URL = env.supabaseUrl || 'https://placeholder.supabase.co';
const SUPABASE_KEY = env.supabaseAnonKey || 'placeholder-anon-key';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Posts ─────────────────────────────────────────────────────────────────────
// Sort: sponsored first, then active boosts, then by votes/recency
function promotedSort<T extends { is_sponsored?: boolean; boosted_until?: string }>(rows: T[]): T[] {
  const now = Date.now();
  const rank = (p: T) =>
    (p.is_sponsored ? 2 : 0) +
    (p.boosted_until && new Date(p.boosted_until).getTime() > now ? 1 : 0);
  return [...rows].sort((a, b) => rank(b) - rank(a));
}

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
  return promotedSort(data ?? []);
}

export async function fetchPostById(id: string) {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  return data;
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
  return promotedSort(data ?? []);
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

// ── Messaging ─────────────────────────────────────────────────────────────────
// Start (or reuse) a conversation about a post
export async function startConversation(postId: string, buyerId: string, sellerId: string) {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('post_id', postId)
    .eq('buyer_id', buyerId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ post_id: postId, buyer_id: buyerId, seller_id: sellerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchConversations(userId: string) {
  const { data } = await supabase
    .from('conversations')
    .select('*, post:posts(title, image_urls)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function fetchMessages(conversationId: string) {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (error) throw error;
}

export async function markMessagesRead(conversationId: string, userId: string) {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId);
}

export async function countUnreadMessages(userId: string): Promise<number> {
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  if (!convs?.length) return 0;
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', convs.map((c) => c.id))
    .eq('read', false)
    .neq('sender_id', userId);
  return count ?? 0;
}

// ── Seller stats (trust signals) ──────────────────────────────────────────────
export async function fetchSellerStats(sellerId: string) {
  const [{ data: profile }, { data: stats }] = await Promise.all([
    supabase.from('profiles').select('display_name, created_at').eq('id', sellerId).maybeSingle(),
    supabase.from('seller_stats').select('completed_sales').eq('seller_id', sellerId).maybeSingle(),
  ]);
  return {
    name: profile?.display_name || 'DesiZoom member',
    memberSince: profile?.created_at,
    completedSales: stats?.completed_sales ?? 0,
  };
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

// ── Admin: post moderation ────────────────────────────────────────────────────
export async function adminFetchAllPosts() {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

export async function adminSetPostActive(postId: string, active: boolean) {
  const { error } = await supabase.from('posts').update({ is_active: active }).eq('id', postId);
  if (error) throw error;
}

export async function adminSetSponsored(postId: string, sponsored: boolean) {
  const { error } = await supabase.from('posts').update({ is_sponsored: sponsored }).eq('id', postId);
  if (error) throw error;
}

export async function adminDeletePost(postId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

// ── Admin: reports ────────────────────────────────────────────────────────────
export async function reportPost(postId: string, reporterId: string, reason: string, details?: string) {
  const { error } = await supabase
    .from('reports')
    .insert({ post_id: postId, reporter_id: reporterId, reason, details: details || null });
  if (error) throw error;
}

export async function adminFetchReports(status = 'open') {
  const { data } = await supabase
    .from('reports')
    .select('*, post:posts(id, title, type, city, is_active, user_id)')
    .eq('status', status)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function adminResolveReport(reportId: string, status: 'resolved' | 'dismissed') {
  const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
  if (error) throw error;
}

// ── Admin: live streams ───────────────────────────────────────────────────────
export async function adminFetchStreams() {
  const { data } = await supabase
    .from('live_streams')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function adminSetStreamStatus(streamId: string, status: 'approved' | 'rejected' | 'ended') {
  const patch: Record<string, unknown> = { status };
  if (status === 'ended') patch.ended_at = new Date().toISOString();
  const { error } = await supabase.from('live_streams').update(patch).eq('id', streamId);
  if (error) throw error;
}

// ── Admin: revenue ────────────────────────────────────────────────────────────
export async function adminFetchPayments() {
  const { data } = await supabase
    .from('payments')
    .select('*, post:posts(title)')
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}
