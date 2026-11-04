// 各テンプレートの場面の長さ（秒）。テンプレートと計画の両方から使い、長さのずれを防ぐ。
export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920
export const END_CARD_SEC = 3
export const MIN_SEC = 15
export const MAX_SEC = 30

// 冒頭のつかみ（結果の先出し）の長さ。どの形式も3秒
export const HOOK_SEC = 3

export const T = {
  TraitQuiz: { hook: 3, question: 4, countdown: 3, answer: 4.5 },
  PitchSpeedQuiz: { hook: 3, question: 4, countdown: 3, answer: 4, compare: 3.5 },
  RankingCountdown: { hook: 3, item: 4, last: 5 },
  VersusDuel: { hook: 3, intro: 3, stats: 4, countdown: 3, result: 4 },
  PitchShowcase: { hook: 3, pitch: 1.8, outro: 2.5 },
  StoryTeaser: { hook: 3, chapter: 4, outro: 3 },
  ScreenTour: { hook: 3, shot: 2.6 },
} as const

export const sec = (s: number) => Math.round(s * FPS)
