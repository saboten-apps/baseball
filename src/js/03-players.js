

/* ===== players: chibi animals (home = shiba inu, away = panda) posed from the same joints ===== */
const _Y = V(0, 1, 0), _d = V();
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
// Matte plush materials use the provided gallery's palette under the existing stadium lights.
const toon = (c, map) => new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(c).convertSRGBToLinear().multiplyScalar(0.85), roughness: 1 }, map ? { map } : null));
function jerseyTex(base, trim, pin) {
  return canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    if (pin) {
      g.fillStyle = trim; g.globalAlpha = 0.18;
      for (let x = 4; x < w; x += 8) g.fillRect(x, 0, 1.5, h);
      g.globalAlpha = 1;
    }
    g.fillStyle = trim;
    g.fillRect(0, 0, w, 7);                                      // 首元のリブ
    g.fillRect(w * 0.25 - 2, 7, 4, h);                           // 前立て（ボタンライン）
    g.fillRect(0, h - 5, w, 5);                                  // 裾ライン
  });
}
// 縞模様：腕（輪っか状）としっぽ（長さ方向の帯）。キャラの毛色に暗い縞をのせる
function stripeTex(base, ink, tail) {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = ink;
    for (let i = 0; i < 4; i++) {
      const a = 6 + i * 15;
      if (tail) g.fillRect(a, 0, 7, h); else g.fillRect(0, a, w, 7);
    }
  });
}
const SPECIES = {
  shiba: { HEAD: '#ed963f', MUZ: '#fff6e8', EARC: '#e48a3e', EARIN: '#f6c9b4', LIMB: '#e48a3e', PAW: '#fff6e8', TAIL: '#e48a3e', PATCH: '#e48a3e', NOSE: '#2a1d19', CHEST: '#fff6e8', ear: 'cone', earS: [0.075, 0.16], muzS: [0.12, 0.086, 0.102], tail: 'curl', hl: 0.011, bulk: 1 },
  panda: { HEAD: '#f7f5ef', MUZ: '#ffffff', EARC: '#26282e', EARIN: '#26282e', LIMB: '#26282e', PAW: '#26282e', TAIL: '#f7f5ef', PATCH: '#141519', NOSE: '#1e1a1d', CHEST: '#f7f5ef', ear: 'round', muzS: [0.116, 0.086, 0.092], tail: 'ball', hl: 0.014, bulk: 1.07 },
  neko:  { HEAD: '#b8bdc2', MUZ: '#fff1dc', EARC: '#b8bdc2', EARIN: '#f2b6bf', LIMB: '#b8bdc2', PAW: '#fff1dc', TAIL: '#b8bdc2', PATCH: '#ad4a0e', NOSE: '#d96b78', CHEST: '#fff1dc', ear: 'cone', earS: [0.072, 0.125], muzS: [0.106, 0.078, 0.082], tail: 'long', hl: 0.012, bulk: 0.94, lineK: 1 },
  usagi: { HEAD: '#f5f1ea', MUZ: '#ffffff', EARC: '#f5f1ea', EARIN: '#f4b8c4', LIMB: '#f5f1ea', PAW: '#ffffff', TAIL: '#ffffff', PATCH: '#f5f1ea', NOSE: '#e87a90', CHEST: '#ffffff', ear: 'long', muzS: [0.102, 0.076, 0.08], tail: 'fluff', hl: 0.013, bulk: 0.93 },
  kuma:  { HEAD: '#a8683a', MUZ: '#ecc89a', EARC: '#a8683a', EARIN: '#ecc89a', LIMB: '#a8683a', PAW: '#7a4a28', TAIL: '#a8683a', PATCH: '#a8683a', NOSE: '#241712', CHEST: '#fff3d1', ear: 'round', muzS: [0.126, 0.092, 0.106], tail: 'ball', hl: 0.011, bulk: 1.14 },
  human: { HEAD: '#fad9be', MUZ: '#fad9be', EARC: '#fad9be', EARIN: '#fad9be', LIMB: '#fad9be', PAW: '#fad9be', TAIL: '#fad9be', PATCH: '#fad9be', NOSE: '#df9c82', CHEST: '#fad9be', ear: 'none', muzS: [0.06, 0.04, 0.04], tail: 'none', hl: 0.012, bulk: 1.04 }
};
// Additional designs in the supplied eight-character gallery. Panda remains for existing teams.
SPECIES.tiger = { ...SPECIES.neko, HEAD: '#ed963f', EARC: '#ed963f', LIMB: '#ed963f', TAIL: '#ed963f', MUZ: '#fff5e7', ear: 'round', stripe: '#302b2a', NOSE: '#29252a' };
SPECIES.floppy = { ...SPECIES.usagi, HEAD: '#f2dfbf', EARC: '#f2dfbf', LIMB: '#f2dfbf', ear: 'floppy' };
SPECIES.alien = { ...SPECIES.shiba, HEAD: '#8bdcb6', EARC: '#8bdcb6', LIMB: '#8bdcb6', PAW: '#8bdcb6', TAIL: '#8bdcb6', MUZ: '#8bdcb6', ear: 'none', tail: 'long', NOSE: '#53c7b6' };
const UNIFORM = {
  home: { species: 'shiba', JERSEY: '#f3eee2', PANTS: '#ebe6da', CAP: '#c8361f', SOCK: '#c8361f', pin: true, SCARF: '#e55d58' },
  away: { species: 'panda', JERSEY: '#24467d', PANTS: '#dde2ea', CAP: '#162845', SOCK: '#162845' },
  neko: { species: 'neko', JERSEY: '#5a3f86', PANTS: '#e4e0ea', CAP: '#3a2268', SOCK: '#2e1f4a', pin: true, SCARF: null },
  usagi: { species: 'usagi', JERSEY: '#2c7a58', PANTS: '#e2ebe5', CAP: '#18432f', SOCK: '#18432f', SCARF: '#a78bd5' },
  kuma: { species: 'kuma', JERSEY: '#2a2b30', PANTS: '#d9d6cc', CAP: '#18191c', SOCK: '#c9a227' },
  human: { species: 'human', JERSEY: '#16181f', PANTS: '#2a2d36', CAP: '#0e1014', SOCK: '#2b78dc' }
};
UNIFORM.tiger = { ...UNIFORM.home, species: 'tiger', SCARF: '#53c7b6', CAP: '#53a99b' };
UNIFORM.floppy = { ...UNIFORM.usagi, species: 'floppy', SCARF: '#53c7b6' };
UNIFORM.alien = { species: 'alien', JERSEY: '#5598dc', PANTS: '#fff5e7', CAP: '#5598dc', SOCK: '#e55d58' };
const MATS = {};
for (const team in UNIFORM) {
  const U = UNIFORM[team], S = SPECIES[U.species], m = {};
  ['HEAD', 'MUZ', 'EARC', 'EARIN', 'LIMB', 'PAW', 'TAIL', 'PATCH', 'NOSE', 'CHEST'].forEach(r => { m[r] = toon(S[r]); });
  ['PANTS', 'CAP', 'SOCK'].forEach(r => { m[r] = toon(U[r]); });
  m.SCARF = toon(U.SCARF || '#ffffff'); m.BOW = toon('#ef9eae'); m.ACCENT = toon('#f4cf65');
  if (S.lineK) m.LINE = new THREE.MeshBasicMaterial({ color: '#0c0605', side: THREE.BackSide });   // 太い輪郭は黒に近い色で
  if (S.stripe) { m.LIMB = toon('#ffffff', stripeTex(S.LIMB, S.stripe, false)); m.TAIL = toon('#ffffff', stripeTex(S.TAIL, S.stripe, true)); }
  m.JERSEY = toon('#ffffff', jerseyTex(U.JERSEY, U.SOCK, U.pin));
  MATS[team] = m;
}
const COMMON = {
  EYE: toon('#1b1a1f'), NOSE: toon('#2a1d19'), SHOE: toon('#1e2026'), GLOVE: toon('#8a5428'),
  HL: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  TOOTH: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  HAIR: toon('#1e1a18'),
  BLUSH: new THREE.MeshBasicMaterial({ color: '#ff7f8f', transparent: true, opacity: 0.62, depthWrite: false }),
  LINE: new THREE.MeshBasicMaterial({ color: '#3a2a24', side: THREE.BackSide }),      // 輪郭線（裏面を少し大きく描く）
  MOUTH: new THREE.MeshBasicMaterial({ color: '#3a2420' })
};
const geoCache = {};
const cylGeo = (a, b) => geoCache[a + '_' + b] || (geoCache[a + '_' + b] = new THREE.CylinderGeometry(b, a, 1, 8));
const SPH = new THREE.SphereGeometry(1, 14, 10), SPL = new THREE.SphereGeometry(1, 8, 6);
const CAPG = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
const HELG = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58);
const BRIM = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, -Math.PI / 2, Math.PI);
const EARG = new THREE.ConeGeometry(1, 1, 8);
const CURL = new THREE.TorusGeometry(0.055, 0.03, 6, 10, Math.PI * 1.6);
const LONGT = new THREE.TorusGeometry(0.105, 0.022, 6, 10, Math.PI * 0.85);
const SCARFG = new THREE.TorusGeometry(0.15, 0.04, 6, 14), KNOTG = new THREE.ConeGeometry(0.06, 0.13, 6);
const MOUTHG = new THREE.TorusGeometry(0.022, 0.0055, 4, 8, Math.PI);   // ω の片側
/* ===== 顔：目・まゆ・ほっぺ・どうぶつ別の特徴を頭の球面に貼る絵にして、表情ごとに絵を切り替える =====
   絵は 横=頭の正面±0.75rad、縦=上から1.05〜2.15rad の範囲。pandaは目の周りが黒いので線を白くする */
