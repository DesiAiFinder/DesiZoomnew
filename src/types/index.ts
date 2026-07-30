// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: { display_name?: string; avatar_url?: string };
  app_metadata?: { role?: 'admin' | 'service_provider' };
}

// ── Posts (community UGC) ─────────────────────────────────────────────────────
export type PostType = 'deal' | 'marketplace' | 'roommate' | 'event' | 'question';

export interface Post {
  id: string;
  user_id: string;
  type: PostType;
  title: string;
  description?: string;
  city: string;
  price?: string;
  price_cents?: number;       // marketplace: item price in cents for Stripe
  image_urls?: string[];      // uploaded photos (Supabase Storage public URLs)
  discount?: string;
  category?: string;
  votes_count: number;
  details?: Record<string, unknown>;
  event_date?: string;
  is_active: boolean;
  is_sold?: boolean;          // marketplace: true after buyer completes payment
  stripe_account_id?: string; // seller's connected Stripe account
  is_sponsored?: boolean;     // admin-set: pinned sponsored post
  boosted_until?: string;     // paid boost active until this timestamp
  ticket_price_cents?: number; // event: paid ticket price (null = free)
  tickets_total?: number;
  tickets_sold?: number;
  venue?: string;
  business_id?: string;       // set when the poster owns a business
  business?: PostBusiness;    // joined; drives the byline and "View business" CTA
  created_at: string;
  updated_at: string;
}

/** The slice of `businesses` a post needs to show its byline. */
export interface PostBusiness {
  id: string;
  name: string;
  logo_url?: string;
  business_type?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

// ── Messaging ─────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  post_id?: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  post?: Pick<Post, 'title' | 'image_urls'>;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

// ── Business search (Google Places) ──────────────────────────────────────────
export type BusinessCategory =
  | 'grocery'
  | 'restaurant'
  | 'temple'
  | 'travel'
  | 'services'
  | 'other';

export interface Business {
  id: string;
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  priceLevel?: number;
  photos?: string[];
  types: string[];
  distance?: number;
  businessStatus?: string;
  category: BusinessCategory;
  isOpen?: boolean;
}

// ── Events ────────────────────────────────────────────────────────────────────
export type EventCategory =
  | 'cultural'
  | 'religious'
  | 'social'
  | 'business'
  | 'educational'
  | 'other';

// ── Local Info ────────────────────────────────────────────────────────────────
export type LocalInfoType =
  | 'utility'
  | 'emergency'
  | 'government'
  | 'trash_recycling'
  | 'city_info';

export interface LocalInfo {
  id: string;
  type: LocalInfoType;
  name: string;
  description?: string;
  phone?: string;
  website?: string;
  address?: string;
  subtype?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

// ── Weather ───────────────────────────────────────────────────────────────────
export interface WeatherData {
  city: string;
  temp: number;
  feels_like: number;
  description: string;
  icon: string;
  humidity: number;
  wind_speed: number;
}

// ── News ──────────────────────────────────────────────────────────────────────
export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  published_at: string;
  description?: string;
  image_url?: string;
}

// ── Radio ─────────────────────────────────────────────────────────────────────
export interface RadioStation {
  name: string;
  lang: string;
  src: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export interface AdminStats {
  totalUsers: number;
  newUsersThisMonth: number;
  totalPosts: number;
  postsThisMonth: number;
}

// ── Location ──────────────────────────────────────────────────────────────────
export interface Location {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
}

// ── Search filters ────────────────────────────────────────────────────────────
export interface SearchFilters {
  category?: BusinessCategory;
  radius?: number;
  rating?: number;
  openNow?: boolean;
}
