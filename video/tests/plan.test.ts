import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BGM, SFX } from '../src/audio.ts'
import { BASE_TAGS, SPOILER_WORDS, buildWeekPlan, rotate } from '../src/plan/buildPlan.ts'
import { FPS, HOOK_SEC, MAX_SEC, MIN_SEC, T } from '../src/plan/timing.ts'
import { TEMPLATE_IDS, type GameData } from '../src/plan/types.ts'
import { isoWeekId, parseWeekId } from '../src/plan/week.ts'
import { checkAudioLicenses } from '../scripts/renderWeek.ts'

const dir = path.join(import.meta.dirname, '..')
const data = JSON.parse(fs.readFileSync(path.join(dir, 'src', 'generated', 'gameData.json'), 'utf8')) as GameData
const licenses = JSON.parse(fs.readFileSync(path.join(dir, 'audio-licenses.json'), 'utf8')).files

describe('ゲームのデータの読み取り', () => {
  it('チーム・球種・ハプニング・ストーリーが読めている', () => {
    expect(data.teams.length).toBeGreaterThanOrEqual(6)
    expect(data.pitches.length).toBeGreaterThanOrEqual(8)
    expect(data.stages.length).toBe(10)
    for (const p of data.pitches) expect(p.max).toBeGreaterThan(p.min)
  })
  it('ストーリー専用のチーム（ネタバレ）は出さない', () => {
    expect(data.teams.map((t) => t.id)).not.toContain('alien')
    expect(data.teams.map((t) => t.id)).not.toContain('tiger')
  })
  it('挿絵は序盤の3話だけ', () => {
    expect(data.stages.filter((s) => s.art).length).toBeLessThanOrEqual(3)
    expect(data.stages.slice(3).every((s) => !s.art)).toBe(true)
  })
})

