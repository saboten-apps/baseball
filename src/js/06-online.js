
/* ===== online 1-on-1 over Supabase Realtime =====
   The pitcher sends only what was thrown (type, speed, target). The batter's device plays the pitch, judges contact,
   and sends the contact result plus a random seed. Both devices run resolveCore() under that seed, so every random
   outcome (double plays, errors, where the ball lands) comes out the same and the game state stays identical. */
const SB_URL = 'https://qxtqaqcbhsekictbrdau.supabase.co';
const SB_KEY = 'sb_publishable_4TJm2e-nlqVN-yFZ_LvZhw_BzoXYkyD';
const PAGES_URL = 'https://baseball.umimachilab.com/';
let online = false;
const onl = { sb: null, ch: null, code: '', side: 'home', me: Math.random().toString(36).slice(2, 10), started: false,
  score: { home: 0, away: 0 }, queued: null, waitRes: null, half: 1, joinTimer: 0, goneTimer: 0,
  pn: 0, oppSign: null, seed: 0, queuedPick: null, queuedSub: [],
  round: 0, finished: false, rematch: { mine: false, theirs: false },
  beast: { home: false, away: false }, beastWanted: { home: false, away: false } };   // pn: pitches thrown so far (same on both devices); oppSign: the batter's sign as the pitcher's device knows it

let beastKeys = '', beastKeyAt = 0, beastTaps = 0, beastTapAt = 0;
function resetOnlineBeast() {
  onl.beast = { home: false, away: false }; onl.beastWanted = { home: false, away: false };
  beastKeys = ''; beastTaps = 0;
}
const onlineBeastState = () => ({ home: onl.beast.home, away: onl.beast.away });
function applyOnlineBeast(state) {
  if (!online || !state) return;
  for (const side of ['home', 'away']) if (state[side] === true) {
    if (side === onl.side && !onl.beast[side]) vanishArm = true;
    onl.beast[side] = onl.beastWanted[side] = true;
  }
}
function prepareOnlinePitch(p) {
  closeReviewOffer();
  // Only the pitcher commits pending activations. This snapshot travels with
  // the pitch, so neither device changes a ball that is already in flight.
  applyOnlineBeast(onl.beastWanted);
  return onl.beast[onl.side] ? { ...p, speed: 200, vn: vanishArm } : p;
}
function requestOnlineBeast() {
  if (!online || !onl.started || !G || G.over || onl.beastWanted[onl.side]) return false;
  onl.beastWanted[onl.side] = true; send('beast', { side: onl.side }); return true;
}
function showOnlineSecret() {
  if (!online || !G || G.over) return;
  overlay({ title: '隠しコマンド', text: '',
    b1: ['入力する', () => {
      const value = ($('#beast-code').value || '').trim().toUpperCase();
      if (value !== 'BEAST') { $('#beast-code').value = ''; $('#beast-code').focus(); return; }
      const requested = requestOnlineBeast();
      overlay({ title: '野性解放', text: requested ? '次の投球から、試合終了までビーストモード。' : 'ビーストモードは発動済みです。',
        b1: ['試合にもどる', () => { $('#overlay').hidden = true; }] });
    }], b2: ['もどる', onlinePause] });
  const label = document.createElement('label'); label.textContent = 'コマンド';
  const input = document.createElement('input'); input.id = 'beast-code'; input.type = 'text';
  input.maxLength = 16; input.autocomplete = 'off'; input.autocapitalize = 'characters'; input.spellcheck = false;
  input.setAttribute('aria-label', '隠しコマンド');
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#goBtn').click(); } });
  label.appendChild(input); $('#od').appendChild(label); input.focus();
}
$('#ot').addEventListener('click', () => {
  if (!online || $('#ot').textContent !== 'オンライン対戦中') { beastTaps = 0; return; }
  const now = now_(); beastTaps = now - beastTapAt < 3 ? beastTaps + 1 : 1; beastTapAt = now;
  if (beastTaps >= 5) { beastTaps = 0; showOnlineSecret(); }
});
document.addEventListener('keydown', e => {
  if (!online || e.repeat || e.isComposing || e.ctrlKey || e.altKey || e.metaKey || (e.target instanceof Element && e.target.closest('input,textarea,[contenteditable="true"]'))) { beastKeys = ''; return; }
  if (e.key.length !== 1) { beastKeys = ''; return; }
  const now = now_(); beastKeys = (now - beastKeyAt < 3 ? beastKeys : '') + e.key.toUpperCase(); beastKeyAt = now;
  if (!'BEAST'.startsWith(beastKeys)) beastKeys = e.key.toUpperCase() === 'B' ? 'B' : '';
  if (beastKeys === 'BEAST') {
    beastKeys = '';
    if (requestOnlineBeast()) setHint('野性解放！ 次の投球からビーストモード');
  }
});

