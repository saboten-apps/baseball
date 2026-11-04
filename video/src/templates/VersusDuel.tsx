// 構成④：打者対決。2人の能力値を並べ、3・2・1 のあとで「強いのはどっち？」の答えを出す
import type React from 'react'
import { Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { CountdownBadge, GradeBar, Hook, Safe, Sfx, Telop } from '../components/parts.tsx'
import { T, sec } from '../plan/timing.ts'
import { GRADE, type PlayerInfo, type VideoProps } from '../plan/types.ts'
import { FONT, paletteOf, type Palette } from '../theme.ts'

const COLORS = ['#ff4f8b', '#3fa9ff']
const g = (n: number) => GRADE[Math.max(1, Math.min(7, n))]

const Fighter: React.FC<{ p: PlayerInfo; color: string; side: 'l' | 'r'; delay?: number }> = ({ p, color, side, delay = 0 }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: f - delay, fps, config: { damping: 10 } })
  return (
    <div style={{ flex: 1, textAlign: 'center', transform: `translateX(${(1 - s) * (side === 'l' ? -500 : 500)}px)`, fontFamily: FONT, fontWeight: 900 }}>
      <div style={{ background: '#fff', border: `10px solid ${color}`, borderRadius: 36, padding: '26px 8px' }}>
        <div style={{ fontSize: [...p.name].length > 4 ? 60 : 78, color: '#1d0f3a' }}>{p.name}</div>
        <div style={{ fontSize: 38, color: '#1d0f3a', opacity: 0.75 }}>{p.teamName}</div>
        {p.star ? <div style={{ fontSize: 42, color }}>★スター</div> : null}
      </div>
    </div>
  )
}

const Stats: React.FC<{ data: VideoProps<'VersusDuel'>['data'] }> = ({ data }) => (
  <Safe gap={34}>
    <div style={{ display: 'flex', gap: 24, width: 880 }}>
      <Fighter p={data.a} color={COLORS[0]} side="l" delay={-20} />
      <Fighter p={data.b} color={COLORS[1]} side="r" delay={-20} />
    </div>
    {data.rows.map((r, i) => (
      <div key={r.label} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 860 }}>
        <GradeBar label={r.label} value={r.a} color={COLORS[0]} delay={i * 12} grade={g(r.a)} />
        <GradeBar label="" value={r.b} color={COLORS[1]} delay={i * 12 + 6} grade={g(r.b)} />
      </div>
    ))}
    <Sfx name="whoosh" at={0} />
  </Safe>
)

const Result: React.FC<{ data: VideoProps<'VersusDuel'>['data']; palette: Palette }> = ({ data, palette }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const win = data.winner === 'a' ? data.a : data.b
  const color = data.winner === 'a' ? COLORS[0] : COLORS[1]
  const stamp = spring({ frame: f - 6, fps, config: { damping: 7, stiffness: 260 }, from: 2.6, to: 1 })
  return (
    <Safe gap={40}>
      <Telop size={80}>総合力が高いのは</Telop>
      <div style={{ transform: `scale(${f >= 6 ? stamp : 0}) rotate(-5deg)`, background: '#fff', border: `14px solid ${color}`, borderRadius: 40, padding: '24px 60px', textAlign: 'center', fontFamily: FONT, fontWeight: 900 }}>
        <div style={{ fontSize: 120, color: '#1d0f3a' }}>{win.name}</div>
        <div style={{ fontSize: 50, color: '#1d0f3a', opacity: 0.75 }}>{win.teamName}</div>
      </div>
      <Telop size={64} color={palette.accent} stroke={palette.ink} delay={24}>ミート＋パワーの合計で比較</Telop>
      <Sfx name="stamp" at={6} />
      <Sfx name="ding" at={8} />
    </Safe>
  )
}

export const VersusDuel: React.FC<VideoProps<'VersusDuel'>> = ({ data, hook, palette }) => {
  const p = paletteOf(palette)
  const t = T.VersusDuel
  const a = sec(t.hook), b = a + sec(t.intro), c = b + sec(t.stats), d = c + sec(t.countdown)
  return (
    <>
      <Sequence durationInFrames={a}><Hook text={hook} palette={p} /></Sequence>
      <Sequence from={a} durationInFrames={b - a}>
        <Safe gap={50}>
          <div style={{ display: 'flex', gap: 24, width: 880 }}>
            <Fighter p={data.a} color={COLORS[0]} side="l" />
            <Fighter p={data.b} color={COLORS[1]} side="r" />
          </div>
          <Telop size={150} color={p.accent} stroke={p.ink} delay={14}>VS</Telop>
        </Safe>
        <Sfx name="boom" at={14} />
      </Sequence>
      <Sequence from={b} durationInFrames={c - b}><Stats data={data} /></Sequence>
      <Sequence from={c} durationInFrames={d - c}>
        <Safe gap={40}>
          <Telop size={84}>どっちが強い？</Telop>
          <CountdownBadge palette={p} />
        </Safe>
        {[0, 1, 2].map((k) => <Sfx key={k} name="tick" at={k * 30} />)}
      </Sequence>
      <Sequence from={d}><Result data={data} palette={p} /></Sequence>
    </>
  )
}
