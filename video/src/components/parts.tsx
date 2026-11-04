// どの動画でも使う部品：背景・テロップ・つかみ・効果音・数値のチップ・エンドカード
import type React from 'react'
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { SFX, type SfxName } from '../audio.ts'
import { END_CARD_SEC, sec } from '../plan/timing.ts'
import { FONT, SAFE, paletteOf, type Palette } from '../theme.ts'


/** ゆっくり動くグラデーションと、光の粒 */
export const Background: React.FC<{ palette: Palette }> = ({ palette }) => {
  const f = useCurrentFrame()
  const angle = 160 + Math.sin(f / 90) * 20
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${angle}deg, ${palette.bg[0]} 0%, ${palette.bg[1]} 48%, ${palette.bg[2]} 100%)` }}>
      {Array.from({ length: 14 }, (_, i) => {
        const x = (i * 197) % 1080
        const y = (1920 + ((i * 331) % 1920) - f * (1.2 + (i % 4) * 0.5)) % 1920
        const r = 10 + (i % 5) * 8
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: r, height: r, borderRadius: r, background: 'rgba(255,255,255,0.18)' }} />
      })}
    </AbsoluteFill>
  )
}

/** 太い縁取りの文字（スマホで読める大きさ・縁取り） */
export const Telop: React.FC<{
  children: React.ReactNode
  size?: number
  color?: string
  stroke?: string
  delay?: number
  style?: React.CSSProperties
  pop?: boolean
}> = ({ children, size = 84, color = '#fff', stroke = '#1d0f3a', delay = 0, style, pop = true }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = pop ? spring({ frame: f - delay, fps, config: { damping: 11, stiffness: 180 } }) : 1
  const scale = pop ? interpolate(s, [0, 1], [0.4, 1]) : 1
  const opacity = f < delay ? 0 : 1
  return (
    <div style={{
      fontFamily: FONT, fontWeight: 900, fontSize: size, lineHeight: 1.22, color, textAlign: 'center',
      WebkitTextStroke: `${Math.max(8, size * 0.16)}px ${stroke}`, paintOrder: 'stroke fill',
      textShadow: `0 ${size * 0.08}px 0 rgba(0,0,0,0.35)`, letterSpacing: '0.02em',
      transform: `scale(${scale})`, opacity, wordBreak: 'normal', lineBreak: 'strict', overflowWrap: 'anywhere', ...style,
    }}>
      {children}
    </div>
  )
}

/** 帯つきの説明文（長めの文を、読みやすい箱に入れる） */
export const Caption: React.FC<{ children: React.ReactNode; size?: number; delay?: number; style?: React.CSSProperties }> = ({ children, size = 54, delay = 0, style }) => {
  const f = useCurrentFrame()
  const o = interpolate(f, [delay, delay + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const y = interpolate(f, [delay, delay + 8], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{
      fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.45, color: '#fff', background: 'rgba(15,8,40,0.78)',
      borderRadius: 28, padding: '22px 34px', textAlign: 'center', opacity: o, transform: `translateY(${y}px)`,
      border: '4px solid rgba(255,255,255,0.35)', wordBreak: 'normal', lineBreak: 'strict', overflowWrap: 'anywhere', ...style,
    }}>
      {children}
    </div>
  )
}

/** 安全な範囲（TikTok の操作部分に隠れない所）に中身を置く */
export const Safe: React.FC<{ children: React.ReactNode; justify?: React.CSSProperties['justifyContent']; gap?: number }> = ({ children, justify = 'center', gap = 36 }) => (
  <AbsoluteFill style={{ paddingTop: SAFE.top, paddingBottom: SAFE.bottom, paddingLeft: SAFE.left, paddingRight: SAFE.right, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: justify, gap }}>
    {children}
  </AbsoluteFill>
)

export const Sfx: React.FC<{ name: SfxName; at: number; volume?: number }> = ({ name, at, volume = 0.9 }) => (
  <Sequence from={Math.max(0, Math.round(at))} durationInFrames={sec(2)} layout="none">
    <Audio src={staticFile(SFX[name])} volume={volume} />
  </Sequence>
)

/** 冒頭のつかみ：1コマ目から文字が見え、はじけて揺れる */
export const Hook: React.FC<{ text: string; palette: Palette; sub?: string }> = ({ text, palette, sub }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 220 }, from: 1.12, to: 1 })
  const shake = f < 10 ? Math.sin(f * 2.4) * (10 - f) * 1.2 : 0
  // 改行（\n）で区切った、いちばん長い行が、安全な範囲の幅（約860px）に1行で収まる大きさにする
  const longest = Math.max(...text.split('\n').map((l) => [...l].length))
  const size = Math.min(130, Math.floor(860 / longest))
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `repeating-conic-gradient(from ${f * 2}deg at 50% 45%, rgba(255,255,255,0.16) 0deg 10deg, transparent 10deg 20deg)` }} />
      <Safe>
        <div style={{ maxWidth: 860, transform: `scale(${s}) rotate(${-3 + shake * 0.2}deg) translateX(${shake}px)` }}>
          <Telop size={size} color={palette.accent} stroke={palette.ink} pop={false} style={{ whiteSpace: 'pre-line' }}>{text}</Telop>
        </div>
        {sub ? <Telop size={60} delay={8}>{sub}</Telop> : null}
      </Safe>
      <Sfx name="whoosh" at={0} />
      <Sfx name="pop" at={2} />
    </AbsoluteFill>
  )
}

/** ゲームの1枚絵・画面（角丸・影つき） */
export const Picture: React.FC<{ src: string; width: number; height: number; style?: React.CSSProperties }> = ({ src, width, height, style }) => (
  <div style={{ width, height, borderRadius: 36, overflow: 'hidden', border: '8px solid #fff', boxShadow: '0 24px 60px rgba(0,0,0,0.45)', flexShrink: 0, ...style }}>
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </div>
)

/** 終わりのカード（ゲーム名・無料・遊び方） */
export const EndCard: React.FC<{ palette: Palette }> = ({ palette }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s = spring({ frame: f, fps, config: { damping: 10 } })
  const stamp = spring({ frame: f - 22, fps, config: { damping: 7, stiffness: 260 }, from: 2.4, to: 1 })
  return (
    <AbsoluteFill>
      <Background palette={palette} />
      <Safe gap={30}>
        <Img src={staticFile('generated/icon.png')} style={{ width: 300, height: 300, borderRadius: 64, transform: `scale(${s})`, boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }} />
        <Telop size={84} color={palette.accent} stroke={palette.ink}>どうぶつベースボール</Telop>
        <div style={{ transform: `scale(${f >= 22 ? stamp : 0}) rotate(-6deg)`, fontFamily: FONT, fontWeight: 900, fontSize: 70, color: '#fff', background: palette.accent2, padding: '10px 40px', borderRadius: 18, border: '7px solid #fff' }}>
          プレイボール！
        </div>
        <Telop size={64} delay={30}>ブラウザで無料！</Telop>
        <Caption size={46} delay={40}>プロフィールのリンクから遊べます</Caption>
      </Safe>
      <Sfx name="sparkle" at={0} />
      <Sfx name="pop" at={22} />
    </AbsoluteFill>
  )
}

/** 動画の外枠：背景・BGM（始めと終わりをなめらかに）・エンドカード */
export const Frame: React.FC<{ palette: number; bgm: string; children: React.ReactNode }> = ({ palette, bgm, children }) => {
  const { durationInFrames, fps } = useVideoConfig()
  const p = paletteOf(palette)
  const end = durationInFrames - END_CARD_SEC * fps
  return (
    <AbsoluteFill style={{ fontFamily: FONT, backgroundColor: p.bg[2] }}>
      <Background palette={p} />
      <Sequence durationInFrames={end}>{children}</Sequence>
      <Sequence from={end}><EndCard palette={p} /></Sequence>
      <Audio src={staticFile(bgm)} volume={(f) => 0.42 * interpolate(f, [0, 6, durationInFrames - 25, durationInFrames], [0.6, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </AbsoluteFill>
  )
}

const LETTERS = 'ABCD'

/** 4択の選択肢。reveal が true のとき、正解だけを緑にする */
export const ChoiceList: React.FC<{ options: { main: string; sub?: string }[]; answerIndex: number; reveal: boolean; palette: Palette }> = ({ options, answerIndex, reveal, palette }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: 860 }}>
      {options.map((o, i) => {
        const ok = i === answerIndex
        const s = reveal ? 1 : spring({ frame: f - i * 5, fps, config: { damping: 12 } })
        const bg = reveal ? (ok ? '#3ddc84' : 'rgba(255,255,255,0.45)') : '#fff'
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 22, background: bg, borderRadius: 30, padding: '16px 26px', border: `8px solid ${reveal && ok ? '#fff' : palette.ink}`, transform: `scale(${reveal && ok ? 1.05 : s})` }}>
            <div style={{ flexShrink: 0, width: 92, height: 92, borderRadius: 92, background: palette.accent2, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{LETTERS[i]}</div>
            <div style={{ fontFamily: FONT, fontWeight: 900, color: '#1d0f3a', lineHeight: 1.2 }}>
              <div style={{ fontSize: [...o.main].length > 8 ? 52 : 62 }}>{o.main}</div>
              {o.sub ? <div style={{ fontSize: 40, opacity: 0.7 }}>{o.sub}</div> : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** 3・2・1 のカウントダウン（開始から数える） */
export const CountdownBadge: React.FC<{ palette: Palette; from?: number }> = ({ palette, from = 3 }) => {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const n = Math.max(1, from - Math.floor(f / fps))
  const s = spring({ frame: f % fps, fps, config: { damping: 8 }, from: 1.8, to: 1 })
  return (
    <div style={{ width: 240, height: 240, borderRadius: 240, background: palette.accent, border: '12px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${s})` }}>
      <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 160, color: palette.ink }}>{n}</span>
    </div>
  )
}

/** 能力値の棒（1〜7）。右端に S〜E の文字 */
export const GradeBar: React.FC<{ label: string; value: number; max?: number; color: string; delay?: number; grade: string }> = ({ label, value, max = 7, color, delay = 0, grade }) => {
  const f = useCurrentFrame()
  const w = interpolate(f, [delay, delay + 14], [0, value / max], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
      <div style={{ width: 150, fontFamily: FONT, fontWeight: 900, fontSize: 40, color: '#fff', WebkitTextStroke: '8px #1d0f3a', paintOrder: 'stroke fill' }}>{label}</div>
      <div style={{ flex: 1, height: 40, borderRadius: 40, background: 'rgba(0,0,0,0.4)', border: '4px solid #fff' }}>
        <div style={{ width: `${Math.max(4, w * 100)}%`, height: '100%', borderRadius: 40, background: color }} />
      </div>
      <div style={{ width: 56, fontFamily: FONT, fontWeight: 900, fontSize: 48, color: '#ffd23f', WebkitTextStroke: '8px #1d0f3a', paintOrder: 'stroke fill', textAlign: 'center' }}>{grade}</div>
    </div>
  )
}
