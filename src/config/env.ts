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
  {
    name: 'Radio Sangam 104.1',
    lang: 'Telugu · Dallas, TX',
    src: 'https://stream.voxx.pro/listen/radio_sangam/radio.mp3',
  },
  {
    name: 'FunAsia 94.5',
    lang: 'Hindi/Punjabi · Dallas, TX',
    src: 'https://stream.voxx.pro/listen/funasia/radio.mp3',
  },
  {
    name: 'Bollywood Hits FM',
    lang: 'Hindi · Online',
    src: 'https://myradiostream.com/29270/listen.mp3',
  },
  {
    name: 'Desi Junction',
    lang: 'Hindi/Punjabi · Chicago',
    src: 'https://stream.zeno.fm/yn65m0rs9tzuv',
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