const FACE_EX = ['normal', 'blink', 'focus', 'joy', 'shout', 'wow', 'sad', 'smile'];
const FACE_MOUTH = { joy: [0.03, 0.026], shout: [0.04, 0.034], wow: [0.017, 0.022] };   // 口を開ける表情（それ以外は閉じた口）
const FACEG = new THREE.SphereGeometry(1, 12, 8, Math.PI / 2 - 0.75, 1.5, 1.05, 1.1);
function drawFace(ex, sp) {
  const light = sp === 'panda';
  const w = 256, h = 192, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'), X = a => w * (0.5 + a / 1.5), Y = t => h * (t - 1.05) / 1.1;
  const ink = light ? '#0c0c10' : '#1c1620', line = light ? '#f6f3ea' : '#2a1d22';
  const EA = 0.38, EY = 1.6, sides = [-1, 1];
  c.lineCap = c.lineJoin = 'round';
  const dot = (x, y, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); };
  // どうぶつ別のベース模様（麻呂眉・額のトラ縞・猫ひげ・柴の裏白）
  if (sp === 'shiba') {
    sides.forEach(s => {
      dot(X(s * 0.62), Y(2.03), 28, 14, 'rgba(255,246,232,0.88)');
      c.save(); c.translate(X(s * 0.27), Y(1.29)); c.rotate(s * 0.18); dot(0, 0, 13, 8, '#fff6e8'); c.restore();
    });
  } else if (sp === 'neko' || sp === 'tiger') {
    c.strokeStyle = '#9a5822'; c.lineWidth = 6.5;
    (sp === 'tiger' ? [-0.18, 0, 0.18] : []).forEach((a, i) => { c.beginPath(); c.moveTo(X(a), Y(1.08)); c.lineTo(X(a * 0.85), Y(i === 1 ? 1.29 : 1.25)); c.stroke(); });
    sides.forEach(s => {
      c.strokeStyle = '#3a241c'; c.lineWidth = 4.2;
      [0, 1].forEach(j => { c.beginPath(); c.moveTo(X(s * 0.48), Y(1.87 + j * 0.09)); c.lineTo(X(s * 0.72), Y(1.84 + j * 0.12)); c.stroke(); });
    });
  }
  const hasBrow = sp === 'kuma' || sp === 'human';
  const eye = (s, rx, ry, sparkle) => {
    const x = X(s * EA), y = Y(EY);
    if (sp === 'human') { rx *= 0.85; ry *= 0.82; }
    if ((sp === 'usagi' || sp === 'floppy')) {
      ry += 2;
      c.strokeStyle = line; c.lineWidth = 4.5; c.beginPath();
      c.moveTo(x + s * (rx - 2), y - ry * 0.45); c.lineTo(x + s * (rx + 7), y - ry * 0.68); c.stroke();
    }
    if (sp === 'alien') { rx *= 1.15; ry *= 1.35; }
    else dot(x, y, rx * 1.28, ry * 1.20, '#fff5e7');
    dot(x, y, rx, ry, ink);
    dot(x + rx * 0.3, y - ry * 0.36, rx * 0.36, rx * 0.36, '#fff');
    dot(x - rx * 0.36, y + ry * 0.4, rx * 0.15, rx * 0.15, '#fff');
    if (sparkle) dot(x - rx * 0.1, y + ry * 0.05, rx * 0.1, rx * 0.1, '#fff');
  };
  const arc = (s, up) => {
    const x = X(s * EA), y = Y(EY);
    c.strokeStyle = line; c.lineWidth = 9; c.beginPath();
    if (up) c.arc(x, y + 8, 24, Math.PI * 1.12, Math.PI * 1.88); else c.arc(x, y - 12, 24, Math.PI * 0.12, Math.PI * 0.88);
    c.stroke();
  };
  const brow = (s, inner, outer, w0) => {        // inner/outer = まゆの内側・外側の高さ（上が小さい）
    const x = X(s * EA), y = Y(EY);
    c.strokeStyle = sp === 'kuma' ? '#24140e' : sp === 'human' ? '#221915' : '#3a2620';
    c.lineWidth = w0 || (sp === 'kuma' ? 9.5 : sp === 'human' ? 7.5 : 7); c.beginPath();
    c.moveTo(x - s * 24, y - inner); c.lineTo(x + s * 24, y - outer); c.stroke();
  };
  const blush = k => { if (sp !== 'human' && sp !== 'alien') sides.forEach(s => dot(X(s * 0.68), Y(1.92), 24 * k, 13 * k, 'rgba(255,116,138,0.62)')); };
  if (ex === 'normal') { sides.forEach(s => { eye(s, 28, 34); if (hasBrow) brow(s, 42, 50); }); blush(1); }
  else if (ex === 'smile') { sides.forEach(s => { eye(s, 28, 34, true); if (hasBrow) brow(s, 44, 50); }); blush(1.25); }
  else if (ex === 'blink') { sides.forEach(s => { arc(s, false); if (hasBrow) brow(s, 43, 50); }); blush(1); }
  else if (ex === 'joy') { sides.forEach(s => arc(s, true)); blush(1.3); }
  else if (ex === 'focus') { sides.forEach(s => { eye(s, 26, 29); brow(s, 42, 54); }); blush(0.8); }
  else if (ex === 'shout') {
    sides.forEach(s => { const x = X(s * EA), y = Y(EY); c.strokeStyle = line; c.lineWidth = 9; c.beginPath();
      c.moveTo(x - s * 24, y - 24); c.lineTo(x + s * 18, y); c.lineTo(x - s * 24, y + 24); c.stroke(); brow(s, 44, 54); });
    blush(1.1);
  }
  else if (ex === 'wow') { sides.forEach(s => { eye(s, 32, 38); brow(s, 58, 50); }); blush(0.8); }
  else if (ex === 'sad') { sides.forEach(s => { eye(s, 28, 33); brow(s, 54, 40); }); dot(X(-0.5), Y(1.78), 5, 8, 'rgba(170,215,255,0.9)'); blush(0.5); }
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 2; return t;
}
const FACE_MATS = {};
Object.keys(SPECIES).forEach(sp => {
  FACE_MATS[sp] = {};
  FACE_EX.forEach(ex => {
    FACE_MATS[sp][ex] = new THREE.MeshBasicMaterial({ map: drawFace(ex, sp), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  });
});
COMMON.FACE = FACE_MATS.shiba.normal; COMMON.MOUTHO = new THREE.MeshBasicMaterial({ color: '#5a1c24' });
function setFace(f, ex) {
  if (f.ex === ex) return; f.ex = ex;
  setPlushShibaFace(f,ex);
  const sp = f.sp || 'shiba';
  f.face.material = (FACE_MATS[sp] || FACE_MATS.shiba)[ex];
  if (f.coneEar) {
    const p = ex === 'sad' ? -0.22 : (ex === 'joy' || ex === 'smile') ? 0.12 : 0;
    const tx = (ex === 'focus' || ex === 'shout') ? 0.12 : ex === 'sad' ? -0.1 : 0;
    f.coneEar.forEach((e, i) => { const s = i ? 1 : -1; e.rotation.set(tx, 0, (-0.05 + p) * s); });
    f.longEar.forEach((e, i) => { const s = i ? 1 : -1; e.rotation.set(tx, 0, ((f.sp === 'floppy' ? -2.0 : -0.12) + p * 0.9) * s); });
  }
  if (!f.mouthO) return;
  const o = FACE_MOUTH[ex];
  f.mouthO.visible = !!o; f.mouths.forEach(m => { m.visible = !o && sp !== 'alien'; });
  if (f.tooth) f.tooth.visible = !o && (sp === 'usagi' || sp === 'floppy');
  if (o) f.mouthO.scale.set(o[0] * 1.4, o[1] * 1.4, 0.018);
}

function makeFig(o) {
  const g = new THREE.Group(); scene.add(g);
  const parts = [];
  const add = (geo, role, parent, sx, sy, sz) => {
    if (geo === SPH && (o.lite || ['EYE', 'NOSE', 'HL', 'BLUSH', 'PAW', 'LIMB', 'PANTS', 'TAIL', 'GLOVE', 'CHEST', 'TOOTH'].includes(role))) geo = SPL;
    const m = new THREE.Mesh(geo, COMMON.EYE); m.castShadow = !!o.shadow && SHADOWS && !['HL', 'BLUSH', 'LINE', 'MOUTH', 'MOUTHO', 'EYE', 'FACE', 'CHEST', 'TOOTH'].includes(role);
    m.userData.role = role; (parent || g).add(m); parts.push(m);
    if (sx !== undefined) m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
    return m;
  };
  const f = { g, parts, helmet: !!o.helmet };
  f.body = add(SPH, 'JERSEY');
  f.lineB = add(SPH, 'LINE', f.body, 1.05); f.lineB.visible = false;
  if (!o.lite) { f.chest = add(SPH, 'CHEST', f.body, 0.42, 0.28, 0.18); f.chest.position.set(0, 0.36, 0.88); }
  f.belt = add(cylGeo(0.2, 0.2), 'CAP');
  buildMascotHead(f, add, o);
  f.ua = [add(cylGeo(0.096, 0.088), 'JERSEY'), add(cylGeo(0.096, 0.088), 'JERSEY')];
  f.fa = [add(cylGeo(0.085, 0.075), 'LIMB'), add(cylGeo(0.085, 0.075), 'LIMB')];
  f.ej = o.lite ? null : [add(SPH, 'LIMB'), add(SPH, 'LIMB')];
  f.paw = [add(SPH, 'PAW'), add(SPH, 'PAW')];
  f.th = [add(cylGeo(0.122, 0.108), 'PANTS'), add(cylGeo(0.122, 0.108), 'PANTS')];
  f.sh = [add(cylGeo(0.10, 0.088), 'SOCK'), add(cylGeo(0.10, 0.088), 'SOCK')];
  f.kj = o.lite ? null : [add(SPH, 'PANTS'), add(SPH, 'PANTS')];
  f.shoe = [add(SPH, 'SHOE'), add(SPH, 'SHOE')];
  f.curl = add(CURL, 'TAIL'); f.longT = add(LONGT, 'TAIL'); f.ball = add(SPH, 'TAIL');
  if (o.glove) f.mitt = add(SPH, 'GLOVE');
  setTeam(f, o.team);
  return f;
}
const U_SCARF = team => UNIFORM[team].SCARF;
function setTeam(f, team) {
  const sp = UNIFORM[team].species, M = MATS[team], S = SPECIES[sp];
  f.team = team; f.sp = sp;
  f.parts.forEach(m => { const r = m.userData.role; m.material = M[r] || COMMON[r]; });
  if (f.muz) { f.muz.visible = !['human', 'alien', 'neko', 'usagi', 'floppy'].includes(sp); f.muz.scale.set(sp === 'kuma' ? 0.21 : 0.25, 0.14, 0.075); }
  f.nose.position.y = sp === 'alien' ? -0.14 : -0.07;
  f.nose.scale.set(sp === 'alien' ? 0.05 : 0.04, sp === 'alien' ? 0.025 : 0.03, 0.025);
  f.hair.forEach(m => { m.visible = sp === 'human'; });
  if (f.chest) f.chest.visible = true;
  f.coneEar.forEach(e => { e.visible = S.ear === 'cone'; });
  f.longEar.forEach((e, i) => { e.visible = S.ear === 'long' || S.ear === 'floppy'; e.position.x = (i ? 1 : -1) * (sp === 'floppy' ? 0.30 : 0.17); });
  f.roundEar.forEach(e => { e.visible = S.ear === 'round'; });
  f.antennae.forEach(e => { e.visible = sp === 'alien'; });
  f.bow.visible = sp === 'neko' || sp === 'kuma';
  f.scarf.visible = !!U_SCARF(team); f.knot.visible = f.scarf.visible;
  f.cap.visible = f.brim.visible = sp === 'alien' || f.helmet;
  const lk = S.lineK || 1; f.lineB.scale.setScalar(1 + 0.05 * lk); f.lineH.scale.setScalar(1 + 0.055 * lk);
  f.panda = sp === 'panda';
  f.patch.forEach(p => { p.visible = f.panda; });
  f.ex = null; setFace(f, 'normal');
  f.curl.visible = S.tail === 'curl'; f.longT.visible = S.tail === 'long'; f.ball.visible = S.tail === 'fluff' || S.tail === 'ball';
}

/* 表情の切り替え。まばたきは見た目だけなので専用の乱数を使う（withSeed中でもずれない） */
let faceS = 777;
const faceRnd = () => (faceS = (Math.imul(faceS, 1664525) + 1013904223) >>> 0) / 4294967296;
const BLINKABLE = { normal: 1, smile: 1, wow: 1, sad: 1 };
function faceFor(f, ex, now) {
  if (f.beastOn) ex = 'shout';
  const b = f.bk || (f.bk = { next: now + 0.5 + faceRnd() * 3, until: 0 });
  if (now >= b.next) { b.until = now + 0.13; b.next = now + 2 + faceRnd() * 4; }
  setFace(f, now < b.until && BLINKABLE[ex] ? 'blink' : ex);
}

/* chibi proportions: squash the human joint heights toward the ground; the batter keeps hands on the bat */
const SQ = 0.70, LEG_SQ = 0.46, HIP_H = 0.9, HEAD_K = 0.88;   // 自然で引き締まった二頭身ちびキャラ
const sqY = (y, base) => { const r = y - base; return base + (r < HIP_H ? r * LEG_SQ : HIP_H * LEG_SQ + (r - HIP_H) * SQ); };
function squashJ(J, base, keepHands) {
  const o = {};
  const pelvis = J.pelvis, neck = J.neck;
  for (const k in J) {
    const p = J[k].clone();
    if (!(keepHands && (k === 'hL' || k === 'hR'))) p.y = sqY(p.y, base);
    // 肩・腕を胴体の中心軸（neck）に寄せてマスコット体型にする
    if (k === 'sL' || k === 'sR') {
      p.x = neck.x + (p.x - neck.x) * 0.72;
      p.z = neck.z + (p.z - neck.z) * 0.72;
    } else if (!keepHands && (k === 'eL' || k === 'eR' || k === 'hL' || k === 'hR')) {
      p.x = neck.x + (p.x - neck.x) * 0.75;
      p.z = neck.z + (p.z - neck.z) * 0.75;
    }
    // 股関節・膝・足を胴体（pelvis）の下に寄せて短足マスコット化
    if (k === 'hipL' || k === 'hipR') {
      p.x = pelvis.x + (p.x - pelvis.x) * 0.74;
      p.z = pelvis.z + (p.z - pelvis.z) * 0.74;
    } else if (k === 'kL' || k === 'kR' || k === 'fL' || k === 'fR') {
      p.x = pelvis.x + (p.x - pelvis.x) * 0.76;
      p.z = pelvis.z + (p.z - pelvis.z) * 0.76;
    }
    o[k] = p;
  }
  const up = o.head.clone().sub(o.neck).normalize();
  o.head = o.neck.clone().addScaledVector(up, 0.34);
  return o;
}
function seg(m, a, b, w = 1) {
  _d.subVectors(b, a); const L = _d.length() || 1e-4;
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_Y, _d.multiplyScalar(1 / L));
  m.scale.set(w, L, w);
}
function dot(m, p, r) { m.position.copy(p); m.scale.setScalar(r); }
const _a = V(), _b = V();
// Shared low-poly geometry; only the player's active pitcher/batter gains a beast form.
const BEAST_SPIKE = new THREE.ConeGeometry(1, 1, 5);
const BEAST_FUR = mat('#302536'), BEAST_FANG = mat('#fff1ce');
const BEAST_EYE = mat('#ff583d', { emissive: '#ff3210', emissiveIntensity: 1.5 });
// The foreground batter needs a smaller head and a clear lane beside the zone.
function batterHeadFactor(f,active){return f!==batterF?1:f.sp==='floppy'?(active ? .32 : .40):(active ? .45 : .60);}
function fitBatterHead(f,J){
  if(f!==batterF)return;
  const away=(f.beastOn ? .25 : .15)+(f.sp==='floppy' ? .05 : 0);
  f.head.position.copy(J.head);f.head.position.x=(J.head.x<0?-1:1)*Math.min(Math.abs(J.head.x)+away,f.beastOn ? .80 : .72);
  f.head.position.y-=.4*(HEAD_K-f.head.scale.x);
}
function beastForm(f, active) {
  if (active && !f.beastForm) {
    const group = new THREE.Group(); f.head.add(group);
    const piece = (geo, material, x, y, z, sx, sy, sz, angle = 0) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.rotation.z = angle;
      group.add(mesh);
    };
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) piece(BEAST_SPIKE, BEAST_FUR, s * (.32 + i * .025), .22 - i * .14, .05, .12, .29, .13, -s * (1.0 + i * .35));
      piece(BEAST_SPIKE, BEAST_FANG, s * .12, -.23, .39, .045, .18, .045, Math.PI);
      piece(SPL, BEAST_EYE, s * .16, .055, .35, .10, .028, .035, -s * .25);
      piece(BEAST_SPIKE, BEAST_FUR, s * .17, .13, .36, .07, .25, .035, s * 1.2);
    }
    f.beastForm = group;
  }
  if (f.beastForm) f.beastForm.visible = active;
  f.head.scale.setScalar(HEAD_K * (active ? 1.25 : 1) * batterHeadFactor(f,active));
  f.beastOn = active;
  f.cap.visible = f.brim.visible = !active && (f.sp === 'alien' || f.helmet);
  if (active) {
    f.body.scale.x *= 1.65; f.body.scale.z *= 1.45;
    [...f.ua, ...f.fa].forEach(m => { m.scale.x *= 1.55; m.scale.z *= 1.55; });
    f.paw.forEach(m => m.scale.multiplyScalar(1.35));
    f.coneEar.forEach(m => m.scale.y = .48);
  } else f.coneEar.forEach(m => m.scale.y = .36);
}
function poseFig(f, J, yaw, headYaw) {
  const bk = ((SPECIES[f.sp] && SPECIES[f.sp].bulk) || 1) * (f.star ? 1.06 : 1);
  _d.subVectors(J.neck, J.pelvis); const L = _d.length() || 1e-4;
  f.body.position.addVectors(J.pelvis, J.neck).multiplyScalar(0.5);
  f.body.quaternion.setFromUnitVectors(_Y, _d.multiplyScalar(1 / L));
  f.body.scale.set(0.32 * bk, L * 0.72, 0.28 * bk);
  _a.copy(J.pelvis).addScaledVector(_d, L * 0.02);
  f.belt.position.copy(_a); f.belt.quaternion.copy(f.body.quaternion); f.belt.scale.set(1.15 * bk, 0.038, 1.10 * bk);
  f.head.position.copy(J.head); f.head.rotation.set(0, headYaw, 0);
  seg(f.ua[0], J.sL, J.eL, bk); seg(f.fa[0], J.eL, J.hL);
  seg(f.ua[1], J.sR, J.eR, bk); seg(f.fa[1], J.eR, J.hR);
  if (f.ej) { dot(f.ej[0], J.eL, 0.086); dot(f.ej[1], J.eR, 0.086); }
  dot(f.paw[0], J.hL, 0.096); dot(f.paw[1], J.hR, 0.096);
  [[J.hipL, J.kL, J.fL, 0], [J.hipR, J.kR, J.fR, 1]].forEach(([hp, kn, ft, i]) => {
    seg(f.th[i], hp, kn, bk);
    _a.copy(ft); _a.y += 0.07; seg(f.sh[i], kn, _a);
    if (f.kj) dot(f.kj[i], kn, 0.11);
    f.shoe[i].position.set(ft.x + Math.sin(yaw) * 0.03, ft.y + 0.055, ft.z + Math.cos(yaw) * 0.03);
    f.shoe[i].scale.set(0.118, 0.065, 0.148); f.shoe[i].rotation.set(0, yaw, 0);
  });
  _b.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  _a.copy(J.pelvis).addScaledVector(_b, 0.2); _a.y += 0.06;
  const wag = Math.sin(now_() * 4.5 + (f.helmet ? 0 : 1.7)) * 0.15;
  f.curl.position.copy(_a); f.curl.rotation.set(0, yaw + Math.PI / 2 + wag, 0);
  f.longT.position.copy(_a); f.longT.position.y += 0.03; f.longT.rotation.set(0.25, yaw + Math.PI / 2 + wag * 1.4, -0.35);
  f.ball.position.copy(_a); if ((f.sp === 'usagi' || f.sp === 'floppy')) f.ball.position.y += 0.02; f.ball.scale.setScalar((f.sp === 'usagi' || f.sp === 'floppy') ? 0.082 : 0.06);
  if (f.mitt) { f.mitt.position.copy(J.hL); f.mitt.scale.set(0.1, 0.115, 0.065); f.mitt.rotation.set(0, headYaw, 0); }
  beastForm(f, (f === pitcherF && beastForRole('pit')) || (f === batterF && beastForRole('bat')));
  fitBatterHead(f,J);
  posePlushShiba(f,J,yaw,headYaw);
}

