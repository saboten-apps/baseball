// 構成⑦：実際のゲーム画面の紹介。冒頭は画面を高速で切り替え、その後1画面ずつズームしながら説明
import type React from 'react'
import { AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { Hook, Safe, Sfx, Telop } from '../components/parts.tsx'
import { T, sec } from '../plan/timing.ts'
import type { ScreenShot, ScreenTourProps, VideoProps } from '../plan/types.ts'
import { paletteOf, type Palette } from '../theme.ts'

const PHONE_W = 520
const PHONE_H = 900

const NOTES: Record<string, (c: ScreenTourProps['counts']) => string> = {
  menu: () => 'ストーリー・CPU・オンライン',
  team: (c) => `${c.teams}チームから選べる`,
  ingame: () => '投げる球が来る！ タイミングで打つ',
  hr: () => '当たればホームラン！',
  story: (c) => `全${c.stages}話のストーリー`,
}

const Phone: React.FC<{ shot: ScreenShot; zoom: [number, number] }> = ({ shot, zoom }) => {
  const f = useCurrentFrame()
  const z = interpolate(f, [0, sec(T.ScreenTour.shot)], zoom)
  return (
    <div style={{ width: PHONE_W, height: PHONE_H, borderRadius: 64, background: '#111', padding: 16, boxShadow: '0 30px 80px rgba(0,0,0,0.5)', flexShrink: 0, boxSizing: 'content-box' }}>
      <div style={{ width: '100%', height: '100%', borderRadius: 50, overflow: 'hidden' }}>
        <Img src={staticFile(shot.src)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 62%', transform: `scale(${z})`, transformOrigin: '50% 60%' }} />
      </div>
    </div>
  )
}

const Montage: React.FC<{ shots: ScreenShot[] }> = ({ shots }) => {
  const f = useCurrentFrame()
  const shot = shots[Math.floor(f / 6) % shots.length]
  return (
    <AbsoluteFill style={{ opacity: 0.55 }}>
      <Img src={staticFile(shot.src)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(2px)' }} />
    </AbsoluteFill>
  )
}

const Shot: React.FC<{ shot: ScreenShot; i: number; counts: ScreenTourProps['counts']; palette: Palette }> = ({ shot, i, counts, palette }) => {
  const f = useCurrentFrame()
  const x = interpolate(f, [0, 7], [i % 2 === 0 ? 1100 : -1100, 0], { extrapolateRight: 'clamp' })
  const note = NOTES[shot.key]?.(counts) ?? shot.label
  return (
    <Safe gap={22} justify="flex-start">
      <Telop size={72} color={palette.accent} stroke={palette.ink}>{shot.label}</Telop>
      <div style={{ transform: `translateX(${x}px)` }}>
        <Phone shot={shot} zoom={i % 2 === 0 ? [1, 1.1] : [1.1, 1]} />
      </div>
      <Telop size={50} delay={8}>{note}</Telop>
      <Sfx name="whoosh" at={0} volume={0.6} />
    </Safe>
  )
}

export const ScreenTour: React.FC<VideoProps<'ScreenTour'>> = ({ data, hook, palette }) => {
  const p = paletteOf(palette)
  const hookF = sec(T.ScreenTour.hook)
  const shotF = sec(T.ScreenTour.shot)
  return (
    <>
      <Sequence durationInFrames={hookF}>
        <Montage shots={data.shots} />
        <Hook text={hook} palette={p} sub="実際のゲーム画面" />
      </Sequence>
      {data.shots.map((s, i) => (
        <Sequence key={s.key} from={hookF + shotF * i} durationInFrames={shotF}>
          <Shot shot={s} i={i} counts={data.counts} palette={p} />
        </Sequence>
      ))}
    </>
  )
}
