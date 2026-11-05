// 1週間分（7本）の動画の計画を作る。ゲームの実データから題材を選び、構成・つかみ・投稿文を決める。
// 同じ週なら同じ結果になる。題材は、週ごとに順番に回すので、しばらく同じものが続かない。
import { BGM, SFX } from '../audio.ts'
import { hashString, makeRng, pick, shuffle, type Rng } from './rng.ts'
import { END_CARD_SEC, FPS, MAX_SEC, MIN_SEC, T, sec } from './timing.ts'
import { GRADE, TEMPLATE_IDS, type GameData, type PlayerInfo, type TemplateId, type TemplateProps, type VideoProps, type VideoSpec } from './types.ts'
import { soundPlan } from './soundPlan.ts'
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

/** ネタバレになる言葉（ストーリー専用チーム・敵）。動画のどこにも出さない */
export const SPOILER_WORDS = ['タイガーズ', 'スターズ', '宇宙人', 'エイリアン', 'alien', 'tiger']
const hasSpoiler = (t: string) => SPOILER_WORDS.some((w) => t.includes(w))

interface Built<K extends TemplateId> {
  data: TemplateProps[K]
  seconds: number
  /** 冒頭3秒のつかみ。結果・意外な数字を先に出す（クイズは答えを出さない）。hookBadge は大きな数字・名前、hookSub は補足 */
  hook: string
  hookSub: string
  hookBadge?: string
  hookArt?: string
  bgm: string
  slug: string
  /** 投稿のタイトル（結果・意外さを先に出す）。caption はこれで始め、最後を質問で締める */
  title: string
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
    const n = withTrait.length
    // 特性の名前は「猫の身のこなし」のように答えが分かってしまうので、つかみには出さない。数字（何チーム中1つ）だけ先に出す
    const title = `全${n}チームで1つだけ！この固有スキルの持ち主は？`
    return {
      data: { trait: answer.trait as { name: string; desc: string }, options: opts.map((t) => ({ team: t.name, animal: t.animal })), answerIndex: opts.indexOf(answer) },
      seconds: T.TraitQuiz.hook + T.TraitQuiz.question + T.TraitQuiz.countdown + T.TraitQuiz.answer + END_CARD_SEC,
      hook: pick(rng, [`${n}チームで\n1つだけの特性`, 'この固有スキル、\n持ち主は誰？', '答えは1チーム\n当てられる？']),
      hookBadge: `${n}チームに1つ`,
      hookSub: 'どうぶつ固有スキルクイズ',
      bgm: BGM.pop,
      slug: 'trait-quiz',
      title,
      caption: `${title}\n「${answer.trait?.desc}」──A〜Dで答えてね。正解は動画の最後に。わかる？`,
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
    // 最高球速（答え）は出さず、「同じ球でこれだけ速さが違う」という意外さだけ先に出す
    const spread = pitch.max - pitch.min
    const title = `同じ「${pitch.name}」でも球速が${spread}km/h違う！最高は何km/h？`
    return {
      data: { pitch, options: opts, answerIndex: opts.indexOf(real), others },
      seconds: T.PitchSpeedQuiz.hook + T.PitchSpeedQuiz.question + T.PitchSpeedQuiz.countdown + T.PitchSpeedQuiz.answer + T.PitchSpeedQuiz.compare + END_CARD_SEC,
      hook: pick(rng, ['同じ球なのに\n球速が全然違う', '投げ方ひとつで\nこんなに変わる', '最速と最遅\nこの差を見て']),
      hookBadge: `差${spread}km/h`,
      hookSub: `「${pitch.name}」の最高球速は？`,
      bgm: BGM.tense,
      slug: 'pitch-speed',
      title,
      caption: `${title}\nゲームの中では全${d.counts.pitches}種類の球種を投げ分けられます。A〜Dで答えてね。わかる？`,
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
    const best = top[0]
    const title = `${r.title}の1位は「${best.name}」！`
    return {
      data: { title: r.title, metric: r.metric, items },
      seconds: T.RankingCountdown.hook + T.RankingCountdown.item * 2 + T.RankingCountdown.last + END_CARD_SEC,
      // 1位の名前を先に出す（そのあと、3位→1位とめくる）
      hook: pick(rng, [`${r.title}\n1位はこの選手`, `${r.title}は\nこの選手だ`]),
      hookBadge: best.name,
      hookSub: `${best.teamName}・${r.metric}${grade(rankValue(r.key, best))}`,
      bgm: BGM.tense,
      slug: 'ranking',
      title,
      caption: `${title}\nゲームの能力値で決める「${r.title}」TOP3。2位は「${top[1].name}」、3位は「${top[2].name}」。あなたの推しは入ってる？`,
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
    const win = winner === 'a' ? a : b, lose = winner === 'a' ? b : a
    const title = `${win.name}が${lose.name}に勝つ！総合${batScore(win)}対${batScore(lose)}の決着`
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
      // 勝者と点差を先に出す（そのあと、能力値を並べて確かめる）
      hook: pick(rng, [`決着！勝つのは\n${win.name}`, `打者対決の勝者は\n${win.name}`]),
      hookBadge: `総合 ${batScore(win)} 対 ${batScore(lose)}`,
      hookSub: `${a.teamName} 対 ${b.teamName}`,
      bgm: BGM.pop,
      slug: 'versus',
      title,
      caption: `${title}\n${a.teamName}の${a.name} VS ${b.teamName}の${b.name}。ミートとパワーの合計で勝負。この結果、納得できる？`,
      tags: ['#対決', '#どっちが強い', '#野球ゲーム'],
    }
  },

  PitchShowcase: (d, w, rng) => {
    const pitches = rotate('showcase', d.pitches, w, 8)
    const fastest = pitches.reduce((a, b) => (b.max > a.max ? b : a))
    const title = `最速${fastest.max}km/hの「${fastest.name}」！変化球${d.counts.pitches}種類を投げ分けろ`
    return {
      data: { pitches, total: d.counts.pitches },
      seconds: T.PitchShowcase.hook + T.PitchShowcase.pitch * pitches.length + T.PitchShowcase.outro + END_CARD_SEC,
      hook: pick(rng, [`最速の球は\n${fastest.name}`, `この球が\n一番速い！`]),
      hookBadge: `${fastest.max}km/h`,
      hookSub: `全${d.counts.pitches}種類を投げ分け`,
      bgm: BGM.pop,
      slug: 'pitch-showcase',
      title,
      caption: `${title}。指を弾く向きで球種、離した位置でコース、速さで球速が決まります。いくつ知ってた？`,
      tags: ['#変化球', '#ピッチャー', '#野球好きな人と繋がりたい'],
    }
  },

  StoryTeaser: (d, w, rng) => {
    // 導入文に、ストーリー専用の敵の名前（ネタバレ）が入っているときは、安全な一文に置き換える
    const safeLine = (s: { title: string; intro: string }) => (hasSpoiler(s.intro) ? '物語は、ここから動き出す。' : s.intro)
    const shown = d.stages.slice(0, 3).map((s) => ({ short: s.short, title: s.title, ...(s.art ? { art: s.art } : {}), line: safeLine(s), hidden: false }))
    // 先出しする場面は、序盤3話（絵がある話）の中から週ごとに選ぶ
    const lead = rotate('story-lead', shown.filter((c) => c.art), w, 1)[0]
    const title = `${lead.short}「${lead.title}」──全${d.counts.stages}話のどうぶつ物語`
    const hidden = { short: `第4話〜第${d.counts.stages}話`, title: '？？？', line: '物語は、まだ始まったばかり。', hidden: true }
    return {
      data: { chapters: [...shown, hidden], total: d.counts.stages },
      seconds: T.StoryTeaser.hook + T.StoryTeaser.chapter * 4 + END_CARD_SEC,
      // 序盤の名場面とタイトルを先に出す（第4話以降は出さない）
      hook: `${lead.short}\n${lead.title}`,
      hookBadge: `全${d.counts.stages}話の物語`,
      hookSub: pick(rng, ['ただの野球ゲームじゃない', '続きはゲームの中で']),
      ...(lead.art ? { hookArt: lead.art } : {}),
      bgm: BGM.dreamy,
      slug: 'story',
      title,
      caption: `${title}。野球をしながら、仲間と自分たちの秘密をたどるストーリー。第1話から無料で遊べます。続きが気になる？`,
      tags: ['#ストーリー', '#どうぶつ', '#無料ゲーム'],
    }
  },

  ScreenTour: (d, _w, rng) => {
    const shots = d.screens.slice(0, 6)
    if (shots.length < 4) throw new Error('ゲーム画面の撮影が足りない（npm run capture を先に実行する）')
    const { pitches, stages } = d.counts
    const title = `変化球${pitches}種類×全${stages}話の物語！スマホで遊べる3D野球`
    return {
      data: { shots, counts: d.counts },
      seconds: T.ScreenTour.hook + T.ScreenTour.shot * shots.length + END_CARD_SEC,
      hook: pick(rng, [`${pitches}種類の変化球\n全${stages}話の物語`, `${d.counts.teams}チームの3D野球\n${pitches}種類の変化球`]),
      hookBadge: `${pitches}種類`,
      hookSub: '実際のゲーム画面',
      bgm: BGM.pop,
      slug: 'screen-tour',
      title,
      caption: `${title}\n打つ・投げる・作戦まで。CPU対戦もオンライン対戦もストーリーも、ブラウザで無料です。あなたはどのチームで戦う？`,
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
    const props: VideoProps = { template, data: b.data, durationInFrames: sec(b.seconds), bgm: b.bgm, hook: b.hook, hookSub: b.hookSub, ...(b.hookBadge ? { hookBadge: b.hookBadge } : {}), ...(b.hookArt ? { hookArt: b.hookArt } : {}), palette: (week + i) % PALETTE_COUNT }
    const hashtags = [...BASE_TAGS, ...b.tags.filter((t) => !BASE_TAGS.includes(t))].slice(0, 6)
    return {
      index: i + 1,
      slug: `${String(i + 1).padStart(2, '0')}-${b.slug}`,
      template,
      day: DAYS[i],
      props,
      post: { title: b.title, caption: b.caption, hashtags },
      // 使う音声（ライセンス照合用）：音の台本に出てくる効果音だけ
      audio: [b.bgm, ...[...new Set(soundPlan(props).map((c) => c.sfx))].map((n) => SFX[n])],
    }
  })
}

export const totalSeconds = (s: VideoSpec) => s.props.durationInFrames / FPS
