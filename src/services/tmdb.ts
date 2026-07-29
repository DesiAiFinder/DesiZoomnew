// Desi films currently in US theatres, via TMDB.
// TMDB gives us titles/posters/languages; it does NOT provide showtimes, so we
// link out to a showtimes search for the user's city.
import { env } from '../config/env';

export interface DesiMovie {
  id: number;
  title: string;
  original_title: string;
  language: string;      // ISO code, e.g. 'te'
  languageLabel: string; // 'Telugu'
  poster?: string;
  overview?: string;
  releaseDate?: string;
  rating?: number;
}

export const DESI_LANGUAGES: { code: string; label: string }[] = [
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'kn', label: 'Kannada' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
];

const LANG_LABEL: Record<string, string> = Object.fromEntries(
  DESI_LANGUAGES.map((l) => [l.code, l.label])
);

const IMG = 'https://image.tmdb.org/t/p/w342';
const CACHE_KEY = 'dz_movies_v2'; // bumped: v1 cached results from a looser query
const CACHE_HOURS = 6;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Indian-language films released in US theatres recently (default: last 45 days
 * through next 10). Cached in localStorage for a few hours to spare the API.
 */
export async function fetchDesiMovies(force = false): Promise<DesiMovie[]> {
  if (!env.tmdbKey) return [];

  if (!force) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { at, list } = JSON.parse(raw);
        if (Date.now() - at < CACHE_HOURS * 3600_000) return list as DesiMovie[];
      }
    } catch { /* ignore bad cache */ }
  }

  const now = new Date();
  const from = new Date(now.getTime() - 45 * 86400000);
  const to = new Date(now.getTime() + 10 * 86400000);

  const results = await Promise.all(
    DESI_LANGUAGES.map(async (l) => {
      // NOTE: with `region` set, TMDB filters on that region's dates only when
      // you use release_date.* (primary_release_date.* ignores the region and
      // lets in old films that merely had *some* release in the window).
      const url =
        `https://api.themoviedb.org/3/discover/movie?api_key=${env.tmdbKey}` +
        `&with_original_language=${l.code}&region=US&with_release_type=3|2` +
        `&release_date.gte=${iso(from)}&release_date.lte=${iso(to)}` +
        `&sort_by=release_date.desc&include_adult=false&page=1`;
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results ?? []).map((m: Record<string, unknown>): DesiMovie => ({
          id: m.id as number,
          title: (m.title as string) || (m.original_title as string),
          original_title: m.original_title as string,
          language: l.code,
          languageLabel: LANG_LABEL[l.code] ?? l.code,
          poster: m.poster_path ? `${IMG}${m.poster_path}` : undefined,
          overview: m.overview as string,
          releaseDate: m.release_date as string,
          rating: m.vote_average as number,
        }));
      } catch {
        return [];
      }
    })
  );

  const fromISO = iso(from);
  const toISO = iso(to);
  const list = results
    .flat()
    // Belt and braces: keep only films whose own release date is in the window
    .filter((m) => m.poster && m.releaseDate && m.releaseDate >= fromISO && m.releaseDate <= toISO)
    .sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));

  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), list })); } catch { /* quota */ }
  return list;
}

/** TMDB has no showtimes — send people to a showtimes search for their city. */
export function showtimesUrl(title: string, city: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${title} showtimes ${city}`)}`;
}