/* ---- right-handed batter ---- */
/* left-handed hitters: everything is planned in right-handed space and mirrored (x -> -x) at the end */
const mirX = v => V(-v.x, v.y, v.z);
/* the batter in the box is held fixed from the pitch until the play is over: the plate appearance ends at contact,
   and the next hitter (maybe left-handed, maybe a star) must not appear while the ball is still in the air */
let shownLeft = false, shownStar = false;
function refreshShown() {
  if (!G || !(phase === 'idle' || phase === 'wait' || phase === 'ready' || phase === 'deliver')) return;
  const B = curBatter(); shownLeft = B.side === 'L'; shownStar = B.star;
  if (B.team && batterF.team !== B.team) setTeam(batterF, B.team);
  batterF.star = !!shownStar; pitcherF.star = !!curPitcher().star;
}
function mirrorJ(J) { const o = {}; for (const k in J) o[k] = mirX(J[k]); return o; }
function makeSwingPlan(C) {
  if (shownLeft) C = mirX(C);
  const hy = clamp(C.y + 0.12, 0.8, 1.3), dy = C.y - hy, hl = Math.sqrt(Math.max(0.05, 0.62 * 0.62 - dy * dy));
  const Gc = V(clamp(C.x - hl, X0 + 0.12, X0 + 0.62), hy, 0.02);
  const dc = C.clone().sub(Gc); dc.z = 0; dc.normalize();
  return [
    { t: 0, G: V(X0 + 0.34, 0.88, 0.24), d: V(0.12, 0.85, 0.5).normalize(), th: -0.2 },
    { t: 0.05, G: V(X0 + 0.30, hy + 0.08, 0.14), d: V(0.15, 0.2, 1).normalize(), th: 0.3 },
    { t: SWING_LEAD, G: Gc, d: dc, th: 0.95 },
    { t: 0.17, G: V(X0 + 0.38, hy + 0.1, -0.24), d: V(0, 0.15, -1).normalize(), th: 1.45 },
    { t: 0.34, G: V(X0 + 0.2, 1.12, -0.12), d: V(-0.7, 0.4, 0.55).normalize(), th: 1.8 }
  ];
}
function slerpVec(a, b, u) {
  const c = clamp(a.dot(b), -1, 1), om = Math.acos(c);
  if (om < 1e-3) return a.clone().lerp(b, u).normalize();
  const s = Math.sin(om);
  return a.clone().multiplyScalar(Math.sin((1 - u) * om) / s).add(b.clone().multiplyScalar(Math.sin(u * om) / s)).normalize();
}
function swingAt(tau, plan) {
  if (tau >= plan[plan.length - 1].t) { const k = plan[plan.length - 1]; return { G: k.G.clone(), dir: k.d.clone(), th: k.th }; }
  let i = 0; while (plan[i + 1].t <= tau) i++;
  const a = plan[i], b = plan[i + 1];
  let u = (tau - a.t) / (b.t - a.t);
  if (i === plan.length - 2) u = easeOut(u);
  return { G: a.G.clone().lerp(b.G, u), dir: slerpVec(a.d, b.d, u), th: lerp(a.th, b.th, u) };
}
/* 打者：体（腰・肩・頭・脚）は本物のモーションキャプチャ（03-motion-bat.js の BAT_MO）、
   手とバットはスイング計画（タップした所にバットが来る）のまま。右打者で作り、左打者は左右反転 */
