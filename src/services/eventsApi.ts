// Auto-populated events via Ticketmaster Discovery API (free tier: 5000 calls/day)
// Get a key at https://developer.ticketmaster.com — add VITE_TICKETMASTER_API_KEY to env
import { env } from '../config/env';

export interface ExternalEvent {
  id: string;
  name: string;
  url: string;
  date: string;        // ISO
  venue?: string;
  city?: string;
  image?: string;
  priceRange?: string;
}

const DESI_KEYWORDS = 'bollywood OR desi OR india OR hindi OR punjabi OR telugu OR tamil OR bhangra';

export async function fetchExternalEvents(city: string, stateCode?: string): Promise<ExternalEvent[]> {
  const key = (env as Record<string, string | undefined>).ticketmasterKey
    || import.meta.env.VITE_TICKETMASTER_API_KEY;
  if (!key) return [];

  // "Little Elm, TX" → city=Little Elm, state=TX
  const [cityName, st] = city.split(',').map((s) => s.trim());

  const params = new URLSearchParams({
    apikey: key,
    keyword: DESI_KEYWORDS,
    city: cityName,
    ...(st || stateCode ? { stateCode: st || stateCode! } : {}),
    radius: '50',
    unit: 'miles',
    sort: 'date,asc',
    size: '10',
    classificationName: 'music,arts,family',
  });

  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
    if (!res.ok) return [];
    const json = await res.json();
    const events = json._embedded?.events ?? [];

    return events.map((e: Record<string, any>) => ({
      id: e.id,
      name: e.name,
      url: e.url,
      date: e.dates?.start?.dateTime || e.dates?.start?.localDate || '',
      venue: e._embedded?.venues?.[0]?.name,
      city: e._embedded?.venues?.[0]?.city?.name,
      image: e.images?.find((img: any) => img.width > 500)?.url || e.images?.[0]?.url,
      priceRange: e.priceRanges?.[0]
        ? `$${e.priceRanges[0].min}–$${e.priceRanges[0].max}`
        : undefined,
    }));
  } catch {
    return [];
  }
}
