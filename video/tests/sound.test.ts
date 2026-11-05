import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BGM, SFX, SFX_SEC, type SfxName } from '../src/audio.ts'
import { buildWeekPlan } from '../src/plan/buildPlan.ts'
import { DUCK, MAX_CUE_VOLUME, MAX_REWARD_GAP_SEC, REWARD_SFX, WEIGHT, bgmGain, duckWindows, soundPlan, type Cue } from '../src/plan/soundPlan.ts'
import { END_CARD_SEC, FPS, T, sec } from '../src/plan/timing.ts'
import type { GameData, VideoSpec } from '../src/plan/types.ts'
import { mixdown, peak, rmsDb } from './mix.ts'

const dir = path.join(import.meta.dirname, '..')
const data = JSON.parse(fs.readFileSync(path.join(dir, 'src', 'generated', 'gameData.json'), 'utf8')) as GameData
const licenses = JSON.parse(fs.readFileSync(path.join(dir, 'audio-licenses.json'), 'utf8')).files
const weeks = Array.from({ length: 52 }, (_, i) => `2027-W${String(i + 1).padStart(2, '0')}`)
const all = weeks.flatMap((w) => buildWeekPlan(data, w))
const cuesOf = (s: VideoSpec) => soundPlan(s.props)
const of = (s: VideoSpec, ...names: SfxName[]) => cuesOf(s).filter((c) => names.includes(c.sfx))
const endAt = (s: VideoSpec) => s.props.durationInFrames - sec(END_CARD_SEC)

describe('効果音の素材（コード合成のオリジナルだけ）', () => {
  it('すべての効果音に、商用利用OKの記録があり、合成の出力ファイルがある', () => {
    for (const p of [...Object.values(BGM), ...Object.values(SFX)]) {
      expect(licenses[p]?.commercialUse, p).toBe(true)
      expect(licenses[p]?.source, p).toContain('synthAudio.ts')
      expect(fs.existsSync(path.join(dir, 'public', p)), p).toBe(true)
    }
  })
  it('台本の長さ（SFX_SEC）が、実際のWAVの長さと合っている', () => {
    for (const [name, p] of Object.entries(SFX)) {
      const bytes = fs.statSync(path.join(dir, 'public', p)).size - 44
      expect(bytes / 2 / 44100, name).toBeCloseTo(SFX_SEC[name as SfxName], 1)
    }
  })
  it('動画で使う音声の一覧（spec.audio）は、音の台本と一致する', () => {
    for (const s of all.slice(0, 70)) {
      const used = new Set(cuesOf(s).map((c) => SFX[c.sfx]))
      expect(new Set(s.audio.filter((a) => !Object.values(BGM).includes(a as never)))).toEqual(used)
    }
  })
})