const BAT_NAMES = ['pelvis', 'neck', 'head', 'sL', 'sR', 'hipL', 'hipR', 'kL', 'kR', 'fL', 'fR'];
const BAT_F = { stride: 12, land: 33, contact: 43, finish: 70 };
let buntK = 0, buntT = 0;
function batterBody(fi) {
  const M = BAT_MO, f = clamp(fi, 0, M.n - 1), i0 = Math.min(M.n - 2, Math.floor(f)), a = f - i0, d = M.d, J = {};
  BAT_NAMES.forEach((n, j) => {
    const b0 = (i0 * 11 + j) * 3, b1 = b0 + 33;
    let x = d[b0] + (d[b1] - d[b0]) * a, y = d[b0 + 1] + (d[b1 + 1] - d[b0 + 1]) * a, z = d[b0 + 2] + (d[b1 + 2] - d[b0 + 2]) * a;
    if (buntK > 0) { const q = M.bunt; x += (q[j * 3] - x) * buntK; y += (q[j * 3 + 1] - y) * buntK; z += (q[j * 3 + 2] - z) * buntK; }
    J[n] = V(x + X0, y, z + 0.06);
  });
  return J;
}
function batterJ(now, k) {
  let G, dir, fi;
  const sw = batAnim && now >= batAnim.t0 ? now - batAnim.t0 : -1;
  if (sw < 0) {
    const w = Math.sin(now * 3) * 0.03 * (k < 0.35 ? 1 : 0);
    G = V(X0 + 0.34, 0.88 + w * 0.3, 0.24); dir = V(0.12 + w, 0.85, 0.5).normalize();
    fi = k < 0.35 ? 0 : k <= 1 ? BAT_F.stride + (BAT_F.land - BAT_F.stride) * (k - 0.35) / 0.65 : BAT_F.land;   // 投手に合わせて足を上げて踏み込む
  } else {
    ({ G, dir } = swingAt(sw, batAnim.plan));
    fi = sw < SWING_LEAD ? BAT_F.land + (BAT_F.contact - BAT_F.land) * sw / SWING_LEAD
      : BAT_F.contact + (BAT_F.finish - BAT_F.contact) * clamp((sw - SWING_LEAD) / 0.4, 0, 1);
  }
  const bunting = isBunting();
  if (bunting) ({ G, dir } = buntGrip());                        // squared around to bunt
  const dtb = clamp(now - buntT, 0, 0.1); buntT = now;
  buntK += ((bunting ? 1 : 0) - buntK) * Math.min(1, dtb * 10);
  if (buntK < 0.01) buntK = 0;
  const B = batterBody(fi);
  const hF = G.clone().addScaledVector(dir, 0.04), hB = G.clone().addScaledVector(dir, 0.12);
  const eF = B.sL.clone().lerp(hF, 0.5).add(V(0.02, -0.12, -0.04)), eB = B.sR.clone().lerp(hB, 0.5).add(V(0, -0.13, 0.06));
  const J = { pelvis: B.pelvis, neck: B.neck, head: B.head, sL: B.sL, sR: B.sR, eL: eF, eR: eB, hL: hF, hR: hB, hipL: B.hipL, hipR: B.hipR, kL: B.kL, kR: B.kR, fL: B.fL, fR: B.fR };
  return shownLeft ? { J: mirrorJ(J), G: mirX(G), dir: mirX(dir) } : { J, G, dir };
}

