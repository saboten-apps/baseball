#!/usr/bin/env node
// 作業の締めに実行する確認：ビルド → 構文・禁止語・乱数チェック → make-test-page.mjs → smoke.mjs
// 使い方: node tools/check.mjs [--full]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
process.chdir(ROOT);

const full = process.argv.includes('--full');
const t0 = Date.now();
let ok = true;

function runNode(script, label, verifyOut) {
  try {
    const out = execFileSync(process.execPath, [script], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (out.trim()) process.stdout.write(out.endsWith('\n') ? out : out + '\n');
    if (verifyOut && !verifyOut(out)) {
      ok = false;
      console.error(`✗ ${label} の出力検査が失敗`);
      return false;
    }
    return true;
  } catch (e) {
    ok = false;
    if (e.stdout) process.stdout.write(e.stdout);
    if (e.stderr) process.stderr.write(e.stderr);
    console.error(`✗ ${label} が失敗`);
    return false;
  }
}

// 1. node build.mjs
try {
  execFileSync(process.execPath, ['build.mjs'], { cwd: ROOT, stdio: 'ignore' });
  console.log('✓ ビルド成功');
} catch {
  console.error('✗ node build.mjs が失敗');
  process.exit(1);
}

// 2. docs/ の未コミット変更確認
try {
  const docsDiff = execFileSync('git', ['status', '--porcelain', 'docs'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (docsDiff) {
    console.log('! docs/ に未コミットの変更あり（src を変えたなら正常。一緒にコミットすること）');
  }
} catch {}

// 3. docs/index.html の構文チェック
try {
  const s = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf8');
  const scripts = s.match(/<script>([\s\S]*?)<\/script>/g) || [];
  let bad = false;
  for (const tag of scripts) {
    const code = tag.replace(/<\/?script>/g, '');
    try {
      new Function(code);
    } catch (e) {
      bad = true;
      ok = false;
      console.error('✗ 構文エラー:', e.message);
    }
  }
  if (!bad) console.log('✓ docs/index.html の構文OK');
} catch (e) {
  ok = false;
  console.error('✗ docs/index.html の読み込み失敗:', e.message);
}

// 3b. アクセス計測（Cloudflare Web Analytics）：公開ページの <head> に1つだけ。表示数の計測だけで、ゲーム内のイベント計測は入れない
try {
  const s = fs.readFileSync(path.join(ROOT, 'docs/index.html'), 'utf8');
  const head = s.slice(0, s.indexOf('</head>'));
  const tags = s.match(/<script[^>]*cloudflareinsights[^>]*><\/script>/g) || [];
  const problems = [];
  if (tags.length !== 1 || !head.includes(tags[0])) problems.push('計測タグが <head> に1つだけある状態になっていない');
  if (tags[0] && !tags[0].includes('07766e8bf1f34c78b7ddf9bce275726f')) problems.push('計測のトークンが違う');
  if (/cloudflareinsights|\bcfBeacon\b|__cfBeacon/.test(s.replace(tags[0] ?? '', '').replace(/<!-- (End )?Cloudflare Web Analytics -->/g, ''))) problems.push('計測タグ以外に、計測のコードがある（イベント計測は入れない）');
  if (!fs.readFileSync(path.join(ROOT, 'docs/sw.js'), 'utf8').includes("endsWith('cloudflareinsights.com')")) problems.push('サービスワーカーが計測のスクリプトをキャッシュしてしまう');
  if (fs.readFileSync(path.join(ROOT, 'dist/artifact.html'), 'utf8').includes('cloudflareinsights')) problems.push('Claude内プレビュー（dist/artifact.html）に計測タグが入っている');
  if (problems.length) { ok = false; console.error('✗ アクセス計測の確認に失敗:\n  ' + problems.join('\n  ')); }
  else console.log('✓ アクセス計測：公開ページの <head> に1つだけ（表示数の計測のみ・確認版には入れない）');
} catch (e) {
  ok = false;
  console.error('✗ アクセス計測の確認に失敗:', e.message);
}

// 4. 旧ユーザー名チェック
try {
  execFileSync('git', ['grep', '-qi', 'hojo0729', '--', '.', ':!tools/check.sh', ':!tools/check.mjs'], { cwd: ROOT, stdio: 'ignore' });
  ok = false;
  console.error('✗ 旧ユーザー名が残っている');
} catch (e) {
  if (e.status === 1) {
    console.log('✓ 旧ユーザー名なし');
  } else {
    ok = false;
    console.error('✗ git grep の実行に失敗');
  }
}

// 5. 08-commentary.js の Math.random チェック
try {
  const cmt = fs.readFileSync(path.join(ROOT, 'src/js/08-commentary.js'), 'utf8');
  const badLines = cmt.split(/\r?\n/).filter(line => {
    if (!line.includes('Math.random')) return false;
    if (line.includes('使うと') || line.includes('/*') || /^\s*\/\//.test(line)) return false;
    return true;
  });
  if (badLines.length > 0) {
    console.log('! 08-commentary.js に Math.random（実況は専用乱数を使う）');
  }
} catch {}

// 6. テストページ生成 & smoke.mjs
if (!runNode('tools/test/make-test-page.mjs', 'make-test-page.mjs')) {
  process.exit(1);
}
if (runNode('tools/test/smoke.mjs', 'smoke.mjs')) {
  console.log('✓ smoke.mjs 通過');
}

// 7. --full 指定時は thr.js / triples.mjs / hbp.js / tac7.js / online-beast.mjs も実行
if (full && ok) {
  for (const [script, name] of [
    ['tools/test/ball-contact.mjs', 'ball-contact.mjs'],
    ['tools/test/thr.js', 'thr.js'],
    ['tools/test/triples.mjs', 'triples.mjs'],
    ['tools/test/hbp.js', 'hbp.js'],
    ['tools/test/tac7.js', 'tac7.js'],
    ['tools/test/online-beast.mjs', 'online-beast.mjs'],
    ['tools/test/online-rematch.mjs', 'online-rematch.mjs'],
    ['tools/test/online-review.mjs', 'online-review.mjs'],
    ['tools/test/beast-effects.mjs', 'beast-effects.mjs'],
    ['tools/test/pitcher-clearance.mjs', 'pitcher-clearance.mjs'],
    ['tools/test/batter-clearance.mjs', 'batter-clearance.mjs'],
    ['tools/test/star-glow.mjs', 'star-glow.mjs']
  ]) {
    if (runNode(script, name, out => out.trim().endsWith('[]') && !out.includes('DIFF '))) {
      console.log(`✓ ${name} 通過`);
    }
  }
  // テストが出力した一時スクショを掃除
  for (const f of ['thr-slow.png', 'thr-after.png', 'bw-1.png', 'bw-2.png', 'bw-3.png']) {
    try { fs.unlinkSync(path.join(ROOT, f)); } catch {}
  }
}

const sec = ((Date.now() - t0) / 1000).toFixed(1);
if (!ok) {
  console.error(`✗ チェック失敗 (${sec}s)`);
  process.exit(1);
}
console.log(`✓ 全チェック完了 (${sec}s)`);