/* run fn with Math.random replaced by a seeded generator (mulberry32) */
function withSeed(seed, fn) {
  const R = Math.random;
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = R; }
}

const battingSide = () => (G.inning % 2 === 1 ? 'away' : 'home');   // top half: guest (pandas) bat, bottom: host (shibas)
const twoTeam = () => online || !!match || !!(story && story.inn);
function scoreBook() { return online ? onl.score : match ? match.score : (story && story.score ? story.score : { home: 0, away: 0 }); }
function onlineScore() {
  const b = scoreBook(), s = { home: b.home, away: b.away };
  if (G) s[battingSide()] += G.runs;                                // runs of the half in progress (banked at each change)
  return s;
}
function inningLabel() { const h = G.inning; return (h > (G.maxHalf || 6) ? '延長' : '') + Math.ceil(h / 2) + '回' + (h % 2 ? '表' : '裏'); }
function teamName(side) { return side === 'home' ? 'しばいぬズ' : 'パンダーズ'; }

/* ---- lobby ---- */
function showOnlineMenu() {
  leaveRoom(); idle(); story = null;
  if (!window.supabase || !window.supabase.createClient) {
    overlay({ title: 'オンライン対戦', text: 'この画面ではオンライン対戦が使えません。ブラウザで ' + PAGES_URL + ' を開いてください。', b1: ['メニューへ', showMenu] });
    return;
  }
  overlay({ title: 'オンライン対戦', text: '友達と1対1、3回まで。部屋を作った人がしばいぬズ（後攻）、入った人がパンダーズ（先攻）。接戦判定にチャレンジは各2回、成功時は回数を維持します。',
    b1: ['部屋を作る', hostRoom], b2: ['部屋に入る', askCode], b3: ['もどる', showMenu] });
}
function askCode() {
  overlay({ title: '部屋番号を入力', text: '相手から聞いた4桁の番号', input: true, b2: ['もどる', showOnlineMenu],
    b1: ['入る', () => {
      const c = ($('#codeIn').value || '').replace(/\D/g, '');
      if (c.length === 4) joinRoom(c); else $('#od').textContent = '4桁の数字を入れてください';
    }] });
}
function sbClient() {
  if (!onl.sb) onl.sb = window.supabase.createClient(SB_URL, SB_KEY, { realtime: { params: { eventsPerSecond: 20 } } });
  return onl.sb;
}
function openChannel(code, onReady) {
  onl.code = code;
  const ch = sbClient().channel('yakyu-' + code, { config: { broadcast: { self: false }, presence: { key: onl.me } } });
  onl.ch = ch;
  ch.on('broadcast', { event: 'msg' }, ({ payload }) => onMsg(payload));
  ch.on('presence', { event: 'sync' }, onPresence);
  ch.subscribe(status => {
    if (onl.ch !== ch) return;
    if (status === 'SUBSCRIBED') { ch.track({ side: onl.side }); if (onReady) onReady(); }
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      overlay({ title: '接続できません', text: '通信状態を確認して、もう一度試してください。', b1: ['もどる', showOnlineMenu] });
    }
  });
}
function send(type, data) {
  if (onl.ch) onl.ch.send({ type: 'broadcast', event: 'msg', payload: Object.assign({ type, from: onl.me, round: onl.round, reviewStamp:onlineReview.stamp }, data || {}) });
}
function leaveRoom() {
  resetOnlineReview(true);
  clearTimeout(onl.joinTimer); clearTimeout(onl.goneTimer);
  if (onl.ch) {
    const ch = onl.ch; onl.ch = null;
    try { ch.send({ type: 'broadcast', event: 'msg', payload: { type: 'bye', from: onl.me, round: onl.round } }); } catch (e) {}
    try { onl.sb.removeChannel(ch); } catch (e) {}
  }
  online = false; onl.started = false; onl.queued = null; onl.waitRes = null; onl.queuedPick = null; onl.queuedSub = [];
  onl.round = 0; onl.finished = false; onl.rematch = { mine: false, theirs: false };
  resetOnlineBeast();
}
function hostRoom() {
  onl.side = 'home';
  const code = String(1000 + Math.floor(Math.random() * 9000));
  overlay({ title: '部屋番号 ' + code, text: 'この番号か招待リンクを相手に送ってください。相手が入ると試合が始まります。', b1: ['招待リンクを送る', () => shareRoom(code)], b2: ['やめる', showOnlineMenu] });
  openChannel(code);
}
function joinRoom(code) {
  onl.side = 'away';
  overlay({ title: '接続中…', text: '部屋 ' + code + ' に入っています', b1: ['やめる', showOnlineMenu] });
  openChannel(code, () => {
    send('hello');
    clearTimeout(onl.joinTimer);
    onl.joinTimer = setTimeout(() => {
      if (!onl.started) overlay({ title: '部屋が見つかりません', text: '番号を確かめてください。相手が部屋を作ってから入ってください。', b1: ['もどる', showOnlineMenu] });
    }, 8000);
  });
}
function others() {
  if (!onl.ch) return [];
  return Object.keys(onl.ch.presenceState()).filter(k => k !== onl.me);
}
function opponentLeft() {
  if (!onl.started) return;
  const finished = onl.finished;
  leaveRoom(); idle();
  overlay({ title: '相手が退出しました', text: finished ? '再戦の受付を終了しました。' : '試合は中断されました。', b1: ['メニューへ', showMenu] });
}
function onPresence() {
  const n = others().length;
  // a phone that briefly switches apps drops out of presence; give it a moment to come back before calling the game
  if (onl.started) {
    clearTimeout(onl.goneTimer);
    if (n === 0) onl.goneTimer = setTimeout(() => { if (online && others().length === 0) opponentLeft(); }, 15000);
    return;
  }
  if (!onl.started && onl.side === 'home' && n >= 1) hostStart();
}
function onSubMsg(m) {
  if (!online) return;
  if (phase !== 'wait' && phase !== 'ready') { onl.queuedSub.push(m); return; }
  if (m.type === 'relief') relieve(teamsNow().fld);
  else if (m.type === 'closer') { const t = teamsNow().fld; relieve(t, ROSTER[t].closer, true); }
  else if (m.type === 'ph') { pinchHit(m.t, m.slot); refreshShown(); }
}
function onMsg(m) {
  if (!m || typeof m.type!=='string' || m.from === onl.me) return;
  if (m.type === 'rematch-start') {
    if (online && onl.finished && onl.rematch.mine && onl.side === 'away' && m.round === onl.round + 1) restartOnline(m);
    return;
  }
  // Older clients have no round field for the first match. Never let a late
  // pitch, result or rematch request from a previous match affect the next one.
  if ((m.round || 0) !== onl.round) return;
  if (m.type === 'rematch') {
    if (online && onl.started) { onl.rematch.theirs = true; if (onl.finished) { renderOnlineOver(); tryOnlineRematch(); } }
    return;
  }
  if (onl.finished && m.type !== 'bye') return;
  if(m.type==='review-ready'&&m.version===1){onlineReview.pitchEnabled=m.pitch===1;onlineReview.pitchRules=m.rules===2;onlineReview.skipEnabled=m.skip===1;if(!onlineReview.enabled){onlineReview.enabled=true;if(onl.side==='home')send('review-ready',{version:1,pitch:1,rules:2,skip:1});}return;}
  if(m.type.startsWith('review-')){handleReviewMessage(m);return;}
  if(onlineReview.enabled&&m.type!=='bye'&&m.reviewStamp!==undefined&&m.reviewStamp!==onlineReview.stamp)return;
  if (m.type === 'hello') { if (onl.side === 'home' && !onl.started) hostStart(); }
  else if (m.type === 'start') { if (onl.side === 'away' && !onl.started) { clearTimeout(onl.joinTimer); onl.seed = m.seed >>> 0; onl.opts = m.opts || null; beginOnline();if(m.review===1)send('review-ready',{version:1,pitch:1,rules:2,skip:1}); } }
  else if (m.type === 'pitch') onPitchMsg(m);
  else if (m.type === 'result') onResultMsg(m);
  else if (m.type === 'beast') {
    if (online && m.side === (onl.side === 'home' ? 'away' : 'home')) onl.beastWanted[m.side] = true;
  }
  else if (m.type === 'bye') opponentLeft();
  else if (m.type === 'relief' || m.type === 'closer' || m.type === 'ph') onSubMsg(m);
  else if (m.type === 'pick') onPickMsg(m);
  else if (m.type === 'time') { onl.oppTime = !!m.on; if (mode === 'pit') setHint(m.on ? '相手がタイムをとりました' : 'プレイ再開'); }
  else if (m.type === 'sign') { if (mode === 'pit' && m.n === onl.pn) onl.oppSign = m.s || null; }   // a sign sent after this pitch was thrown is dropped
}