/* ---- pitcher (built right-handed, mirrored for a lefty). k: 0 set, 0-0.35 leg lift, 0.35-1 stride and arm, 1 release, 1-1.35 follow-through ---- */
function pitcherJ(k) { const J = pitcherJR(k); return lefty() ? mirrorJ(J) : J; }
/* 投球フォーム：本物のモーションキャプチャ（03-motion.js の PITCH_MO）を k で再生する。
   k 0-1 = 足を上げ始めてからリリースまで、1-1.35 = フォロースルー。右投げ。左投げは pitcherJ で左右反転 */
const PJ_NAMES = ['pelvis', 'neck', 'head', 'sL', 'sR', 'eL', 'eR', 'hL', 'hR', 'hipL', 'hipR', 'kL', 'kR', 'fL', 'fR'];
function pitcherJR(k) {
  const M = PITCH_MO, f = clamp(k, 0, 1.35) / M.step, i0 = Math.min(M.n - 2, Math.floor(f)), a = f - i0, d = M.d, J = {};
  PJ_NAMES.forEach((n, j) => {
    const b0 = (i0 * 15 + j) * 3, b1 = b0 + 45;
    J[n] = V(d[b0] + (d[b1] - d[b0]) * a + 0.02, d[b0 + 1] + (d[b1 + 1] - d[b0 + 1]) * a + MOUND_Y, d[b0 + 2] + (d[b1 + 2] - d[b0 + 2]) * a + RUBBER_Z + 0.08);
  });
  return J;
}

