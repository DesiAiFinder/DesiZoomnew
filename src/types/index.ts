// ── Auth ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: { display_name?: string; avatar_url?: string };
  app_metadata?: { role?: 'admin' | 'service_provider' };
}

// ── Posts (community UGC) ─────────────────────────────────────────────────────
export type PostType = 'deal' | 'marketplace' | 'roommate' | 'event';

export interface Post {
  id: string;
  user_id: string;
  type: PostType;
  title: string;
  description?: string;
  city: string;
  price?: string;
  price_cents?: number;       // marketplace: item price in cents for Stripe
  discount?: string;
  category?: string;
  votes_count: number;
  details?: Record<string, unknown>;
  event_date?: string;
  is_active: boolean;
  is_sold?: boolean;          // marketplace: true after buyer completes payment
  stripe_account_id?: string; // seller's connected Stripe account
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
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
