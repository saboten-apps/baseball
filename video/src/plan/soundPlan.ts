// 動画の「音の台本」：どの音を、何フレーム目に、どれだけの大きさで鳴らすか。
// パチンコ／ガチャ型の「期待 → 緊張 → 報酬」の設計：
//   ・つかみ（冒頭3秒）：見出し・数字・補足が出る瞬間に、音を合わせる（結果の先出しと噛み合わせる）
//   ・緊張：カウントダウンや、めくる前は、刻み音が少しずつ速くなる
//   ・報酬：要素が出るたびに、音程が上がる音。正解・勝者・1位は、快音＋ファンファーレ＋キラキラ（最大級）
//   ・落差：空振り・凡退は「ズコッ」と落ちる音
//   ・共通：2〜3秒ごとに小さな報酬音（blip）を置き、最後（エンドカード）に、いちばん大きな音（jackpot）
// 音は、答え・ストーリーの続きに関係なく同じ（クイズの正解の位置・隠した話で変わらない）。
// 音の大きさは、波形そのものがすでに最大 0.9 にそろえてあるので、ここでは「鳴らす大きさ（volume）」だけを決める。
import { SFX_SEC, type SfxName } from '../audio.ts'
import { END_CARD_SEC, FPS, T, sec } from './timing.ts'
import type { TemplateId, VideoProps } from './types.ts'

export type CueKind = 'hook' | 'tension' | 'reward' | 'drop' | 'finale'
export interface Cue { sfx: SfxName; /** 動画の頭からのフレーム */ at: number; volume: number; kind: CueKind }

/** 「ご褒美の音」に数える効果音（2〜3秒ごとの間隔を、これで数える） */
export const REWARD_SFX: readonly SfxName[] = ['blip', 'ding', 'coin', 'sparkle', 'rise_1', 'rise_2', 'rise_3', 'rise_4', 'rise_5', 'crack', 'winner', 'homerun', 'jackpot', 'fanfare']
/** 音の大きさの順位（高いほど派手）。最後の音（jackpot）が、いちばん大きい */
export const WEIGHT: Partial<Record<SfxName, number>> = {
  blip: 1, ding: 2, rise_1: 2, rise_2: 3, rise_3: 4, rise_4: 5, rise_5: 6, crack: 5, winner: 8, homerun: 9, jackpot: 10,
}
/** 小さな報酬音の間隔の上限（秒） */
export const MAX_REWARD_GAP_SEC = 3
/** 効果音全体の底上げ（BGM に対して、ご褒美の音を前に出す）。実測のピークに余裕があるので 1.3 倍 */
export const SFX_GAIN = 1.3
/** 鳴らす大きさの上限（BGM と重なっても、割れない範囲） */
export const MAX_CUE_VOLUME = 1
/** この音が鳴るあいだ、BGM を下げる（ご褒美を目立たせ、音が割れるのも防ぐ）。値は BGM の倍率 */
export const DUCK: Partial<Record<SfxName, number>> = { crack: 0.55, winner: 0.4, homerun: 0.3, jackpot: 0.25, zuko: 0.5 }

const f = (s: number) => Math.round(s * FPS)

/** 3・2・1 の刻み音：1秒目に1回、2秒目に2回、3秒目に4回と、少しずつ速くなる（数字の切り替わりに合わせる）。間隔はフレームで決める */
const COUNT_TICKS = [0, 30, 45, 60, 68, 76, 84]
function acceleratingTicks(at: number): Cue[] {
  return COUNT_TICKS.map((o, i) => ({ sfx: 'tick' as const, at: at + o, volume: Math.min(0.5, 0.3 + 0.04 * i), kind: 'tension' as const }))
}

/** めくる前の刻み音：間隔が少しずつ縮まる（約0.33秒 → 0.1秒）。間隔はフレームで決め、必ず「同じか短く」なる */
function buildUp(at: number, seconds: number): Cue[] {
  const cues: Cue[] = []
  let t = 0, gap = 10, i = 0
  while (t < seconds * FPS - 3) {
    cues.push({ sfx: 'tick', at: at + t, volume: Math.min(0.5, 0.28 + 0.03 * i), kind: 'tension' })
    t += gap
    gap = Math.max(3, Math.min(gap, Math.round(gap * 0.82)))
    i++
  }
  return cues
}

type Planner = (props: VideoProps, bodyEnd: number) => Cue[]

const rankingStart = (i: number) => sec(T.RankingCountdown.hook) + sec(T.RankingCountdown.item) * i

