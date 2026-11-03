// ゲーム本体のデータ（チーム・選手・球種・ハプニング・ストーリー）を読み、動画用の gameData.json を作る。
// ゲーム本体のファイルは読むだけで、変更しない。ゲームは ES modules ではなく、1つのスコープに連結されるので、
// 必要なデータの定義だけを切り出して vm で評価する。切り出せなければ、失敗として止まる。
// 使い方：node scripts/extractGameData.ts（撮影した画面を使うときは、先に npm run capture）
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import type { GameData, HappeningInfo, PitchInfo, PlayerInfo, ScreenShot, StageInfo, TeamInfo } from '../src/plan/types.ts'

const VIDEO = path.join(import.meta.dirname, '..')
const ROOT = path.join(VIDEO, '..')
const PUB = path.join(VIDEO, 'public', 'generated')
const JS = path.join(ROOT, 'src', 'js')

/** 動画に出すチーム（ストーリー専用のタイガーズ・スターズは、ネタバレになるので出さない） */
const ANIMAL: Record<string, string> = { home: '柴犬', away: 'パンダ', neko: 'ネコ', usagi: 'うさぎ', kuma: 'クマ', human: '人間' }

/** ストーリーのうち、動画で見せる序盤の話の挿絵（docs/story の中の、ネタバレにならないもの） */
const STORY_ART: Record<number, string> = { 0: 'everyday.webp', 1: 'rescue.webp', 2: 'lab.webp' }
const STORY_SHOWN = 3

function read(name: string) {
  return fs.readFileSync(path.join(JS, name), 'utf8').replace(/\r\n/g, '\n')
}

/** `start` から始まる定義を、閉じる `\n};`（または `\n];`）まで切り出す。見つからなければ止まる */
function grab(src: string, start: string, close: '};' | '];', file: string) {
  const i = src.indexOf(start)
  if (i < 0) throw new Error(`${file} に「${start}」がない（ゲーム本体の書き方が変わった？ scripts/extractGameData.ts を直す）`)
  const j = src.indexOf(`\n${close}`, i)
  if (j < 0) throw new Error(`${file} の「${start}」の終わりが見つからない`)
  return src.slice(i, j + 1 + close.length)
}

function evalIn<T>(code: string, expr: string, file: string): T {
  try {
    return vm.runInNewContext(`${code}\n;(${expr})`, {}, { timeout: 2000 }) as T
  } catch (e) {
    throw new Error(`${file} の定義を読めなかった: ${(e as Error).message}`, { cause: e })
  }
}

type RawBat = [string, number, number, string?]
type RawPit = [string, number, number, number, number, string?, string[]?]
interface RawTeam { name: string; run: number[]; bat: RawBat[]; pit: RawPit[] }
interface RawType { name: string; short: string; min: number; max: number }

function main() {
  const roster = read('07-roster.js')
  // ALL_PITCHES から TRAIT の終わりまで（ROSTER・ストーリー専用チームの派生・TRAIT がすべて入る）
  const traitDef = grab(roster, 'const TRAIT = {', '};', '07-roster.js')
  const from = roster.indexOf('const ALL_PITCHES')
  if (from < 0) throw new Error('07-roster.js に ALL_PITCHES がない')
  const block = roster.slice(from, roster.indexOf(traitDef) + traitDef.length)
  const { ROSTER, TRAIT } = evalIn<{ ROSTER: Record<string, RawTeam>; TRAIT: Record<string, { n: string; d: string }> }>(block, '{ ROSTER, TRAIT }', '07-roster.js')

  const teams: TeamInfo[] = []
  const players: PlayerInfo[] = []
  for (const [id, animal] of Object.entries(ANIMAL)) {
    const t = ROSTER[id]
    if (!t) throw new Error(`07-roster.js に ${id} がない`)
    const star = t.bat.find((b) => /\*/.test(b[3] ?? ''))?.[0]
    teams.push({ id, name: t.name, animal, ...(TRAIT[id] ? { trait: { name: TRAIT[id].n, desc: TRAIT[id].d } } : {}), ...(star ? { star } : {}) })
    t.bat.forEach((b, i) => players.push({
      name: b[0], team: id, teamName: t.name, kind: 'bat', contact: b[1], power: b[2], run: t.run[i] ?? 3,
      velocity: 0, control: 0, breaks: 0, star: /\*/.test(b[3] ?? ''),
    }))
    t.pit.forEach((p) => players.push({
      name: p[0], team: id, teamName: t.name, kind: 'pit', contact: 0, power: 0, run: 0,
      velocity: p[1], control: p[2], breaks: p[3], star: /\*/.test(p[5] ?? ''),
    }))
  }

  const core = read('01-core.js')
  const types = evalIn<Record<string, RawType>>(grab(core, 'const TYPES = {', '};', '01-core.js'), 'TYPES', '01-core.js')
  const pitches: PitchInfo[] = Object.entries(types).map(([id, t]) => ({ id, name: t.name, short: t.short, min: t.min, max: t.max }))
  const hap = evalIn<{ t: string; n: string; d: string }[]>(grab(core, 'const HAP = [', '];', '01-core.js'), 'HAP', '01-core.js')
  const happenings: HappeningInfo[] = hap.map((h) => ({ id: h.t, name: h.n, desc: h.d }))

  const story = read('04-story-data.js')
  const rawStages = evalIn<{ short: string; title: string; intro: [string, string][] }[]>(grab(story, 'const STAGES = [', '];', '04-story-data.js'), 'STAGES', '04-story-data.js')
  fs.mkdirSync(path.join(PUB, 'story'), { recursive: true })
  fs.copyFileSync(path.join(ROOT, 'docs', 'icons', 'icon-512.png'), path.join(PUB, 'icon.png'))
  const stages: StageInfo[] = rawStages.map((s, i) => {
    let art: string | undefined
    const file = STORY_ART[i]
    if (i < STORY_SHOWN && file) {
      const src = path.join(ROOT, 'docs', 'story', file)
      if (!fs.existsSync(src)) throw new Error(`ストーリーの挿絵がない: docs/story/${file}`)
      fs.copyFileSync(src, path.join(PUB, 'story', file))
      art = `generated/story/${file}`
    }
    const first = s.intro.find((l) => l[1])
    return { short: s.short, title: s.title, ...(art ? { art } : {}), intro: first ? first[1] : '' }
  })

  const screensFile = path.join(PUB, 'screens', 'screens.json')
  const screens: ScreenShot[] = fs.existsSync(screensFile) ? JSON.parse(fs.readFileSync(screensFile, 'utf8')) : []

  const data: GameData = {
    teams, players, pitches, happenings, stages, screens,
    counts: { teams: teams.length, pitches: pitches.length, stages: stages.length, happenings: happenings.length },
  }
  if (teams.length < 6 || pitches.length < 8 || stages.length < 3) throw new Error('読み取った数が少なすぎる（ゲーム本体の書き方が変わった？）')
  fs.mkdirSync(path.join(VIDEO, 'src', 'generated'), { recursive: true })
  fs.writeFileSync(path.join(VIDEO, 'src', 'generated', 'gameData.json'), JSON.stringify(data, null, 1))
  console.log(`gameData: チーム ${teams.length}・選手 ${players.length}・球種 ${pitches.length}・ハプニング ${happenings.length}・ストーリー ${stages.length}話・画面 ${screens.length}`)
}

main()
