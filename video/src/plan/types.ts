// 動画づくりで使う型。ゲーム本体（src/js）は読み込まず、必要な分だけをここで定義する。

export interface TeamInfo {
  id: string
  /** チーム名（しばいぬズ など） */
  name: string
  /** どうぶつの名前（柴犬 など） */
  animal: string
  trait?: { name: string; desc: string }
  star?: string
}

export interface PlayerInfo {
  name: string
  team: string
  teamName: string
  kind: 'bat' | 'pit'
  /** 1〜7（6〜7 は S） */
  contact: number
  power: number
  run: number
  velocity: number
  control: number
  breaks: number
  star: boolean
}

export interface PitchInfo {
  id: string
  name: string
  short: string
  min: number
  max: number
}

export interface HappeningInfo { id: string; name: string; desc: string }

export interface StageInfo { short: string; title: string; art?: string; intro: string }

export interface ScreenShot {
  key: string
  label: string
  /** staticFile() に渡すパス */
  src: string
}

/** scripts/extractGameData.ts が、ゲーム本体のデータから作る */
export interface GameData {
  teams: TeamInfo[]
  players: PlayerInfo[]
  pitches: PitchInfo[]
  happenings: HappeningInfo[]
  stages: StageInfo[]
  screens: ScreenShot[]
  counts: { teams: number; pitches: number; stages: number; happenings: number }
}

export const TEMPLATE_IDS = [
  'TraitQuiz',
  'PitchSpeedQuiz',
  'RankingCountdown',
  'VersusDuel',
  'PitchShowcase',
  'StoryTeaser',
  'ScreenTour',
] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]

export const GRADE = ['', 'E', 'D', 'C', 'B', 'A', 'S', 'S'] as const

export interface TraitQuizProps {
  /** 当てる特性（名前は答えまで見せる） */
  trait: { name: string; desc: string }
  options: { team: string; animal: string }[]
  answerIndex: number
}
export interface PitchSpeedQuizProps {
  pitch: PitchInfo
  /** 球速の選択肢（km/h） */
  options: number[]
  answerIndex: number
  /** 速さを比べる他の球種 */
  others: PitchInfo[]
}
export interface RankingCountdownProps {
  title: string
  /** 評価の名前（パワー など） */
  metric: string
  /** 3位→1位の順 */
  items: { rank: number; name: string; teamName: string; grade: string; star: boolean }[]
}
export interface VersusDuelProps {
  a: PlayerInfo
  b: PlayerInfo
  /** 比べる項目 */
  rows: { label: string; a: number; b: number }[]
  /** 総合で強い方 */
  winner: 'a' | 'b'
}
export interface PitchShowcaseProps {
  pitches: PitchInfo[]
  total: number
}
export interface StoryTeaserProps {
  chapters: { short: string; title: string; art?: string; line: string; hidden: boolean }[]
  total: number
}
export interface ScreenTourProps {
  shots: ScreenShot[]
  counts: GameData['counts']
}

export type TemplateProps = {
  TraitQuiz: TraitQuizProps
  PitchSpeedQuiz: PitchSpeedQuizProps
  RankingCountdown: RankingCountdownProps
  VersusDuel: VersusDuelProps
  PitchShowcase: PitchShowcaseProps
  StoryTeaser: StoryTeaserProps
  ScreenTour: ScreenTourProps
}

/** すべての動画に共通の入力 */
export interface CommonProps {
  durationInFrames: number
  bgm: string
  /** 冒頭2秒のつかみ（テロップ） */
  hook: string
  /** 色の組み合わせ（週ごとに変える） */
  palette: number
}

export type VideoProps<T extends TemplateId = TemplateId> = CommonProps & { template: T; data: TemplateProps[T] }

export interface VideoSpec {
  index: number
  slug: string
  template: TemplateId
  /** 投稿の目安の曜日 */
  day: string
  props: VideoProps
  post: { caption: string; hashtags: string[] }
  /** この動画で使う音声（staticFile のパス）。ライセンスの確認に使う */
  audio: string[]
}
