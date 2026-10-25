
/* ===== batted ball ===== */
function makePlay(c, C, now) {
  const th = c.dir * D2R, hx = Math.sin(th), hz = -Math.cos(th);
  const grounder = c.launch < 5, isOut = c.kind === 'play' && c.bases === 0, hr = c.bases === 4, foul = c.kind === 'foul';
  const fd = foul ? 999 : fenceDist(hx, hz);
  let dd = Math.min(c.dist, 135);
  if (grounder && isOut) dd = Math.min(dd, rnd(24, 34));
  else if (grounder && !isOut) dd = Math.max(dd, rnd(42, 54));   // ゴロヒットは内野を抜けて転がる
  if (isOut && !grounder) dd = Math.min(dd, fd - 5);
  else if (!isOut && !grounder && !hr && !foul && c.bases > 0) dd = Math.max(dd, 48); // ヒットは内野手の後ろへ落ちる
  if (hr) dd = Math.max(dd, fd + rnd(6, 20));
  if (!hr && !foul) dd = Math.min(dd, fd - 2);
  const S0 = C.clone();
  const L = V(S0.x + hx * dd, 0, S0.z + hz * dd);
  let T, h = 0;
  if (grounder) T = clamp(dd / (c.ev / 3.6 * 0.55), 0.9, 3.0);
  else {
    const la = clamp(c.launch, 6, 78);
    h = Math.max(1.2, dd * Math.tan(la * D2R) / 4);
    T = clamp(2 * Math.sqrt(2 * h / 9.8), 0.8, 5.5);
  }
  const caught = isOut && !grounder;
  let bi = 0, bd = 1e9;
  FPOS.forEach((f, i) => { const q = Math.hypot(f[0] - L.x, f[1] - L.z); if (q < bd) { bd = q; bi = i; } });
  const fr = isOut ? 1 : hr ? 0.35 : foul ? 0.6 : rnd(0.55, 0.8);
  /* スーパープレー：強い当たりのアウトで、たまに野手が飛びつく／跳ぶ（見た目だけ。結果は変えない） */
  let sp = null, endY = caught ? 1.35 : BALL_R;
  if (isOut && !foul && !c.bunt && !c.popup && c.res !== 'ポップフライ' && Math.random() < (trT('fld') === 'neko' ? 0.75 : 0.5)) {
    if (grounder && c.ev >= 110) sp = 'dive';
    else if (caught && c.launch < 24 && c.ev >= 115) { sp = 'dive'; endY = 0.5; }
    else if (caught && Math.hypot(L.x, L.z) >= 62) { sp = 'jump'; endY = 2.3; }
  }
  return {
    start: now, T, S0, L, h, grounder, caught, hr, foul, bi, fr, landed: false, hd: V(hx, 0, hz), sp,
    spYaw: Math.atan2(L.x - FPOS[bi][0], L.z - FPOS[bi][1]),
    endY, dist: Math.hypot(L.x, L.z),
    roll: V(hx, 0, hz).multiplyScalar(hr || caught || foul ? 0 : clamp(dd * 0.12, 2, 10)), n: 0
  };
}
/* infield throws after a grounder is fielded. bases: 1 = first, 2 = second */
const BASE_AT = { 1: V(19.4, 1.2, -19.4), 2: V(0, 1.2, -38.8), 3: V(-19.4, 1.2, -19.4), 4: V(0, 1.2, -0.4) };
function addThrows(p, bases) {
  let t = 0.25, from = V(p.L.x, 1.0, p.L.z);
  p.throws = []; p.cover = {};
  if (bases.includes(1)) p.cover[p.bi === 0 ? 1 : 0] = BASE_AT[1];
  if (bases.includes(2)) p.cover[p.bi === 2 || p.bi === 3 ? 1 : 2] = BASE_AT[2];
  if (bases.includes(3)) p.cover[p.bi === 3 ? 2 : 3] = BASE_AT[3];
  if (bases.includes(4)) p.cover[p.bi === 0 ? 1 : 0] = BASE_AT[4];
  bases.forEach(b => {
    const to = BASE_AT[b], dur = from.distanceTo(to) / (p.homePlay ? 26 : 30) + (p.homePlay ? 0.35 : 0.12);
    p.throws.push({ base: b, from: from.clone(), to: to.clone(), t0: t, dur });
    t += dur + (b === 2 ? 0.35 : 0); from = to.clone();
  });
  p.throwEnd = t; p.thrN = 0;
}
function playBallPos(u, out) {
  const p = play, uu = Math.min(u, 1);
  if (u > 1 && p.throws) {
    const el = (u - 1) * p.T;
    let th = null;
    p.throws.forEach(t => { if (el >= t.t0) th = t; });
    if (!th) return out.set(p.L.x, 0.9, p.L.z);
    const k = clamp((el - th.t0) / th.dur, 0, 1);
    out.lerpVectors(th.from, th.to, k); out.y += 3.2 * k * (1 - k);
    return out;
  }
  if (p.grounder) {
    const e = easeOut(uu);
    out.set(lerp(p.S0.x, p.L.x, e), 0, lerp(p.S0.z, p.L.z, e));
    out.y = BALL_R + Math.max(0, p.S0.y * (1 - uu * 6)) + Math.abs(Math.sin(uu * Math.PI * 3.5)) * 0.5 * (1 - uu);
    if (p.err && u > 1) { const r = easeOut(Math.min(u - 1, 0.6) / 0.6); out.x += p.roll.x * r; out.z += p.roll.z * r; }   // through the fielder's legs
  } else {
    out.set(lerp(p.S0.x, p.L.x, uu), lerp(p.S0.y, p.endY, uu) + 4 * p.h * uu * (1 - uu), lerp(p.S0.z, p.L.z, uu));
    if (u > 1 && p.roll.lengthSq() > 0) {
      const r = Math.min(u - 1, 0.6) / 0.6, e = easeOut(r);
      out.x += p.roll.x * e; out.z += p.roll.z * e;
      out.y = BALL_R + Math.abs(Math.sin(r * Math.PI * 2)) * 1.2 * (1 - r);
    }
  }
  if (!p.hr && out.y < BALL_R) out.y = BALL_R;
  return out;
}

