# Claude Code 引き継ぎメモ（どうぶつリーグ / baseball）

2026-11-03 作成。Claude Code が主担当になるための現状整理。
詳しい仕様・過去の作業ログは、ルートの `HANDOFF.md`（Gemini/Codex時代の記録、221行）と `CLAUDE.md`（構成と約束ごと）、`design/*.md` にある。このファイルは「今どうなっているか・何が未完か・次に何をするか」だけを書く。

> 注意：`docs/` は GitHub Pages の公開フォルダ。このファイルも公開される（秘密は書かない）。置き場所を変えたいときは Take に相談。

## 1. 現状（2026-11-03 時点）

- **main = `a157fc6`**（10/25 Codex「ストライクゾーンを画面幅の40%以上に保つ」）。GitHub Pages のデプロイ #88 は成功済み。`docs/index.html` は `src/` から再ビルドしても差分なし。
- 公開URL：本番 https://saboten-apps.github.io/baseball/ ／ スマホ確認版 https://saboten-apps.github.io/baseball-preview/（別リポジトリ）。
- 10/21〜25 の機能（新ストーリー全10話、各話の球場、ビースト、オンライン再戦・接戦チャレンジ、三塁打、全9種のぬいぐるみ造形）はすべて main に入っている。
- **ルートの `HANDOFF.md` / `README.md` / `AGENTS.md` には「main は未変更」「作業ブランチ `feature/story-and-mascots` 限定」という古い記述が残っている**（実際は 10/22 に Take が main 公開を承認済み。ぬいぐるみ造形も main に入っている）。
- ブランチ `stable`（戻れる印）は **`46ff18e`（10/18）のまま古い**。
- 自動チェック：`.github/workflows/check.yml`（push to main と PR で `check --full` ＋ docs の出し忘れ確認）。直近 main の check はすべて成功。

## 2. 開いているPR（4件・すべて素材追加のみ）

| PR | ブランチ | 内容 | 状態 |
|---|---|---|---|
| #1 | `gpt/baseball-promo` | プロモ画像PNG 8枚を `docs/promo/` に追加 | open・clean |
| #3 | `gpt/baseball-promo-wave2` | 第2弾 8枚（キャラ・キービジュアル・エンブレム等） | open・clean |
| #2 | `gpt/baseball-promo-wave3` | 第3弾 8枚（対決・優勝・球場・ダイブ等） | open・clean |
| #4 | `gpt/baseball-promo-wave4` | 第4弾 8枚（ストーリー場面・壁紙・告知枠） | open・clean |

- いずれも GPT(Codex) が作成。原本PNGのバイト一致をSHA-256で確認済みと書かれている。ゲーム本体のコードは触らない。
- **要判断**：1枚約2〜2.7MB × 32枚 ≒ 80MB 超が `docs/`（公開フォルダ）に入る。リポジトリが重くなり、Pages の配信対象にもなる。`docs/promo/` に置いてよいか、別の置き場（例：`design/` や外部）にするかは Take が決める。
- 4件とも同じ `docs/promo/` に別ファイルを足すだけなので、衝突はしない見込み（未確認）。マージは Take の指示があるときだけ。

## 3. その他のブランチ

| ブランチ | 状態 |
|---|---|
| `claude/tiktok-videos` | main より3コミット先行。TikTok動画の週次生成ワークフロー（別セッション「TikTok動画生成システム改善」）。検証用の push トリガーは外し済み |
| `feature/plush-shiba` | main と同一（`a157fc6`）。役目終了 |
| `feature/story-and-mascots` / `feature/review-and-pitcher` | main に取り込み済み（`107fe00` / `1c7af85`）。整理候補 |
| `cat-gloss-trial` | main より1コミット先行の試作（猫のツヤ）。未採用 |
| `cat-tabby-trial` / `gemini/review-1` / `test/infra-1` | main に取り込み済み。整理候補 |
| `ccr-3fb6b626-p7hwve` | このセッションの作業ブランチ。main と同一＋このファイル |

ブランチの削除は Take の指示があるときだけ。

## 4. 未完・未確認のこと

1. **実機確認（Take）**：Pixel 10 Pro での描画の重さ（ぬいぐるみ造形・ビースト演出・球場）、指の操作感、音量バランス、オンライン2台の通し対戦。ヘッドレス試験では出ない。
2. 10/25 のぬいぐるみ造形（全9種）の見た目は、Take の最終OKが記録に無い（「柴犬を確認してから他種へ展開」という方針で全種展開済み）。
3. 三塁打の音声は未追加（字幕のみ）。`design/voice-fix-handoff.md` と `design/triples-and-voice.md` を参照。
4. 古いドキュメントの整合（上記1章の「古い記述」）。直すのは Take が確認してから。
5. 運用ルールの食い違い：ルート `HANDOFF.md` 11章は「確認を待たず main へ直接 push してよい」、`AGENTS.md` と README は「main への push 禁止」。新しい運用（下記）に揃えたい。
6. `stable` ブランチの更新（`git push origin main:stable`）は、Take が実機で問題なしと言ってから。
7. 次の機能候補（Take は未依頼）：ストア公開準備、ペナントレース、成績記録、ホームラン競争、守備のピンチ演出。ルート `HANDOFF.md` 8章。

## 5. 次にやること（提案・どれも Take の確認が先）

1. 運用ルールを決める（`AGENTS.md` の案を別途提示済み）。
2. PR #1〜#4 の扱いを決める（`docs/promo/` に置くか、置き場を変えるか。マージは Take が指示）。
3. 古い記述の修正（README・ルート HANDOFF・AGENTS の「main は未変更」等）。
4. `check --full` を一度流して、今の main が緑であることをこちらでも確認。
5. 実機確認で出た不具合の修正（障害対応はルート `HANDOFF.md` 12章の手順）。

## 6. 作業の約束（要点）

- `src/` を直したら `node build.mjs` して `docs/` ごとコミット。`docs/index.html` と `docs/sw.js` は生成物なので手で直さない。
- push 前に `node tools/check.mjs`（オンラインに触れたら `--full`）。
- オンライン結果処理の乱数は `withSeed()` の中だけ。見た目と音に `Math.random` を使わない。
- スマホの描画負荷（影・メッシュ・大きなテクスチャ）に注意。
- main へのマージ・PR作成・deploy（公開）は Take の指示があるときだけ。作業ブランチは `claude/作業名`（指示があればそれを優先）。force push はしない。
- コードの変更は、Take が確認してから始める。

## 7. 記録（新しいものを上に）

- 2026-11-03 Claude Code：引き継ぎ開始。README・docs・直近コミット・PR #1〜#4 を読んで現状を整理し、このファイルを作成。コードは未変更。
