const BLOCKED_HEADERS = new Set([
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'x-content-type-options',
  'strict-transport-security',
  'permissions-policy',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'expect-ct',
  'feature-policy',
  'referrer-policy',
]);

function resolveUrl(href, base) {
  if (!href) return null;
  const trimmed = href.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('#') ||
    trimmed === ''
  ) return null;
  try {
    const absolute = new URL(trimmed, base).href;
    return '/api/proxy?url=' + encodeURIComponent(absolute);
  } catch { return null; }
}

function rewriteHtml(html, base, targetUrl) {
  // Remove CSP and other blocking meta tags
  html = html.replace(/<meta[^>]+http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*\/?>/gi, '');
  html = html.replace(/<meta[^>]+http-equiv\s*=\s*["']X-Frame-Options["'][^>]*\/?>/gi, '');

  // Remove integrity and crossorigin attributes (breaks rewritten resources)
  html = html.replace(/\s+integrity\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s+crossorigin\s*=\s*["'][^"']*["']/gi, '');

  // Rewrite href, src, action attributes
  html = html.replace(/(\s(?:href|src|action|data-src|data-href))\s*=\s*"([^"]*)"/gi, (match, attr, url) => {
    const rw = resolveUrl(url, base);
    return rw ? `${attr}="${rw}"` : match;
  });
  html = html.replace(/(\s(?:href|src|action|data-src|data-href))\s*=\s*'([^']*)'/gi, (match, attr, url) => {
    const rw = resolveUrl(url, base);
    return rw ? `${attr}='${rw}'` : match;
  });

  // Rewrite srcset
  html = html.replace(/\ssrcset\s*=\s*"([^"]*)"/gi, (match, srcset) => {
    const rw = srcset.replace(/([^\s,][^\s,]*?)(\s+\d+[wx])?(?=\s*,|\s*$)/g, (m, u, d) => {
      const r = resolveUrl(u.trim(), base);
      return r ? r + (d || '') : m;
    });
    return ` srcset="${rw}"`;
  });

  // Rewrite inline style url()
  html = html.replace(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gi, (match, url) => {
    const rw = resolveUrl(url, base);
    return rw ? `url('${rw}')` : match;
  });

  // Inject proxy helper script before </body>
  const proxyScript = `
<script>
(function() {
  // Override fetch
  const _fetch = window.fetch;
  window.fetch = function(url, opts) {
    try {
      const abs = new URL(url, '${base.href}').href;
      if (!abs.startsWith(location.origin)) {
        return _fetch('/api/proxy?url=' + encodeURIComponent(abs), opts);
      }
    } catch(e) {}
    return _fetch(url, opts);
  };

  // Override XHR
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    try {
      const abs = new URL(url, '${base.href}').href;
      if (!abs.startsWith(location.origin)) {
        arguments[1] = '/api/proxy?url=' + encodeURIComponent(abs);
      }
    } catch(e) {}
    return _open.apply(this, arguments);
  };

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    const a = e.target.closest('a');
    if (a && a.href && !a.href.startsWith(location.origin) && !a.href.startsWith('/api/proxy')) {
      e.preventDefault();
      const proxyUrl = '/api/proxy?url=' + encodeURIComponent(a.href);
      window.location.href = proxyUrl;
    }
  }, true);

  // Intercept form submits
  document.addEventListener('submit', function(e) {
    const form = e.target;
    let action = form.action || '${base.href}';
    try { action = new URL(action, '${base.href}').href; } catch(e2) {}
    if (!action.startsWith(location.origin)) {
      e.preventDefault();
      const method = (form.method || 'get').toLowerCase();
      const data = new FormData(form);
      if (method === 'get') {
        const params = new URLSearchParams(data).toString();
        window.location.href = '/api/proxy?url=' + encodeURIComponent(action + '?' + params);
      } else {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/proxy?url=' + encodeURIComponent(action));
        xhr.send(data);
      }
    }
  }, true);
})();
</script>`;

  if (html.includes('</body>')) {
    html = html.replace('</body>', proxyScript + '</body>');
  } else {
    html += proxyScript;
  }

  // Inject base tag to help with relative resource loading (proxy handles actual rewriting)
  if (!html.includes('<base ')) {
    html = html.replace(/<head[^>]*>/i, (m) => m + `\n<base href="${base.href}">`);
  }

  return html;
}

