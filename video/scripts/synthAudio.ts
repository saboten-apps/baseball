// BGM と効果音を、コードだけで合成して WAV に書き出す（外部素材・外部APIは使わない）。
// 乱数は固定の種から作るので、何度実行しても同じ音になる。権利はこのリポジトリの作者にあり、商用利用できる。
// 使い方：node scripts/synthAudio.ts（出力：public/generated/audio/*.wav）
import fs from 'node:fs'
import path from 'node:path'

const RATE = 44100
const OUT = path.join(import.meta.dirname, '..', 'public', 'generated', 'audio')

type Buf = Float32Array

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

type Wave = 'sine' | 'square' | 'tri' | 'saw'
function osc(wave: Wave, phase: number) {
  const p = phase - Math.floor(phase)
  switch (wave) {
    case 'sine': return Math.sin(2 * Math.PI * p)
    case 'square': return p < 0.5 ? 1 : -1
    case 'tri': return 1 - 4 * Math.abs(p - 0.5)
    case 'saw': return 2 * p - 1
  }
}

/** 音を1つ、buf に足す（ADSR の簡易版） */
function tone(buf: Buf, start: number, dur: number, freq: number, opts: { wave?: Wave; vol?: number; attack?: number; release?: number; slide?: number; vibrato?: number } = {}) {
  const { wave = 'square', vol = 0.2, attack = 0.005, release = 0.08, slide = 0, vibrato = 0 } = opts
  const s0 = Math.floor(start * RATE)
  const n = Math.floor((dur + release) * RATE)
  let phase = 0
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / RATE
    const env = t < attack ? t / attack : t < dur ? 1 : Math.max(0, 1 - (t - dur) / release)
    const f = freq * (1 + slide * (t / (dur + release))) * (1 + vibrato * Math.sin(2 * Math.PI * 5.5 * t))
    phase += f / RATE
    if (s0 + i >= 0) buf[s0 + i] += osc(wave, phase) * env * vol
  }
}

function noise(buf: Buf, start: number, dur: number, rng: () => number, opts: { vol?: number; decay?: number; lowpass?: number } = {}) {
  const { vol = 0.2, decay = 20, lowpass = 1 } = opts
  const s0 = Math.floor(start * RATE)
  const n = Math.floor(dur * RATE)
  let last = 0
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / RATE
    last += (rng() * 2 - 1 - last) * lowpass
    buf[s0 + i] += last * Math.exp(-decay * t) * vol
  }
}

function kick(buf: Buf, start: number, vol = 0.55) {
  const s0 = Math.floor(start * RATE)
  let phase = 0
  for (let i = 0; i < RATE * 0.25 && s0 + i < buf.length; i++) {
    const t = i / RATE
    phase += (45 + 110 * Math.exp(-30 * t)) / RATE
    buf[s0 + i] += Math.sin(2 * Math.PI * phase) * Math.exp(-12 * t) * vol
  }
}

/** 全体を -1〜1 に収め、最大音量をそろえる */
function master(buf: Buf, peak = 0.89) {
  let max = 0
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.tanh(buf[i] * 1.2)
    max = Math.max(max, Math.abs(buf[i]))
  }
  const g = max > 0 ? peak / max : 1
  for (let i = 0; i < buf.length; i++) buf[i] *= g
  return buf
}

function writeWav(file: string, buf: Buf) {
  const data = Buffer.alloc(buf.length * 2)
  for (let i = 0; i < buf.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), i * 2)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8)
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write('data', 36); h.writeUInt32LE(data.length, 40)
  fs.writeFileSync(path.join(OUT, file), Buffer.concat([h, data]))
}

interface Song {
  bpm: number
  /** 1小節ごとの和音（ルートの MIDI 番号と、構成音の半音差） */
  chords: [number, number[]][]
  lead: Wave
  drums: 'four' | 'half' | 'soft'
  arp: number[]
  seed: number
}

