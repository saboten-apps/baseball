// 構成②：球速クイズ。球種の名前を出し「最高何km/h？」→ 4択 → 3・2・1 → 正解 → 他の球種との速さ比べ
import type React from 'react'
import { Sequence, interpolate, useCurrentFrame } from 'remotion'
import { ChoiceList, CountdownBadge, Hook, Safe, Sfx, Telop } from '../components/parts.tsx'
import { T, sec } from '../plan/timing.ts'
import type { PitchSpeedQuizProps, VideoProps } from '../plan/types.ts'
import { FONT, paletteOf, type Palette } from '../theme.ts'

const Compare: React.FC<{ data: PitchSpeedQuizProps; palette: Palette }> = ({ data, palette }) => {
  const f = useCurrentFrame()
  const list = [data.pitch, ...data.others].sort((a, b) => b.max - a.max)
  const top = Math.max(...list.map((x) => x.max))
  return (
    <Safe gap={34}>
      <Telop size={70}>球種ごとの最高球速</Telop>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: 860 }}>
        {list.map((x, i) => {
          const w = interpolate(f, [i * 4, i * 4 + 14], [0, x.max / top], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          const me = x.id === data.pitch.id
          return (
            <div key={x.id}>
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 52, color: '#fff', WebkitTextStroke: '10px #1d0f3a', paintOrder: 'stroke fill' }}>
                {x.name}　<span style={{ color: me ? '#3ddc84' : palette.accent }}>{x.max}km/h</span>
              </div>
              <div style={{ height: 44, borderRadius: 44, background: 'rgba(0,0,0,0.35)', border: '4px solid #fff', marginTop: 8 }}>
                <div style={{ width: `${Math.max(4, w * 100)}%`, height: '100%', borderRadius: 44, background: me ? '#3ddc84' : palette.accent }} />
              </div>
            </div>
          )
        })}
      </div>
      <Sfx name="whoosh" at={0} />
    </Safe>
  )
}

export const PitchSpeedQuiz: React.FC<VideoProps<'PitchSpeedQuiz'>> = ({ data, hook, hookSub, hookBadge, hookArt, palette }) => {
  const p = paletteOf(palette)
  const t = T.PitchSpeedQuiz
  const a = sec(t.hook), b = a + sec(t.question + t.countdown), c = b + sec(t.answer)
  const options = data.options.map((v) => ({ main: `${v}km/h` }))
  return (
    <>
      <Sequence durationInFrames={a}><Hook text={hook} sub={hookSub} badge={hookBadge} art={hookArt} palette={p} /></Sequence>
      <Sequence from={a} durationInFrames={b - a}>
        <Safe gap={30}>
          <Telop size={112} color={p.accent} stroke={p.ink}>{data.pitch.name}</Telop>
          <Telop size={64} pop={false}>最高球速は？</Telop>
          <ChoiceList options={options} answerIndex={data.answerIndex} reveal={false} palette={p} />
          <Sequence from={sec(t.question)} layout="none"><CountdownBadge palette={p} /></Sequence>
        </Safe>
        <Sfx name="pop" at={0} />
        {[0, 1, 2].map((k) => <Sfx key={k} name="tick" at={sec(t.question) + k * 30} />)}
      </Sequence>
      <Sequence from={b} durationInFrames={c - b}>
        <Safe gap={30}>
          <Telop size={100} color="#3ddc84" stroke="#0b3d22">正解は {'ABCD'[data.answerIndex]}！</Telop>
          <ChoiceList options={options} answerIndex={data.answerIndex} reveal palette={p} />
          <Telop size={58} delay={10}>{data.pitch.min}〜{data.pitch.max}km/h</Telop>
        </Safe>
        <Sfx name="ding" at={0} />
      </Sequence>
      <Sequence from={c}><Compare data={data} palette={p} /></Sequence>
    </>
  )
}
