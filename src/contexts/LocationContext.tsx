import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Location } from '../types';
import { CITIES, env } from '../config/env';
import { supabase } from '../services/supabase';

interface LocationState {
  city: string;
  setCity: (c: string) => void;
  geoLocation: Location | null;
  geoLoading: boolean;
  detectedCity: string | null;
}

const LocationContext = createContext<LocationState>({
  city: CITIES[0], setCity: () => {}, geoLocation: null, geoLoading: false, detectedCity: null,
});

async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await res.json();
    const components = data.results?.[0]?.address_components ?? [];
    const cityComp = components.find((c: any) => c.types.includes('locality'));
    const stateComp = components.find((c: any) => c.types.includes('administrative_area_level_1'));
    if (cityComp && stateComp) {
      return `${cityComp.long_name}, ${stateComp.short_name}`;
    }
  } catch {
    // ignore
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

  // Load city from user profile on login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('city')
          .eq('id', session.user.id)
          .single();
        if (data?.city) {
          setCity(data.city);
          localStorage.setItem('dz_city', data.city);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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

  const handleSetCity = async (c: string) => {
    setCity(c);
    localStorage.setItem('dz_city', c);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('profiles').update({ city: c }).eq('id', session.user.id);
    }
  };

  return (
    <LocationContext.Provider value={{ city, setCity: handleSetCity, geoLocation, geoLoading, detectedCity }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);
