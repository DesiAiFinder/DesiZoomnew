export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  googlePlacesKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string,
  openWeatherKey: import.meta.env.VITE_OPENWEATHER_API_KEY as string,
  adminPassword: import.meta.env.VITE_ADMIN_PASSWORD as string,
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

export const DESI_FESTIVALS = [
  { name: 'Diwali',     month: 9,  day: 20 },
  { name: 'Holi',       month: 2,  day: 14 },
  { name: 'Navratri',   month: 9,  day: 10 },
  { name: 'Eid',        month: 3,  day: 31 },
  { name: 'Dussehra',   month: 9,  day: 19 },
  { name: 'Baisakhi',   month: 3,  day: 14 },
];
