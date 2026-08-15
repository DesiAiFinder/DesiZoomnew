import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { geocodeCity, milesBetween } from './geo';

const SUPABASE_URL = env.supabaseUrl || 'https://placeholder.supabase.co';
const SUPABASE_KEY = env.supabaseAnonKey || 'placeholder-anon-key';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Normalize a city arg that may be a single city or a list of nearby cities.
const cityList = (city: string | string[]): string[] => (Array.isArray(city) ? city : [city]);

// ── Area / radius ───────────────────────────────────────────────────────────
// Cities (from real listings) within `radius` miles of the selected city.
const _nearbyCache: Record<string, string[]> = {};
export async function fetchNearbyCities(centerCity: string, radius: number): Promise<string[]> {
  if (!centerCity || radius <= 0) return [centerCity];
  const key = `${centerCity}|${radius}`;
  if (_nearbyCache[key]) return _nearbyCache[key];
  const center = await geocodeCity(centerCity);
  if (!center) return [centerCity];

  const [p, r] = await Promise.all([
    supabase.from('posts').select('city').limit(3000),
    supabase.from('restaurants').select('city').limit(1000),
  ]);
  const candidates = new Set<string>([centerCity]);
  (p.data ?? []).forEach((x: { city?: string }) => x.city && candidates.add(x.city));
  (r.data ?? []).forEach((x: { city?: string }) => x.city && candidates.add(x.city));

  const near: string[] = [centerCity];
  for (const c of candidates) {
    if (c === centerCity) continue;
    const ll = await geocodeCity(c);
    if (ll && milesBetween(center, ll) <= radius) near.push(c);
  }
  _nearbyCache[key] = near;
  return near;
}

// ── Posts ─────────────────────────────────────────────────────────────────────
// Sort: sponsored first, then active boosts, then by votes/recency
function promotedSort<T extends { is_sponsored?: boolean; boosted_until?: string }>(rows: T[]): T[] {
  const now = Date.now();
  const rank = (p: T) =>
    (p.is_sponsored ? 2 : 0) +
    (p.boosted_until && new Date(p.boosted_until).getTime() > now ? 1 : 0);
  return [...rows].sort((a, b) => rank(b) - rank(a));
}

// Posts carry their business byline when the author owns one (migration_post_business.sql).
// `business:businesses(...)` is a left join — posts by individuals simply get null.
const POST_SELECT = '*, business:businesses(id,name,logo_url,business_type)';

export async function fetchPosts(city: string | string[], type?: string, search?: string) {
  let q = supabase
    .from('posts')
    .select(POST_SELECT)
    .in('city', cityList(city))
    .eq('is_active', true)
    .order('votes_count', { ascending: false });
  if (type) q = q.eq('type', type);
  if (search) q = q.ilike('title', `%${search}%`);
  const { data } = await q;
  return promotedSort(data ?? []);
}

// Unified "For You" feed — all active posts for a city, promoted first, newest next
export async function fetchForYou(city: string | string[], type?: string) {
  let q = supabase
    .from('posts')
    .select(POST_SELECT)
    .in('city', cityList(city))
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(40);
  if (type) q = q.eq('type', type);
  const { data } = await q;
  return promotedSort(data ?? []);
}

export async function fetchPostById(id: string) {
  const { data } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

export async function fetchEvents(city: string | string[]) {
  const { data } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .in('city', cityList(city))
    .eq('type', 'event')
    .eq('is_active', true)
    .order('event_date', { ascending: true })
    .limit(5);
  return data ?? [];
}

export async function fetchMarketplace(city: string | string[], category?: string) {
  let q = supabase
    .from('posts')
    .select(POST_SELECT)
    .in('city', cityList(city))
    .eq('type', 'marketplace')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (category) q = q.eq('category', category);
  const { data } = await q;
  return promotedSort(data ?? []);
}

// "Your city today" — live snapshot for the home hero cards.
export async function fetchCityToday(city: string | string[]) {
  const cities = cityList(city);
  const state = cities[0]?.split(',')[1]?.trim();
  const [live, evs, rests, deals] = await Promise.all([
    supabase.from('live_streams').select('id,title,city,audience')
      .eq('status', 'approved')
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('posts').select('id,title,event_date')
      .in('city', cities).eq('type', 'event').eq('is_active', true)
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true }).limit(5),
    supabase.from('restaurants').select('id,name,is_open')
      .eq('is_active', true).eq('is_open', true)
      .ilike('city', state ? `%, ${state}` : cities[0]).limit(10),
    supabase.from('posts').select('id,title')
      .in('city', cities).eq('type', 'deal').eq('is_active', true)
      .order('created_at', { ascending: false }).limit(5),
  ]);
  return {
    live: (live.data ?? []) as { id: string; title: string }[],
    events: (evs.data ?? []) as { id: string; title: string; event_date?: string }[],
    restaurants: (rests.data ?? []) as { id: string; name: string }[],
    deals: (deals.data ?? []) as { id: string; title: string }[],
  };
}

