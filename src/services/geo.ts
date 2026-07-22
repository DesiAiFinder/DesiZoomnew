// Lightweight geo helpers for radius-based ("within N miles") discovery.
// City names are geocoded once via Google and cached in localStorage, so we can
// compute distances between free-form city strings without a DB migration.
import { env } from '../config/env';

export type LatLng = { lat: number; lng: number };

const CACHE_KEY = 'dz_geocode_v1';

function loadCache(): Record<string, LatLng | null> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveCache(c: Record<string, LatLng | null>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

// Geocode a city string ("Little Elm, TX") → coordinates, cached forever.
export async function geocodeCity(city: string): Promise<LatLng | null> {
  if (!city) return null;
  const cache = loadCache();
  if (city in cache) return cache[city];
  let result: LatLng | null = null;
  try {
    if (env.googlePlacesKey) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${env.googlePlacesKey}`
      );
      const data = await res.json();
      const loc = data.results?.[0]?.geometry?.location;
      if (loc && typeof loc.lat === 'number') result = { lat: loc.lat, lng: loc.lng };
    }
  } catch { /* ignore network / quota errors */ }
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
