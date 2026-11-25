/*
 * WEB DEVICE STUDIO - api/proxy.js  (función serverless de Vercel)
 * Carga tu invitación y le agrega el código de sincronización de scroll,
 * para que "Celular + PC" se deslicen juntos sin tocar tus invitaciones.
 *
 * Opcional: en Vercel > Settings > Environment Variables puedes crear
 *   PROXY_ALLOW = misinvitaciones.vercel.app,otro-dominio.com
 * para que solo cargue esos dominios (recomendado: evita que usen tu proxy para otras webs).
 */
const dns = require('dns').promises;
const net = require('net');

const SNIP = `<script>
(()=>{if(parent===window)return;let ig=0,main=null;const P=t=>parent.postMessage(t,'*');
try{let fe=null;const fire=t=>{['fullscreenchange','webkitfullscreenchange'].forEach(n=>{try{(t&&t.isConnected?t:document).dispatchEvent(new Event(n,{bubbles:true}))}catch(_){}})};
const rq=function(){const t=this;fe=t;setTimeout(()=>fire(t),0);return Promise.resolve()};
const ex=function(){const t=fe;fe=null;setTimeout(()=>fire(t),0);return Promise.resolve()};
['requestFullscreen','webkitRequestFullscreen','webkitRequestFullScreen','mozRequestFullScreen','msRequestFullscreen'].forEach(n=>{Element.prototype[n]=rq});
['exitFullscreen','webkitExitFullscreen','webkitCancelFullScreen','mozCancelFullScreen','msExitFullscreen'].forEach(n=>{Document.prototype[n]=ex});
['fullscreenElement','webkitFullscreenElement','webkitCurrentFullScreenElement','mozFullScreenElement','msFullscreenElement'].forEach(n=>Object.defineProperty(Document.prototype,n,{configurable:true,get:()=>fe}));
['fullscreenEnabled','webkitFullscreenEnabled'].forEach(n=>Object.defineProperty(Document.prototype,n,{configurable:true,get:()=>true}))}catch(_){}
const H=e=>e===document||e===document.documentElement||e===document.body?(document.scrollingElement||document.documentElement):e;
const mx=e=>e.scrollHeight-e.clientHeight;
const find=()=>{if(main&&main.isConnected)return main;const b=document.scrollingElement||document.documentElement;if(mx(b)>20)return main=b;
let best=null,bs=0;document.querySelectorAll('*').forEach(e=>{const o=getComputedStyle(e).overflowY;if((o==='auto'||o==='scroll')&&mx(e)>bs){bs=mx(e);best=e}});return main=best&&bs>20?best:b};
const path=e=>{const a=[];while(e&&e!==document.documentElement){const p=e.parentNode;if(!p)return null;a.unshift([].indexOf.call(p.children,e));e=p}return a};
const get=a=>{let e=document.documentElement;for(const i of a)e=e&&e.children[i];return e};
addEventListener('scroll',e=>{if(Date.now()<ig)return;const t=H(e.target);if(mx(t)<=20)return;main=t;P({wds:'scroll',p:t.scrollTop/mx(t)})},true);
addEventListener('click',e=>{if(e.isTrusted){const a=path(e.target);if(a)P({wds:'click',a})}},true);
['input','change'].forEach(n=>addEventListener(n,e=>{if(e.isTrusted){const a=path(e.target);if(a)P({wds:'input',a,v:e.target.value,c:e.target.checked})}},true));
addEventListener('message',e=>{const d=e.data;if(!d||!d.wds)return;
if(d.wds==='scrollTo'){const t=find();ig=Date.now()+400;t.scrollTo({top:d.p*mx(t),behavior:'instant'})}
else if(d.wds==='click'){const t=get(d.a);if(t){ig=Date.now()+900;t.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}))}}
else if(d.wds==='input'){const t=get(d.a);if(t){if(t.value!==d.v)t.value=d.v;if('checked' in t&&d.c!==undefined)t.checked=d.c;t.dispatchEvent(new Event('input',{bubbles:true}));t.dispatchEvent(new Event('change',{bubbles:true}))}}});
P({wds:'hello'})})();
<\/script>`;

