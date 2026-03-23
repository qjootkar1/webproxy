export const config = { runtime: 'nodejs20.x', maxDuration: 30 };

const STRIP = new Set([
  'content-security-policy','content-security-policy-report-only',
  'x-frame-options','x-content-type-options','strict-transport-security',
  'permissions-policy','cross-origin-embedder-policy','cross-origin-opener-policy',
  'cross-origin-resource-policy','expect-ct','feature-policy','referrer-policy',
  'transfer-encoding','content-encoding','set-cookie','connection','keep-alive',
  'trailer','upgrade',
]);

function abs(href, base) {
  if (!href) return null;
  const t = href.trim();
  if (!t || /^(data:|javascript:|mailto:|tel:|#|blob:)/.test(t)) return null;
  try { return new URL(t, base).href; } catch { return null; }
}
function px(url) { return '/api/proxy?url=' + encodeURIComponent(url); }

function rewriteHtml(html, base) {
  html = html.replace(/<meta[^>]+http-equiv\s*=\s*["'](?:Content-Security-Policy|X-Frame-Options)["'][^>]*\/?>/gi, '');
  html = html.replace(/\s+integrity\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s+crossorigin(?:\s*=\s*["'][^"']*["'])?/gi, '');
  html = html.replace(/(\s(?:href|src|action|data-src|data-href))\s*=\s*"([^"]*)"/gi, (m,a,v)=>{const r=abs(v,base);return r?`${a}="${px(r)}"`  :m;});
  html = html.replace(/(\s(?:href|src|action|data-src|data-href))\s*=\s*'([^']*)'/gi, (m,a,v)=>{const r=abs(v,base);return r?`${a}='${px(r)}'`:m;});
  html = html.replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi,(m,q,u)=>{const r=abs(u,base);return r?`url(${q}${px(r)}${q})`:m;});

  const script = `<script>
(function(){
  var B='${base}';
  var _f=window.fetch;
  window.fetch=function(u,o){try{var a=new URL(String(u),B).href;if(a.indexOf(location.origin)!==0)return _f('/api/proxy?url='+encodeURIComponent(a),o);}catch(e){}return _f.apply(this,arguments);};
  var _o=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(m,u){try{var a=new URL(String(u),B).href;if(a.indexOf(location.origin)!==0)arguments[1]='/api/proxy?url='+encodeURIComponent(a);}catch(e){}return _o.apply(this,arguments);};
  document.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(!a)return;var h=a.href;if(h&&h.indexOf(location.origin)!==0&&h.indexOf('/api/proxy')!==0){e.preventDefault();location.href='/api/proxy?url='+encodeURIComponent(h);}},true);
  document.addEventListener('submit',function(e){var f=e.target,ac=f.action||B;try{ac=new URL(ac,B).href;}catch(e2){}if(ac.indexOf(location.origin)!==0){e.preventDefault();var d=new FormData(f);if((f.method||'get').toLowerCase()==='get'){location.href='/api/proxy?url='+encodeURIComponent(ac+'?'+new URLSearchParams(d));}else{var x=new XMLHttpRequest();x.open('POST','/api/proxy?url='+encodeURIComponent(ac));x.send(d);}}},true);
})();
<\/script>`;

  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, script+'</body>') : html+script;
  if (!/<base\s/i.test(html)) {
    html = /<head[^>]*>/i.test(html) ? html.replace(/(<head[^>]*>)/i,`$1\n<base href="${base}">`) : `<base href="${base}">`+html;
  }
  return html;
}

function rewriteCss(css, base) {
  return css.replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi,(m,q,u)=>{const r=abs(u,base);return r?`url(${q}${px(r)}${q})`:m;});
}

const ERR_HTML = (msg) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>오류</title>
<style>body{font-family:sans-serif;background:#05070f;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.b{text-align:center;max-width:440px;padding:40px}.i{font-size:56px;margin-bottom:16px}h2{color:#f87171;margin-bottom:12px}p{color:#64748b;margin-bottom:24px;line-height:1.6}
a{background:#38bdf8;color:#05070f;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:700;display:inline-block}</style></head>
<body><div class="b"><div class="i">⚠️</div><h2>연결 실패</h2><p>${msg}</p><a href="/">← 홈으로 돌아가기</a></div></body></html>`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let rawUrl = req.query.url || '';
  if (!rawUrl) return res.status(400).setHeader('Content-Type','text/html').send(ERR_HTML('URL을 입력해주세요.'));

  try { rawUrl = decodeURIComponent(rawUrl); } catch {}
  if (!/^https?:\/\//i.test(rawUrl)) rawUrl = 'https://' + rawUrl;

  let target;
  try { target = new URL(rawUrl); }
  catch { return res.status(400).setHeader('Content-Type','text/html').send(ERR_HTML('잘못된 URL입니다: ' + rawUrl)); }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': req.headers['accept'] || 'text/html,application/xhtml+xml,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Cache-Control': 'no-cache',
  };

  const ref = req.headers['referer'];
  if (ref) { try { const p = new URL(ref).searchParams.get('url'); if(p) headers['Referer'] = decodeURIComponent(p); } catch {} }
  if (req.headers['cookie']) headers['Cookie'] = req.headers['cookie'];

  let upstream;
  try {
    upstream = await fetch(target.href, {
      method: ['GET','POST','HEAD'].includes(req.method) ? req.method : 'GET',
      headers,
      body: req.method === 'POST' ? req.body : undefined,
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
  } catch (err) {
    return res.status(502).setHeader('Content-Type','text/html').send(
      ERR_HTML(`<b>${target.hostname}</b> 에 연결할 수 없습니다.<br><br>사이트가 다운되었거나 접근을 차단했을 수 있습니다.<br><small>${err.message}</small>`)
    );
  }

  const finalBase = upstream.url || target.href;
  let base; try { base = new URL(finalBase).href; } catch { base = target.href; }
  const ct = upstream.headers.get('content-type') || 'application/octet-stream';

  for (const [k,v] of upstream.headers.entries()) {
    const lk = k.toLowerCase();
    if (STRIP.has(lk)) continue;
    if (lk === 'location') {
      try { res.setHeader('Location', px(new URL(v, base).href)); } catch { res.setHeader('Location', v); }
      continue;
    }
    try { res.setHeader(k, v); } catch {}
  }
  res.setHeader('Content-Type', ct);
  res.setHeader('X-Proxy','SwiftProxy');
  res.status(upstream.status);

  if (req.method === 'HEAD') return res.end();

  if (ct.includes('text/html')) {
    const text = await upstream.text();
    return res.setHeader('Content-Type','text/html; charset=utf-8').send(rewriteHtml(text, base));
  }
  if (ct.includes('text/css')) {
    return res.send(rewriteCss(await upstream.text(), base));
  }
  if (ct.includes('text/') || ct.includes('application/javascript') || ct.includes('application/json') || ct.includes('xml')) {
    return res.send(await upstream.text());
  }
  return res.send(Buffer.from(await upstream.arrayBuffer()));
}
