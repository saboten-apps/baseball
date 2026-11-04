// 構成⑥：ストーリーの予告。序盤3話のタイトルと挿絵を見せ、最後は「？？？」で続きをゲームへ誘う（ネタバレしない）
import type React from 'react'
import { Sequence, interpolate, useCurrentFrame } from 'remotion'
import { Caption, Hook, Picture, Safe, Sfx, Telop } from '../components/parts.tsx'
import { T, sec } from '../plan/timing.ts'
import type { VideoProps } from '../plan/types.ts'
import { FONT, paletteOf, type Palette } from '../theme.ts'

type Chapter = VideoProps<'StoryTeaser'>['data']['chapters'][number]

const Scene: React.FC<{ ch: Chapter; palette: Palette }> = ({ ch, palette }) => {
  const f = useCurrentFrame()
  const z = interpolate(f, [0, sec(T.StoryTeaser.chapter)], [1, 1.06])
  return (
    <Safe gap={30}>
      <Telop size={64} color={palette.accent} stroke={palette.ink}>{ch.short}</Telop>
      {ch.art ? (
        <Picture src={ch.art} width={760} height={500} style={{ transform: `scale(${z})` }} />
      ) : (
        <div style={{ width: 760, height: 500, borderRadius: 36, border: '8px solid #fff', background: 'linear-gradient(135deg,#2a1b5c,#120a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 200, color: '#fff' }}>？？？</div>
      )}
      <Telop size={[...ch.title].length > 8 ? 76 : 96} delay={4}>{ch.title}</Telop>
      <Caption size={46} delay={10}>{ch.line}</Caption>
      <Sfx name={ch.hidden ? 'ding' : 'whoosh'} at={0} volume={0.7} />
    </Safe>
  )
}

export const StoryTeaser: React.FC<VideoProps<'StoryTeaser'>> = ({ data, hook, hookSub, hookBadge, hookArt, palette }) => {
  const p = paletteOf(palette)
  const hookF = sec(T.StoryTeaser.hook), chF = sec(T.StoryTeaser.chapter)
  return (
    <>
      <Sequence durationInFrames={hookF}><Hook text={hook} sub={hookSub} badge={hookBadge} art={hookArt} palette={p} /></Sequence>
      {data.chapters.map((ch, i) => (
        <Sequence key={ch.short} from={hookF + chF * i} durationInFrames={chF}><Scene ch={ch} palette={p} /></Sequence>
      ))}
    </>
  )
}