function rewriteCss(css, base) {
  return css.replace(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gi, (match, url) => {
    const rw = resolveUrl(url, base);
    return rw ? `url('${rw}')` : match;
  });
}

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing ?url= parameter' });

  try { url = decodeURIComponent(url); } catch {}
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let targetUrl;
  try { targetUrl = new URL(url); } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  // ── YouTube → Invidious 자동 변환 ──
  const INVIDIOUS = 'https://inv.nadeko.net';
  const ytHosts = ['youtube.com','www.youtube.com','m.youtube.com','youtu.be','music.youtube.com'];
  if (ytHosts.includes(targetUrl.hostname)) {
    let invPath = targetUrl.pathname + targetUrl.search;
    if (targetUrl.hostname === 'youtu.be') {
      const id = targetUrl.pathname.replace('/', '');
      invPath = '/watch?v=' + id + (targetUrl.searchParams.get('t') ? '&t=' + targetUrl.searchParams.get('t') : '');
    }
    const invUrl = INVIDIOUS + invPath;
    url = invUrl;
    try { targetUrl = new URL(url); } catch {}
  }

  // ── Google 검색 → Bing 대체 ──
  const googleHosts = ['google.com','www.google.com','google.co.kr','www.google.co.kr'];
  if (googleHosts.includes(targetUrl.hostname) && targetUrl.pathname === '/search') {
    const q = targetUrl.searchParams.get('q') || '';
    url = 'https://www.bing.com/search?q=' + encodeURIComponent(q);
    try { targetUrl = new URL(url); } catch {}
  }

  // Forward request headers
  const forwardHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': req.headers['accept'] || 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Cache-Control': 'no-cache',
  };
  if (req.headers['referer']) {
    try {
      const refUrl = new URL(req.headers['referer']);
      const refParam = refUrl.searchParams.get('url');
      if (refParam) forwardHeaders['Referer'] = decodeURIComponent(refParam);
    } catch {}
  }

  let fetchRes;
  try {
    fetchRes = await fetch(targetUrl.href, {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: forwardHeaders,
      body: req.method === 'POST' ? req.body : undefined,
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch: ' + err.message });
  }

  const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
  const finalUrl = fetchRes.url || targetUrl.href;
  let base;
  try { base = new URL(finalUrl); } catch { base = targetUrl; }

  // Forward safe response headers
  for (const [key, val] of fetchRes.headers.entries()) {
    const lower = key.toLowerCase();
    if (BLOCKED_HEADERS.has(lower)) continue;
    if (lower === 'location') {
      try {
        const redirectUrl = new URL(val, base.href).href;
        res.setHeader('Location', '/api/proxy?url=' + encodeURIComponent(redirectUrl));
      } catch { res.setHeader('Location', val); }
      continue;
    }
    if (lower === 'set-cookie') continue; // skip cookies for simplicity
    if (lower === 'transfer-encoding' || lower === 'content-encoding') continue;
    try { res.setHeader(key, val); } catch {}
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('X-Proxy-By', 'SwiftProxy');
  res.status(fetchRes.status);

  if (contentType.includes('text/html')) {
    let html = await fetchRes.text();
    html = rewriteHtml(html, base, targetUrl);
    return res.send(html);
  } else if (contentType.includes('text/css')) {
    let css = await fetchRes.text();
    css = rewriteCss(css, base);
    return res.send(css);
  } else if (contentType.includes('text/') || contentType.includes('application/javascript') || contentType.includes('application/json')) {
    const text = await fetchRes.text();
    return res.send(text);
  } else {
    const buf = await fetchRes.arrayBuffer();
    return res.send(Buffer.from(buf));
  }
}
