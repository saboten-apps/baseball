// 1本の動画：外枠（背景・BGM・エンドカード）の中に、テンプレートの中身を入れる
import type React from 'react'
import { Frame } from './components/parts.tsx'
import { soundPlan } from './plan/soundPlan.ts'
import type { TemplateId, VideoProps } from './plan/types.ts'
import { PitchShowcase } from './templates/PitchShowcase.tsx'
import { PitchSpeedQuiz } from './templates/PitchSpeedQuiz.tsx'
import { RankingCountdown } from './templates/RankingCountdown.tsx'
import { ScreenTour } from './templates/ScreenTour.tsx'
import { StoryTeaser } from './templates/StoryTeaser.tsx'
import { TraitQuiz } from './templates/TraitQuiz.tsx'
import { VersusDuel } from './templates/VersusDuel.tsx'

const TEMPLATES: { [K in TemplateId]: React.FC<VideoProps<K>> } = {
  TraitQuiz, PitchSpeedQuiz, RankingCountdown, VersusDuel, PitchShowcase, StoryTeaser, ScreenTour,
}

export const Video: React.FC<VideoProps> = (props) => {
  const Body = TEMPLATES[props.template] as React.FC<VideoProps>
  return (
    <Frame palette={props.palette} bgm={props.bgm} cues={soundPlan(props)}>
      <Body {...props} />
    </Frame>
  )
}