const planners: { [K in TemplateId]: Planner } = {
  TraitQuiz: () => {
    const t = T.TraitQuiz
    const q = sec(t.hook), cd = q + sec(t.question), ans = cd + sec(t.countdown)
    return [
      { sfx: 'pop', at: q, volume: 0.6, kind: 'hook' },
      ...acceleratingTicks(cd),
      { sfx: 'winner', at: ans, volume: 0.7, kind: 'reward' },
    ]
  },

  PitchSpeedQuiz: () => {
    const t = T.PitchSpeedQuiz
    const q = sec(t.hook), cd = q + sec(t.question), ans = cd + sec(t.countdown), cmp = ans + sec(t.answer)
    return [
      { sfx: 'pop', at: q, volume: 0.6, kind: 'hook' },
      ...acceleratingTicks(cd),
      { sfx: 'winner', at: ans, volume: 0.7, kind: 'reward' },
      // 他の球種の棒が伸びるたびに、音程が上がる
      { sfx: 'whoosh', at: cmp, volume: 0.3, kind: 'hook' },
      ...[1, 2, 3, 4].map((lv, i) => ({ sfx: `rise_${lv}` as SfxName, at: cmp + 10 + i * 8, volume: 0.55, kind: 'reward' as const })),
    ]
  },

  RankingCountdown: () => {
    const t = T.RankingCountdown
    const cues: Cue[] = []
    // 3位 → 2位 → 1位：めくる前に刻み音が速くなり、めくった瞬間に、順位が上がるほど高く大きい音
    const reveal: [number, SfxName, number][] = [[0, 'rise_1', 1.2], [1, 'rise_3', 1.2], [2, 'winner', 2.6]]
    reveal.forEach(([i, sfx, flip]) => {
      const start = rankingStart(i)
      cues.push(...buildUp(start + f(0.25), flip - 0.25))
      cues.push({ sfx, at: start + f(flip) + 2, volume: sfx === 'winner' ? 0.75 : 0.65, kind: 'reward' })
      if (i === 2) cues.push({ sfx: 'rise_5', at: start + f(flip) + 14, volume: 0.6, kind: 'reward' })
    })
    void t
    return cues
  },

  VersusDuel: () => {
    const t = T.VersusDuel
    const intro = sec(t.hook), stats = intro + sec(t.intro), cd = stats + sec(t.stats), res = cd + sec(t.countdown)
    return [
      { sfx: 'whoosh', at: intro, volume: 0.3, kind: 'hook' },
      { sfx: 'boom', at: intro + 14, volume: 0.5, kind: 'hook' },
      { sfx: 'whoosh', at: stats, volume: 0.3, kind: 'hook' },
      // 能力の棒が伸びるたびに、音程が上がる
      ...[1, 2, 3].map((lv, i) => ({ sfx: `rise_${lv}` as SfxName, at: stats + i * 12 + 14, volume: 0.55, kind: 'reward' as const })),
      ...acceleratingTicks(cd),
      // 落差：負けた側の「ズコッ」→ 勝者の発表
      { sfx: 'zuko', at: res, volume: 0.6, kind: 'drop' },
      { sfx: 'winner', at: res + 14, volume: 0.75, kind: 'reward' },
    ]
  },

  PitchShowcase: (props, bodyEnd) => {
    const t = T.PitchShowcase
    const data = props.data as VideoProps<'PitchShowcase'>['data']
    const hookF = sec(t.hook), oneF = sec(t.pitch)
    const cues: Cue[] = []
    data.pitches.forEach((p, i) => {
      const at = hookF + oneF * i
      cues.push({ sfx: 'whoosh', at, volume: 0.3, kind: 'hook' })
      // 遅い球（110km/h未満）は、空振りのように「ズコッ」と落ちる。ほかは、1球ごとに音程が上がる
      if (p.max < 110) cues.push({ sfx: 'zuko', at: at + 5, volume: 0.6, kind: 'drop' })
      else cues.push({ sfx: `rise_${Math.min(5, 1 + (i % 5))}` as SfxName, at: at + 5, volume: 0.55, kind: 'reward' })
    })
    cues.push({ sfx: 'winner', at: hookF + oneF * data.pitches.length, volume: 0.7, kind: 'reward' })
    void bodyEnd
    return cues
  },

  StoryTeaser: () => {
    const t = T.StoryTeaser
    const hookF = sec(t.hook), chF = sec(t.chapter)
    // 序盤3話は1話ごとに音程が上がる。「？？？」の回も同じ小さな音（続きを匂わせない）
    return [1, 2, 3, 4].flatMap((lv, i) => [
      { sfx: 'whoosh' as const, at: hookF + chF * i, volume: 0.3, kind: 'hook' as const },
      { sfx: `rise_${Math.min(lv, 4)}` as SfxName, at: hookF + chF * i + 8, volume: 0.55, kind: 'reward' as const },
    ])
  },

  ScreenTour: (props) => {
    const t = T.ScreenTour
    const data = props.data as VideoProps<'ScreenTour'>['data']
    const hookF = sec(t.hook), shotF = sec(t.shot)
    const cues: Cue[] = []
    data.shots.forEach((s, i) => {
      const at = hookF + shotF * i
      cues.push({ sfx: 'whoosh', at, volume: 0.3, kind: 'hook' })
      if (s.key === 'hr') cues.push({ sfx: 'homerun', at: at + 10, volume: 0.75, kind: 'reward' })
      else if (s.key === 'ingame') cues.push(...buildUp(at + f(0.4), 1.6), { sfx: 'crack', at: at + f(2.1), volume: 0.6, kind: 'reward' })
      else cues.push({ sfx: `rise_${Math.min(5, 1 + (i % 5))}` as SfxName, at: at + 8, volume: 0.55, kind: 'reward' })
    })
    return cues
  },
}

