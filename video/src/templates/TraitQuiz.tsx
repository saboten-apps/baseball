// 構成①：どうぶつ固有スキルのクイズ。特性の説明を出し、「どのチームのスキル？」を4択 → 3・2・1 → 正解
import type React from 'react'
import { Caption, ChoiceList, CountdownBadge, Hook, Safe, Sfx, Telop } from '../components/parts.tsx'
import { Sequence } from 'remotion'
import { T, sec } from '../plan/timing.ts'
import type { VideoProps } from '../plan/types.ts'
import { paletteOf } from '../theme.ts'

export const TraitQuiz: React.FC<VideoProps<'TraitQuiz'>> = ({ data, hook, hookSub, hookBadge, hookArt, palette }) => {
  const p = paletteOf(palette)
  const t = T.TraitQuiz
  const a = sec(t.hook), b = a + sec(t.question + t.countdown), c = b + sec(t.answer)
  const options = data.options.map((o) => ({ main: o.team, sub: o.animal }))
  return (
    <>
      <Sequence durationInFrames={a}><Hook text={hook} sub={hookSub} badge={hookBadge} art={hookArt} palette={p} /></Sequence>
      <Sequence from={a} durationInFrames={b - a}>
        <Safe gap={28}>
          <Caption size={56}>{data.trait.desc}</Caption>
          <Telop size={70} pop={false}>どのチームのスキル？</Telop>
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
          <Telop size={64} color={p.accent} stroke={p.ink} delay={10}>「{data.trait.name}」</Telop>
        </Safe>
        <Sfx name="ding" at={0} />
      </Sequence>
    </>
  )
}
