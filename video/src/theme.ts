// 色と文字。テロップはスマホで読めるよう、太字・太い縁取り・大きめの文字にそろえる。

export const FONT = '"Noto Sans CJK JP", "Noto Sans JP", "Hiragino Sans", "IPAPGothic", "WenQuanYi Zen Hei", sans-serif'

/** TikTok の画面の上（タブ）・下（説明文）・右（ボタン）に隠れない範囲 */
export const SAFE = { top: 250, bottom: 470, left: 64, right: 150 } as const

export interface Palette { bg: [string, string, string]; accent: string; accent2: string; ink: string }

export const PALETTES: Palette[] = [
  { bg: ['#ff6fb1', '#8a4dff', '#2b1055'], accent: '#ffe14d', accent2: '#ff2e88', ink: '#2b1055' },
  { bg: ['#29d3c2', '#2f6bff', '#141b4d'], accent: '#ffe14d', accent2: '#ff7a1a', ink: '#141b4d' },
  { bg: ['#ffb347', '#ff5f6d', '#4a1037'], accent: '#fff36b', accent2: '#7a2cff', ink: '#4a1037' },
  { bg: ['#7ee081', '#1fa2a8', '#12324a'], accent: '#ffe14d', accent2: '#ff4f9a', ink: '#12324a' },
]

export const paletteOf = (i: number): Palette => PALETTES[i % PALETTES.length]
