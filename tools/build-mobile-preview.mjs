// Build a separately hosted phone/PWA preview. This does not deploy anything.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
execFileSync(process.execPath, ['tools/build-preview.mjs'], { stdio: 'inherit' });
const out = 'dist/mobile-preview';
fs.mkdirSync(out + '/icons', { recursive: true });
let page = fs.readFileSync('dist/animal-baseball-playtest.html', 'utf8');
page = page.replace('<title>どうぶつベースボール</title>', '<title>どうぶつベースボール・スマホ確認版</title>');
// 確認版は、アクセス計測（Cloudflare Web Analytics）を入れない（本番の表示数に混ぜない）
page = page.replace(/<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->\n?/, '');
// Pages repositories share an origin. Keep preview saves, preferences, links and rooms separate.
page = page.replace(/(['"])(yakyu-[a-z-]+|animal-baseball-story-v2)\1/g, (_, quote, key) => quote + 'mobile-preview-' + key + quote);
page = page.replace(".channel('yakyu-' + code", ".channel('mobile-preview-yakyu-' + code");
page = page.replace("const PAGES_URL = 'https://saboten-apps.github.io/baseball/';", "const PAGES_URL = new URL('./', location.href).href;");
page = page.replace('</head>', `<link rel="manifest" href="manifest.webmanifest">
<style>#overlay.logo::after { content: 'スマホ確認版'; font: 12px sans-serif; color: #a6d7c8; letter-spacing: .1em; }</style>
</head>`);
page = page.replace('</body>', `<script>
if ('serviceWorker' in navigator && window.isSecureContext) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
</script></body>`);
fs.writeFileSync(out + '/index.html', page);
const manifest = {
  id: './', name: 'どうぶつベースボール・スマホ確認版', short_name: 'どうぶつ確認版', lang: 'ja',
  description: '本番と別のURLで遊ぶ開発中の確認版', start_url: './', scope: './', display: 'standalone',
  orientation: 'portrait', theme_color: '#0a1815', background_color: '#0a1815',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};
fs.writeFileSync(out + '/manifest.webmanifest', JSON.stringify(manifest, null, 2));
for (const icon of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) {
  fs.copyFileSync('docs/icons/' + icon, out + '/icons/' + icon);
}
const version = createHash('sha256').update(page).digest('hex').slice(0, 12);
const worker = `const PREFIX = 'animal-baseball-phone:' + new URL(self.registration.scope).pathname + ':';
const CACHE = PREFIX + '${version}';
const CORE = ['./index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html', copy))); }
      return response;
    }).catch(() => caches.match('./index.html')));
  } else event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
`;
fs.writeFileSync(out + '/sw.js', worker);
fs.writeFileSync(out + '/.nojekyll', '');
fs.writeFileSync(out + '/_headers', '/index.html\n  Cache-Control: no-cache\n/sw.js\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Cache-Control: no-cache\n');
// Netlify Drop and other static hosts recognize index.html at the ZIP root.
if (process.platform === 'win32') {
  execFileSync('powershell.exe', ['-NoProfile', '-Command',
    "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip = [IO.Path]::GetFullPath('dist/mobile-preview.zip'); if ([IO.File]::Exists($zip)) { [IO.File]::Delete($zip) }; [IO.Compression.ZipFile]::CreateFromDirectory([IO.Path]::GetFullPath('dist/mobile-preview'), $zip)"], { stdio: 'inherit' });
} else execFileSync('python3', ['-c', `from pathlib import Path
import zipfile
root = Path('dist/mobile-preview')
with zipfile.ZipFile('dist/mobile-preview.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    names = ['index.html', 'manifest.webmanifest', 'sw.js', '_headers', '.nojekyll', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png']
    for name in names: archive.write(root / name, name)
`], { stdio: 'inherit' });
console.log('Phone preview ready: dist/mobile-preview.zip (static host upload). No remote site was created or updated.');