function song(s: Song, seconds = 34): Buf {
  const buf = new Float32Array(Math.floor(seconds * RATE))
  const rng = makeRng(s.seed)
  const beat = 60 / s.bpm
  const bar = beat * 4
  const bars = Math.ceil(seconds / bar)
  for (let b = 0; b < bars; b++) {
    const [root, iv] = s.chords[b % s.chords.length]
    const t0 = b * bar
    // ベース（8分）
    for (let k = 0; k < 8; k++) {
      const n = root - 24 + (k % 4 === 3 ? 7 : 0)
      tone(buf, t0 + k * beat / 2, beat / 2 * 0.8, midi(n), { wave: 'tri', vol: 0.28, release: 0.03 })
    }
    // 和音のパッド
    for (const d of iv) tone(buf, t0, bar * 0.95, midi(root + d), { wave: 'saw', vol: 0.025, attack: 0.08, release: 0.3 })
    // 分散和音（16分）
    for (let k = 0; k < 16; k++) {
      const d = iv[s.arp[k % s.arp.length] % iv.length] + (k % 8 >= 4 ? 12 : 0)
      tone(buf, t0 + k * beat / 4, beat / 4 * 0.6, midi(root + 12 + d), { wave: s.lead, vol: 0.045, release: 0.05 })
    }
    // メロディ（小節ごとに、和音の音から少し動く）
    if (b % 8 >= 2) {
      for (let k = 0; k < 4; k++) {
        if (rng() < 0.25) continue
        const d = iv[Math.floor(rng() * iv.length)] + (rng() < 0.3 ? 2 : 0)
        tone(buf, t0 + k * beat, beat * (rng() < 0.5 ? 0.9 : 0.45), midi(root + 24 + d), { wave: 'square', vol: 0.06, vibrato: 0.006, release: 0.12 })
      }
    }
    // リズム
    for (let k = 0; k < 4; k++) {
      const t = t0 + k * beat
      if (s.drums === 'four' || (s.drums === 'half' && k % 2 === 0) || (s.drums === 'soft' && k === 0)) kick(buf, t, s.drums === 'soft' ? 0.35 : 0.55)
      if (k % 2 === 1 && s.drums !== 'soft') noise(buf, t, 0.18, rng, { vol: 0.22, decay: 22, lowpass: 0.6 })
      noise(buf, t + beat / 2, 0.05, rng, { vol: 0.06, decay: 80 })
      if (s.drums === 'four') noise(buf, t, 0.04, rng, { vol: 0.04, decay: 90 })
    }
  }
  // 始めと終わりを、なめらかに
  const fade = RATE * 0.02
  for (let i = 0; i < fade; i++) { buf[i] *= i / fade; buf[buf.length - 1 - i] *= i / fade }
  return master(buf, 0.8)
}

const MAJ = [0, 4, 7, 12]
const MIN = [0, 3, 7, 12]

const songs: Record<string, Song> = {
  bgm_pop: { bpm: 132, chords: [[60, MAJ], [67, MAJ], [69, MIN], [65, MAJ]], lead: 'square', drums: 'four', arp: [0, 1, 2, 3, 2, 1], seed: 11 },
  bgm_tense: { bpm: 112, chords: [[57, MIN], [57, MIN], [53, MAJ], [52, MAJ]], lead: 'saw', drums: 'half', arp: [0, 2, 1, 3], seed: 23 },
  bgm_dreamy: { bpm: 96, chords: [[65, MAJ], [57, MIN], [58, MAJ], [60, MAJ]], lead: 'tri', drums: 'soft', arp: [0, 1, 2, 3], seed: 37 },
}

function sfx(seconds: number, draw: (b: Buf, rng: () => number) => void, seed: number) {
  const b = new Float32Array(Math.floor(seconds * RATE))
  draw(b, makeRng(seed))
  return master(b, 0.9)
}

// ---- ご褒美・緊張・落差の音（パチンコ／ガチャ型：期待→緊張→報酬）。すべてコード合成のオリジナル ----

/** バットの快音：硬い破裂音＋木の胴鳴り＋高い余韻 */
function crackAt(b: Buf, t: number, rng: () => number, vol = 1) {
  noise(b, t, 0.09, rng, { vol: 0.9 * vol, decay: 70, lowpass: 0.95 })
  tone(b, t, 0.04, 950, { wave: 'sine', vol: 0.7 * vol, slide: -0.7, release: 0.1 })
  tone(b, t, 0.02, 2300, { wave: 'sine', vol: 0.3 * vol, release: 0.22 })
  kick(b, t, 0.55 * vol)
}

/** ファンファーレ風アルペジオ（ド・ミ・ソ・高いド・高いミ → 和音を伸ばす） */
function fanfareAt(b: Buf, t: number, vol = 1, lift = 0) {
  ;[72, 76, 79, 84, 88].forEach((n, i) => tone(b, t + i * 0.085, 0.09, midi(n + lift), { wave: 'square', vol: 0.2 * vol, release: 0.06 }))
  const t1 = t + 5 * 0.085
  ;[84, 88, 91, 96].forEach((n) => tone(b, t1, 0.55, midi(n + lift), { wave: 'saw', vol: 0.11 * vol, attack: 0.01, release: 0.45, vibrato: 0.004 }))
}

