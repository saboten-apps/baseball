// 1週間分（7本）の動画の計画を作る。ゲームの実データから題材を選び、構成・つかみ・投稿文を決める。
// 同じ週なら同じ結果になる。題材は、週ごとに順番に回すので、しばらく同じものが続かない。
import { BGM, SFX, TEMPLATE_SFX } from '../audio.ts'
import { hashString, makeRng, pick, shuffle, type Rng } from './rng.ts'
import { END_CARD_SEC, FPS, MAX_SEC, MIN_SEC, T, sec } from './timing.ts'
import { GRADE, TEMPLATE_IDS, type GameData, type PlayerInfo, type TemplateId, type TemplateProps, type VideoProps, type VideoSpec } from './types.ts'
import { parseWeekId } from './week.ts'

export const BASE_TAGS = ['#どうぶつベースボール', '#野球ゲーム', '#ブラウザゲーム']
const DAYS = ['月', '火', '水', '木', '金', '土', '日']
export const PALETTE_COUNT = 4

/** 候補を固定の順に並べ、週ごとに count 件ずつ進める（全部使い切るまで重ならない） */
export function rotate<T>(pool: string, items: readonly T[], weekIndex: number, count: number): T[] {
  if (items.length < count) throw new Error(`題材が足りない: ${pool}（${items.length} < ${count}）`)
  const order = shuffle(makeRng(hashString(`pool:${pool}`)), items)
  return Array.from({ length: count }, (_, i) => order[(weekIndex * count + i) % order.length])
}

const grade = (n: number) => GRADE[Math.max(1, Math.min(7, n))]

interface Built<K extends TemplateId> {
  data: TemplateProps[K]
  seconds: number
  hook: string
  bgm: string
  slug: string
  caption: string
  tags: string[]
}

type Builder<K extends TemplateId> = (d: GameData, w: number, rng: Rng) => Built<K>

/** 打者の総合（ミート＋パワー）。比べるときの目安 */
const batScore = (p: PlayerInfo) => p.contact + p.power

const RANKINGS: { key: string; title: string; metric: string; kind: 'bat' | 'pit'; value: (p: PlayerInfo) => number }[] = [
  { key: 'power', title: '最強スラッガー', metric: 'パワー', kind: 'bat', value: (p) => p.power * 10 + p.contact },
  { key: 'contact', title: 'ミートの達人', metric: 'ミート', kind: 'bat', value: (p) => p.contact * 10 + p.power },
  { key: 'run', title: '一番の俊足', metric: '走力', kind: 'bat', value: (p) => p.run * 10 + p.contact },
  { key: 'velocity', title: '最速ピッチャー', metric: '球速', kind: 'pit', value: (p) => p.velocity * 10 + p.control },
  { key: 'break', title: '魔球の使い手', metric: '変化', kind: 'pit', value: (p) => p.breaks * 10 + p.control },
]
const rankValue = (key: string, p: PlayerInfo) => ({ power: p.power, contact: p.contact, run: p.run, velocity: p.velocity, break: p.breaks })[key] ?? 0

