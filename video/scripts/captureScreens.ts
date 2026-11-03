// ゲーム本体の実際の画面を、スマホの縦画面で撮る。ゲームは操作するだけで、変更しない。
// ゲームのテスト用の仕組み（tools/test/lib.mjs・make-test-page.mjs）を使い、ヘッドレス Chrome で動かす。
// 使い方：リポジトリ直下で node build.mjs && node tools/test/make-test-page.mjs のあと、このフォルダで node scripts/captureScreens.ts
//   Chrome の場所は環境変数 CHROME_PATH（なければ、システムの Chrome）。
// 出力：public/generated/screens/*.png と screens.json（撮れた画面の一覧）
// メニューと試合中の画面が撮れなければ、失敗として止まる（それ以外は撮れた分だけ使う）。
import fs from 'node:fs'
import path from 'node:path'
import type { ScreenShot } from '../src/plan/types.ts'

const VIDEO = path.join(import.meta.dirname, '..')
const ROOT = path.join(VIDEO, '..')
const OUT = path.join(VIDEO, 'public', 'generated', 'screens')
const REQUIRED = ['menu', 'ingame']

interface Page {
  goto(url: string): Promise<unknown>
  click(sel: string): Promise<void>
  evaluate<T = unknown>(fn: unknown, arg?: unknown): Promise<T>
  waitForTimeout(ms: number): Promise<void>
  waitForFunction(fn: unknown, arg?: unknown, opts?: { timeout?: number }): Promise<unknown>
  screenshot(opts: { path: string }): Promise<unknown>
}
interface Lib { launchBrowser(): Promise<{ b: { newPage(o: unknown): Promise<Page>; close(): Promise<void> }; url: string }> }

async function main() {
  if (!fs.existsSync(path.join(ROOT, 'tools', 'test', 'game.html'))) {
    throw new Error('tools/test/game.html がない。リポジトリ直下で node build.mjs && node tools/test/make-test-page.mjs を先に実行する')
  }
  const lib = (await import(path.join(ROOT, 'tools', 'test', 'lib.mjs'))) as Lib
  fs.rmSync(OUT, { recursive: true, force: true })
  fs.mkdirSync(OUT, { recursive: true })
  const shots: ScreenShot[] = []
  const { b, url } = await lib.launchBrowser()
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: 'ja-JP' })
    const shot = async (key: string, label: string, wait = 900) => {
      await p.waitForTimeout(wait)
      await p.screenshot({ path: path.join(OUT, `${key}.png`) })
      shots.push({ key, label, src: `generated/screens/${key}.png` })
      console.log('撮影', key)
    }
    const step = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn()
      } catch (e) {
        if (REQUIRED.includes(name)) throw e
        console.warn(`撮影できなかった（省略）: ${name}: ${(e as Error).message.split('\n')[0]}`)
      }
    }

    await p.goto(url)
    await step('menu', () => shot('menu', 'メニュー', 1800))
    await step('team', async () => {
      await p.click('#go2')
      await shot('team', 'チーム選び', 600)
      await p.click('#goBtn')
      await p.waitForTimeout(400)
    })
    await step('ingame', async () => {
      await p.click('#goBtn')
      await p.waitForTimeout(300)
      await p.click('#go2')
      await p.waitForFunction('window.__dbg && window.__dbg.phase === "fly"', null, { timeout: 40000 })
      await shot('ingame', '試合中', 250)
    })
    await step('hr', async () => {
      // 撮影のあいだに球が通り過ぎるので、次の球が飛んでくるのを待ち、すぐ打球の結果を与える
      await p.waitForTimeout(500)
      await p.waitForFunction('window.__dbg && window.__dbg.phase === "fly"', null, { timeout: 40000 })
      await p.evaluate("window.__dbg.hit({kind:'play',q:0.95,dir:-10,ev:175,launch:30,dist:125,res:'ホームラン',bases:4})")
      await shot('hr', 'ホームラン！', 1500)
    })
    await step('story', async () => {
      await p.goto(url)
      await p.waitForTimeout(1200)
      await p.evaluate('window.__dbg.showStage(0)')
      await shot('story', 'ストーリー', 1200)
    })
  } finally {
    await b.close()
  }
  fs.writeFileSync(path.join(OUT, 'screens.json'), JSON.stringify(shots, null, 1))
  console.log(`画面 ${shots.length} 枚 → ${path.relative(process.cwd(), OUT)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
