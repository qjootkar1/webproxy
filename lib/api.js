// Invidious instance with fallbacks
const INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://yt.artemislena.eu',
];

const PRIMARY = INSTANCES[0];

export async function invFetch(path, opts = {}) {
  const { revalidate = 300 } = opts;

  for (let i = 0; i < INSTANCES.length; i++) {
    const base = INSTANCES[i];
    try {
      const res = await fetch(`${base}/api/v1${path}`, {
        next: { revalidate },
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'NadekoClient/1.0',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === INSTANCES.length - 1) throw e;
      // Try next instance
      console.warn(`Instance ${base} failed, trying next...`);
    }
  }
}

export function getThumbnail(videoId, quality = 'mqdefault') {
  // Use Invidious thumbnail proxy to avoid ytimg CORS issues
  return `${PRIMARY}/vi/${videoId}/${quality}.jpg`;
}

export function getEmbedUrl(videoId, opts = {}) {
  const params = new URLSearchParams({
    autoplay: opts.autoplay ? '1' : '0',
    quality: opts.quality || 'hd720',
    listen: '0',
    local: 'true',       // use instance's own proxy
    player_style: 'youtube',
    ...opts.params,
  });
  return `${PRIMARY}/embed/${videoId}?${params}`;
}

export function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

export function formatViews(n) {
  if (!n) return '';
  if (n >= 1_000_000_000) return `${(n/1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n/1_000).toFixed(0)}K`;
  return n.toString();
}

export function formatRelative(published) {
  if (!published) return '';
  const diff = Date.now() / 1000 - published;
  const d = Math.floor(diff / 86400);
  const w = Math.floor(d / 7);
  const mo = Math.floor(d / 30);
  const y = Math.floor(d / 365);
  if (y > 0)  return `${y}년 전`;
  if (mo > 0) return `${mo}달 전`;
  if (w > 0)  return `${w}주 전`;
  if (d > 0)  return `${d}일 전`;
  return '오늘';
}

export { PRIMARY };