const builders: { [K in TemplateId]: Builder<K> } = {
  TraitQuiz: (d, w, rng) => {
    const withTrait = d.teams.filter((t) => t.trait)
    const [answer] = rotate('trait', withTrait, w, 1)
    const others = shuffle(rng, withTrait.filter((t) => t.id !== answer.id)).slice(0, 3)
    const opts = shuffle(rng, [answer, ...others])
    return {
      data: { trait: answer.trait as { name: string; desc: string }, options: opts.map((t) => ({ team: t.name, animal: t.animal })), answerIndex: opts.indexOf(answer) },
      seconds: T.TraitQuiz.hook + T.TraitQuiz.question + T.TraitQuiz.countdown + T.TraitQuiz.answer + END_CARD_SEC,
      hook: pick(rng, ['このスキル、\nどのチームの？', 'どうぶつ固有スキル\n当てられる？', 'クイズ！\nこの特性の持ち主は？']),
      bgm: BGM.pop,
      slug: 'trait-quiz',
      caption: `Q.「${answer.trait?.desc}」──この特性を持つ、どうぶつチームは？ A〜Dで答えてね。正解は動画の最後に！`,
      tags: ['#クイズ', '#わかったらコメント', '#スマホゲーム'],
    }
  },

  PitchSpeedQuiz: (d, w, rng) => {
    const pool = d.pitches.filter((p) => p.max - p.min >= 12)
    const [pitch] = rotate('speed', pool, w, 1)
    const real = pitch.max
    const wrong = shuffle(rng, [-24, -16, -8, 8, 16].map((o) => real + o)).filter((v) => v >= 60 && v <= 175).slice(0, 3)
    const opts = shuffle(rng, [real, ...wrong]).sort((a, b) => a - b)
    const others = rotate('speed-others', d.pitches.filter((p) => p.id !== pitch.id), w, 3)
    return {
      data: { pitch, options: opts, answerIndex: opts.indexOf(real), others },
      seconds: T.PitchSpeedQuiz.hook + T.PitchSpeedQuiz.question + T.PitchSpeedQuiz.countdown + T.PitchSpeedQuiz.answer + T.PitchSpeedQuiz.compare + END_CARD_SEC,
      hook: pick(rng, ['この球、\n最高何km/h？', '球速クイズ！\n何km/h出る？', '投げられる？\n最速の球は？']),
      bgm: BGM.tense,
      slug: 'pitch-speed',
      caption: `Q.「${pitch.name}」の最高球速は何km/h？ ゲームの中では全${d.counts.pitches}種類の球種を投げ分けられます。A〜Dで答えてね。`,
      tags: ['#球速', '#変化球', '#野球好きと繋がりたい'],
    }
  },

  RankingCountdown: (d, w, rng) => {
    const r = RANKINGS[w % RANKINGS.length]
    const pool = d.players.filter((p) => p.kind === r.kind)
    // 同じ名前の二刀流（スター）は、打者・投手のうち、この種目の側だけを数える
    const sorted = [...pool].sort((a, b) => r.value(b) - r.value(a) || a.name.localeCompare(b.name, 'ja'))
    const seen = new Set<string>()
    const top: PlayerInfo[] = []
    for (const p of sorted) {
      if (seen.has(p.name)) continue
      seen.add(p.name)
      top.push(p)
      if (top.length === 3) break
    }
    const items = [top[2], top[1], top[0]].map((p, i) => ({ rank: 3 - i, name: p.name, teamName: p.teamName, grade: grade(rankValue(r.key, p)), star: p.star }))
    return {
      data: { title: r.title, metric: r.metric, items },
      seconds: T.RankingCountdown.hook + T.RankingCountdown.item * 2 + T.RankingCountdown.last + END_CARD_SEC,
      hook: pick(rng, [`${r.title}\nTOP3`, `${r.title}は\n誰だ？`, `選手ランキング\n${r.title}`]),
      bgm: BGM.tense,
      slug: 'ranking',
      caption: `ゲームの能力値で決める「${r.title}」TOP3。1位は${top[0].teamName}のあの選手！ あなたの推しは入ってる？`,
      tags: ['#ランキング', '#推し選手', '#野球ゲーム好きと繋がりたい'],
    }
  },

  VersusDuel: (d, w, rng) => {
    const bats = d.players.filter((p) => p.kind === 'bat' && p.contact + p.power >= 6)
    const [a] = rotate('duel-a', bats, w, 1)
    // 合計が同じ組み合わせは、勝ち負けがつかないので選ばない
    const rivals = bats.filter((p) => p.team !== a.team && p.name !== a.name && batScore(p) !== batScore(a))
    const [b] = rotate('duel-b', rivals, w, 1)
    const winner = batScore(a) > batScore(b) ? 'a' : 'b'
    return {
      data: {
        a, b, winner,
        rows: [
          { label: 'ミート', a: a.contact, b: b.contact },
          { label: 'パワー', a: a.power, b: b.power },
          { label: '走力', a: a.run, b: b.run },
        ],
      },
      seconds: T.VersusDuel.hook + T.VersusDuel.intro + T.VersusDuel.stats + T.VersusDuel.countdown + T.VersusDuel.result + END_CARD_SEC,
      hook: pick(rng, ['打者対決！\nどっちが強い？', 'ドリームマッチ\n強いのはどっち？', 'どうぶつ頂上決戦']),
      bgm: BGM.pop,
      slug: 'versus',
      caption: `${a.teamName}の${a.name} VS ${b.teamName}の${b.name}。打者としてどっちが強い？ コメントで予想してね！`,
      tags: ['#対決', '#どっちが強い', '#野球ゲーム'],
    }
  },

  PitchShowcase: (d, w, rng) => {
    const pitches = rotate('showcase', d.pitches, w, 8)
    return {
      data: { pitches, total: d.counts.pitches },
      seconds: T.PitchShowcase.hook + T.PitchShowcase.pitch * pitches.length + T.PitchShowcase.outro + END_CARD_SEC,
      hook: pick(rng, [`変化球${d.counts.pitches}種類\n投げ分けろ！`, `${d.counts.pitches}種類の球種\n全部言える？`, '投げ方ひとつで\n球が変わる']),
      bgm: BGM.pop,
      slug: 'pitch-showcase',
      caption: `ゲームには${d.counts.pitches}種類の球種。指を弾く向きで球種、離した位置でコース、速さで球速が決まります。いくつ知ってた？`,
      tags: ['#変化球', '#ピッチャー', '#野球好きな人と繋がりたい'],
    }
  },

  StoryTeaser: (d, _w, rng) => {
    const shown = d.stages.slice(0, 3).map((s) => ({ short: s.short, title: s.title, ...(s.art ? { art: s.art } : {}), line: s.intro, hidden: false }))
    const hidden = { short: `第4話〜第${d.counts.stages}話`, title: '？？？', line: '物語は、まだ始まったばかり。', hidden: true }
    return {
      data: { chapters: [...shown, hidden], total: d.counts.stages },
      seconds: T.StoryTeaser.hook + T.StoryTeaser.chapter * 4 + END_CARD_SEC,
      hook: pick(rng, [`全${d.counts.stages}話の\nどうぶつ物語`, '野球の先に\n待っているのは…', 'ただの野球ゲーム\nじゃなかった']),
      bgm: BGM.dreamy,
      slug: 'story',
      caption: `野球をしながら、仲間と自分たちの秘密をたどる全${d.counts.stages}話のストーリー。第1話「${d.stages[0].title}」から無料で遊べます。続きはゲームで。`,
      tags: ['#ストーリー', '#どうぶつ', '#無料ゲーム'],
    }
  },

  ScreenTour: (d, _w, rng) => {
    const shots = d.screens.slice(0, 6)
    if (shots.length < 4) throw new Error('ゲーム画面の撮影が足りない（npm run capture を先に実行する）')
    return {
      data: { shots, counts: d.counts },
      seconds: T.ScreenTour.hook + T.ScreenTour.shot * shots.length + END_CARD_SEC,
      hook: pick(rng, ['スマホで遊べる\n3D野球ゲーム', 'ブラウザで今すぐ\nプレイボール', 'インストール不要の\n野球アクション']),
      bgm: BGM.pop,
      slug: 'screen-tour',
      caption: `打つ・投げる・作戦まで、スマホで遊べる3D野球アクション。CPU対戦もオンライン対戦もストーリーも、ブラウザで無料です。`,
      tags: ['#ゲーム紹介', '#無料ゲーム', '#スマホゲーム'],
    }
  },
}