describe('週の計画', () => {
  const plan = buildWeekPlan(data, '2026-W45')

  it('7本すべて、違う構成になる', () => {
    expect(plan).toHaveLength(7)
    expect(new Set(plan.map((s) => s.template)).size).toBe(7)
    expect(new Set(plan.map((s) => s.props.hook)).size).toBe(7)
  })

  it('長さは15〜30秒・30fps のフレーム数', () => {
    for (const s of plan) {
      expect(s.props.durationInFrames / FPS).toBeGreaterThanOrEqual(MIN_SEC)
      expect(s.props.durationInFrames / FPS).toBeLessThanOrEqual(MAX_SEC)
      expect(Number.isInteger(s.props.durationInFrames)).toBe(true)
    }
  })

  it('投稿文とハッシュタグがある（共通タグ・6個まで・重複なし）', () => {
    for (const s of plan) {
      expect(s.post.caption.length).toBeGreaterThan(20)
      expect(s.post.hashtags.slice(0, 3)).toEqual(BASE_TAGS)
      expect(s.post.hashtags.length).toBeLessThanOrEqual(6)
      expect(new Set(s.post.hashtags).size).toBe(s.post.hashtags.length)
      for (const t of s.post.hashtags) expect(t).toMatch(/^#\S+$/)
    }
  })

  it('クイズの投稿文に、答えを書かない', () => {
    for (const s of plan.filter((x) => x.template === 'TraitQuiz' || x.template === 'PitchSpeedQuiz')) {
      if (s.props.template === 'TraitQuiz') {
        const d = s.props.data as { options: { team: string }[]; answerIndex: number }
        expect(s.post.caption).not.toContain(d.options[d.answerIndex].team)
      } else {
        const d = s.props.data as { options: number[]; answerIndex: number }
        expect(s.post.caption).not.toContain(`${d.options[d.answerIndex]}km`)
      }
    }
  })

  it('クイズは、正解が選択肢の中に1つだけある', () => {
    for (const w of ['2026-W44', '2026-W45', '2026-W46', '2026-W47']) {
      for (const s of buildWeekPlan(data, w)) {
        if (s.props.template === 'PitchSpeedQuiz') {
          const d = s.props.data as { pitch: { max: number }; options: number[]; answerIndex: number }
          expect(d.options[d.answerIndex]).toBe(d.pitch.max)
          expect(new Set(d.options).size).toBe(d.options.length)
          expect(d.options).toHaveLength(4)
        }
        if (s.props.template === 'TraitQuiz') {
          const d = s.props.data as { options: { team: string }[]; answerIndex: number }
          expect(new Set(d.options.map((o) => o.team)).size).toBe(4)
        }
      }
    }
  })

  it('打者対決は、合計が同じ組み合わせにならない', () => {
    for (let w = 1; w <= 52; w++) {
      for (const s of buildWeekPlan(data, `2027-W${String(w).padStart(2, '0')}`)) {
        if (s.props.template !== 'VersusDuel') continue
        const d = s.props.data as { a: { contact: number; power: number }; b: { contact: number; power: number } }
        expect(d.a.contact + d.a.power).not.toBe(d.b.contact + d.b.power)
      }
    }
  })

  it('同じ週なら同じ内容、週が変われば題材と並びが変わる', () => {
    expect(buildWeekPlan(data, '2026-W45')).toEqual(plan)
    const next = buildWeekPlan(data, '2026-W46')
    expect(next.map((s) => s.template)).not.toEqual(plan.map((s) => s.template))
    expect(JSON.stringify(next.map((s) => s.props.data))).not.toBe(JSON.stringify(plan.map((s) => s.props.data)))
  })

  it('1年分（52週）作っても失敗しない', () => {
    for (let w = 1; w <= 52; w++) expect(() => buildWeekPlan(data, `2027-W${String(w).padStart(2, '0')}`)).not.toThrow()
  })

  it('使う音声はすべて、商用利用の確認済みとして記録されている', () => {
    for (const p of [...Object.values(BGM), ...Object.values(SFX)]) expect(licenses[p]?.commercialUse).toBe(true)
    expect(() => checkAudioLicenses(plan, licenses, () => true)).not.toThrow()
  })

  it('記録のない音声・商用不可の音声があれば止まる', () => {
    const bad = { ...licenses, [BGM.pop]: { ...licenses[BGM.pop], commercialUse: false } }
    const s = plan.find((x) => x.audio.includes(BGM.pop))!
    expect(() => checkAudioLicenses([s], bad, () => true)).toThrow(/商用利用/)
    expect(() => checkAudioLicenses([{ ...s, audio: ['x.wav'] }], licenses, () => true)).toThrow(/記録がない/)
  })
})

describe('部品', () => {
  it('題材は使い切るまで重ならない', () => {
    const items = Array.from({ length: 10 }, (_, i) => i)
    const seen = Array.from({ length: 5 }, (_, w) => rotate('t', items, w, 2)).flat()
    expect(new Set(seen).size).toBe(10)
  })
  it('ISO 週（日本時間）', () => {
    expect(isoWeekId(new Date('2026-10-31T03:00:00Z'))).toBe('2026-W44')
    expect(isoWeekId(new Date('2026-11-01T16:00:00Z'))).toBe('2026-W45')
    expect(() => parseWeekId('2026-44')).toThrow()
  })
  it('全テンプレートが揃っている', () => {
    expect(TEMPLATE_IDS).toHaveLength(7)
  })
})

describe('冒頭3秒の結果先出し（つかみ）', () => {
  const lines = (x: string) => x.split('\n')
  const weeks = Array.from({ length: 52 }, (_, i) => `2027-W${String(i + 1).padStart(2, '0')}`)
  const all = weeks.flatMap((w) => buildWeekPlan(data, w))
  const texts = (x: (typeof all)[number]) => [x.props.hook, x.props.hookBadge ?? '', x.props.hookSub, x.post.title, x.post.caption]

  it('つかみは字幕として読める長さ（見出し2行・1行12字／数字・名前12字／補足16字まで）', () => {
    for (const s of all) {
      const { hook, hookSub, hookBadge } = s.props
      expect(lines(hook).length, hook).toBeLessThanOrEqual(2)
      for (const l of lines(hook)) expect([...l].length, `${s.template}: ${hook}`).toBeLessThanOrEqual(12)
      expect([...hookSub].length, `${s.template}: ${hookSub}`).toBeGreaterThan(0)
      expect([...hookSub].length, `${s.template}: ${hookSub}`).toBeLessThanOrEqual(16)
      if (hookBadge) expect([...hookBadge].length, `${s.template}: ${hookBadge}`).toBeLessThanOrEqual(12)
    }
  })

  it('つかみは全形式3秒で、尺は15〜30秒のまま', () => {
    for (const t of Object.values(T)) expect(t.hook).toBe(HOOK_SEC)
    for (const s of all) {
      expect(s.props.durationInFrames / FPS).toBeGreaterThanOrEqual(MIN_SEC)
      expect(s.props.durationInFrames / FPS).toBeLessThanOrEqual(MAX_SEC)
    }
  })

  it('52週とも、7本・7形式で、週次の仕組みは変わらない', () => {
    for (const w of weeks) {
      const plan = buildWeekPlan(data, w)
      expect(plan).toHaveLength(7)
      expect(new Set(plan.map((s) => s.template)).size).toBe(7)
    }
  })

  it('形式ごとに、結果・意外な数字がつかみに入っている', () => {
    for (const s of all) {
      const d = s.props.data as never as Record<string, any>
      const text = [s.props.hook, s.props.hookBadge ?? '', s.props.hookSub].join(' ')
      switch (s.template) {
        case 'TraitQuiz': expect(s.props.hookBadge).toMatch(/^\d+チームに1つ$/); break
        case 'PitchSpeedQuiz': expect(s.props.hookBadge).toBe(`差${d.pitch.max - d.pitch.min}km/h`); break
        case 'RankingCountdown': expect(s.props.hookBadge).toBe(d.items[2].name); break
        case 'VersusDuel': {
          const win = d.winner === 'a' ? d.a : d.b
          expect(s.props.hook).toContain(win.name)
          expect(s.props.hookBadge).toMatch(/^総合 \d+ 対 \d+$/)
          break
        }
        case 'PitchShowcase': {
          const fastest = Math.max(...d.pitches.map((p: { max: number }) => p.max))
          expect(s.props.hookBadge).toBe(`${fastest}km/h`)
          break
        }
        case 'StoryTeaser': expect(text).toMatch(/第[1-3]話/); expect(s.props.hookArt).toBeTruthy(); break
        case 'ScreenTour': expect(text).toContain(String(data.counts.pitches)); break
      }
    }
  })

  it('クイズは答えを出さない（つかみ・タイトル・投稿文に、正解のチーム／特性名／最高球速がない）', () => {
    for (const s of all) {
      if (s.template === 'TraitQuiz') {
        const d = s.props.data as { trait: { name: string }; options: { team: string; animal: string }[]; answerIndex: number }
        const a = d.options[d.answerIndex]
        for (const t of texts(s)) {
          expect(t).not.toContain(d.trait.name)
          expect(t).not.toContain(a.team)
          expect(t).not.toContain(a.animal)
        }
      }
      if (s.template === 'PitchSpeedQuiz') {
        const d = s.props.data as { pitch: { max: number }; options: number[]; answerIndex: number }
        for (const t of texts(s)) {
          expect(t).not.toContain(`${d.pitch.max}km`)
          expect(t).not.toContain(`${d.options[d.answerIndex]}km`)
        }
      }
    }
  })

  it('投稿は、結果・意外さを先に出すタイトルで始まり、最後は質問で締める', () => {
    for (const s of all) {
      expect([...s.post.title].length, s.post.title).toBeGreaterThan(8)
      expect([...s.post.title].length, s.post.title).toBeLessThanOrEqual(60)
      expect(s.post.caption.startsWith(s.post.title), s.post.caption).toBe(true)
      expect(s.post.caption.trimEnd().endsWith('？'), s.post.caption).toBe(true)
    }
  })

  it('タイトルが、つかみと同じ結果を含む', () => {
    for (const s of all) {
      const d = s.props.data as never as Record<string, any>
      if (s.template === 'PitchSpeedQuiz') expect(s.post.title).toContain(`${d.pitch.max - d.pitch.min}km/h`)
      if (s.template === 'RankingCountdown') expect(s.post.title).toContain(d.items[2].name)
      if (s.template === 'VersusDuel') expect(s.post.title).toContain(s.props.hookBadge?.replace('総合 ', '総合').replace(' 対 ', '対'))
      if (s.template === 'PitchShowcase') expect(s.post.title).toContain(s.props.hookBadge as string)
    }
  })

  it('ネタバレを出さない（ストーリーは序盤3話だけ・タイガーズ／スターズ等の言葉は、どこにも出ない）', () => {
    for (const s of all) {
      const json = JSON.stringify([s.props, s.post])
      for (const w of SPOILER_WORDS) expect(json, `${s.template}: ${w}`).not.toContain(w)
      if (s.template === 'StoryTeaser') {
        const d = s.props.data as { chapters: { short: string; hidden: boolean; art?: string }[] }
        expect(d.chapters.filter((c) => !c.hidden).map((c) => c.short)).toEqual(['第1話', '第2話', '第3話'])
        expect(d.chapters.filter((c) => c.art).length).toBeLessThanOrEqual(3)
        for (const x of data.stages.slice(3)) expect(json).not.toContain(x.title)
      }
    }
  })

  it('同じ週なら何度作っても同じ内容', () => {
    expect(JSON.stringify(buildWeekPlan(data, '2027-W10'))).toBe(JSON.stringify(buildWeekPlan(data, '2027-W10')))
  })
})
