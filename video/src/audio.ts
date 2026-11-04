// 動画で使う音（BGM・効果音）の一覧。すべて scripts/synthAudio.ts がコードで合成する自作の音で、
// 外部の素材は使わない。ゲーム本体の音（効果音ラボ・Lyria・Gemini の音声）は、再配布・利用条件が違うので使わない。
// 使える範囲は audio-licenses.json に記録し、レンダリング前に照合する。

const dir = 'generated/audio'

export const BGM = {
  pop: `${dir}/bgm_pop.wav`,
  tense: `${dir}/bgm_tense.wav`,
  dreamy: `${dir}/bgm_dreamy.wav`,
} as const

export const SFX = {
  pop: `${dir}/sfx_pop.wav`,
  whoosh: `${dir}/sfx_whoosh.wav`,
  ding: `${dir}/sfx_ding.wav`,
  tick: `${dir}/sfx_tick.wav`,
  drumroll: `${dir}/sfx_drumroll.wav`,
  boom: `${dir}/sfx_boom.wav`,
  sparkle: `${dir}/sfx_sparkle.wav`,
  buzzer: `${dir}/sfx_buzzer.wav`,
  coin: `${dir}/sfx_coin.wav`,
  stamp: `${dir}/sfx_stamp.wav`,
} as const

export type SfxName = keyof typeof SFX

/** テンプレートで使う効果音（ライセンス照合用。テンプレートを変えたら、ここも合わせる） */
export const TEMPLATE_SFX: Record<string, SfxName[]> = {
  common: ['whoosh', 'pop', 'sparkle'],
  TraitQuiz: ['tick', 'ding', 'buzzer'],
  PitchSpeedQuiz: ['tick', 'ding', 'whoosh'],
  RankingCountdown: ['drumroll', 'ding', 'boom'],
  VersusDuel: ['tick', 'boom', 'stamp', 'ding'],
  PitchShowcase: ['whoosh', 'tick'],
  StoryTeaser: ['ding', 'whoosh'],
  ScreenTour: [],
}
