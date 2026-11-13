// テスト用：音の台本どおりに、WAV を足し合わせた「本物の波形」を作る（Remotion が書き出す音と同じ足し算）
import fs from 'node:fs'
import path from 'node:path'
import { SFX } from '../src/audio.ts'
import { bgmGain, duckWindows, type Cue } from '../src/plan/soundPlan.ts'
import { FPS, sec } from '../src/plan/timing.ts'

const dir = path.join(import.meta.dirname, '..', 'public')
const RATE = 44100
/** Remotion はモノラルをステレオの中央に置くので、実際の書き出しは約 -3dB になる（2026-W46 の実測と合わせた） */
const STEREO = Math.SQRT1_2
const cache = new Map<string, Float32Array>()

export function wav(p: string): Float32Array {
  let w = cache.get(p)
  if (!w) {
    const b = fs.readFileSync(path.join(dir, p))
    w = new Float32Array((b.length - 44) / 2)
    for (let i = 0; i < w.length; i++) w[i] = b.readInt16LE(44 + i * 2) / 32768
    cache.set(p, w)
  }
  return w
}

/** 効果音だけの合計と、BGM込みの合計（フレームごとの BGM の大きさは、Frame と同じ式） */
export function mixdown(cues: Cue[], bgm: string, durationInFrames: number) {
  const n = Math.floor((durationInFrames / FPS) * RATE)
  const sfx = new Float32Array(n), all = new Float32Array(n)
  for (const c of cues) {
    const w = wav(SFX[c.sfx])
    const s0 = Math.round((c.at / FPS) * RATE)
    for (let i = 0; i < w.length && s0 + i < n; i++) sfx[s0 + i] += w[i] * c.volume
  }
  const music = wav(bgm)
  const win = duckWindows(cues)
  const fade = (f: number) => {
    const rise = f < 6 ? 0.6 + 0.4 * (f / 6) : 1
    const fall = f > durationInFrames - 25 ? Math.max(0, (durationInFrames - f) / 25) : 1
    return rise * fall
  }
  for (let i = 0; i < n; i++) {
    const f = (i / RATE) * FPS
    all[i] = (sfx[i] + music[i % music.length] * 0.42 * bgmGain(f, win) * fade(f)) * STEREO
  }
  for (let i = 0; i < n; i++) sfx[i] *= STEREO
  return { sfx, all }
}

export const peak = (a: Float32Array) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m }
export const rmsDb = (a: Float32Array, from = 0, to = a.length) => { let s = 0; for (let i = from; i < to; i++) s += a[i] * a[i]; return 10 * Math.log10(s / (to - from) + 1e-12) }
export const endSec = (d: number) => sec(0) + d / FPS
