// 1週間分（7本）の動画を、順番にレンダリングし、投稿文・ハッシュタグと一緒に書き出す。
// 1本でも失敗したら、そこで止まり、終了コード1で終わる（後の動画は作らない）。
// TikTok への投稿はしない（書き出すだけ）。
//
// 使い方：node scripts/renderWeek.ts [--week 2026-W45] [--only 1,3] [--out out/2026-W45]
//   --week：作る週（既定は、日本時間の今週）。同じ週なら、同じ内容になる
//   --only：作る動画の番号（1〜7）。確認用
//   環境変数 REMOTION_BROWSER_EXECUTABLE：Remotion が使う Chrome（指定しなければ Remotion が用意する）
// 出力：<out>/NN-名前.mp4・.jpg（表紙）・.txt（投稿文）、posts.md（一覧）、manifest.json
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { bundle } from '@remotion/bundler'
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer'
import { buildWeekPlan, totalSeconds } from '../src/plan/buildPlan.ts'
import { FPS, HEIGHT, MAX_SEC, MIN_SEC, WIDTH } from '../src/plan/timing.ts'
import type { GameData, VideoSpec } from '../src/plan/types.ts'
import { isoWeekId, parseWeekId } from '../src/plan/week.ts'

const VIDEO = path.join(import.meta.dirname, '..')
const PUBLIC = path.join(VIDEO, 'public')

interface License { source: string; license: string; commercialUse: boolean; checked: string }

/** 使う音声が、すべて「商用利用できる」と記録されているか */
export function checkAudioLicenses(plan: VideoSpec[], licenses: Record<string, License>, exists: (p: string) => boolean) {
  const problems: string[] = []
  for (const p of new Set(plan.flatMap((s) => s.audio))) {
    const l = licenses[p]
    if (!l) problems.push(`${p}: audio-licenses.json に記録がない`)
    else if (l.commercialUse !== true) problems.push(`${p}: 商用利用の確認が取れていない`)
    if (!exists(p)) problems.push(`${p}: ファイルがない（npm run audio を実行する）`)
  }
  if (problems.length) throw new Error(`音声のライセンス確認に失敗:\n  ${problems.join('\n  ')}`)
}

/** 書き出した動画が、TikTok 向けの条件を満たしているか */
function verifyVideo(file: string, expectedSec: number) {
  const ffprobe = process.env.FFPROBE || 'ffprobe'
  const out = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', file], { encoding: 'utf8' }))
  const v = out.streams.find((s: { codec_type: string }) => s.codec_type === 'video')
  const a = out.streams.find((s: { codec_type: string }) => s.codec_type === 'audio')
  const dur = Number(out.format.duration)
  const errors: string[] = []
  if (!v || v.width !== WIDTH || v.height !== HEIGHT) errors.push(`解像度が ${v?.width}x${v?.height}（${WIDTH}x${HEIGHT} のはず）`)
  if (v?.r_frame_rate !== `${FPS}/1`) errors.push(`フレームレートが ${v?.r_frame_rate}（${FPS}/1 のはず）`)
  if (!a) errors.push('音声がない')
  if (!(dur >= MIN_SEC && dur <= MAX_SEC + 0.5) || Math.abs(dur - expectedSec) > 0.5) errors.push(`長さが ${dur.toFixed(2)} 秒（${expectedSec} 秒のはず・${MIN_SEC}〜${MAX_SEC} 秒）`)
  if (errors.length) throw new Error(`${path.basename(file)} の確認に失敗: ${errors.join(' / ')}`)
  return dur
}

const postText = (s: VideoSpec) => `${s.post.caption}\n\n${s.post.hashtags.join(' ')}\n`

