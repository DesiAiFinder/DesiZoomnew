import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Location } from '../types';
import { CITIES } from '../config/env';
import { supabase } from '../services/supabase';

interface LocationState {
  city: string;
  setCity: (c: string) => void;
  geoLocation: Location | null;
  geoLoading: boolean;
}

const LocationContext = createContext<LocationState>({
  city: CITIES[0], setCity: () => {}, geoLocation: null, geoLoading: false,
});

export function LocationProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState<string>(
    () => localStorage.getItem('dz_city') || CITIES[0]
  );
  const [geoLocation, setGeoLocation] = useState<Location | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

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

  // Auto-detect geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    );
  }, []);

  const handleSetCity = async (c: string) => {
    setCity(c);
    localStorage.setItem('dz_city', c);
    // Persist to profile if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('profiles').update({ city: c }).eq('id', session.user.id);
    }
  };

  return (
    <LocationContext.Provider value={{ city, setCity: handleSetCity, geoLocation, geoLoading }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocation = () => useContext(LocationContext);
