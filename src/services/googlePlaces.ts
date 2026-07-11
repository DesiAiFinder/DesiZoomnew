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

function metersToMiles(m: number): number {
  return Math.round((m / 1609.34) * 10) / 10;
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
          const dist = r.geometry?.location
            ? google.maps.geometry
              ? metersToMiles(
                  google.maps.geometry.spherical.computeDistanceBetween(
                    latLng,
                    r.geometry.location
                  )
                )
              : undefined
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

        resolve(businesses.sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99)));
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