async function main() {
  const { values } = parseArgs({ options: { week: { type: 'string' }, only: { type: 'string' }, out: { type: 'string' } } })
  const week = values.week ?? isoWeekId(new Date())
  parseWeekId(week)
  const outDir = path.resolve(values.out ?? path.join(VIDEO, 'out', week))
  const only = values.only ? new Set(values.only.split(',').map(Number)) : null

  const dataFile = path.join(VIDEO, 'src', 'generated', 'gameData.json')
  if (!fs.existsSync(dataFile)) throw new Error('src/generated/gameData.json がない。npm run data を先に実行する')
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8')) as GameData
  const plan = buildWeekPlan(data, week).filter((s) => !only || only.has(s.index))
  if (plan.length === 0) throw new Error('作る動画がない（--only を確認する）')

  const licenses = JSON.parse(fs.readFileSync(path.join(VIDEO, 'audio-licenses.json'), 'utf8')).files as Record<string, License>
  checkAudioLicenses(plan, licenses, (p) => fs.existsSync(path.join(PUBLIC, p)))
  if (data.screens.length < 4) console.warn('注意：ゲーム画面の撮影が少ない（npm run capture）。画面紹介の動画は、出来事の絵で代わりに作る')

  fs.mkdirSync(outDir, { recursive: true })
  console.log(`週 ${week}：${plan.length} 本を ${path.relative(process.cwd(), outDir) || '.'} へ`)
  const serveUrl = await bundle({ entryPoint: path.join(VIDEO, 'src', 'index.ts'), publicDir: PUBLIC, rootDir: VIDEO })
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null

  const results: { spec: VideoSpec; file: string; seconds: number }[] = []
  for (const spec of plan) {
    const file = path.join(outDir, `${spec.slug}.mp4`)
    const started = Date.now()
    console.log(`[${spec.index}/7] ${spec.slug}（${spec.template}・${totalSeconds(spec)}秒）レンダリング開始`)
    try {
      const inputProps = spec.props as unknown as Record<string, unknown>
      const composition = await selectComposition({ serveUrl, id: spec.template, inputProps, browserExecutable })
      if (composition.durationInFrames !== spec.props.durationInFrames) throw new Error('コンポジションの長さが計画と違う')
      let last = -1
      await renderMedia({
        composition, serveUrl, inputProps, browserExecutable,
        codec: 'h264', audioCodec: 'aac', pixelFormat: 'yuv420p', crf: 20,
        outputLocation: file, overwrite: true,
        onProgress: ({ progress }) => {
          const pct = Math.floor(progress * 10) * 10
          if (pct !== last) { last = pct; process.stdout.write(` ${pct}%`) }
        },
      })
      process.stdout.write('\n')
      // 表紙（つかみの文字が出ている所）
      await renderStill({ composition, serveUrl, inputProps, browserExecutable, frame: 20, output: file.replace(/\.mp4$/, '.jpg'), imageFormat: 'jpeg', jpegQuality: 90, overwrite: true })
      const seconds = verifyVideo(file, totalSeconds(spec))
      fs.writeFileSync(file.replace(/\.mp4$/, '.txt'), postText(spec))
      results.push({ spec, file, seconds })
      console.log(`  → OK ${seconds.toFixed(1)}秒・${(fs.statSync(file).size / 1e6).toFixed(1)}MB（${((Date.now() - started) / 1000).toFixed(0)}秒かかった）`)
    } catch (e) {
      fs.rmSync(file, { force: true })
      throw new Error(`[${spec.index}] ${spec.slug} のレンダリングに失敗したので、止めます: ${(e as Error).message}`, { cause: e })
    }
  }

  const md = [`# ${week} の投稿（${results.length}本）`, '', 'TikTok への投稿は手動で行う。各動画の投稿文は、同じ名前の .txt にもある。', '']
  for (const r of results) {
    md.push(`## ${r.spec.day}曜日：${path.basename(r.file)}（${r.seconds.toFixed(1)}秒・${r.spec.template}）`, '', `つかみ：${r.spec.props.hook.replace(/\n/g, '')}`, '', '```', postText(r.spec).trim(), '```', '')
  }
  fs.writeFileSync(path.join(outDir, 'posts.md'), md.join('\n'))
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({
    week,
    videos: results.map((r) => ({
      index: r.spec.index, day: r.spec.day, template: r.spec.template, file: path.basename(r.file), seconds: Number(r.seconds.toFixed(2)),
      hook: r.spec.props.hook.replace(/\n/g, ''), caption: r.spec.post.caption, hashtags: r.spec.post.hashtags, audio: r.spec.audio,
    })),
  }, null, 2))
  console.log(`完了：${results.length} 本（${path.join(outDir, 'posts.md')}）`)
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  main().catch((e) => {
    console.error(`\n失敗: ${(e as Error).message}`)
    process.exit(1)
  })
}