/* ---- fielders and runners ---- */
function fielderJ(x, z, yaw, ph, mv, ready, reach) {
  const o = V(x, 0, z), R = v => o.clone().add(rotY(v, yaw)), D = v => rotY(v, yaw);
  const sw = Math.sin(ph) * mv, bob = Math.abs(Math.sin(ph)) * 0.05 * mv;
  const cr = ready * 0.14 * (1 - mv);
  const P = R(V(0, 0.95 - cr + bob, 0));
  const hipL = R(V(0.11, 0.9 - cr + bob, 0)), hipR = R(V(-0.11, 0.9 - cr + bob, 0));
  const sp = 0.13 + 0.14 * ready * (1 - mv);
  const fL = R(V(sp, Math.max(0, sw) * 0.14, sw * 0.4)), fR = R(V(-sp, Math.max(0, -sw) * 0.14, -sw * 0.4));
  const kL = hipL.clone().lerp(fL, 0.5).add(D(V(0.02, 0, 0.1 + cr * 0.8))), kR = hipR.clone().lerp(fR, 0.5).add(D(V(-0.02, 0, 0.1 + cr * 0.8)));
  const N = P.clone().add(D(V(0, 0.47 - cr * 0.4, 0.06 + cr * 0.9 + 0.1 * mv)));
  const sL = N.clone().add(D(V(0.19, -0.03, 0))), sR = N.clone().add(D(V(-0.19, -0.03, 0)));
  let hL, hR;
  if (mv > 0.1) { hL = sL.clone().add(D(V(0.04, -0.4, -sw * 0.35 + 0.08))); hR = sR.clone().add(D(V(-0.04, -0.4, sw * 0.35 + 0.08))); }
  else { hL = sL.clone().add(D(V(0.02, -0.4, 0.2 + cr))); hR = sR.clone().add(D(V(-0.02, -0.4, 0.2 + cr))); }
  if (reach) hL.lerp(N.clone().add(D(V(0.12, 0.42, 0.25))), reach);
  const eL = sL.clone().lerp(hL, 0.5).add(D(V(0.07, 0, -0.05))), eR = sR.clone().lerp(hR, 0.5).add(D(V(-0.07, 0, -0.05)));
  const head = N.clone().add(D(V(0, 0.15, 0.03)));
  return { pelvis: P, neck: N, head, sL, sR, eL, eR, hL, hR, hipL, hipR, kL, kR, fL, fR };
}

