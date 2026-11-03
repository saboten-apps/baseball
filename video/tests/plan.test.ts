import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { BGM, SFX } from '../src/audio.ts'
import { BASE_TAGS, buildWeekPlan, rotate } from '../src/plan/buildPlan.ts'
import { FPS, MAX_SEC, MIN_SEC } from '../src/plan/timing.ts'
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
