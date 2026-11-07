// Build a private, portable playtest. Nothing is uploaded or published.
// Three.js comes from the locked dependency; Supabase stays at build.mjs's pinned version.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(ROOT);
execFileSync(process.execPath, ['build.mjs'], { stdio: 'inherit' });
fs.mkdirSync('dist/vendor', { recursive: true });
const supabase = 'dist/vendor/supabase-2.45.4.js';
if (!fs.existsSync(supabase)) {
  const data = execFileSync('curl', ['--fail', '--location', '--silent', '--show-error',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'], { maxBuffer: 4 * 1024 * 1024 });
  fs.writeFileSync(supabase, data);
}
const safeScript = s => s.replace(/<\/script/gi, '<\\/script');
let page = fs.readFileSync('docs/index.html', 'utf8');
page = page.replace(/<script src="[^"]*three@[^>]+><\/script>/,
  () => '<script>' + safeScript(fs.readFileSync('node_modules/three/build/three.min.js', 'utf8')) + '</script>');
page = page.replace(/<script src="[^"]*supabase-js[^>]+><\/script>/,
  () => '<script src="data:text/javascript;base64,' + fs.readFileSync(supabase).toString('base64') + '"></script>');
page = page.replace(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/, '');
page = page.replace(/<link rel="manifest"[^>]+>/, '');
// 確認版は、アクセス計測（Cloudflare Web Analytics）を入れない
page = page.replace(/<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->\n?/, '');
page = page.replace(/<script>if \('serviceWorker'[\s\S]*?<\/script>/, '');
const mime = { '.mp3': 'audio/mpeg', '.bin': 'application/octet-stream', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const assets = {};
for (const dir of ['audio', 'bgm', 'sfx', 'icons', 'story', 'video']) {
  for (const name of fs.readdirSync('docs/' + dir).sort()) {
    const key = dir + '/' + name, ext = path.extname(name);
    assets[key] = 'data:' + (mime[ext] || 'application/octet-stream') + ';base64,' + fs.readFileSync('docs/' + key).toString('base64');
  }
}
page = page.replace(/href="(icons\/[^"]+)"/g, (all, key) => assets[key] ? 'href="' + assets[key] + '"' : all);
// Story paths are literal JS strings; embed them so pictures also work offline.
page = page.replace(/(['"])(story\/[^'"\s]+\.webp)\1/g, (all, quote, key) => assets[key] ? quote + assets[key] + quote : all);
page = page.replace(/(['"])(video\/[^'"\s]+\.mp4)\1/g, (all, quote, key) => assets[key] ? quote + assets[key] + quote : all);
const runtimeAssets = Object.fromEntries(Object.entries(assets).filter(([key]) => !key.startsWith('story/') && !key.startsWith('video/')));
const bootstrap = `(() => {
  const assets = ${JSON.stringify(runtimeAssets)};
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const value = typeof input === 'string' ? input : input.url;
    const match = String(value).match(/(?:^|\\/)((?:audio|bgm|sfx)\\/[^/?#]+)(?:[?#].*)?$/);
    return nativeFetch(match && assets[match[1]] ? assets[match[1]] : input, init);
  };
  const NativeAudio = window.Audio;
  window.Audio = function(src) { return new NativeAudio(assets[src] || src); };
  window.Audio.prototype = NativeAudio.prototype;
})();`;
page = page.replace('<script>', () => '<script>' + safeScript(bootstrap) + '</script>\n<script>');
const output = 'dist/animal-baseball-playtest.html';
fs.writeFileSync(output, page);
console.log(`Private playtest: ${output} (${(Buffer.byteLength(page) / 1024 / 1024).toFixed(1)} MiB). Open the file in Chrome/Edge; no server is required.`);
