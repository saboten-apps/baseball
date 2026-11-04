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
}

fs.mkdirSync(OUT, { recursive: true })
for (const [name, s] of Object.entries(songs)) writeWav(`${name}.wav`, song(s))
for (const [name, b] of Object.entries(effects)) writeWav(`${name}.wav`, b)
console.log('audio:', Object.keys(songs).length, 'bgm,', Object.keys(effects).length, 'sfx →', path.relative(process.cwd(), OUT))