const pitcherF = makeFig({ team: 'away', glove: true, shadow: true });
const batterF = makeFig({ team: 'home', helmet: true, shadow: true });
const FPOS = [[22, -24], [10, -37], [-10, -37], [-21, -24], [-45, -85], [0, -95], [45, -85]];
const fielderF = FPOS.map(() => makeFig({ team: 'away', glove: true, lite: true }));
const RUNPOS = [[19.4 - 1.8, -19.4 - 1.8], [0 - 1.8, -38.8 + 1.8], [-19.4 + 1.5, -19.4 + 1.5]];
const runnerF = RUNPOS.map(() => makeFig({ team: 'home', helmet: true, lite: true }));
function updateRunners() {
  runnerF.forEach((f, i) => {
    f.g.visible = !!(G && G.bases[i]);
    const [x, z] = RUNPOS[i], yaw = Math.atan2(-x, -z);
    poseFig(f, squashJ(fielderJ(x, z, yaw, 0, 0, 1, 0), 0), yaw, yaw);
  });
}
function setTeams() {
  const { bat, fld } = teamsNow();
  setTeam(batterF, bat); runnerF.forEach(f => setTeam(f, bat));
  setTeam(pitcherF, fld); fielderF.forEach((f, i) => setTeam(f, story && fld === 'home' ? STORY_BAT[(i + 1) % STORY_BAT.length][5] : fld));
}

