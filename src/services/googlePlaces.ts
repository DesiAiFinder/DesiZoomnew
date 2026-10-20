import type { Business, BusinessCategory, Location } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any;

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

let mapsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (mapsLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    window.initGoogleMaps = () => { mapsLoaded = true; resolve(); };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return loadingPromise;
}

function categoryFromTypes(types: string[]): BusinessCategory {
  if (types.some((t) => t.includes('grocery') || t.includes('supermarket'))) return 'grocery';
  if (types.some((t) => t.includes('restaurant') || t.includes('food'))) return 'restaurant';
  if (types.some((t) => t.includes('temple') || t.includes('church') || t.includes('worship'))) return 'temple';
  if (types.some((t) => t.includes('travel'))) return 'travel';
  return 'services';
}

/**
 * Distance in miles between two points.
 *
 * Computed here rather than via google.maps.geometry.spherical, which the old
 * code used — but the Maps script only loads `libraries=places`, so
 * google.maps.geometry was always undefined. Every distance came back
 * undefined, the sort compared 99 to 99 and did nothing, and results stayed in
 * Google's relevance order. That's why "Services Near You" in Little Elm led
 * with Dallas City Hall, 30 miles away.
 *
 * Plain haversine has no such dependency and can't silently stop working.
 */
function milesBetween(a: Location, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export async function searchNearbyPlaces(
  location: Location,
  query: string,
  radius = 16000
): Promise<Business[]> {
  const service = new google.maps.places.PlacesService(document.createElement('div'));
  const latLng = new google.maps.LatLng(location.lat, location.lng);

  return new Promise((resolve) => {
    service.textSearch(
      { query, location: latLng, radius },
      (results: any[], status: any) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
          resolve([]);
          return;
        }

        const businesses: Business[] = results.slice(0, 20).map((r: any) => {
          const loc = r.geometry?.location;
          const dist = loc
            ? milesBetween(location, { lat: loc.lat(), lng: loc.lng() })
            : undefined;

          return {
            id: r.place_id ?? Math.random().toString(),
            placeId: r.place_id ?? '',
            name: r.name ?? '',
            address: r.formatted_address ?? '',
            rating: r.rating,
            priceLevel: r.price_level,
            photos: r.photos?.slice(0, 1).map((p: any) => p.getUrl({ maxWidth: 400 })),
            types: r.types ?? [],
            distance: dist,
            businessStatus: r.business_status,
            category: categoryFromTypes(r.types ?? []),
            isOpen: r.opening_hours?.isOpen?.(),
          };
        });

        const sorted = businesses.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));

        // textSearch treats `radius` as a bias, not a filter — when few places
        // match nearby it happily returns ones 30 miles away. Drop those, but
        // never return nothing: an over-wide result beats an empty page, so if
        // the filter would empty the list we keep the closest handful instead.
        const limitMiles = (radius / 1609.34) * 1.25;
        const withinRange = sorted.filter((b) => (b.distance ?? 9999) <= limitMiles);
        resolve(withinRange.length ? withinRange : sorted.slice(0, 4));
      }
    );
  });
}

// Fetch phone + website for a single place (called lazily on card expand)
export async function getPlaceDetails(placeId: string): Promise<{ phone?: string; website?: string; mapsUrl?: string }> {
  const service = new google.maps.places.PlacesService(document.createElement('div'));
  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId,
        fields: ['formatted_phone_number', 'website', 'url'],
      },
      (result: any, status: any) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
          resolve({});
          return;
        }
        resolve({
          phone: result.formatted_phone_number,
          website: result.website,
          mapsUrl: result.url,
        });
      }
    );
  });
}