/** 歓声っぽいノイズ（帯域を絞ったノイズが、ふくらんで消える） */
function cheerAt(b: Buf, t: number, dur: number, rng: () => number, vol = 1) {
  const s0 = Math.floor(t * RATE)
  const n = Math.floor(dur * RATE)
  let a = 0, c = 0, wob = 0
  for (let i = 0; i < n && s0 + i < b.length; i++) {
    const x = i / RATE
    const white = rng() * 2 - 1
    a += (white - a) * 0.28
    c += (white - c) * 0.035
    wob += ((rng() * 2 - 1) - wob) * 0.0008
    const env = Math.pow(Math.sin(Math.PI * Math.min(1, x / dur)), 1.4) * (0.75 + 2.5 * wob)
    b[s0 + i] += (a - c) * 1.6 * env * 0.5 * vol
  }
}

/** キラキラした高い音のならび */
function sparkleAt(b: Buf, t: number, notes: number[], step = 0.05, vol = 1) {
  notes.forEach((n, i) => tone(b, t + i * step, 0.04, midi(n), { wave: 'sine', vol: 0.3 * vol, release: 0.35 }))
}

/** 「ズコッ」：音程がずるっと落ちて、コッと止まる */
function zukoAt(b: Buf, t: number, rng: () => number, vol = 1) {
  const s0 = Math.floor(t * RATE)
  const dur = 0.34
  let phase = 0
  for (let i = 0; i < dur * RATE && s0 + i < b.length; i++) {
    const x = i / RATE
    phase += 560 * Math.pow(85 / 560, x / dur) / RATE
    const env = Math.min(1, x / 0.01) * Math.exp(-3.2 * x)
    b[s0 + i] += (osc('saw', phase) * 0.6 + osc('tri', phase * 0.5) * 0.4) * env * 0.5 * vol
  }
  kick(b, t + 0.36, 0.7 * vol)
  noise(b, t + 0.36, 0.08, rng, { vol: 0.35 * vol, decay: 50, lowpass: 0.4 })
}

/** 報酬の音：段階が上がるほど高い鐘（ド・レ・ミ・ソ・ラ） */
const RISE_NOTES = [84, 86, 88, 91, 93]
function riseAt(b: Buf, level: number) {
  const n = RISE_NOTES[level - 1]
  tone(b, 0, 0.03, midi(n), { wave: 'sine', vol: 0.6, release: 0.42 })
  tone(b, 0, 0.03, midi(n + 12), { wave: 'sine', vol: 0.22, release: 0.3 })
  tone(b, 0.045, 0.03, midi(n + 7), { wave: 'sine', vol: 0.28, release: 0.3 })
}