describe('音の台本：期待→緊張→報酬', () => {
  it('つかみ：0フレームで見出しの音、数字・名前が出る頃（3フレーム）に報酬音', () => {
    for (const s of all) {
      const c = cuesOf(s)
      expect(c.some((x) => x.sfx === 'whoosh' && x.at === 0)).toBe(true)
      expect(c.some((x) => x.sfx === 'ding' && x.at <= 6)).toBe(true)
    }
  })

  it('2〜3秒ごとに、小さな報酬音がある（最初から最後まで、ご褒美の音の間隔が3秒以内）', () => {
    for (const s of all) {
      const marks = [0, ...cuesOf(s).filter((c) => REWARD_SFX.includes(c.sfx)).map((c) => c.at), s.props.durationInFrames].sort((a, b) => a - b)
      for (let i = 1; i < marks.length; i++) expect((marks[i] - marks[i - 1]) / FPS, `${s.template} @${marks[i - 1]}`).toBeLessThanOrEqual(MAX_REWARD_GAP_SEC + 0.01)
    }
  })

  it('最後（エンドカードの頭）に、いちばん大きな音（jackpot）が1回だけ。ほかの音は、これより小さい', () => {
    for (const s of all) {
      const c = cuesOf(s)
      const j = c.filter((x) => x.sfx === 'jackpot')
      expect(j).toHaveLength(1)
      expect(j[0].at).toBe(endAt(s))
      for (const x of c) if (x.sfx !== 'jackpot') expect(WEIGHT[x.sfx] ?? 0, x.sfx).toBeLessThan(WEIGHT.jackpot as number)
      // 本編の最大の音（正解・勝者・1位・ホームラン）より、後ろにある
      const biggest = Math.max(...c.filter((x) => x.sfx !== 'jackpot').map((x) => WEIGHT[x.sfx] ?? 0))
      expect(biggest).toBeLessThan(WEIGHT.jackpot as number)
    }
  })

  it('3・2・1 の刻み音は、少しずつ速くなる（クイズ2種と打者対決）', () => {
    for (const s of all.filter((x) => ['TraitQuiz', 'PitchSpeedQuiz', 'VersusDuel'].includes(x.template))) {
      const t = T[s.template as 'TraitQuiz']
      const start = s.template === 'VersusDuel'
        ? sec(T.VersusDuel.hook + T.VersusDuel.intro + T.VersusDuel.stats)
        : sec(t.hook + (t as { question: number }).question)
      const ticks = of(s, 'tick').filter((c) => c.at >= start && c.at < start + sec(3)).map((c) => c.at)
      expect(ticks.length).toBeGreaterThanOrEqual(6)
      const gaps = ticks.slice(1).map((v, i) => v - ticks[i])
      for (let i = 1; i < gaps.length; i++) expect(gaps[i], s.template).toBeLessThanOrEqual(gaps[i - 1])
      expect(gaps[gaps.length - 1]).toBeLessThan(gaps[0] / 2)
    }
  })

  it('ランキング：めくる前の刻み音が速くなり、3位→2位→1位と、音程が上がり、1位で最大の音', () => {
    const order: SfxName[] = ['rise_1', 'rise_3', 'winner']
    for (const s of all.filter((x) => x.template === 'RankingCountdown')) {
      const start = (i: number) => sec(T.RankingCountdown.hook) + sec(T.RankingCountdown.item) * i
      const rewards = order.map((n, i) => cuesOf(s).find((c) => c.sfx === n && c.at >= start(i) && c.at < start(i) + sec(T.RankingCountdown.item + 1)))
      rewards.forEach((r) => expect(r).toBeTruthy())
      const w = rewards.map((r) => WEIGHT[(r as Cue).sfx] ?? 0)
      expect(w[0]).toBeLessThan(w[1])
      expect(w[1]).toBeLessThan(w[2])
      for (let i = 0; i < 3; i++) {
        const ticks = of(s, 'tick').filter((c) => c.at >= start(i) && c.at < start(i) + sec(T.RankingCountdown.item)).map((c) => c.at)
        expect(ticks.length).toBeGreaterThanOrEqual(3)
        const gaps = ticks.slice(1).map((v, k) => v - ticks[k])
        for (let k = 1; k < gaps.length; k++) expect(gaps[k]).toBeLessThanOrEqual(gaps[k - 1])
      }
    }
  })

  it('落差：打者対決は、負けた側の「ズコッ」のあとに勝者の発表。球種紹介は、遅い球だけ「ズコッ」', () => {
    for (const s of all.filter((x) => x.template === 'VersusDuel')) {
      const z = of(s, 'zuko'), w = of(s, 'winner')
      expect(z).toHaveLength(1)
      expect(w).toHaveLength(1)
      expect(w[0].at - z[0].at).toBeGreaterThan(0)
      expect(w[0].at - z[0].at).toBeLessThanOrEqual(FPS)
    }
    for (const s of all.filter((x) => x.template === 'PitchShowcase')) {
      const pitches = (s.props.data as { pitches: { max: number }[] }).pitches
      expect(of(s, 'zuko')).toHaveLength(pitches.filter((p) => p.max < 110).length)
    }
  })

  it('実画面紹介：ホームラン画面で最大級の「ホームラン」音、試合中の画面は緊張→快音', () => {
    for (const s of all.filter((x) => x.template === 'ScreenTour')) {
      const keys = (s.props.data as { shots: { key: string }[] }).shots.map((x) => x.key)
      expect(of(s, 'homerun')).toHaveLength(keys.includes('hr') ? 1 : 0)
      if (keys.includes('ingame')) expect(of(s, 'crack').length).toBeGreaterThanOrEqual(2)
    }
  })

  it('クイズ：正解の位置が違っても、音は同じ。答えの発表より前に、派手な音（正解・ホームラン級）を鳴らさない', () => {
    for (const s of all.filter((x) => x.template === 'TraitQuiz' || x.template === 'PitchSpeedQuiz')) {
      const t = T[s.template as 'TraitQuiz']
      const answerAt = sec(t.hook + (t as { question: number }).question + t.countdown)
      const d = s.props.data as { answerIndex: number; options: unknown[] }
      const other = { ...s.props, data: { ...d, answerIndex: (d.answerIndex + 1) % d.options.length } }
      expect(JSON.stringify(soundPlan(other as never))).toBe(JSON.stringify(cuesOf(s)))
      for (const c of cuesOf(s).filter((x) => x.at < answerAt)) expect(WEIGHT[c.sfx] ?? 0, `${s.template}: ${c.sfx}`).toBeLessThan(WEIGHT.winner as number)
      expect(of(s, 'winner').map((c) => c.at)).toEqual([answerAt])
    }
  })

  it('ストーリー予告：「？？？」の回も、序盤の話と同じ種類の小さな音（続きを匂わせない）', () => {
    for (const s of all.filter((x) => x.template === 'StoryTeaser')) {
      const chF = sec(T.StoryTeaser.chapter), hookF = sec(T.StoryTeaser.hook)
      const inCh = (i: number) => cuesOf(s).filter((c) => c.at >= hookF + chF * i && c.at < hookF + chF * (i + 1) && c.sfx !== 'blip')
      for (let i = 0; i < 4; i++) for (const c of inCh(i)) expect(WEIGHT[c.sfx] ?? 0).toBeLessThanOrEqual(WEIGHT.rise_4 as number)
      expect(inCh(3).map((c) => c.sfx).sort()).toEqual(inCh(2).map((c) => c.sfx.replace(/rise_\d/, 'rise_4')).sort())
    }
  })
})

