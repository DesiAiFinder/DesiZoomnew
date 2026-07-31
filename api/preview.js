/**
 * Link-preview renderer for /listing/:id
 *
 * Why this exists: DesiZoom is a Vite SPA, so index.html ships one fixed set of
 * og: tags. WhatsApp, Facebook and friends don't run JavaScript, so every deal
 * anyone shared previewed as the same generic "DesiZoom — Everything Desi"
 * card. In a community where WhatsApp forwarding is the main distribution
 * channel, that quietly flattened the whole growth loop.
 *
 * Only crawlers reach this function — vercel.json routes here based on
 * user-agent, so real visitors still get the normal SPA with no redirect and
 * no flash. A human who somehow lands here is bounced to the real page by the
 * inline script at the bottom.
 *
 * Reads through the public anon key and RLS, exactly like the browser does, so
 * this can never expose a post the site wouldn't already show.
 */

const SITE = 'https://www.desizoom.com';
const FALLBACK_IMAGE = `${SITE}/icons/icon-512.png`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TYPE_LABEL = {
  deal: 'Deal',
  marketplace: 'For sale',
  roommate: 'Accommodation',
  event: 'Event',
  question: 'Community',
};

/** Escape for use inside an HTML attribute or text node. */
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clamp(text, max) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/** Build the preview strings for a post. */
function describe(post) {
  const seller = post.business?.name;
  const label = TYPE_LABEL[post.type] || 'Listing';

  // Title: "Free Tea with any purchase — Desi Bandhu"
  const title = seller
    ? `${post.title} — ${seller}`
    : `${post.title} — ${post.city}`;

  // Description prefers the author's own words, then price/discount, then a
  // sensible default. Never leave this empty; a blank description renders as
  // a bare grey card in WhatsApp.
  const bits = [];
  if (post.discount) bits.push(post.discount);
  else if (post.price) bits.push(post.price);
  if (seller) bits.push(seller);
  bits.push(post.city);

  const description = post.description
    ? clamp(post.description, 160)
    : clamp(`${label} · ${bits.filter(Boolean).join(' · ')}`, 160);

  const image = Array.isArray(post.image_urls) && post.image_urls[0]
    ? post.image_urls[0]
    : FALLBACK_IMAGE;

  return { title: clamp(title, 90), description, image };
}

function html({ title, description, image, url }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(title)} | DesiZoom</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="DesiZoom" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:url" content="${esc(url)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(description)}</p>
<p><a href="${esc(url)}">View on DesiZoom</a></p>
<script>location.replace(${JSON.stringify(url)});</script>
</body>
</html>`;
}

export default async function handler(req, res) {
  const id = (req.query?.id || '').toString();
  const url = `${SITE}/listing/${encodeURIComponent(id)}`;

  const generic = {
    title: 'DesiZoom — Everything Desi',
    description: 'Food, deals, services and events for your desi community.',
    image: FALLBACK_IMAGE,
    url: UUID.test(id) ? url : SITE,
  };

  // Never let a preview failure surface as an error page to a crawler — a 500
  // makes WhatsApp show nothing at all. Always fall back to the generic card.
  try {
    if (!UUID.test(id)) throw new Error('bad id');

    const base = process.env.VITE_SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY;
    if (!base || !key) throw new Error('supabase env missing');

    const select = 'title,description,city,type,price,discount,image_urls,business:businesses(name)';
    const r = await fetch(
      `${base}/rest/v1/posts?id=eq.${id}&is_active=eq.true&select=${encodeURIComponent(select)}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!r.ok) throw new Error(`supabase ${r.status}`);

    const rows = await r.json();
    const post = Array.isArray(rows) ? rows[0] : null;
    if (!post) throw new Error('not found');

    const meta = describe(post);
    // Crawlers refetch the same link constantly; let the CDN absorb that.
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html({ ...meta, url }));
  } catch (e) {
    console.error('[preview]', id, e?.message);
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html(generic));
  }
}