/**
 * The business this user owns, if any. `businesses` has a unique index on
 * owner_id, so this is at most one row. Used to attribute their posts.
 */
export async function fetchMyBusiness(userId: string) {
  const { data } = await supabase
    .from('businesses')
    .select('id, name, logo_url, business_type')
    .eq('owner_id', userId)
    .maybeSingle();
  return data as { id: string; name: string; logo_url?: string; business_type?: string } | null;
}

/**
 * Where a business's CTA should send people to transact. Deep-links by
 * business id so the destination opens that business directly rather than a
 * list — both pages fall back to the list if the id isn't in the current city.
 */
export function businessLink(businessType?: string, businessId?: string): string {
  const base = businessType === 'restaurant' || businessType === 'grocery' ? '/order' : '/services';
  return businessId ? `${base}?business=${businessId}` : base;
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
    // public_profiles, not profiles: the base table is own-row-or-admin so that
    // email / stripe_account_id aren't world-readable. See
    // migration_fix_profile_exposure.sql.
    supabase.from('public_profiles').select('display_name, created_at').eq('id', sellerId).maybeSingle(),
    supabase.from('seller_stats').select('completed_sales').eq('seller_id', sellerId).maybeSingle(),
  ]);
  return {
    name: profile?.display_name || 'DesiZoom member',
    memberSince: profile?.created_at,
    completedSales: stats?.completed_sales ?? 0,
  };
}

// ── Local Info ────────────────────────────────────────────────────────────────
/**
 * Curated civic info for a city, plus anything marked as applying everywhere
 * (city is null — 911, national hotlines).
 *
 * Throws on failure instead of returning []. The previous version discarded
 * `error`, so when this queried a `city` column that didn't exist the page
 * showed "No curated entries yet" forever and nobody knew why. An empty result
 * and a broken query must not look the same.
 */
