# どうぶつリーグ (yakyu)　※旧名「ナイター対決」

スマホのブラウザで遊ぶ3D野球アクション。Three.js (r149, CDN) を使い、ビルド後は1枚のHTMLになる。

## 構成

- `src/style.css` — 画面のスタイル
- `src/body.html` — スコアボード、キャンバス、オーバーレイ、フッターのマークアップ
- `src/js/*.js` — ゲーム本体。**ファイル名順に連結して、1つのIIFEの中で同じスコープを共有する**
  （`01-core.js` が `(() => {` を開き、`09-main.js` が `})();` で閉じる。ES modules ではない）
  - `01-core.js` 定数、効果音、球種、試合状態、カウント/走塁ルール、当たり判定、投球、結果処理
  - `02-stadium.js` レンダラー、カメラ、球場、照明、ボール、マーカー
  - `02-story-stadium.js` 各話の3D背景・配色・照明。通常球場への復帰、背景のキャッシュと共有描画（仕様は `design/story-stadiums.md`）
  - `03-motion.js` 投球フォームのモーションキャプチャ（CMU mocap 124_01。`tools/bvh-joints.py` → `tools/make-motion.py` で生成。手で編集しない）
  - `03-motion-bat.js` 打者の体の動き（CMU mocap 124_07 スイング・124_08 バント。`tools/make-bat-motion.py` で生成）。手とバットはスイング計画のまま
  - `03-mascot-heads.js` 提供HTMLから適合したマスコットの頭部造形。`03-players.js` 動物の選手モデル、ポーズ（打者・投手・野手）、バット。手前の打者の頭部だけ縮小/配置調整して左右のストライクゾーンを確保（batterHeadFactor / fitBatterHead）。投手は元の頭部比率を使う。
  - `03-mascot-plush.js` 参考画像に基づく柴犬だけのぬいぐるみ試作。共有ジオメトリ/素材、太い茶色の輪郭、短い丸い手足。従来骨格の手/足先を使い、他種へ戻すと元のメッシュを復帰。柴犬打者では頭身を維持し配置とカメラでゾーンを確保する。
  - `04-story-data.js` 全10話の定義、`04-story-flow.js` 章進行・探索・救援・ビーストモード、`04-story-scenes.js` 2D場面演出・終幕・モデル確認、`04-story.js` 共通メニューと会話。第9話は3回表裏（延長5回）、相手 `alien`。ストーリー専用の混成打順は `STORY_BAT`。旧 `yakyu-progress` を保ち、新作は `animal-baseball-story-v2` に保存する
  - `04-beast-effects.js` 全ビースト発動場面のカットイン・合成咆哮・持続オーラ・打撃衝撃。試合時計と判定乱数から独立。仕様は `design/beast-effects.md`。
  - `05-tactics.js` 作戦（盗塁・エンドラン・バント・スクイズ）、牽制
  - `06-online.js` オンライン対戦（Supabase Realtime）
  - `06-online-review.js` オンラインの接戦判定と任意の見逃しストライク/ボールへのチャレンジ。共通で各2回・成功時保持、境界付近の投球は共有seedで50%変更、申請権のスキップ、記録した到達時刻と3Dスロー再現、投球ゾーン図、得点/アウトの訂正、再判定世代による遅延通信排除。仕様は `design/online-review.md`。
  - `07-roster.js` 各チームの打順・投手陣（ミート/パワー、球速/制球/変化/スタミナ、左右・両打ち、★スター、投手の持ち球 pt、走力 run・捕手の肩 arm・守護神 closer・代打の切り札 ph）、疲労、継投。G.bases は空=0、走者がいれば その走者の走力(1-5)。サイコロ（奇数の回）・ハプニング（回の頭に30%：風・雨・ウェーブ・照明トラブル。オンラインは共有シードで同じものが起きる）・技（会心・消える魔球）は 01-core。どうぶつ固有スキルは `TRAIT`（チーム単位の常時効果。ストーリーでは無効。`trT('bat'|'fld')` で参照）。ギミックのオン・オフは `OPT`（localStorage 'yakyu-opts'）を `opt(k)` で読む。オンラインはホストの設定を start メッセージで共有。盗塁（CPUが投げるとき）は `stealPress` で投手モーションの k からスタートの良し悪しを決め、早すぎると牽制。ゴロでランナーがいるとき（CPU対戦・守備側のみ、オンラインは対象外）は `thrWanted`→`thrStart` でスローになり、`pickThrow`/`thrResolve`（05-tactics 末尾）で送球先を選ぶ（`play.pend` の間は nextAt=Infinity。時間切れは `stepThrowPick`）。デッドボール：見逃した球が打者の体の位置（`hbpCheck`）に来ると `c.hbp`（オンラインは結果メッセージに載る）。同じ投手が2個目で乱闘（`brawl`、投手は `G.eject`→`applyEject` で退場・交代。ストーリーは退場なし）。打者のタイムは `timeOut`（オンラインは1試合3回、'time' メッセージ）。左投手・左打者は右用の動きを x 反転して描く
  - `08-commentary.js` 実況（画面下のテロップ + 録音音声 docs/audio。セリフ表は LINES）。乱数は専用生成器を使うこと（withSeed中に呼ばれてもずれない）
  - `09-main.js` 打球、毎フレーム更新、カメラ、入力、起動