/* ===== per-frame update ===== */
const tmpV = V();
function pitcherK(now) {
  if (phase === 'wait') return clamp(1 - (nextAt - now) / 0.85, 0, 1);
  if (phase === 'deliver') return clamp((now - deliverStart) / DELIVER, 0, 1);
  if ((phase === 'fly' || phase === 'result') && ball) return 1 + clamp((now - ball.start) / 0.5, 0, 1) * 0.35;
  return 0;
}
/* 乱闘：全員が本塁へ集まる（近づく0→1、もみ合い1、離れる1→0）。煙のかたまりは絵のスプライト */
function brawlK(now) {
  if (!brawl) return 0;
  if (now > brawl.end) { brawl = null; return 0; }
  return Math.min(clamp((now - brawl.at) / 0.9, 0, 1), clamp((brawl.end - now) / 0.7, 0, 1));
}
const brawlCloud = (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const c = cv.getContext('2d'); c.lineWidth = 6; c.strokeStyle = '#3a2a24'; c.lineJoin = 'round';
  const puff = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke(); };
  [[128, 150, 70, '#f2efe6'], [70, 130, 48, '#e7e3d8'], [190, 135, 50, '#e7e3d8'], [100, 85, 44, '#f6f3ea'], [160, 85, 42, '#f6f3ea'], [128, 110, 52, '#fffdf6']].forEach(a => puff(...a));
  const star = (x, y, R, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.45 : R, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); };
  star(52, 48, 26, '#ffd23f'); star(190, 208, 24, '#ff9a3c'); star(60, 200, 20, '#ffd23f');
  c.strokeStyle = '#d6322a'; c.lineWidth = 9; c.lineCap = 'round';                                      // 怒りマーク
  for (let q = 0; q < 4; q++) { c.beginPath(); c.arc(200 + [1, -1, -1, 1][q] * 13, 60 + [1, 1, -1, -1][q] * 13, 11, q * Math.PI / 2 + Math.PI, q * Math.PI / 2 + Math.PI * 1.5); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.visible = false; scene.add(sp); return sp;
})();
/* 野手の表情：打球を追うとき・捕ったとき・ホームランを見上げるとき */
function fielderFace(i, k) {
  if (brawlK(now_()) > 0) return 'shout';
  if (!play) return 'normal';
  if (play.hr) return 'wow';
  if (play.foul) return 'normal';
  if (play.bi === i) {
    const u = (now_() - play.start - 0.12) / play.T;
    if (play.sp && u > 0.75) return 'joy';
    if (u < 0.95) return 'shout';
    return play.err ? 'sad' : play.caught ? 'smile' : 'normal';
  }
  return 'normal';
}
function updateFaces(now, k) {
  const hit = play && play.hr, fight = brawlK(now) > 0, hbp = now < hbpUntil;
  faceFor(pitcherF, fight ? 'shout' : hbp ? 'wow' : (phase === 'deliver' && k > 0.45) || (phase === 'fly' && ball && now - ball.start < 0.45) ? 'shout' : hit ? 'sad' : 'normal', now);
  faceFor(batterF, fight ? 'shout' : hbp ? 'sad' : hit ? 'joy' : (phase === 'deliver' || phase === 'fly') ? 'focus' : 'normal', now);
  brawlCloud.visible = fight;
  if (fight) { brawlCloud.material.rotation = Math.sin(now * 9) * 0.15; const s = 3.4 + Math.sin(now * 21) * 0.3; brawlCloud.scale.set(s, s, 1); brawlCloud.position.set(Math.sin(now * 17) * 0.12, 1.2 + Math.sin(now * 13) * 0.1, -0.8); }
}
function updateFielders(now, k) {
  const ready = phase === 'fly' || phase === 'deliver' || (phase === 'wait' && k > 0.6) ? 1 : 0.3;
  fielderF.forEach((f, i) => {
    let x = FPOS[i][0], z = FPOS[i][1], yaw = Math.atan2(-x, -z), mv = 0, reach = 0, rd = ready, spU = null;
    const bk = brawlK(now);
    if (bk > 0) {                                              // 乱闘：みんな本塁に集まってもみ合う
      const a = i / FPOS.length * 6.283 + 0.4, r = 1.1 + 0.45 * (i % 3), tx = Math.sin(a) * r, tz = -0.8 + Math.cos(a) * r, e = easeOut(bk);
      x = lerp(x, tx, e); z = lerp(z, tz, e);
      yaw = Math.atan2(-x, -0.8 - z); mv = bk < 1 ? 1 : 0; rd = 1;
      if (bk >= 1) { reach = 0.5 + 0.5 * Math.sin(now * 16 + i * 1.7); x += Math.sin(now * 13 + i * 2.1) * 0.1; z += Math.cos(now * 11 + i) * 0.1; }
    } else
    if (pickoff && (phase === 'pick' || (phase === 'result' && !play))) {
      rd = 1;
      const targetBase = pickoff.base;
      const coverIdx = targetBase === 1 ? 0 : 1; // 1塁なら一塁手(0)、2塁なら二塁手(1)がベースに入る
      if (i === coverIdx) {
        const to = BASE_PT[targetBase];
        // 投球開始からベースへ素早くダッシュして入る
        const pkK = clamp((now - (pickoff.t0 - 0.2)) / 0.45, 0, 1);
        const tx = to.x + (targetBase === 1 ? -0.4 : -0.4);
        const tz = to.z + (targetBase === 1 ? 0.4 : 0.6);
        x = lerp(FPOS[i][0], tx, pkK); z = lerp(FPOS[i][1], tz, pkK);
        if (pkK < 1) { mv = 1; yaw = Math.atan2(tx - FPOS[i][0], tz - FPOS[i][1]); }
        else {
          yaw = Math.atan2(-x, -z); // ベース上でマウンド/本塁方向を向いて捕球体勢
          reach = clamp((now - pickoff.t0) / pickoff.dur, 0, 1);
        }
      } else yaw = Math.atan2(BASE_PT[targetBase].x - x, BASE_PT[targetBase].z - z);
    } else
    if (play) {
      rd = 0.5;
      if (play.bi === i) {
        const u = (now - play.start - 0.12) / play.T;
        const pr = clamp(clamp(u, 0, 1) * play.fr + Math.max(0, u - 1) * 1.2, 0, 1);
        x = lerp(FPOS[i][0], play.L.x, pr); z = lerp(FPOS[i][1], play.L.z, pr);
        if (u > 0 && pr < 1) { mv = 1; yaw = Math.atan2(play.L.x - FPOS[i][0], play.L.z - FPOS[i][1]); }
        else yaw = Math.atan2(ballMesh.position.x - x, ballMesh.position.z - z);
        if (play.caught) reach = clamp((u - 0.7) / 0.3, 0, 1);
        if (play.sp) { spU = u; yaw = play.spYaw; if (play.sp === 'jump') reach = clamp((u - 0.75) / 0.2, 0, 1); }
      } else if (play.cover && play.cover[i]) {
        const c = play.cover[i], k = clamp((now - play.start) / 1.0, 0, 1);
        x = lerp(FPOS[i][0], c.x - 0.6, k); z = lerp(FPOS[i][1], c.z + 0.6, k);
        if (k < 1) { mv = 1; yaw = Math.atan2(c.x - FPOS[i][0], c.z - FPOS[i][1]); }
        else yaw = Math.atan2(ballMesh.position.x - x, ballMesh.position.z - z);
      } else yaw = Math.atan2(ballMesh.position.x - x, ballMesh.position.z - z);
    }
    let J = squashJ(fielderJ(x, z, yaw, now * 11 + i * 1.7, mv, rd, reach), 0);
    if (spU !== null) J = superPose(J, play.sp, spU, x, z, yaw);
    poseFig(f, J, yaw, yaw);
    faceFor(f, fielderFace(i, k), now);
  });
}
/* スーパープレーの体の動き。dive = 前に飛びつく（足元を軸に前へ倒す）、jump = 高く跳ぶ */
const _sq = new THREE.Quaternion(), _sa = V();
function superPose(J, kind, u, x, z, yaw) {
  const a = clamp((u - 0.78) / 0.25, 0, 1), up = 1 - clamp((u - 1.4) / 0.35, 0, 1);
  if (a <= 0 || up <= 0) return J;
  const sx = Math.sin(yaw), cz = Math.cos(yaw);
  let ang = 0, lift = 0, back = 0;
  if (kind === 'dive') { ang = 1.35 * easeOut(a) * up; lift = 0.12 * Math.sin(Math.PI * a); back = 1.0 * easeOut(a) * up; }
  else lift = 1.0 * Math.sin(Math.PI * clamp((u - 0.78) / 0.42, 0, 1));
  _sq.setFromAxisAngle(_sa.set(cz, 0, -sx), ang);
  for (const k in J) {
    const p = J[k];
    p.x -= x; p.z -= z; p.applyQuaternion(_sq);
    p.x += x - sx * back; p.z += z - cz * back; p.y += lift;
  }
  return J;
}
/* runners on base run to the next base until the result is shown, then snap to the new bases */
const NEXT_BASE = [[0, -38.8], [-19.4, -19.4], [0, 0]];
function updateRunAnim(now) {
  if (!play || !play.run || !pendBanner) return;
  runnerF.forEach((f, i) => {
    if (!play.run[i]) return;
    const [sx, sz] = RUNPOS[i], [tx, tz] = NEXT_BASE[i];
    const d = Math.hypot(tx - sx, tz - sz), t0 = play.start + (play.tag ? play.T : 0.1);
    const speed = (play.homePlay && i === 2) ? 6.2 : 7.5;
    const k = clamp((now - t0) / (play.runDuration || d / speed), 0, 1);
    const x = lerp(sx, tx, k), z = lerp(sz, tz, k), yaw = Math.atan2(tx - sx, tz - sz);
    f.g.visible = true;
    if (i === 2 && play.homePlay && k >= 0.72) {
      if (!f.slid) { f.slid = true; sfx.slide(0); }
      const su = (k - 0.72) / 0.28;
      let J = squashJ(fielderJ(x, z, yaw, 0, 0, 1, 0), 0);
      J = superPose(J, 'dive', 0.8 + su * 0.4, x, z, yaw);
      poseFig(f, J, yaw, yaw);
      faceFor(f, play.homeSafe ? 'smile' : 'sad', now);
    } else {
      if (k < 0.72) f.slid = false;
      poseFig(f, squashJ(fielderJ(x, z, yaw, now * 12 + i, k > 0 && k < 1 ? 1 : 0, 0, 0), 0), yaw, yaw);
      faceFor(f, k > 0 && k < 1 ? 'shout' : 'smile', now);
    }
  });
}
function updateBall(now, dt, pj) {
  trail.forEach(m => { m.visible = false; });
  if (play) {
    htLine.material.color.set(play.beast ? '#ff692b' : '#f4c95a');
    const u = (now - play.start) / play.T;
    playBallPos(u, tmpV);
    ballMesh.position.copy(tmpV); ballMesh.visible = true;
    ballMesh.scale.setScalar(1 + 2.5 * clamp(u * 3, 0, 1));
    ballMesh.rotateX(dt * 25);
    if (u <= 1.02 && play.n < HT_N) {
      htGeo.attributes.position.setXYZ(play.n++, tmpV.x, tmpV.y, tmpV.z);
      htGeo.attributes.position.needsUpdate = true; htGeo.setDrawRange(0, play.n);
    }
    htLine.visible = play.n > 1;
    if (play.throws && u > 1) {
      const el = (u - 1) * play.T, n = play.throws.filter(t => el >= t.t0 + t.dur).length;
      if (n > play.thrN) { play.thrN = n; sfx.pop(); }
    }
    if (u >= 1 && !play.landed) {
      play.landed = true;
      if (!play.caught) { landRing.position.set(play.L.x, 0.06, play.L.z); landRing.visible = true; }
    }
    return;
  }
  htLine.visible = false; landRing.visible = false;
  if (ball) {
    const t = (now - ball.start) / ball.dur;
    ballPosAt(t, tmpV);
    const hid = ball.vn && t > 0.45 && t < 0.85;   // 消える魔球：途中で見えなくなる
    if (!ball.done && !ball.mitt && t >= 1.08) { ball.mitt = true; sfx.mitt(ball.speed); }   // キャッチャーミットに収まった音
    ballMesh.position.copy(tmpV); ballMesh.scale.setScalar(1);
    ballMesh.visible = tmpV.z < 1.0 && !hid;
    ballMesh.rotateOnAxis(ball.axis, ball.rps * dt);
    if (!ball.done && t < 1 && !hid) {
      trailPts.push(tmpV.clone()); if (trailPts.length > trail.length) trailPts.shift();
      trailPts.forEach((p, i) => {
        const m = trail[i], u = (i + 1) / trailPts.length; m.visible = true; m.position.copy(p);
        m.material.color.set(beastForRole('pit') ? '#ff9c42' : '#eef0e4');
        m.material.opacity = u * 0.42; m.scale.setScalar(0.45 + 0.55 * u);
      });
    }
    return;
  }
  ballMesh.position.copy(pj.hR); ballMesh.scale.setScalar(1); ballMesh.visible = !(pickoff && phase === 'pick' && now >= pickoff.t0);
}
function pulse(m, t0, now, dur, s0, s1) {
  const u = (now - t0) / dur;
  if (u < 0 || u > 1) { m.visible = false; return; }
  m.visible = true; m.scale.setScalar(lerp(s0, s1, easeOut(u))); m.material.opacity = m.userData.op * (1 - u);
}
function updateFx(now) {
  pulse(tapRing, fxTap, now, 0.35, 0.06, 0.14);
  pulse(flashRing, fxFlash, now, 0.4, 0.08, 0.6);
  ghostRing.visible = ghostOn && !play; ghostRing.scale.setScalar(0.06);
  aimRing.visible = !!(flick && aim);
  if (aimRing.visible) { aimRing.position.set(aim.x, aim.y, 0.01); aimRing.scale.setScalar(0.08); }
  if (landRing.visible) landRing.scale.setScalar(1.4 + Math.sin(now * 6) * 0.2);
}
const _cl = V();
/* fixed shots instead of a chasing camera: pick one viewpoint that keeps every given point on screen, then hold it */
const shotCam = new THREE.PerspectiveCamera(50, 1, 0.1, 1200), _q = V();
function frameShot(pts, at) {
  let cx = 0, cy = 0, cz = 0;
  pts.forEach(p => { cx += p.x; cy += p.y; cz += p.z; });
  cx /= pts.length; cy /= pts.length; cz /= pts.length;
  let spread = 0;
  pts.forEach(p => { spread = Math.max(spread, Math.hypot(p.x - cx, p.z - cz)); });
  let hx = cx, hz = cz;
  const hl = Math.hypot(hx, hz);
  if (hl < 3) { hx = 0; hz = -1; } else { hx /= hl; hz /= hl; }
  const look = V(cx, Math.max(1, cy * 0.8), cz);
  const tall = clamp(1 - camera.aspect, 0, 0.6);                    // portrait screens: look down more steeply to use the height
  let pos, need, R = 14 + spread * 1.15, Hh = 6 + spread * (0.12 + tall * 0.9);   // stand behind the action, looking along it
  for (let tries = 0; tries < 4; tries++) {                         // back off until everything fits a sane lens
    pos = V(cx - hx * R, Hh, cz - hz * R);
    shotCam.aspect = camera.aspect; shotCam.position.copy(pos); shotCam.lookAt(look); shotCam.updateMatrixWorld();
    need = 0.2;
    pts.forEach(p => {
      _q.copy(p).applyMatrix4(shotCam.matrixWorldInverse);
      if (-_q.z < 1) return;
      need = Math.max(need, Math.abs(_q.y) / -_q.z, Math.abs(_q.x) / -_q.z / camera.aspect);
    });
    if (need * 1.15 < Math.tan(36 * D2R)) break;
    R *= 1.35; Hh *= 1.35;
  }
  const fov = clamp(2 * Math.atan(need * 1.15) / D2R, 34, 80);
  return { pos, look, fov, at };
}
function playShot(p, now) {
  const mid = V((p.S0.x + p.L.x) / 2, Math.max(p.S0.y, p.endY) + p.h, (p.S0.z + p.L.z) / 2);
  const pts = [p.S0, mid, V(p.L.x + p.roll.x, 0.5, p.L.z + p.roll.z)];
  if (p.throws) p.throws.forEach(t => pts.push(t.to));
  if (p.pend) p.pend.opts.forEach(o => pts.push(BASE_AT[o.b]));          // 送球先を選ぶ場面：投げ先の塁が全部映るように
  p.shot = frameShot(pts, now + 0.35);                             // let the swing finish in the catcher view, then cut
  if (p.sp) {                                                      // スーパープレー：野手に寄る
    let hx = p.L.x - FPOS[p.bi][0], hz = p.L.z - FPOS[p.bi][1]; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    const sd = (Math.hypot(p.L.x - hz * 6, p.L.z + hx * 6 + 30) < Math.hypot(p.L.x + hz * 6, p.L.z - hx * 6 + 30)) ? 1 : -1;
    const pos = V(p.L.x - hz * 6.5 * sd + hx * 3, 2.0, p.L.z + hx * 6.5 * sd + hz * 3);
    p.spShot = { pos, look: V(p.L.x, 0.9, p.L.z), fov: 42, at: now + p.T * 0.58, until: now + p.T * 1.5 };
  }
  if (p.homePlay) {                                                // 本塁クロスプレー：捕球・タッチの攻防に寄る
    p.homeShot = {
      pos: V(-4.8, 1.8, 4.2),
      look: V(-1.2, 0.9, -1.2),
      fov: 38,
      at: now + p.T + 0.15,
      until: now + p.T + (p.throwEnd || 1.8) + 1.2
    };
  }
}
let camShot = null;
function updateCamera(now, dt) {
  let shot = null;
  if (play && play.homeShot && now >= play.homeShot.at && now < play.homeShot.until) shot = play.homeShot;
  else if (play && play.spShot && now >= play.spShot.at && now < play.spShot.until) shot = play.spShot;
  else if (brawl && now >= brawl.at - 0.3 && now < brawl.end) shot = brawl.shot;
  else if (play && play.shot && now >= play.shot.at) shot = play.shot;
  else if (camShot && now >= camShot.at) shot = camShot;
  if (shot) { camPos.copy(shot.pos); camLook.copy(shot.look); camFov = shot.fov; }
  else { camPos.copy(CAM_HOME); camLook.copy(homeLook()); camFov = homeFov; }
  if(!shot){
    // Keep the pitch target centered for either batting side.
    const zoneDistance=Math.hypot(1.6-ZY0,3.8);
    // Reserve at least 42% of the canvas width for the pitch target.
    camFov=2*Math.atan(ZW/(.42*zoneDistance*camera.aspect))/D2R;
    camPos.set(0,1.6,3.8);camLook.set(0,ZY0,0);
  }
  camera.position.copy(camPos);
  if (!shot && now < shakeUntil) camera.position.add(V(rnd(-1, 1) * shakeAmp, rnd(-1, 1) * shakeAmp, 0));
  camera.lookAt(camLook);
  const near = shot ? 1 : 0.1;                                     // wide shots need depth precision far away
  if (Math.abs(camera.fov - camFov) > 0.01 || camera.near !== near) { camera.fov = camFov; camera.near = near; camera.updateProjectionMatrix(); }
}
function update(now, dt) {
  const k = pitcherK(now);
  let pj = squashJ(pitcherJ(k), MOUND_Y), pyaw = 0;
  const pbk = brawlK(now);
  if (pbk > 0) {                                                // 乱闘：投手がマウンドから打者に詰め寄る
    const e = easeOut(pbk), bx = shownLeft ? 0.8 : -0.8, px = lerp(0, bx * 0.55, e), pz = lerp(RUBBER_Z, -1.5, e);
    pyaw = Math.atan2(bx - px, 0.3 - pz);
    pj = squashJ(fielderJ(px, pz, pyaw, now * 12, pbk < 1 ? 1 : 0, 1, pbk >= 1 ? 0.5 + 0.5 * Math.sin(now * 17) : 0), 0);
  }
  poseFig(pitcherF, pj, pyaw, pyaw);
  refreshShown();
  const bj = batterJ(now, k); poseFig(batterF, squashJ(bj.J, 0, true), shownLeft ? -Math.PI / 2 : Math.PI / 2, Math.PI);
  batG.position.copy(bj.G); batG.quaternion.setFromUnitVectors(_Y, bj.dir);
  updateStars(now, bj, pj);
  updateBeastEffects(now, pj, bj);
  batAura.material.color.set('#ffc845'); pitAura.material.color.set('#ffc845');
  for (const role of ['pit', 'bat']) if (beastForRole(role)) {
    const aura = role === 'pit' ? pitAura : batAura, pos = role === 'pit' ? pj.pelvis : bj.J.pelvis;
    aura.visible = true; aura.position.copy(pos); aura.scale.setScalar(3.8);
    aura.material.color.set('#ff4626'); aura.material.opacity = .5 + .15 * Math.sin(now * 7);
  }
  const gb = giantActive() && phase !== 'idle' ? 1 : 0;
  batG.scale.set(1 + gb * 1.6, 1 + gb * 0.55, 1 + gb * 1.6);
  updateFielders(now, k);
  updateFaces(now, k);
  updateRunAnim(now);
  updateRunning(now);
  refreshAct();
  updateBall(now, dt, pj);
  updateFx(now);
  updateShow(now, dt);
  updateCamera(now, dt);
}

