// Fetches Indian/desi news headlines from public RSS feeds and caches them.
// Stores headline + link + source only (copyright-safe, links out to source).
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Only our own front-ends may call this. A wildcard let any site on the
// internet invoke these endpoints with a visitor's session.
const ALLOWED_ORIGINS = [
  'https://www.desizoom.com',
  'https://desizoom.com',
  'https://desizoomnew.vercel.app',
  'http://localhost:5173',
];
function corsFor(req: Request) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

// Public RSS feeds → category label. Swap/extend as you like.
const FEEDS: { url: string; source: string; category: string }[] = [
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'The Hindu', category: 'India' },
  { url: 'https://feeds.feedburner.com/ndtvnews-india-news', source: 'NDTV', category: 'India' },
  { url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', source: 'ESPNcricinfo', category: 'Cricket' },
  { url: 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms', source: 'Times of India', category: 'US Desi' },
  { url: 'https://www.bollywoodhungama.com/rss/news.xml', source: 'Bollywood Hungama', category: 'Bollywood' },
];

function decode(s: string): string {
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"')
    .replace(/<[^>]+>/g, '').trim();
}

function parseItems(xml: string): { title: string; link: string; pub?: string }[] {
  const items: { title: string; link: string; pub?: string }[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const b of blocks.slice(0, 8)) {
    const title = b.match(/<title[^>]*>(.*?)<\/title>/is)?.[1];
    const link = b.match(/<link[^>]*>(.*?)<\/link>/is)?.[1]
      || b.match(/<guid[^>]*>(https?:.*?)<\/guid>/is)?.[1];
    const pub = b.match(/<pubDate[^>]*>(.*?)<\/pubDate>/is)?.[1];
    if (title && link) items.push({ title: decode(title), link: decode(link), pub: pub?.trim() });
  }
  return items;
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let added = 0;
  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, { headers: { 'User-Agent': 'DesiZoomBot/1.0' } });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const it of parseItems(xml)) {
        const { error } = await supabase.from('news_items').upsert({
          title: it.title.slice(0, 240),
          url: it.link,
          source: feed.source,
          category: feed.category,
          status: 'approved',
          published_at: it.pub ? new Date(it.pub).toISOString() : new Date().toISOString(),
        }, { onConflict: 'url', ignoreDuplicates: true });
        if (!error) added++;
      }
    } catch { /* skip a bad feed */ }
  }

  // Trim to the most recent 60 RSS items to keep the table lean
  const { data: old } = await supabase
    .from('news_items').select('id').is('submitted_by', null)
    .order('published_at', { ascending: false }).range(60, 500);
  if (old?.length) await supabase.from('news_items').delete().in('id', old.map((o) => o.id));

  return new Response(JSON.stringify({ added }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
