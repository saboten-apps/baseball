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
  // 期待→緊張→報酬の音設計（scripts/synthAudio.ts がコードで合成）
  crack: `${dir}/sfx_crack.wav`,
  fanfare: `${dir}/sfx_fanfare.wav`,
  winner: `${dir}/sfx_winner.wav`,
  homerun: `${dir}/sfx_homerun.wav`,
  jackpot: `${dir}/sfx_jackpot.wav`,
  zuko: `${dir}/sfx_zuko.wav`,
  blip: `${dir}/sfx_blip.wav`,
  rise_1: `${dir}/sfx_rise_1.wav`,
  rise_2: `${dir}/sfx_rise_2.wav`,
  rise_3: `${dir}/sfx_rise_3.wav`,
  rise_4: `${dir}/sfx_rise_4.wav`,
  rise_5: `${dir}/sfx_rise_5.wav`,
} as const

export type SfxName = keyof typeof SFX

/** 各効果音の長さ（秒）。再生の枠（Sequence）の長さに使う。synthAudio.ts と合わせる */
export const SFX_SEC: Record<SfxName, number> = {
  pop: 0.25, whoosh: 0.5, ding: 1.2, tick: 0.12, drumroll: 1.6, boom: 1.0, sparkle: 0.9, buzzer: 0.6, coin: 0.6, stamp: 0.6,
  crack: 0.7, fanfare: 1.6, winner: 1.8, homerun: 3.2, jackpot: 3.5, zuko: 0.75, blip: 0.3,
  rise_1: 0.55, rise_2: 0.55, rise_3: 0.55, rise_4: 0.55, rise_5: 0.55,
}