/* the host picks the shared seed (used for the inning dice) and starts */
function hostStart() { onl.seed = (Math.random() * 4294967296) >>> 0; onl.opts = Object.assign({}, OPT); send('start', { seed: onl.seed, opts: onl.opts, review:1 }); beginOnline(); }
/* a pickoff thrown by the pitcher: the batter's device runs the same play */
function onPickMsg(m) {
  if (!online) return;
  if (mode === 'bat' && phase === 'wait') { if (m.out) sign = null; startPickoff(now_(), m.out, m.base); }
  else onl.queuedPick = m;
}

/* ---- game flow ---- */
function beginOnline() {
  resetOnlineReview();
  onl.started = true; online = true; story = null; match = null;
  onl.finished = false; onl.rematch = { mine: false, theirs: false };
  resetOnlineBeast();
  onl.timeLeft = 3; onl.oppTime = false; timeOut = false;
  onl.score = { home: 0, away: 0 }; onl.queued = null; onl.waitRes = null; onl.pn = 0; onl.oppSign = null; onl.queuedPick = null; onl.queuedSub = [];
  sign = null; cpuStealPlan = false; cpuBuntPlan = false;
  newGame(); G.maxHalf = 6;
  $('.seg').hidden = true; $('#menuBtn').hidden = false;
  $('#overlay').hidden = true;
  applyRole();
  showBanner('プレイボール', 'あなたは ' + teamName(onl.side) + (onl.side === 'home' ? '（後攻）' : '（先攻）'), 'g');
  const dd = applyInningDice(); if (dd) setTimeout(() => showDiceBanner(dd), 1900);
}
function roleHint() {
  return mode === 'bat' ? '相手の投球を待っています。来たら、ボールが通る位置をタップ' : 'あなたの投球。弾く向きで球種、離した位置でコース';
}
function applyRole() {
  mode = battingSide() === onl.side ? 'bat' : 'pit';
  $('#mBat').classList.toggle('on', mode === 'bat'); $('#mPit').classList.toggle('on', mode === 'pit');
  $('#pitches').hidden = mode !== 'pit';
  onl.half = G.inning; sign = null; onl.oppSign = null;
  setTeams(); resize();
  phase = mode === 'bat' ? 'wait' : 'ready'; nextAt = Infinity;      // nothing automatic: the other player pitches
  hud(); setHint(roleHint());
  takeQueuedPitch();
}
function takeQueuedPitch() {
  while ((phase === 'wait' || phase === 'ready') && onl.queuedSub.length) onSubMsg(onl.queuedSub.shift());
  if (mode === 'bat' && phase === 'wait' && onl.queuedPick) { const q = onl.queuedPick; onl.queuedPick = null; onPickMsg(q); return; }
  if (mode === 'bat' && phase === 'wait' && onl.queued) { const q = onl.queued; onl.queued = null; onPitchMsg(q); }
}
/* batter: a pitch arrived from the other device */
function onPitchMsg(m) {
  if (!online || onlineReview.active) return;
  if (mode !== 'bat' || phase !== 'wait') { onl.queued = m; return; }   // still showing the last play, or switching sides
  closeReviewOffer();pending = m.p; phase = 'deliver'; deliverStart = now_();
  applyOnlineBeast(m.beast);
  setHint('');
}
/* pitcher: the batter's device judged the pitch */
function onResultMsg(m) {
  if (!online || onlineReview.active) return;
  if (mode !== 'pit' || phase !== 'fly' || !ball) { onl.waitRes = m; return; }
  applyRemoteResult(m);
}
function applyRemoteResult(m) {
  applyOnlineBeast(m.beast);
  const C = m.C ? V(m.C[0], m.C[1], m.C[2]) : ball.tgt.clone();
  if (m.swung) batAnim = { t0: now_() - SWING_LEAD, plan: makeSwingPlan(C) };
  if (m.c.bunt) curBunt = true;
  runOnlineResult(m.c, C, m.seed);
}
/* pitcher side while the ball is in the air: wait for the batter's verdict */
function stepFlyOnline(now) {
  if (onl.waitRes) { const m = onl.waitRes; onl.waitRes = null; applyRemoteResult(m); return; }
  if (now > ball.start + ball.dur + 10) setHint('相手の応答を待っています…');
}
function onlineAfterResult() {
  clearPlay();
  const sc = onlineScore();
  if (G.inning >= 6 && G.inning % 2 === 0 && sc.home > sc.away) G.over = true;   // walk-off in any bottom half from the 3rd on
  if (G.over) { showOnlineOver(); return; }
  if (G.inning !== onl.half) {
    if (timeOut) { timeOut = false; send('time', { on: false }); }
    onl.oppTime = false;
    applyRole();
    const dd = applyInningDice();
    const B = curBatter(), lead = B.star ? '　先頭はスーパースター ' + B.name : '';
    if (B.star) G.lastAnn = G.pa;
    showBanner('チェンジ', inningLabel() + '　' + (mode === 'bat' ? '攻撃' : '守備') + lead, 'n');
    if (dd) setTimeout(() => showDiceBanner(dd), 1600);
    return;
  }
  phase = mode === 'bat' ? 'wait' : 'ready'; nextAt = Infinity;
  hud(); setHint(roleHint());
  announceChance();
  takeQueuedPitch();
}
/* the menu button during an online game: the match keeps running underneath, and leaving takes a second tap */
function onlinePause() {
  if(onlineReview.active)return;
  if (onl.finished) { renderOnlineOver(); return; }
  overlay({ title: 'オンライン対戦中', text: '試合は続いています。部屋番号 ' + onl.code + '　' + inningLabel() + '　しばいぬズ ' + onlineScore().home + ' - ' + onlineScore().away + ' パンダーズ',
    b1: ['試合にもどる', () => { $('#overlay').hidden = true; }], b2: ['試合をやめる', () => overlay({
      title: '試合をやめますか？', text: '相手との接続が切れて、試合は終わりになります。',
      b1: ['続ける', () => { $('#overlay').hidden = true; }], b2: ['やめる', showMenu] })] });
}
function showOnlineOver() {
  if (onl.finished) return;
  onl.finished = true;
  idle(); resetOnlineBeast();
  const sc = onlineScore();
  if (sc[onl.side] > sc[onl.side === 'home' ? 'away' : 'home']) celebrate(now_() + 0.2, 6);
  renderOnlineOver();
}
function renderOnlineOver() {
  const sc = onlineScore(), mine = sc[onl.side], theirs = sc[onl.side === 'home' ? 'away' : 'home'];
  overlay({ clear: mine > theirs, title: mine > theirs ? '勝ち！' : mine < theirs ? '負け…' : '引き分け',
    text: 'しばいぬズ ' + sc.home + ' - ' + sc.away + ' パンダーズ\n'
      + (onl.rematch.mine ? '再戦を希望しました。相手の返事を待っています。' : onl.rematch.theirs ? '相手が再戦を希望しています。' : '双方が希望すると、同じ部屋で再戦できます。')
      + '\n再戦は先攻・後攻と担当チームを交代します。',
    b1: [onl.rematch.mine ? '相手の返事を待っています…' : 'もう一度対戦する', requestOnlineRematch], b2: ['メニューへ', showMenu] });
  $('#goBtn').disabled = onl.rematch.mine;
}
function requestOnlineRematch() {
  if (!online || !onl.finished || onl.rematch.mine) return;
  onl.rematch.mine = true; send('rematch'); renderOnlineOver(); tryOnlineRematch();
}
function tryOnlineRematch() {
  if (!onl.finished || !onl.rematch.mine || !onl.rematch.theirs || onl.side !== 'home') return;
  const next = { round: onl.round + 1, seed: (Math.random() * 4294967296) >>> 0 };
  send('rematch-start', next); restartOnline(next);
}
function restartOnline(m) {
  onl.round = m.round; onl.seed = m.seed >>> 0;
  onl.side = onl.side === 'home' ? 'away' : 'home';
  idle(); beginOnline();
}

/* ---- sharing: send the game link, or an invite link that opens straight into a room ---- */
function inviteUrl(code) { return PAGES_URL + '?room=' + code; }
async function shareLink(text, url) {
  try { if (navigator.share) { await navigator.share({ title: 'どうぶつベースボール', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  let copied = false;
  try { await navigator.clipboard.writeText(text + '\n' + url); copied = true; } catch (e) {}
  $('#od').textContent = copied ? 'リンクをコピーしました。LINE などに貼って送ってください。' : url;
}
function shareGame() { shareLink('どうぶつたちの野球ゲーム「どうぶつベースボール」で遊ぼう！', PAGES_URL); }
function shareRoom(code) { shareLink('どうぶつベースボールで対戦しよう！リンクを開くと部屋に入れます（部屋番号 ' + code + '）', inviteUrl(code)); }
/* opened from an invite link (?room=1234): go straight into that room */
function inviteBoot() {
  let code = '';
  try { code = new URLSearchParams(location.search).get('room') || ''; } catch (e) {}
  if (!/^\d{4}$/.test(code)) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (window.supabase && window.supabase.createClient) joinRoom(code);
}