/* ===== input ===== */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), zonePlane = new THREE.Plane(V(0, 0, 1), 0);
function screenToZone(px, py) {
  ndc.set(px / W * 2 - 1, -(py / H) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const p = V();
  return ray.ray.intersectPlane(zonePlane, p) ? p : null;
}
function pt(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function setAim(x, y) {
  const p = screenToZone(x, y); if (!p) return;
  p.x = clamp(p.x, -ZW * 2, ZW * 2); p.y = clamp(p.y, ZY0 - ZH * 2, ZY0 + ZH * 2);
  aim = p;
  const inside = (shownLeft ? 1 : -1) * p.x / ZW;                 // 打者の体に当たるコースなら、狙いの輪が赤くなる
  const ac2 = mode === 'pit' && inside >= HBP_EDGE ? '#ff4a3c' : '#f4c95a';
  aimRing.material.color.set(ac2); aimRing.children.forEach(m => m.material.color.set(ac2));
}
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); audioInit();
  const [x, y] = pt(e), now = now_();
  if (mode === 'bat') {
    if (phase === 'fly' && !swing && ball && !ball.done) {
      const p = screenToZone(x, y); if (!p) return;
      swing = { time: now, x: p.x / ZW, y: (ZY0 - p.y) / ZH, C: p, bunt: curBunt, crit: critArm && !curBunt };
      if (swing.crit) { critArm = false; G.skill.crit--; }
      if (!curBunt) { batAnim = { t0: now, plan: makeSwingPlan(p) }; sfx.swish(); }
      fxTap = now; tapRing.position.set(p.x, p.y, 0.01);
    }
  } else if (phase === 'ready') {
    if (online && onl.oppTime) { setHint('相手がタイム中です'); return; }
    flick = { pts: [[x, y, now * 1000]] }; setAim(x, y);
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  }
});
cv.addEventListener('pointermove', e => {
  if (!flick) return;
  const [x, y] = pt(e);
  flick.pts.push([x, y, now_() * 1000]); setAim(x, y);
  if (flick.pts.length > 160) flick.pts.shift();
  const g = readGesture(flick.pts);
  if (g) { const gk = fitPitch(g); setHint(icoOf(gk) + '  ' + TYPES[gk].name); markGuide(gk); }
});
/* swipe direction -> pitch. angle 0 = right, 90 = up (screen). zigzag = knuckleball */
const GESTURE = [[90, 'str'], [45, 'cut'], [0, 'sli'], [-45, 'cur'], [-90, 'frk'], [-135, 'snk'], [180, 'sht'], [135, 'two']];
function readGesture(pts) {
  const a = pts[0], b = pts[pts.length - 1], dx = (b[0] - a[0]) * (lefty() ? -1 : 1), dy = b[1] - a[1];   // a lefty's breaks are mirrored, so the swipe still shows where the ball goes
  let rev = 0, dir = 0, ext = a[0];
  for (const p of pts) {
    const x = p[0];
    if (dir === 0) { if (Math.abs(x - ext) > 14) { dir = Math.sign(x - ext); ext = x; } }
    else if ((x - ext) * dir > 0) ext = x;
    else if (Math.abs(x - ext) > 14) { rev++; dir = -dir; ext = x; }
  }
  if (rev >= 2) return 'knk';
  if (Math.hypot(dx, dy) < 30) return null;
  const ang = Math.atan2(-dy, dx) / D2R;
  let best = 'str', bd = 999;
  GESTURE.forEach(([c, k]) => { let d = Math.abs(ang - c); if (d > 180) d = 360 - d; if (d < bd) { bd = d; best = k; } });
  return best;
}
function markGuide(k) { [...$('#pitches').children].forEach(c => c.classList.toggle('on', c.dataset.t === k)); }
function endFlick(cancel) {
  if (!flick) return;
  const pts = flick.pts, last = pts[pts.length - 1], first = pts[0];
  flick = null;
  const a = aim; aim = null;
  if (cancel || !a) return;
  const tEnd = last[2];
  let i0 = pts.length - 1;
  while (i0 > 0 && tEnd - pts[i0 - 1][2] <= 100) i0--;
  if (i0 === pts.length - 1 && i0 > 0) i0--;   // always measure over at least the last segment
  const p0 = pts[i0], dtm = Math.max(16, tEnd - p0[2]);
  const v = Math.hypot(last[0] - p0[0], last[1] - p0[1]) / dtm;
  const total = Math.hypot(last[0] - first[0], last[1] - first[1]);
  let key = readGesture(pts);
  if (!key || total < 40 || v < 0.2) { setHint('もっと大きく、素早く弾いて投げる'); return; }
  let f = clamp(v * 28 / 65, 0, 1);
  if (key === 'str' && f < 0.3) { key = 'chg'; f = f / 0.3; }   // a slow fastball swipe throws a changeup
  else if (key === 'str' && f > 0.85) { key = 'gou'; f = (f - 0.85) / 0.15; }   // a very fast one throws the heater
  key = fitPitch(key);
  ptype = key; markGuide(key);
  const T = TYPES[key];
  const P = curPitcher();
  const sig = ((0.01 + f * 0.03) * (1 + (3 - P.c) * 0.1) + P.fatigue * 0.04);
  const tx = a.x / ZW + gauss() * sig, ty = (ZY0 - a.y) / ZH + gauss() * sig;
  pending = { key, speed: clamp(T.min + (T.max - T.min) * f + (P.v - 3) * 4 - P.fatigue * 8, 70, 170), tx: clamp(tx, -2, 2), ty: clamp(ty, -2, 2), vn: vanishArm };
  if (online) pending = prepareOnlinePitch(pending);
  if (vanishArm && !beastActive()) { vanishArm = false; G.skill.vn--; }
  phase = 'deliver'; deliverStart = now_(); setHint(icoOf(key) + '  ' + T.name);
  if (online) { pending.sg = onl.oppSign; send('pitch', { p: pending, beast: onlineBeastState() }); }
}
cv.addEventListener('pointerup', () => endFlick(false));
cv.addEventListener('pointercancel', () => endFlick(true));