// Enlaces internos: se siguen cargando por el proxy para no perder la sincronización.
const NAV = `<script>
(()=>{document.addEventListener('click',e=>{
if(e.defaultPrevented)return;const a=e.target.closest&&e.target.closest('a[href]');if(!a||a.hasAttribute('download'))return;
const raw=a.getAttribute('href')||'';
if(raw.charAt(0)==='#'){e.preventDefault();let id=raw.slice(1);try{id=decodeURIComponent(id)}catch(_){}const t=id?(document.getElementById(id)||document.getElementsByName(id)[0]):document.documentElement;if(t&&t.scrollIntoView)t.scrollIntoView();return}
if(a.target==='_blank')return;let u;try{u=new URL(a.href)}catch(_){return}
if(u.protocol!=='http:'&&u.protocol!=='https:')return;
if(u.host!==new URL(document.baseURI).host)return;
e.preventDefault();location.href=location.origin+'/api/proxy?url='+encodeURIComponent(u.href)});})();
<\/script>`;

const MAX_BYTES = 5 * 1024 * 1024;

function isPrivateIP(ip) {
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::1' || l === '::') return true;
    if (l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe8') || l.startsWith('fe9') || l.startsWith('fea') || l.startsWith('feb')) return true;
    const m = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return m ? isPrivateIP(m[1]) : false;
  }
  const p = ip.split('.').map(Number);
  return p[0] === 0 || p[0] === 10 || p[0] === 127 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127);
}

async function isAllowed(u) {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const allow = (process.env.PROXY_ALLOW || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (allow.length && !allow.includes(u.hostname.toLowerCase())) return false;
  if (process.env.PROXY_ALLOW_PRIVATE === '1') return true; // solo para pruebas locales
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  const ips = net.isIP(h) ? [{ address: h }] : await dns.lookup(h, { all: true });
  return ips.length > 0 && ips.every(a => !isPrivateIP(a.address));
}

function fail(res, code, msg) {
  res.statusCode = code;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end('<!doctype html><meta charset="utf-8"><body style="font:16px system-ui;background:#111;color:#eee;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><b>' + msg + '</b></div>');
}

module.exports = async (req, res) => {
  const q = new URL(req.url, 'http://x').searchParams;
  if (q.get('ping')) {
    res.statusCode = 200;
    res.setHeader('content-type', 'text/plain');
    res.setHeader('cache-control', 'no-store');
    return res.end('ok');
  }

  let u;
  try { u = new URL(q.get('url')); } catch { return fail(res, 400, 'Enlace no válido'); }

  try {
    let r, hops = 0;
    for (;;) {
      if (!(await isAllowed(u))) return fail(res, 403, 'Este dominio no está permitido');
      r = await fetch(u, {
        redirect: 'manual',
        signal: AbortSignal.timeout(12000),
        headers: { 'user-agent': req.headers['user-agent'] || 'Mozilla/5.0', accept: 'text/html,*/*' }
      });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location') && hops++ < 5) {
        u = new URL(r.headers.get('location'), u);
        continue;
      }
      break;
    }

    const type = r.headers.get('content-type') || '';
    if (!/text\/html/i.test(type)) {
      res.statusCode = 302;
      res.setHeader('location', u.href);
      return res.end();
    }

    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_BYTES) return fail(res, 413, 'La página es demasiado pesada');
    let html = buf.toString('utf8');

    html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, '');
    const base = '<base href="' + u.href.replace(/"/g, '%22') + '">';
    const ins = (re) => { const m = html.match(re); if (!m) return false; const i = m.index + m[0].length; html = html.slice(0, i) + base + html.slice(i); return true; };
    if (!ins(/<head(\s[^>]*)?>/i) && !ins(/<html(\s[^>]*)?>/i) && !ins(/^\s*<!doctype[^>]*>/i)) html = base + html;

    if (!html.includes("wds:'hello'")) {
      const i = html.toLowerCase().lastIndexOf('</body>');
      html = i >= 0 ? html.slice(0, i) + NAV + SNIP + html.slice(i) : html + NAV + SNIP;
    }

    res.statusCode = 200;
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-robots-tag', 'noindex');
    res.end(html);
  } catch (e) {
    fail(res, 502, 'No se pudo cargar la página');
  }
};