/** 動画1本ぶんの音の台本（フレーム順） */
export function soundPlan(props: VideoProps): Cue[] {
  const end = props.durationInFrames - sec(END_CARD_SEC)
  const cues: Cue[] = [
    // つかみ：見出しが出る瞬間（0）→ 数字・名前（3）→ 補足（8）に合わせる
    { sfx: 'whoosh', at: 0, volume: 0.32, kind: 'hook' },
    { sfx: 'pop', at: 2, volume: 0.3, kind: 'hook' },
    { sfx: 'ding', at: 3, volume: 0.3, kind: 'reward' },
    { sfx: 'blip', at: 8, volume: 0.4, kind: 'reward' },
    ...(planners[props.template] as Planner)(props, end),
    // エンドカード：最後の大当たり（いちばん大きな音）。スタンプの瞬間に快音
    { sfx: 'jackpot', at: end, volume: 0.66, kind: 'finale' },
    { sfx: 'crack', at: end + 22, volume: 0.3, kind: 'reward' },
  ]
  // 2〜3秒ごとに、小さな報酬音（blip）を置く：ご褒美の音の間隔が上限を超えるところへ、真ん中に足す
  const maxGap = f(MAX_REWARD_GAP_SEC)
  for (let guard = 0; guard < 40; guard++) {
    const marks = [0, ...cues.filter((c) => REWARD_SFX.includes(c.sfx)).map((c) => c.at), props.durationInFrames].sort((a, b) => a - b)
    let widest = -1, at = 0
    for (let i = 1; i < marks.length; i++) if (marks[i] - marks[i - 1] > maxGap && marks[i] - marks[i - 1] > widest) { widest = marks[i] - marks[i - 1]; at = marks[i - 1] + Math.round(widest / 2) }
    if (widest < 0) break
    cues.push({ sfx: 'blip', at, volume: 0.45, kind: 'reward' })
  }
  return cues.map((c) => ({ ...c, volume: Math.min(MAX_CUE_VOLUME, Math.round(c.volume * SFX_GAIN * 1000) / 1000) })).sort((a, b) => a.at - b.at || a.sfx.localeCompare(b.sfx))
}

/** この音が鳴っている間（BGM を下げる区間） */
export function duckWindows(cues: Cue[]): { from: number; to: number; gain: number }[] {
  return cues.flatMap((c) => (DUCK[c.sfx] ? [{ from: c.at, to: c.at + f(Math.min(SFX_SEC[c.sfx], 1.6)), gain: DUCK[c.sfx] as number }] : []))
}

/** BGM の倍率（1 = そのまま）。ご褒美の音の間は下げ、前後はなめらかにつなぐ */
export function bgmGain(frame: number, windows: ReturnType<typeof duckWindows>): number {
  let g = 1
  for (const w of windows) {
    const ramp = 4
    const k = frame < w.from - ramp ? 0 : frame < w.from ? (frame - (w.from - ramp)) / ramp : frame <= w.to ? 1 : frame < w.to + 10 ? 1 - (frame - w.to) / 10 : 0
    g = Math.min(g, 1 - k * (1 - w.gain))
  }
  return g
}
