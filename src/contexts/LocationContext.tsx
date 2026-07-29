import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Location } from '../types';
import { CITIES, env } from '../config/env';
import { fetchNearbyCities } from '../services/supabase';
import { loadGoogleMaps } from '../services/googlePlaces';
import { DEFAULT_RADIUS } from '../services/geo';

interface LocationState {
  city: string;
  setCity: (c: string) => void;
  geoLocation: Location | null;
  geoLoading: boolean;
  detectedCity: string | null;
  radius: number;
  setRadius: (r: number) => void;
  /** Selected city plus every nearby city within the chosen radius. */
  nearbyCities: string[];
}

const LocationContext = createContext<LocationState>({
  city: CITIES[0], setCity: () => {}, geoLocation: null, geoLoading: false, detectedCity: null,
  radius: DEFAULT_RADIUS, setRadius: () => {}, nearbyCities: [CITIES[0]],
});

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any;

/**
 * Turn coordinates into "City, ST".
 *
 * Uses the Maps JavaScript API geocoder, NOT the REST endpoint at
 * maps.googleapis.com/maps/api/geocode/json. That REST endpoint is a
 * server-side web service: it returns no Access-Control-Allow-Origin header,
 * so a browser fetch() is blocked by CORS and always fails. The old code did
 * exactly that inside a bare `catch {}`, which is why city detection silently
 * never worked in production on any device.
 */
async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<string | null> {
  try {
    await loadGoogleMaps(apiKey);

    const results: any[] = await new Promise((resolve, reject) => {
      new google.maps.Geocoder().geocode(
        { location: { lat, lng } },
        (res: any[], status: string) => {
          if (status === 'OK' && res?.length) resolve(res);
          else reject(new Error(`Geocoder status: ${status}`));
        }
      );
    });

    const components = results[0]?.address_components ?? [];
    const cityComp = components.find((c: any) => c.types.includes('locality'));
    const stateComp = components.find((c: any) => c.types.includes('administrative_area_level_1'));
    if (cityComp && stateComp) {
      return `${cityComp.long_name}, ${stateComp.short_name}`;
    }
    console.warn('[location] geocoded, but no locality/state in result', components);
  } catch (e) {
    // Log it. The previous silent catch is what hid this bug for weeks.
    console.warn('[location] reverse geocode failed:', e);
  }
  return null;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState<string>(
    () => localStorage.getItem('dz_city') || CITIES[0]
  );
  const [geoLocation, setGeoLocation] = useState<Location | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [radius, setRadiusState] = useState<number>(
    () => Number(localStorage.getItem('dz_radius') ?? DEFAULT_RADIUS)
  );
  const [nearbyCities, setNearbyCities] = useState<string[]>([city]);

  const setRadius = (r: number) => {
    setRadiusState(r);
    localStorage.setItem('dz_radius', String(r));
  };

  // Recompute nearby cities whenever the city or radius changes.
  useEffect(() => {
    let cancelled = false;
    setNearbyCities([city]); // immediate fallback while geocoding resolves
    fetchNearbyCities(city, radius)
      .then((list) => { if (!cancelled) setNearbyCities(list.length ? list : [city]); })
      .catch(() => { if (!cancelled) setNearbyCities([city]); });
    return () => { cancelled = true; };
  }, [city, radius]);

  // City is stored per-browser in localStorage only.
  //
  // There used to be a profiles.city sync here, but profiles has never had a
  // city column in production — the query failed silently for the whole life
  // of the app. When the column was briefly added, this effect woke up and
  // overwrote every signed-in user's detected city with the column default,
  // clobbering their localStorage. Removed rather than repaired.
  //
  // If cross-device city is wanted later: add the column as nullable with NO
  // default, and only apply it when the user has explicitly chosen a city
  // (otherwise a stored value always beats live geolocation).

  // Auto-detect geolocation + reverse geocode city
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeoLocation(loc);
        setGeoLoading(false);

        // Reverse geocode to get actual city name
        if (env.googlePlacesKey) {
          const detected = await reverseGeocode(loc.lat, loc.lng, env.googlePlacesKey);
          if (detected) {
            setDetectedCity(detected);
            // If user hasn't manually set a city, auto-update to detected city
            const stored = localStorage.getItem('dz_city');
            if (!stored || stored === CITIES[0]) {
              setCity(detected);
              localStorage.setItem('dz_city', detected);
            }
          }
        }
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  }, []);

  const handleSetCity = (c: string) => {
    setCity(c);
    localStorage.setItem('dz_city', c);
  };

  return (
    <LocationContext.Provider value={{ city, setCity: handleSetCity, geoLocation, geoLoading, detectedCity, radius, setRadius, nearbyCities }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);
