// Nearby ticketed desi events via the Ticketmaster Discovery API.
// Free tier: 5000 calls/day, ~5/sec. Key is the Consumer Key, not the secret.
//
// Scope check before you expect too much: Ticketmaster carries ticketed
// commercial shows — a touring Bollywood singer at a big venue. It does NOT
// carry temple Diwali melas, garba nights at community halls, or association
// events. Those have no API anywhere and have to be posted or seeded.
import { env } from '../config/env';
import { CITY_COORDS } from '../config/env';
import { geocodeCity } from './geo';

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

// Ticketmaster's `keyword` is a plain search, not a boolean expression — the
// old 'bollywood OR desi OR india OR …' string was matched literally and
// found almost nothing. Several narrow queries, merged, works better.
//
// Every term here must be UNAMBIGUOUSLY desi. 'indian' was in this list and
// returned "Memphis Redbirds vs. Indianapolis Indians" and "Haskell Indian
// Nations basketball" — minor-league baseball on a desi events page is worse
// than an empty section. Don't re-add it, and don't add 'india' either.
const DESI_KEYWORDS = ['bollywood', 'bhangra', 'punjabi', 'telugu', 'tamil', 'garba'];

// Belt and braces: even a safe keyword can land on sport. Reject anything
// Ticketmaster classifies as Sports, whatever matched it.
function isSport(e: Record<string, any>): boolean {
  return (e.classifications ?? []).some(
    (c: any) => (c?.segment?.name ?? '').toLowerCase() === 'sports'
  );
}

interface Opts {
  /** Miles. Events deserve a wide net; see eventRadiusFor in LocationContext. */
  radiusMiles?: number;
  limit?: number;
}

/**
 * Events near a city.
 *
 * Searches by coordinates, NOT by city name. The old version passed
 * `city: 'Little Elm'`, and Ticketmaster matches that exactly against its own
 * venue cities — there is no Ticketmaster venue in Little Elm, so it returned
 * nothing no matter what radius was also supplied. Suburbs are the normal case
 * for us, so city-name matching was never going to work.
 */
export async function fetchExternalEvents(
  city: string,
  { radiusMiles = 75, limit = 12 }: Opts = {}
): Promise<ExternalEvent[]> {
  const key = env.ticketmasterKey;
  if (!key || !city) return [];

  const center = CITY_COORDS[city] ?? (await geocodeCity(city));
  if (!center) return [];

  const base = {
    apikey: key,
    latlong: `${center.lat},${center.lng}`,
    radius: String(Math.round(radiusMiles)),
    unit: 'miles',
    sort: 'date,asc',
    size: '10',
    startDateTime: new Date().toISOString().slice(0, 19) + 'Z',
  };

  const results = await Promise.all(
    DESI_KEYWORDS.map(async (keyword) => {
      try {
        const params = new URLSearchParams({ ...base, keyword });
        const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
        if (!res.ok) {
          // 429 = quota. Worth seeing in the console rather than silently empty.
          console.warn('ticketmaster', keyword, res.status);
          return [];
        }
        const json = await res.json();
        return (json._embedded?.events ?? []) as Record<string, any>[];
      } catch (e) {
        console.warn('ticketmaster fetch failed', keyword, e);
        return [];
      }
    })
  );

  // The keyword searches overlap, so dedupe on event id.
  const seen = new Set<string>();
  const merged: ExternalEvent[] = [];
  for (const e of results.flat()) {
    if (!e?.id || seen.has(e.id) || isSport(e)) continue;
    seen.add(e.id);
    merged.push({
      id: e.id,
      name: e.name,
      url: e.url,
      date: e.dates?.start?.dateTime || e.dates?.start?.localDate || '',
      venue: e._embedded?.venues?.[0]?.name,
      city: e._embedded?.venues?.[0]?.city?.name,
      image: e.images?.find((img: any) => img.width > 500)?.url || e.images?.[0]?.url,
      priceRange: e.priceRanges?.[0]
        ? `$${Math.round(e.priceRanges[0].min)}–$${Math.round(e.priceRanges[0].max)}`
        : undefined,
    });
  }

  return merged
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .slice(0, limit);
}
