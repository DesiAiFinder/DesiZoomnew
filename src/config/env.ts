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
  { name: 'Bollywood Beats FM', lang: 'Hindi · Local', src: '' },
  { name: 'Radio Edison Desi', lang: 'Punjabi · Local', src: '' },
  { name: 'Sur Sangeet National', lang: 'Hindi · National', src: '' },
  { name: 'Desi Talk Radio', lang: 'Urdu/Hindi · National', src: '' },
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
