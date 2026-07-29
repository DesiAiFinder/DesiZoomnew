export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  googlePlacesKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string,
  openWeatherKey: import.meta.env.VITE_OPENWEATHER_API_KEY as string,
  adminPassword: import.meta.env.VITE_ADMIN_PASSWORD as string,
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string,
  tmdbKey: import.meta.env.VITE_TMDB_API_KEY as string,
};

export const CITIES = [
  'Edison, NJ',
  'Jersey City, NJ',
  'Fremont, CA',
  'Chicago, IL',
  'Houston, TX',
  'Atlanta, GA',
  'Dallas, TX',
  'Los Angeles, CA',
];

export const RADIO_STATIONS = [
  // ── DFW ──────────────────────────────────────────────────────────────────
  {
    name: 'Radio Sangam 104.1',
    lang: 'Telugu · Dallas, TX',
    freq: '104.1 FM',
    group: 'DFW',
    src: 'https://stream.voxx.pro/listen/radio_sangam/radio.mp3',
  },
  {
    name: 'FunAsia 94.5',
    lang: 'Hindi/Punjabi · Dallas, TX',
    freq: '94.5 FM',
    group: 'DFW',
    src: 'https://stream.voxx.pro/listen/funasia/radio.mp3',
  },
  {
    name: 'Big 106.2',
    lang: 'Bollywood · Dallas, TX',
    freq: '106.2 FM',
    group: 'DFW',
    src: 'https://stream.voxx.pro/listen/big1062/radio.mp3',
  },
  {
    name: 'Beat 97.8',
    lang: 'Hindi/Desi · DFW',
    freq: '97.8 FM',
    group: 'DFW',
    src: 'https://stream.voxx.pro/listen/beat978/radio.mp3',
  },

  // ── National / Online ────────────────────────────────────────────────────
  {
    name: 'Bollywood Hits FM',
    lang: 'Hindi · Online',
    freq: 'Online',
    group: 'National',
    src: 'https://myradiostream.com/29270/listen.mp3',
  },
  {
    name: 'Desi Junction',
    lang: 'Hindi/Punjabi · Chicago',
    freq: 'Online',
    group: 'National',
    src: 'https://stream.zeno.fm/yn65m0rs9tzuv',
  },
  {
    name: 'Radio Zindagi',
    lang: 'Hindi/Gujarati · Bay Area',
    freq: 'Online',
    group: 'National',
    src: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
  },
  {
    name: 'Masala Radio',
    lang: 'Desi Mix · Nationwide',
    freq: 'Online',
    group: 'National',
    src: 'https://stream.zeno.fm/masalaradio',
  },
];

export const MKT_CATEGORIES = [
  'All', 'For sale', 'Vehicles', 'Services',
  'Jobs', 'Matrimony', 'Student', 'Temple', 'Lost & found',
];

export const DEAL_CATEGORIES = [
  { key: 'all', label: '🛍️ All' },
  { key: 'deal', label: '🏷️ Deals' },
  { key: 'marketplace', label: '🛍️ Marketplace' },
  { key: 'roommate', label: '🏠 Roommates' },
  { key: 'event', label: '🎉 Events' },
];

export const BUSINESS_CATEGORIES = [
  { key: 'grocery',    label: '🛒 Grocery Stores',  query: 'Indian grocery store' },
  { key: 'restaurant', label: '🍛 Restaurants',      query: 'Indian restaurant' },
  { key: 'temple',     label: '🛕 Temples',          query: 'Hindu temple' },
  { key: 'travel',     label: '✈️ Travel Agents',    query: 'Indian travel agent' },
  { key: 'services',   label: '🔧 Services',         query: 'Indian service provider' },
];

// ── Occasion search ───────────────────────────────────────────────────────────
// "wedding" or "birthday party" isn't a business category, it's an occasion.
// Each occasion fans out into the vendor categories people actually need.
export interface OccasionVendor {
  key: string;      // matches businesses.business_type where applicable
  icon: string;
  label: string;
  query: string;    // what we ask Google Places
}
export interface Occasion {
  id: string;
  icon: string;
  label: string;
  blurb: string;
  match: string[];  // lowercase keywords that trigger this occasion
  vendors: OccasionVendor[];
}