export async function fetchLocalInfo(city: string) {
  const { data, error } = await supabase
    .from('local_info')
    .select('*')
    // The value MUST be quoted: PostgREST splits or() on commas, and every
    // city here is "Little Elm, TX" — unquoted it parses as two conditions.
    .or(`city.eq."${city.replace(/"/g, '')}",city.is.null`)
    .eq('is_active', true)
    .order('type');
  if (error) throw error;
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

// ── User's own content (profile page) ─────────────────────────────────────────
export async function fetchMyPosts(userId: string) {
  const { data } = await supabase
    .from('posts')
    .select(POST_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function updateMyPost(postId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from('posts').update(patch).eq('id', postId);
  if (error) throw error;
}

export async function deleteMyPost(postId: string) {
  const { error } = await supabase.from('posts').update({ is_active: false }).eq('id', postId);
  if (error) throw error;
}

export async function fetchMyPurchases(userId: string) {
  const { data } = await supabase
    .from('payments')
    .select('*, post:posts(title, image_urls)')
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function fetchMySales(userId: string) {
  const { data } = await supabase
    .from('payments')
    .select('*, post:posts(title)')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

// ── Tickets ───────────────────────────────────────────────────────────────────
export async function fetchMyTickets(userId: string) {
  const { data } = await supabase
    .from('tickets')
    .select('*, event:posts(title, event_date, venue, city)')
    .eq('buyer_id', userId)
    .eq('status', 'paid')
    .order('created_at', { ascending: false });
  return data ?? [];
}

// ── Favorites ─────────────────────────────────────────────────────────────────
export async function toggleFavorite(userId: string, postId: string, saved: boolean) {
  if (saved) {
    await supabase.from('favorites').delete().eq('user_id', userId).eq('post_id', postId);
  } else {
    await supabase.from('favorites').insert({ user_id: userId, post_id: postId });
  }
}

export async function fetchFavoriteIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('favorites').select('post_id').eq('user_id', userId);
  return new Set((data ?? []).map((f) => f.post_id));
}

export async function fetchFavoritePosts(userId: string) {
  const { data } = await supabase
    .from('favorites')
    .select('post:posts(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((f) => f.post).filter(Boolean);
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export async function fetchMyAlerts(userId: string) {
  const { data } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createAlert(userId: string, city: string, keyword: string | null, postType: string | null) {
  const { error } = await supabase.from('alerts').insert({ user_id: userId, city, keyword, post_type: postType });
  if (error) throw error;
}

export async function deleteAlert(alertId: string) {
  await supabase.from('alerts').delete().eq('id', alertId);
}

// ── Reviews ───────────────────────────────────────────────────────────────────
export async function submitReview(payload: {
  booking_id: string; offering_id?: string; provider_user_id: string;
  reviewer_id: string; rating: number; comment?: string;
}) {
  const { error } = await supabase.from('reviews').insert(payload);
  if (error) throw error;
}

export async function fetchProviderRating(providerUserId: string) {
  const { data } = await supabase
    .from('provider_ratings')
    .select('avg_rating, review_count')
    .eq('provider_user_id', providerUserId)
    .maybeSingle();
  return data as { avg_rating: number; review_count: number } | null;
}

export async function fetchReviewedBookingIds(reviewerId: string) {
  const { data } = await supabase
    .from('reviews')
    .select('booking_id')
    .eq('reviewer_id', reviewerId);
  return new Set((data ?? []).map((r) => r.booking_id));
}

// ── Admin: post moderation ────────────────────────────────────────────────────
export async function adminFetchAllPosts() {
  const { data } = await supabase
    .from('posts')
    .select(POST_SELECT)
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
/**
 * Everything the Money tab needs: what came in, what went to merchants, what
 * we kept, and what is owed to a tax authority.
 *
 * Stripe's processing fee isn't stored anywhere, so it's estimated at
 * 2.9% + 30c per completed transaction. That's the published US card rate and
 * it's what these destination charges cost us — but it is an estimate, and the
 * UI says so. Stripe's own dashboard is the source of truth for the exact
 * figure at month end.
 */
export async function adminFetchFinance() {
  const [{ data: pays }, { data: ords }, { data: juris }] = await Promise.all([
    supabase.from('payments')
      .select('id, amount_cents, commission_cents, status, kind, created_at, stripe_session_id, post:posts(title)')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('orders')
      .select('id, tax_cents, tax_jurisdiction, tax_remitted_by, subtotal_cents, service_fee_cents, commission_cents, delivery_fee_cents, status, created_at, customer_name, restaurant:restaurants(name)')
      .neq('status', 'pending')
      .limit(5000),
    supabase.from('tax_jurisdictions').select('code, name, we_remit, registered, accepting'),
  ]);
  return {
    payments: (pays ?? []) as PaymentRow[],
    orders: (ords ?? []) as OrderTaxRow[],
    jurisdictions: (juris ?? []) as Jurisdiction[],
  };
}

export interface PaymentRow {
  id: string;
  amount_cents: number; commission_cents: number | null;
  status: string; kind: string | null; created_at: string;
  stripe_session_id?: string | null;
  post?: { title?: string } | null;
}
export interface OrderTaxRow {
  id: string;
  tax_cents: number | null; tax_jurisdiction: string | null;
  tax_remitted_by: string | null; subtotal_cents: number;
  service_fee_cents: number | null; commission_cents: number | null;
  delivery_fee_cents: number | null;
  status: string; created_at: string;
  customer_name?: string | null;
  restaurant?: { name?: string } | null;
}
export interface Jurisdiction {
  code: string; name: string; we_remit: boolean; registered: boolean; accepting: boolean;
}

export async function adminFetchPayments() {
  const { data } = await supabase
    .from('payments')
    .select('*, post:posts(title)')
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

// ── Refunds ───────────────────────────────────────────────────────────────────
/** Refund a payment by its Stripe checkout session id. Admin or seller only. */
export async function refundPayment(sessionId: string, reason?: string) {
  const { data, error } = await supabase.functions.invoke('refund-payment', {
    body: { session_id: sessionId, reason },
  });
  if (error || data?.error) throw new Error(data?.error || error?.message || 'Refund failed');
  return data as { ok: true; refund_id: string; amount_cents: number };
}

// ── Admin: restaurants ────────────────────────────────────────────────────────
export async function adminFetchRestaurants() {
  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}
export async function adminSetRestaurantActive(id: string, active: boolean) {
  await supabase.from('restaurants').update({ is_active: active }).eq('id', id);
}
export async function adminDeleteRestaurant(id: string) {
  // menu_items and orders cascade via FK on delete
  const { error } = await supabase.from('restaurants').delete().eq('id', id);
  if (error) throw error;
}
export async function adminDeleteStream(id: string) {
  const { error } = await supabase.from('live_streams').delete().eq('id', id);
  if (error) throw error;
}
export async function adminDeleteNews(id: string) {
  const { error } = await supabase.from('news_items').delete().eq('id', id);
  if (error) throw error;
}

// ── Admin: food orders ────────────────────────────────────────────────────────
export async function adminFetchOrders() {
  const { data } = await supabase
    .from('orders')
    .select('*, restaurant:restaurants(name)')
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

// ── Admin: organizations ──────────────────────────────────────────────────────
export async function adminFetchOrgs() {
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .order('city', { ascending: true })
    .order('name', { ascending: true });
  return data ?? [];
}
export async function adminSaveOrg(payload: Record<string, unknown>) {
  if (payload.id) {
    const { id, ...rest } = payload;
    const { error } = await supabase.from('organizations').update(rest).eq('id', id as string);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('organizations').insert(payload);
    if (error) throw error;
  }
}
export async function adminSetOrgActive(id: string, active: boolean) {
  await supabase.from('organizations').update({ is_active: active }).eq('id', id);
}
export async function adminDeleteOrg(id: string) {
  await supabase.from('organizations').delete().eq('id', id);
}
