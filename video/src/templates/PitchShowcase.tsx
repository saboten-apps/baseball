// 構成⑤：球種のスピード紹介。球種が次々に飛び込み、最高球速と、速さの目安の棒が出る
import type React from 'react'
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Hook, Safe, Sfx, Telop } from '../components/parts.tsx'
import { T, sec } from '../plan/timing.ts'
import type { PitchInfo, VideoProps } from '../plan/types.ts'
import { FONT, paletteOf, type Palette } from '../theme.ts'

const MAX_KMH = 170

const One: React.FC<{ pitch: PitchInfo; i: number; palette: Palette }> = ({ pitch, i, palette }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 240 }, from: 2, to: 1 })
  const x = interpolate(f, [0, 6], [i % 2 === 0 ? -900 : 900, 0], { extrapolateRight: 'clamp' })
  const w = interpolate(f, [4, 20], [0, pitch.max / MAX_KMH], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill>
      <Safe gap={36}>
        <div style={{ transform: `translateX(${x}px) scale(${s})` }}>
          <Telop size={[...pitch.name].length > 6 ? 108 : 132} color={palette.accent} stroke={palette.ink} pop={false}>{pitch.name}</Telop>
        </div>
        <Telop size={100} delay={4}>{pitch.max}km/h</Telop>
        <div style={{ width: 860, height: 56, borderRadius: 56, background: 'rgba(0,0,0,0.4)', border: '5px solid #fff' }}>
          <div style={{ width: `${w * 100}%`, height: '100%', borderRadius: 56, background: palette.accent }} />
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 52, color: '#fff', WebkitTextStroke: '10px #1d0f3a', paintOrder: 'stroke fill' }}>
          {pitch.min}〜{pitch.max}km/h
        </div>
      </Safe>
      <Sfx name="whoosh" at={0} volume={0.6} />
      <Sfx name="tick" at={5} volume={0.6} />
    </AbsoluteFill>
  )
}

export const PitchShowcase: React.FC<VideoProps<'PitchShowcase'>> = ({ data, hook, palette }) => {
  const p = paletteOf(palette)
  const t = T.PitchShowcase
  const hookF = sec(t.hook), oneF = sec(t.pitch)
  const outro = hookF + oneF * data.pitches.length
  return (
    <>
      <Sequence durationInFrames={hookF}><Hook text={hook} palette={p} sub="球速と球種" /></Sequence>
      {data.pitches.map((pi, i) => (
        <Sequence key={pi.id} from={hookF + oneF * i} durationInFrames={oneF}><One pitch={pi} i={i} palette={p} /></Sequence>
      ))}
      <Sequence from={outro}>
        <Safe gap={36}>
          <Telop size={80}>ほかにもまだまだ…</Telop>
          <Telop size={100} color={p.accent} stroke={p.ink} delay={8}>全{data.total}種類！</Telop>
        </Safe>
        <Sfx name="ding" at={0} />
      </Sequence>
    </>
  )
}