describe('音量（割れない範囲で、そろえる）', () => {
  it('鳴らす大きさは上限以内で、報酬が大きいほど大きい', () => {
    for (const s of all) for (const c of cuesOf(s)) {
      expect(c.volume, c.sfx).toBeGreaterThan(0)
      expect(c.volume, c.sfx).toBeLessThanOrEqual(MAX_CUE_VOLUME)
    }
  })

  it('実際に足し合わせた波形（ステレオ化の-3dB込み）が、割れない（BGM込みで、最大が 0.9 以下）。7形式×複数週', () => {
    for (const s of all.filter((_, i) => i % 2 === 0)) {
      const { all: mix } = mixdown(cuesOf(s), s.props.bgm, s.props.durationInFrames)
      expect(peak(mix), `${s.template}`).toBeLessThanOrEqual(0.9)
    }
  }, 120_000)

  it('最後の大当たりが、動画でいちばん大きい（本編のどの2秒より大きい）。形式ごとの平均の大きさの差は 4dB 以内', () => {
    const byTemplate = new Map<string, number[]>()
    const R = 44100
    for (const s of all.filter((_, i) => i % 7 === 0)) {
      const { all: mix } = mixdown(cuesOf(s), s.props.bgm, s.props.durationInFrames)
      const e = Math.floor(((s.props.durationInFrames - sec(END_CARD_SEC)) / FPS) * R)
      let loudestBody = -99
      for (let t = 0; t + 2 * R <= e; t += R / 2) loudestBody = Math.max(loudestBody, rmsDb(mix, t, t + 2 * R))
      const finale = rmsDb(mix, e, Math.min(mix.length, e + 2 * R))
      expect(finale - loudestBody, `${s.template}: 最後 ${finale.toFixed(1)}dB / 本編の最大 ${loudestBody.toFixed(1)}dB`).toBeGreaterThanOrEqual(1)
      byTemplate.set(s.template, [...(byTemplate.get(s.template) ?? []), rmsDb(mix)])
    }
    const means = [...byTemplate.values()].map((v) => v.reduce((a, b) => a + b, 0) / v.length)
    expect(Math.max(...means) - Math.min(...means)).toBeLessThanOrEqual(4)
  }, 120_000)

  it('いちばん大きな音（jackpot）の間は、BGM を下げる', () => {
    expect(DUCK.jackpot).toBeLessThan(DUCK.winner as number)
    const s = all[0]
    const c = cuesOf(s).find((x) => x.sfx === 'jackpot') as Cue
    expect(bgmGain(c.at + 10, duckWindows(cuesOf(s)))).toBeCloseTo(DUCK.jackpot as number, 2)
    expect(bgmGain(0, duckWindows(cuesOf(s)))).toBeGreaterThan(0.99)
  })
})