- `docs/sfx/*.bin` — 効果音ラボの打球音・ミット音・スライディング音（`tools/make-sfx.py` が mp3 を XOR で固定化して作る。元の mp3 はコミットしない。サイトの規約: 商用可・クレジット不要・AI学習利用禁止・素材ファイルの再配布禁止）。`01-core.js` の `sfxLoad`/`playRec` で再生。音まわりに Math.random は使わず `sfxRnd` を使う
- `build.mjs` — `node build.mjs` で `docs/index.html`（GitHub Pages 公開用）と `dist/artifact.html`（Claude内プレビュー用）を作る
- `docs/` — GitHub Pages の公開フォルダ（ビルド結果をコミットする）。アプリ化（PWA）用の `manifest.webmanifest` と `sw.js` もビルドで作られる。`docs/icons/` のアイコンは `python3 tools/make-icons.py` で作る。`docs/audio/<id>.mp3` を置いてビルドすると、実況の声として自動で使われる（スマホの機械音声は使わない）
- `docs/story/` — 各話10枚・終幕3カット・襲来/覚醒4カット・第1話の跳躍1枚の全18枚（圧縮WebP）。スマホ確認版には `tools/build-preview.mjs` が埋め込む。台詞の第3要素にsceneを指定すると会話中に絵が切り替わる。山場はstory-spotlightクラスで絵を拡大し、BGMを下げ、音楽オン時だけ短い低音を鳴らす。終幕の風船はSVGで一度だけ上昇。意図/生成記録は `design/story-plot.md` と `design/story-art-prompts.md`。ビースト発動後の最終戦は10点差コールド。

## 動作確認

- `docs/video/` — Take提供のGemini生成動画を襲来10秒・覚醒約6.7秒に分けたMP4。会話配列の第4要素で動画キーを指定。明示再生/動画なし/スキップ/失敗時の挿絵復帰を備え、単一HTMLにも埋め込む。素材と圧縮条件は `design/story-video.md`。

- `tools/test/` にヘッドレスChromiumの確認スクリプトがある（手順は `tools/test/README.md`）。ロジックを変えたら `thr.js`・`hbp.js`、オンラインに関わるなら `tac7.js`（SAME/DIFF）を回す

## 約束ごと

- `src/` を編集したら必ず `node build.mjs` を実行して `docs/index.html` も更新してからコミットする
- 新しいファイルは連結順を意識して番号を付ける。トップレベルで他ファイルの `const` を使うと読み込み順の問題が出るので、関数の中で参照する
- ワールド座標はメートル。本塁前端が z=0、投手方向が -z、カメラ側が +z
- スマホ（特に Pixel 10 Pro）で描画が落ちたことがあるので、重い処理（影、大きなテクスチャ、メッシュ数）を増やすときは注意する
- オンライン対戦の判定は打者側の端末が行い、結果と乱数シードを相手に送る。結果処理の乱数は `withSeed()` の中で引くこと（両端末で同じ結果になる）

オンライン隠しコマンド：試合中メニュー見出し5回タップ→BEAST入力（PCはBEASTキー入力も可）。要求を共有し、次の投球に添えたチーム別状態で確定する。詳細は `design/online-beast.md`、2タブ同期試験は `node tools/test/online-beast.mjs`。終了・退出・新規試合でリセットし、ストーリーのコールド条件はオンラインに適用しない。