const V = {
  venue:    { key: 'venue',      icon: '🏛️', label: 'Venues & halls',        query: 'banquet hall event venue' },
  partyVenue:{key: 'venue',      icon: '🏛️', label: 'Party venues',          query: 'party venue birthday party place' },
  caterer:  { key: 'catering',   icon: '🍽️', label: 'Caterers',              query: 'Indian catering service' },
  cake:     { key: 'other',      icon: '🎂', label: 'Cakes & sweets',        query: 'bakery cake shop' },
  decor:    { key: 'venue',      icon: '🎪', label: 'Decorators',            query: 'event decorator balloon decoration' },
  photo:    { key: 'photo',      icon: '📸', label: 'Photo & video',         query: 'event photographer videographer' },
  mehndi:   { key: 'beauty',     icon: '💄', label: 'Mehndi & makeup',       query: 'mehndi henna artist bridal makeup' },
  priest:   { key: 'priest',     icon: '🕉️', label: 'Priests & pooja',       query: 'Hindu priest pandit temple' },
  dj:       { key: 'other',      icon: '🎧', label: 'DJ & music',            query: 'DJ event entertainment' },
  restaurant:{key: 'restaurant', icon: '🍛', label: 'Restaurants',           query: 'Indian restaurant' },
  jewelry:  { key: 'other',      icon: '💍', label: 'Jewellery & attire',    query: 'Indian jewelry saree bridal store' },
  flowers:  { key: 'other',      icon: '🌸', label: 'Flowers & garlands',    query: 'florist flower garland' },
  grocery:  { key: 'grocery',    icon: '🛒', label: 'Grocery',               query: 'Indian grocery store' },
} as const;

export const OCCASIONS: Occasion[] = [
  {
    id: 'wedding', icon: '💍', label: 'wedding',
    blurb: "Everything you'll need for the big day, grouped by vendor.",
    match: ['wedding', 'shaadi', 'shadi', 'marriage', 'reception', 'sangeet', 'baraat', 'nikah'],
    vendors: [V.venue, V.caterer, V.photo, V.mehndi, V.priest, V.decor, V.dj, V.jewelry],
  },
  {
    id: 'birthday', icon: '🎂', label: 'birthday party',
    blurb: "Everything you'll need for the party, grouped by vendor.",
    match: ['birthday', 'bday', 'birth day'],
    vendors: [V.partyVenue, V.caterer, V.cake, V.decor, V.photo, V.restaurant],
  },
  {
    id: 'babyshower', icon: '🍼', label: 'baby shower / seemantham',
    blurb: 'Vendors for a baby shower or seemantham.',
    match: ['baby shower', 'seemantham', 'godh bharai', 'valaikappu'],
    vendors: [V.venue, V.caterer, V.decor, V.photo, V.priest],
  },
  {
    id: 'housewarming', icon: '🏠', label: 'housewarming / griha pravesh',
    blurb: 'Vendors for a griha pravesh or housewarming.',
    match: ['housewarming', 'house warming', 'griha pravesh', 'gruhapravesam', 'grihapravesh'],
    vendors: [V.priest, V.caterer, V.decor, V.flowers, V.grocery],
  },
  {
    id: 'pooja', icon: '🕉️', label: 'pooja / ceremony',
    blurb: 'Priests and vendors for your ceremony.',
    match: ['pooja', 'puja', 'satyanarayana', 'homam', 'havan', 'ceremony', 'upanayanam', 'namkaran'],
    vendors: [V.priest, V.caterer, V.flowers, V.decor, V.grocery],
  },
  {
    id: 'engagement', icon: '💐', label: 'engagement',
    blurb: 'Vendors for an engagement or roka.',
    match: ['engagement', 'roka', 'ring ceremony', 'nischitartham'],
    vendors: [V.venue, V.caterer, V.photo, V.decor, V.mehndi],
  },
  {
    id: 'graduation', icon: '🎓', label: 'graduation party',
    blurb: 'Vendors for a graduation celebration.',
    match: ['graduation', 'convocation'],
    vendors: [V.partyVenue, V.caterer, V.cake, V.photo, V.restaurant],
  },
  {
    id: 'party', icon: '🎉', label: 'party / get-together',
    blurb: 'Vendors for your get-together.',
    match: ['party', 'get together', 'get-together', 'celebration', 'anniversary', 'festival', 'event'],
    vendors: [V.partyVenue, V.caterer, V.decor, V.cake, V.photo, V.restaurant],
  },
];

/** Find the occasion a free-text query is describing, if any. */
export function detectOccasion(q: string): Occasion | null {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  // Longest keyword wins so "baby shower" beats "party"
  let best: { occ: Occasion; len: number } | null = null;
  for (const occ of OCCASIONS) {
    for (const kw of occ.match) {
      if (s.includes(kw) && (!best || kw.length > best.len)) best = { occ, len: kw.length };
    }
  }
  return best?.occ ?? null;
}

export const DESI_FESTIVALS = [
  { name: 'Diwali',     month: 9,  day: 20 },
  { name: 'Holi',       month: 2,  day: 14 },
  { name: 'Navratri',   month: 9,  day: 10 },
  { name: 'Eid',        month: 3,  day: 31 },
  { name: 'Dussehra',   month: 9,  day: 19 },
  { name: 'Baisakhi',   month: 3,  day: 14 },
];