/* ===== flow ===== */
function startGame() {
  storyVisual(null);
  audioInit(); newGame();
  if (story && story.openingHR) { setTeams(); resize(); hud(); }
  if (story && story.inn) storyRole();
  $('#pitches').hidden = mode !== 'pit';
  const dd0 = applyInningDice(); if (dd0) setTimeout(() => showDiceBanner(dd0), 600);
  $('#overlay').hidden = true;
  phase = mode === 'bat' ? 'wait' : 'ready';
  nextAt = now_() + 1.8;
  setHint(mode === 'bat' ? '投手が投げたら、ボールが通る位置をタップして打つ' : '弾く向きで球種が決まる。指を離した位置がコース、弾く速さが球速');
  updateGoal();
}
function setMode(m) {
  mode = m; flick = null; aim = null; pending = null;
  $('#mBat').classList.toggle('on', m === 'bat');
  $('#mPit').classList.toggle('on', m === 'pit');
  $('#pitches').hidden = m !== 'pit';
  setTeams(); newGame(); showStart(); resize();
}
const ICO_MIRROR = { '↖': '↗', '↗': '↖', '→': '←', '←': '→', '↘': '↙', '↙': '↘' };
const icoOf = k => lefty() ? TYPES[k].ico.replace(/[↖↗→←↘↙]/g, c => ICO_MIRROR[c]) : TYPES[k].ico;
const PITCH_ORDER = ['gou', 'str', 'cut', 'sli', 'cur', 'frk', 'snk', 'sht', 'two', 'chg', 'knk'];
let iconsFor = '';
/* the pitches this pitcher owns (all of them before a game exists) */
function pitchSet() { return G ? curPitcher().pt : PITCH_ORDER; }
function buildPitchButtons() {
  const pc = $('#pitches'), set = pitchSet(); pc.innerHTML = '';
  iconsFor = (lefty() ? 'L' : 'R') + set.join();
  PITCH_ORDER.filter(k => set.includes(k)).forEach(k => {
    const b = document.createElement('div');
    b.className = 'pg';
    b.dataset.t = k;
    b.innerHTML = '<i' + (TYPES[k].ico.length > 1 ? ' style="font-size:10px"' : '') + '>' + icoOf(k) + '</i><b>' + TYPES[k].short + '</b>';
    pc.appendChild(b);
  });
}
/* the swipe guide follows the pitcher: his hand and his pitches */
function pitchIcons() { if (iconsFor !== (lefty() ? 'L' : 'R') + pitchSet().join()) buildPitchButtons(); }
/* a swipe for a pitch this pitcher doesn't have becomes the closest one he does */
const GANG = Object.fromEntries(GESTURE.map(([c, k]) => [k, c]));
function fitPitch(key) {
  if (!G) return key;
  const set = curPitcher().pt;
  if (set.includes(key)) return key;
  if (!(key in GANG)) return 'str';
  let best = 'str', bd = 999;
  set.forEach(k => { if (!(k in GANG)) return; let d = Math.abs(GANG[k] - GANG[key]); if (d > 180) d = 360 - d; if (d < bd) { bd = d; best = k; } });
  return best;
}
$('#goBtn').addEventListener('click', () => { audioInit(); if (ovAction) ovAction(); });
$('#go2').addEventListener('click', () => { audioInit(); if (ovAction2) ovAction2(); });
$('#go3').addEventListener('click', () => { audioInit(); if (ovAction3) ovAction3(); });
$('#go4').addEventListener('click', () => { audioInit(); if (ovAction4) ovAction4(); });
$('#go5').addEventListener('click', () => { audioInit(); if (ovAction5) ovAction5(); });
$('#go6').addEventListener('click', () => { audioInit(); if (ovAction6) ovAction6(); });
$('#codeIn').addEventListener('keydown', e => { if (e.key === 'Enter' && ovAction) ovAction(); });
$('#menuBtn').addEventListener('click', () => { if (online && onl.started) onlinePause(); else if (G && !G.over && phase !== 'idle') matchPause(); else showMenu(); });
$('#cmtBtn').addEventListener('click', () => setCmtMode((cmt.mode + 1) % 3));
$('#cmtBtn').textContent = CMT_LABEL[cmt.mode];
function bgmLabel() { const on = bgmWanted(), b = $('#bgmBtn'); b.textContent = '♪ 応援 ' + (on ? 'オン' : 'オフ'); b.classList.toggle('off', !on); }
$('#bgmBtn').addEventListener('click', () => {
  audioInit();
  const on = !bgmWanted(); try { localStorage.setItem('yakyu-bgm', on ? '1' : '0'); } catch (e) {}
  if (on) bgmStartIfOn(); else { bgmOn = false; bgmFileStop(); }
  bgmLabel();
});
bgmLabel();
['pointerdown', 'touchend', 'click'].forEach(ev => document.addEventListener(ev, cmtUnlock, { once: false, passive: true }));
$('#mBat').addEventListener('click', () => setMode('bat'));
$('#mPit').addEventListener('click', () => setMode('pit'));
$('#pitches').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  ptype = b.dataset.t;
  [...$('#pitches').children].forEach(c => c.classList.toggle('on', c === b));
});