export function buildWeekPlan(data: GameData, weekId: string): VideoSpec[] {
  const { year, week } = parseWeekId(weekId)
  const w = year * 53 + week
  const rng = makeRng(hashString(`week:${weekId}`))
  // 曜日ごとの並びも、週ごとにずらす（同じ曜日に、同じ型が続かないように）
  const order = TEMPLATE_IDS.map((_, i) => TEMPLATE_IDS[(i + week) % TEMPLATE_IDS.length])
  return order.map((template, i) => {
    const b = (builders[template] as Builder<TemplateId>)(data, w, makeRng(hashString(`${weekId}:${template}`) ^ Math.floor(rng() * 1e9)))
    if (b.seconds < MIN_SEC || b.seconds > MAX_SEC) throw new Error(`${template} の長さ ${b.seconds} 秒が、${MIN_SEC}〜${MAX_SEC} 秒の外`)
    const props: VideoProps = { template, data: b.data, durationInFrames: sec(b.seconds), bgm: b.bgm, hook: b.hook, palette: (week + i) % PALETTE_COUNT }
    const hashtags = [...BASE_TAGS, ...b.tags.filter((t) => !BASE_TAGS.includes(t))].slice(0, 6)
    return {
      index: i + 1,
      slug: `${String(i + 1).padStart(2, '0')}-${b.slug}`,
      template,
      day: DAYS[i],
      props,
      post: { caption: b.caption, hashtags },
      audio: [b.bgm, ...[...TEMPLATE_SFX.common, ...TEMPLATE_SFX[template]].map((s) => SFX[s])],
    }
  })
}

export const totalSeconds = (s: VideoSpec) => s.props.durationInFrames / FPS