/* ---- bat ---- */
const batG = new THREE.Group(); scene.add(batG);
const WOOD = mat('#c99a5c', { roughness: 0.42 });
const batBody = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.0135, 0.84, 18).translate(0, 0.43, 0), WOOD);
const batCap = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.85, 0), WOOD);
const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.02, 14), mat('#2a1c12'));
const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0158, 0.0142, 0.26, 14).translate(0, 0.15, 0), mat('#23242a', { roughness: 0.9 }));
[batBody, batCap, grip].forEach(m => { m.castShadow = SHADOWS; });
batG.add(batBody, batCap, knob, grip);
/* superstar glow: a gold halo behind the star batter (and the star pitcher), and a gold bat */
const auraMat = () => new THREE.SpriteMaterial({ map: ballGlowTex, color: '#ffc845', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const batAura = new THREE.Sprite(auraMat()), pitAura = new THREE.Sprite(auraMat());
scene.add(batAura, pitAura);
let starBatOn = null;
function updateStars(now, bj, pj) {
  const on = !!G && phase !== 'idle', bs = on && shownStar, ps = on && curPitcher().star, pulse = 0.5 + 0.2 * Math.sin(now * 4);
  batAura.visible = bs; pitAura.visible = ps;
  if (bs) { batAura.position.copy(bj.J.pelvis); batAura.position.y += 0.15; batAura.position.z -= 0.3; batAura.scale.setScalar(2.6); batAura.material.opacity = pulse; }
  if (ps) { pitAura.position.copy(pj.pelvis); pitAura.position.z -= 0.4; pitAura.scale.setScalar(2.4); pitAura.material.opacity = pulse * 0.9; }
  if (starBatOn !== bs) {
    starBatOn = bs;
    WOOD.color.set(bs ? '#f2c14e' : '#c99a5c'); WOOD.emissive.set(bs ? '#5a3c00' : '#000000');
  }
}