const effects: Record<string, Buf> = {
  sfx_pop: sfx(0.25, (b) => tone(b, 0, 0.06, 520, { wave: 'sine', vol: 0.8, slide: 1.4, release: 0.1 }), 1),
  sfx_whoosh: sfx(0.5, (b, r) => {
    for (let i = 0; i < b.length; i++) { const t = i / RATE; b[i] += (r() * 2 - 1) * Math.sin(Math.PI * t / 0.5) * 0.5 }
    for (let i = 1; i < b.length; i++) b[i] = b[i - 1] + (b[i] - b[i - 1]) * (0.05 + 0.4 * (i / b.length))
  }, 2),
  sfx_ding: sfx(1.2, (b) => {
    tone(b, 0, 0.02, midi(88), { wave: 'sine', vol: 0.6, release: 1.1 })
    tone(b, 0, 0.02, midi(95), { wave: 'sine', vol: 0.25, release: 0.8 })
  }, 3),
  sfx_tick: sfx(0.12, (b) => tone(b, 0, 0.01, 1800, { wave: 'square', vol: 0.4, release: 0.03 }), 4),
  sfx_drumroll: sfx(1.6, (b, r) => {
    for (let k = 0; k < 40; k++) noise(b, k * 0.035, 0.06, r, { vol: 0.15 + 0.35 * (k / 40), decay: 40, lowpass: 0.5 })
    kick(b, 1.4, 0.8)
  }, 5),
  sfx_boom: sfx(1.0, (b, r) => { kick(b, 0, 1); noise(b, 0, 0.8, r, { vol: 0.5, decay: 6, lowpass: 0.08 }) }, 6),
  sfx_sparkle: sfx(0.9, (b) => {
    [84, 88, 91, 96, 100].forEach((n, i) => tone(b, i * 0.06, 0.04, midi(n), { wave: 'sine', vol: 0.35, release: 0.4 }))
  }, 7),
  sfx_buzzer: sfx(0.6, (b) => {
    tone(b, 0, 0.45, 140, { wave: 'saw', vol: 0.5, release: 0.08 })
    tone(b, 0, 0.45, 147, { wave: 'square', vol: 0.3, release: 0.08 })
  }, 8),
  sfx_coin: sfx(0.6, (b) => {
    tone(b, 0, 0.07, midi(83), { wave: 'square', vol: 0.35, release: 0.02 })
    tone(b, 0.07, 0.3, midi(88), { wave: 'square', vol: 0.35, release: 0.2 })
  }, 9),
  sfx_stamp: sfx(0.6, (b, r) => { kick(b, 0, 0.9); noise(b, 0, 0.12, r, { vol: 0.6, decay: 30, lowpass: 0.3 }) }, 10),
  sfx_crack: sfx(0.7, (b, r) => crackAt(b, 0, r), 11),
  sfx_fanfare: sfx(1.6, (b) => fanfareAt(b, 0), 12),
  // 正解・勝者・1位の発表：快音＋ファンファーレ＋キラキラ
  sfx_winner: sfx(1.8, (b, r) => { crackAt(b, 0, r, 0.9); fanfareAt(b, 0.12, 0.9); sparkleAt(b, 0.55, [84, 88, 91, 96, 100], 0.06, 0.8) }, 13),
  // ホームラン：快音＋歓声＋ファンファーレ＋キラキラ（本編でいちばん大きなご褒美）
  sfx_homerun: sfx(3.2, (b, r) => {
    crackAt(b, 0, r, 1)
    kick(b, 0.3, 0.7)
    cheerAt(b, 0.15, 2.9, r, 1)
    fanfareAt(b, 0.35, 1)
    sparkleAt(b, 0.95, [84, 88, 91, 96, 100, 103, 108], 0.07, 0.9)
  }, 14),
  // 最後の大当たり：ホームラン＋もう1段高いファンファーレ＋キラキラの連打（動画でいちばん大きな音）
  sfx_jackpot: sfx(3.5, (b, r) => {
    kick(b, 0, 0.7)
    crackAt(b, 0.02, r, 0.55)
    cheerAt(b, 0.05, 3.3, r, 2.2)
    fanfareAt(b, 0.1, 1.4)
    fanfareAt(b, 1.0, 1.3, 12)
    sparkleAt(b, 0.5, [84, 88, 91, 96, 100, 103, 108, 112], 0.06, 1.3)
    sparkleAt(b, 1.6, [96, 100, 103, 108, 112, 115], 0.07, 1.2)
    for (let i = 0; i < 5; i++) tone(b, 1.2 + i * 0.07, 0.05, midi(88 + i * 2), { wave: 'square', vol: 0.2, release: 0.2 })
    // 最後まで続く和音（ドミソド）で、音の厚みを出す
    ;[72, 76, 79, 84].forEach((n) => tone(b, 1.9, 1.2, midi(n), { wave: 'saw', vol: 0.09, attack: 0.02, release: 0.35, vibrato: 0.004 }))
  }, 15),
  sfx_zuko: sfx(0.75, (b, r) => zukoAt(b, 0, r), 16),
  sfx_blip: sfx(0.3, (b) => { tone(b, 0, 0.04, midi(91), { wave: 'sine', vol: 0.5, release: 0.12 }); tone(b, 0.045, 0.05, midi(96), { wave: 'sine', vol: 0.45, release: 0.18 }) }, 17),
  sfx_rise_1: sfx(0.55, (b) => riseAt(b, 1), 21),
  sfx_rise_2: sfx(0.55, (b) => riseAt(b, 2), 22),
  sfx_rise_3: sfx(0.55, (b) => riseAt(b, 3), 23),
  sfx_rise_4: sfx(0.55, (b) => riseAt(b, 4), 24),
  sfx_rise_5: sfx(0.55, (b) => riseAt(b, 5), 25),
}

fs.mkdirSync(OUT, { recursive: true })
for (const [name, s] of Object.entries(songs)) writeWav(`${name}.wav`, song(s))
for (const [name, b] of Object.entries(effects)) writeWav(`${name}.wav`, b)
console.log('audio:', Object.keys(songs).length, 'bgm,', Object.keys(effects).length, 'sfx →', path.relative(process.cwd(), OUT))