let lastT = now_(), perfN = 0, perfSum = 0, degraded = LITE;
let pausedAt = 0;
function frame() {
  const now = now_(), rawDt = now - lastT, dt = Math.min(0.05, rawDt); lastT = now;
  syncStadium();
  updateOnlineReview(now);
  if(onlineReview.active){renderReviewField();requestAnimationFrame(frame);return;}
  // The movie covers the stadium. Leave the decoder the GPU/CPU budget instead
  // of rendering an invisible 3D scene throughout the cutscene.
  if (storyMovie) { if (phase !== 'idle' && !pausedAt) pausedAt = now; requestAnimationFrame(frame); return; }
  if (renderMascotGallery(now)) { requestAnimationFrame(frame); return; }
  if (!degraded && !document.hidden && rawDt < 0.5) {
    perfN++; perfSum += rawDt;
    if (perfN >= 90) {
      if (perfSum / perfN > 0.034) { degraded = true; renderer.setPixelRatio(1); key.castShadow = false; resize(); }
      perfN = 0; perfSum = 0;
    }
  }
  // offline game: the game holds still while the menu sheet is open, then picks up where it was
  if (!online && !$('#overlay').hidden && phase !== 'idle') {
    if (!pausedAt) pausedAt = now;
    renderer.render(scene, camera); requestAnimationFrame(frame); return;
  }
  if (pausedAt) {
    const d = now - pausedAt; pausedAt = 0;
    nextAt += d; deliverStart += d; shakeUntil += d;
    if (ball) ball.start += d;
    if (play) { play.start += d; if (play.shot) play.shot.at += d; }
    if (pendBanner) pendBanner.at += d;
    if (brawl) { brawl.at += d; brawl.end += d; brawl.shot.at += d; }
    hbpUntil += d;
    if (batAnim) batAnim.t0 += d;
    if (swing) swing.time += d;
  }
  if (phase === 'wait' && timeOut && !online) nextAt = Math.max(nextAt, now + 1.0);   // タイム中は投げない
  if (phase === 'wait' && now >= nextAt) { if (!tryCpuPickoff(now)) cpuPitch(); }
  else if (phase === 'pick') stepPickoff(now);
  else if (phase === 'deliver' && now >= deliverStart + DELIVER) { const p = pending; pending = null; launchBall(p); }
  else if (phase === 'fly' && ball) stepFly(now);
  else if (phase === 'result' && now >= nextAt) afterResult();
  if (play && play.pend) stepThrowPick(now);
  if (pendBanner && now >= pendBanner.at) flushBanner();
  update(now, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
if (window.ResizeObserver) new ResizeObserver(resize).observe($('#stage'));
window.addEventListener('resize', resize);
buildPitchButtons(); setTeams(); resize(); newGame(); showMenu(); inviteBoot();
requestAnimationFrame(frame);
})();
