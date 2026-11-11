// Build: inline src/style.css, src/body.html and src/js/*.js (in file-name order) into one page.
//   docs/index.html  -> standalone page served by GitHub Pages
//   dist/artifact.html -> body-only variant for previewing inside Claude (its viewer adds <html>/<head>)
// Usage: node build.mjs
import { statSync, readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
const SUPABASE_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const FONTS = 'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap';

const css = readFileSync('src/style.css', 'utf8');
const body = readFileSync('src/body.html', 'utf8');
const parts = readdirSync('src/js').filter(f => f.endsWith('.js')).sort();
// The files share one scope: they are concatenated inside a single IIFE, which 01-core.js opens and 09-main.js closes.
// Voice clips present in docs/audio are listed in the commentary module, so the page only fetches files that exist.
const voiceIds = existsSync('docs/audio') ? readdirSync('docs/audio').filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4)).sort() : [];
const jsFor = ids => parts.map(f => `/* ---- ${f} ---- */\n` + readFileSync('src/js/' + f, 'utf8')).join('\n').replace('/*VOICE_IDS*/[]', JSON.stringify(ids));
const js = jsFor(voiceIds);

const scriptsFor = code => `<script src="${THREE_URL}"></script>\n<script src="${SUPABASE_URL}"></script>\n<script>\n${code}\n</script>\n`;
const scripts = scriptsFor(js);

// Cloudflare Web Analytics（ページの表示数だけを数える。ゲーム内のイベント計測はしない）。公開ページ（docs/index.html）にだけ入れる。
// 確認版（tools/build-preview.mjs・build-mobile-preview.mjs）は、このタグを取り除く（確認版のアクセスを数えないため）。
const ANALYTICS = `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "07766e8bf1f34c78b7ddf9bce275726f"}'></script><!-- End Cloudflare Web Analytics -->`;

const standalone = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#0a1815">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="どうぶつベースボール">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="description" content="どうぶつたちが戦う3D野球。スマホで遊べて、友達とネット対戦もできる無料ゲーム。">
<meta property="og:type" content="website">
<meta property="og:site_name" content="どうぶつベースボール">
<meta property="og:title" content="どうぶつベースボール - みんなで遊べる3D野球">
<meta property="og:description" content="スマホで遊べる3D野球。招待リンクで友達とネット対戦もできます。無料。">
<meta property="og:url" content="https://baseball.umimachilab.com/">
<meta property="og:image" content="https://baseball.umimachilab.com/icons/ogp.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="どうぶつベースボール - みんなで遊べる3D野球">
<meta name="twitter:description" content="スマホで遊べる3D野球。招待リンクで友達とネット対戦もできます。無料。">
<meta name="twitter:image" content="https://baseball.umimachilab.com/icons/ogp.png">
<title>どうぶつベースボール</title>
<link rel="stylesheet" href="${FONTS}">
<style>
html { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: border-box; }
[hidden] { display: none !important; }
${css}</style>
${ANALYTICS}
</head>
<body>
${body}${scripts}<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));</script>
</body>
</html>
`;

const artifact = `<meta name="claude:viewport-fit-sides" content="cover">
<title>どうぶつベースボール</title>
<link rel="stylesheet" href="${FONTS}">
<style>
${css}</style>
${body}${scriptsFor(jsFor([]))}`;

const manifest = {
  name: 'どうぶつベースボール', short_name: 'どうぶつベースボール', description: 'どうぶつたちの3D野球アクション', lang: 'ja',
  start_url: './', scope: './', display: 'standalone', orientation: 'portrait', background_color: '#0a1815', theme_color: '#0a1815',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};
// Service worker: page = network first (so updates arrive), everything else = cache first, filled as it is used.
// The version changes whenever the page or the voice list changes, which makes browsers replace the old cache.
// the cache name changes whenever the page, the voice clips or the music files change (cached files are served cache-first)
const mediaSig = ['docs/audio', 'docs/bgm', 'docs/sfx', 'docs/story', 'docs/video'].filter(d => existsSync(d)).flatMap(d => readdirSync(d).sort().map(f => d + '/' + f + ':' + statSync(d + '/' + f).size)).join();
const version = createHash('sha1').update(standalone).update(voiceIds.join()).update(mediaSig).digest('hex').slice(0, 10);
const sw = `const CACHE = 'yakyu-${version}';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', '${THREE_URL}', '${SUPABASE_URL}'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { mode: u.startsWith('http') ? 'no-cors' : 'same-origin' })).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.protocol.startsWith('ws') || u.hostname.endsWith('supabase.co') || u.hostname.endsWith('cloudflareinsights.com')) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put('index.html', c)); return res; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.status === 200 || res.type === 'opaque') { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); } return res; })));
});
`;

mkdirSync('docs', { recursive: true });
mkdirSync('dist', { recursive: true });
writeFileSync('docs/index.html', standalone);
writeFileSync('dist/artifact.html', artifact);
writeFileSync('docs/manifest.webmanifest', JSON.stringify(manifest, null, 2));
writeFileSync('docs/sw.js', sw);
console.log(`voice clips: ${voiceIds.length}, sw cache: yakyu-${version}`);
console.log(`built ${parts.length} script parts -> docs/index.html (${standalone.length} chars), dist/artifact.html`);
