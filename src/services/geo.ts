// Lightweight geo helpers for radius-based ("within N miles") discovery.
// City names are geocoded once via Google and cached in localStorage, so we can
// compute distances between free-form city strings without a DB migration.
import { env } from '../config/env';
import { loadGoogleMaps } from './googlePlaces';

export type LatLng = { lat: number; lng: number };

const CACHE_KEY = 'dz_geocode_v1';

function loadCache(): Record<string, LatLng | null> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(c: Record<string, LatLng | null>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any;

/**
 * Geocode a city string ("Little Elm, TX") → coordinates. Cached in
 * localStorage forever, so it's one Google call per city per browser.
 *
 * Uses the Maps JavaScript API geocoder, NOT maps/api/geocode/json. Our key is
 * HTTP-referrer-restricted, and Google's web-service endpoints reject such keys
 * outright — REQUEST_DENIED, "API keys with referer restrictions cannot be used
 * with this API." The old fetch() version failed on every call inside a silent
 * catch, which meant fetchNearbyCities only ever returned the user's own city
 * and the radius selector did nothing at all.
 *
 * Same fix as reverseGeocode in LocationContext. Don't "simplify" back to fetch.
 */
export async function geocodeCity(city: string): Promise<LatLng | null> {
  if (!city) return null;
  const cache = loadCache();
  if (city in cache) return cache[city];

  let result: LatLng | null = null;
  try {
    if (env.googlePlacesKey) {
      await loadGoogleMaps(env.googlePlacesKey);
      const loc: LatLng | null = await new Promise((resolve) => {
        new google.maps.Geocoder().geocode({ address: city }, (res: any[], status: string) => {
          if (status === 'OK' && res?.[0]?.geometry?.location) {
            const l = res[0].geometry.location;
            resolve({ lat: l.lat(), lng: l.lng() });
          } else {
            console.warn('[geo] geocode failed for', city, status);
            resolve(null);
          }
        });
      });
      result = loc;
    }
  } catch (e) {
    console.warn('[geo] geocode error for', city, e);
  }

  // Cache negatives too, so a genuinely unknown city isn't retried endlessly.
  cache[city] = result;
  saveCache(cache);
  return result;
}

// Great-circle distance in miles between two points (Haversine).
export function milesBetween(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3959; // Earth radius in miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Distance-picker options shown in the nav. mi === 0 means "this city only".
export const RADIUS_OPTIONS: { mi: number; label: string }[] = [
  { mi: 0,   label: 'This city' },
  { mi: 25,  label: '25 miles' },
  { mi: 50,  label: '50 miles' },
  { mi: 100, label: 'Whole metro' },
];

export const DEFAULT_RADIUS = 50;
