// Remotion に登録する動画（テンプレートごとに1つ）。既定の中身は、今週の計画から作る（Studio で確認する用）。
// 本番のレンダリングでは、scripts/renderWeek.ts が週の計画を inputProps で渡す。
import type React from 'react'
import { Composition } from 'remotion'
import gameData from './generated/gameData.json'
import { buildWeekPlan } from './plan/buildPlan.ts'
import { FPS, HEIGHT, WIDTH } from './plan/timing.ts'
import type { GameData, VideoProps } from './plan/types.ts'
import { isoWeekId } from './plan/week.ts'
import { Video } from './Video.tsx'

const plan = buildWeekPlan(gameData as GameData, isoWeekId(new Date()))

export const Root: React.FC = () => (
  <>
    {plan.map((spec) => (
      <Composition
        key={spec.template}
        id={spec.template}
        component={Video as unknown as React.FC<Record<string, unknown>>}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={spec.props.durationInFrames}
        defaultProps={spec.props as unknown as Record<string, unknown>}
        calculateMetadata={({ props }) => ({ durationInFrames: (props as unknown as VideoProps).durationInFrames })}
      />
    ))}
  </>
)
