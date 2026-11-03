// 構成③：選手ランキング TOP3。3位→2位→1位の順に、能力値を出す。1位は最初「？？？」で、ドラムロールのあとにめくれる
import type React from 'react'
import { Sequence, interpolate, useCurrentFrame } from 'remotion'
import { Hook, Safe, Sfx, Telop } from '../components/parts.tsx'
import { T, sec } from '../plan/timing.ts'
import type { VideoProps } from '../plan/types.ts'
import { FONT, paletteOf, type Palette } from '../theme.ts'

type Item = VideoProps<'RankingCountdown'>['data']['items'][number]

const Card: React.FC<{ item: Item; metric: string; flipAt: number; palette: Palette }> = ({ item, metric, flipAt, palette }) => {
  const f = useCurrentFrame()
  const turn = interpolate(f, [flipAt, flipAt + 10], [0, 180], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const front = turn < 90
  const shake = f < flipAt && flipAt > 0 && f > 20 ? Math.sin(f * 1.4) * 6 : 0
  return (
    <Safe gap={36}>
      <Telop size={120} color={palette.accent} stroke={palette.ink}>第{item.rank}位</Telop>
      <div style={{
        width: 840, height: 420, borderRadius: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: front ? 'linear-gradient(135deg,#2a1b5c,#120a2e)' : 'linear-gradient(135deg,#fff7c2,#ffd23f)',
        border: '10px solid #fff', boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        transform: `perspective(1400px) rotateY(${front ? turn : turn - 180}deg) translateX(${shake}px)`,
      }}>
        {front ? (
          <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 170, color: '#fff', letterSpacing: '0.1em' }}>？？？</span>
        ) : (
          <>
            <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: [...item.name].length > 5 ? 100 : 130, color: palette.ink }}>{item.name}</span>
            <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 52, color: palette.ink, opacity: 0.8 }}>{item.teamName}{item.star ? '　★スター' : ''}</span>
          </>
        )}
      </div>
      <Telop size={64} pop={false}>{metric}</Telop>
      <Telop size={150} color="#ffd23f" stroke={palette.ink} delay={flipAt + 4}>{item.grade}</Telop>
      <Sfx name="drumroll" at={0} volume={0.6} />
      <Sfx name={item.rank === 1 ? 'boom' : 'ding'} at={flipAt + 4} />
    </Safe>
  )
}

export const RankingCountdown: React.FC<VideoProps<'RankingCountdown'>> = ({ data, hook, palette }) => {
  const p = paletteOf(palette)
  const t = T.RankingCountdown
  const hookF = sec(t.hook), itemF = sec(t.item)
  return (
    <>
      <Sequence durationInFrames={hookF}><Hook text={hook} palette={p} sub={`能力値：${data.metric}`} /></Sequence>
      {data.items.map((it, i) => {
        const last = i === data.items.length - 1
        return (
          <Sequence key={it.rank} from={hookF + itemF * i} durationInFrames={last ? sec(t.last) : itemF}>
            <Card item={it} metric={data.metric} flipAt={last ? sec(2.6) : sec(1.2)} palette={p} />
          </Sequence>
        )
      })}
    </>
  )
}
