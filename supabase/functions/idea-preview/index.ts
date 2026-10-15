import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* ─── idea-preview ───────────────────────────────────────────────────────────
   Given a link a teammate pasted on the Ideas board, fetch the page, read its
   Open Graph tags and return a title, creator and thumbnail. The thumbnail is
   copied into the idea-images bucket because Instagram/Pinterest CDN links are
   signed and expire.

   Runs as the calling user (their JWT), so the team-member check and the
   storage write both go through the normal RLS policies — no service role.   */

/* ─── CORS ───────────────────────────────────────────────────────────────── */

const DEFAULT_ALLOWED_ORIGINS = [
  'https://layercade.com',
  'https://www.layercade.com',
  'http://localhost:5173',
];

const ALLOWED_ORIGINS = new Set(
  (Deno.env.get('ALLOWED_ORIGINS')?.split(',').map((o) => o.trim()).filter(Boolean) ??
    DEFAULT_ALLOWED_ORIGINS),
);

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/* ─── Safe fetching ──────────────────────────────────────────────────────────
   The URL is user-supplied. Only public http(s) hostnames, redirects followed
   by hand so every hop is re-checked, and bodies are size-capped.             */

const USER_AGENT = 'Mozilla/5.0 (compatible; LayercadeIdeas/1.0; +https://layercade.com)';
const MAX_HTML_BYTES = 1_500_000;
const MAX_IMAGE_BYTES = 5_000_000;
const TIMEOUT_MS = 8000;

function isPublicUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  if (!host.includes('.')) return null;                       // localhost, intranet names
  if (/^[\d.]+$/.test(host) || host.startsWith('[')) return null; // IP literals
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return null;
  return u;
}

async function safeFetch(raw: string, accept: string): Promise<{ res: Response; url: URL } | null> {
  let current = isPublicUrl(raw);
  for (let hop = 0; current && hop < 6; hop++) {
    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'en' },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get('location');
      await res.body?.cancel();
      current = next ? isPublicUrl(new URL(next, current).toString()) : null;
      continue;
    }
    return { res, url: current };
  }
  return null;
}

async function readCapped(res: Response, max: number): Promise<Uint8Array | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); break; }
    chunks.push(value);
  }
  const out = new Uint8Array(Math.min(size, max));
  let offset = 0;
  for (const c of chunks) {
    if (offset + c.length > out.length) break;
    out.set(c, offset); offset += c.length;
  }
  return out.subarray(0, offset);
}

/* ─── Meta tag parsing ───────────────────────────────────────────────────── */

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&');
}

function parseMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? '';
    }
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key && attrs.content && !(key in meta)) meta[key] = decodeEntities(attrs.content).trim();
  }
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  if (title) meta['html:title'] = decodeEntities(title).trim();
  return meta;
}

/* ─── Source-specific clean-up ───────────────────────────────────────────── */

type Source = 'makerworld' | 'instagram' | 'pinterest' | 'other';

function detectSource(host: string): Source {
  const h = host.toLowerCase().replace(/^www\./, '');
  if (h.startsWith('makerworld.')) return 'makerworld';
  if (h === 'instagram.com' || h.endsWith('.instagram.com')) return 'instagram';
  if (h === 'pin.it' || /(^|\.)pinterest\.[a-z.]+$/.test(h)) return 'pinterest';
  return 'other';
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

function describe(meta: Record<string, string>, source: Source) {
  let title = meta['og:title'] || meta['twitter:title'] || meta['html:title'] || '';
  let author = meta['author'] || meta['article:author'] || '';
  const description = meta['og:description'] || meta['description'] || '';

  if (source === 'instagram') {
    // og:title looks like: Jane Doe on Instagram: "caption text…"
    const m = title.match(/^(.+?) on Instagram:\s*["“]?([\s\S]*?)["”]?$/);
    if (m) { author = author || m[1]; title = m[2] || title; }
    title = title.split('\n')[0];
  }

  // Strip site-name suffixes: "Gridfinity bin by Foo - MakerWorld", "… | Pinterest"
  title = title.replace(/\s*[-|–—]\s*(MakerWorld|Pinterest|Instagram)\b.*$/i, '').trim();

  if (source === 'makerworld' && !author) {
    const m = title.match(/^(.+?)\s+by\s+(.+)$/i);
    if (m) { title = m[1]; author = m[2]; }
  }

  return {
    title: truncate(title, 140),
    author: truncate(author.replace(/^@/, ''), 80),
    description: truncate(description, 400),
  };
}

/* ─── Handler ────────────────────────────────────────────────────────────── */

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
};

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = corsHeaders(origin);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: 'Origin not allowed' }, 403);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
  );

  const { data: isMember } = await supabase.rpc('is_team_member');
  if (!isMember) return json({ error: 'Team members only' }, 403);

  const body = await req.json().catch(() => ({}));
  const pasted = typeof body?.url === 'string' ? body.url.trim() : '';
  if (!isPublicUrl(pasted)) return json({ error: 'That doesn’t look like a web link' }, 400);

  // Even if the page can't be read we still return the source, so the client
  // can save the idea with a placeholder title.
  const fallback = { url: pasted, source: detectSource(new URL(pasted).hostname), title: '', author: '', description: '', image_url: null as string | null };

  try {
    const page = await safeFetch(pasted, 'text/html,application/xhtml+xml');
    if (!page || !page.res.ok) {
      await page?.res.body?.cancel();
      return json({ ...fallback, partial: true }, 200);
    }

    const bytes = await readCapped(page.res, MAX_HTML_BYTES);
    const html = new TextDecoder().decode(bytes ?? new Uint8Array());
    const meta = parseMeta(html);

    const canonical = isPublicUrl(meta['og:url'] ? new URL(meta['og:url'], page.url).toString() : '') ?? page.url;
    const source = detectSource(canonical.hostname);
    const { title, author, description } = describe(meta, source);

    // Thumbnail: copy into our bucket; fall back to the remote link if that fails.
    let image_url: string | null = null;
    const remoteImage = meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image'] || meta['twitter:image:src'];
    if (remoteImage) {
      const absolute = new URL(remoteImage, page.url).toString();
      image_url = absolute;
      try {
        const img = await safeFetch(absolute, 'image/*');
        const type = img?.res.headers.get('content-type')?.split(';')[0].trim() ?? '';
        if (img?.res.ok && EXT[type]) {
          const data = await readCapped(img.res, MAX_IMAGE_BYTES);
          if (data && data.length > 0 && data.length < MAX_IMAGE_BYTES) {
            const path = `${crypto.randomUUID()}.${EXT[type]}`;
            const { error } = await supabase.storage.from('idea-images').upload(path, data, { contentType: type });
            if (!error) image_url = supabase.storage.from('idea-images').getPublicUrl(path).data.publicUrl;
          }
        } else {
          await img?.res.body?.cancel();
        }
      } catch (err) {
        console.error('[idea-preview] thumbnail copy failed:', err);
      }
    }

    return json({
      url: canonical.toString(),
      source,
      title,
      author,
      description,
      image_url,
      partial: !title || !image_url,
    }, 200);
  } catch (err) {
    console.error('[idea-preview] fetch failed:', err);
    return json({ ...fallback, partial: true }, 200);
  }
});
