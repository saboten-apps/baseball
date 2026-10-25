# 動作確認スクリプト（ヘッドレス Chrome / Node.js のみ・Python 不要）

`dist/artifact.html` をテスト用に加工（`window.__dbg` のデバッグ用フックを足し、Supabase をモックに差し替え）して、`playwright-core`（システムの Chrome）と内蔵ローカル HTTP サーバー（`tools/test/lib.mjs`）で動かす。
ゲーム本体には入らない（`tools/` はビルド対象外）。

## 準備（初回のみ）
    npm install                              # devDependencies (playwright-core, three@0.149.0) を入れる（ブラウザのダウンロードはしない）
    git config core.hooksPath .githooks      # pre-push フックを有効化（clone しただけでは有効にならないため必ず実行）

## 使い方
    node tools/check.mjs                     # 推奨：ビルド → 構文・乱数チェック → game.html 生成 → smoke.mjs を一括実行
    node tools/check.mjs --full              # 上記に加えて thr.js / triples.mjs / hbp.js / tac7.js / online-beast.mjs も一括実行

### 個別に動かす場合
    node build.mjs                           # まず本体をビルド（dist/artifact.html ができる）
    node tools/test/make-test-page.mjs       # tools/test/game.html を作る（src を変えるたびにやり直す）
    node tools/test/smoke.mjs                # 起動スモーク＆全モード（メニュー・ストーリー全10話・CPU・練習・オンライン・整合・リセット漏れ）テスト
    node tools/test/thr.js                   # 送球先の選択（満塁・1塁・3塁など）
    node tools/test/triples.mjs              # 深い左右中間の三塁打、走力・外野の肩、走者得点、単打/HRとの分離（--fullにも含む）
    node tools/test/ball-contact.mjs          # ボール球の距離別ヒット低下・上下左右・CPU・ゾーン内維持（--fullにも含む）
    node tools/test/hbp.js                   # デッドボール→乱闘→投手交代（スクショ bw-*.png）
    node tools/test/faces2.js                # 顔の表情の確認画像（f2-*.png）
    node tools/test/ingame.js                # 守備側の通常画面とホームラン（ig-*.png）
    node tools/test/ui.js                    # メニュー〜試合開始〜ホームラン〜守備のスクショ
    node tools/test/tac7.js                  # オンライン2タブの同期確認（SAME/DIFF）
    node tools/test/online-rematch.mjs        # 同意・先後交代・初期化・前試合の通信排除・再戦後の投球同期・退出
    node tools/test/online-review.mjs         # 一塁/盗塁/本塁の精密再判定・3Dリプレイ3サイズ・境界50%/三振/押し出し取消・スキップ同期/共通回数・遅延投球取消・再戦初期化（--pitch-onlyで投球/スキップだけ）
    node tools/test/pitcher-clearance.mjs     # 投手9種×通常/ビースト×投球4姿勢×3画面幅の頭部とゾーンの非重複・スクショ
    node tools/test/batter-clearance.mjs      # 打者9種×左右×通常/ビースト×構え4姿勢×3画面幅の頭部とゾーンの非重複・スクショ
    node tools/test/plush-shiba.mjs           # 全9種のぬいぐるみ表示・3サイズ・回転・種別切替
    node tools/test/beast-effects.mjs         # 獣化カットイン3サイズ・軽減設定・第8話の実覚醒・打撃衝撃・終了時解除
    node tools/test/stadium.mjs              # 10章の球場・覚醒照明・寸法保持・背景再利用・通常球場復帰・3画面サイズ

スクショは実行したフォルダに出る。`__dbg` のフックは `tools/test/make-test-page.mjs` の先頭にある
（`hit(c)` で打球結果を強制、`pitch()` で1球投げる、`ff()` で投球・待機時間を即座に早送り、`gopit()` で守備側で開始、`face(team, expr)` で顔の確認 など）。
環境変数 `CHROME_PATH` で Chrome の実行ファイルパスを、`THREE_JS` で `three.min.js` の場所を変えられる。

`story.mjs` は smoke から実行される新ストーリーの回帰テストです。10話通し・探索の記録確認・救援の失点・延長引き分けからの再挑戦・ビーストモード・無音の終幕・旧セーブ分離・再読込・9種のモデルを確認します。画像は `/tmp/baseball-*.png` に出力します。実機の操作感とリアルタイムの外部オンライン対戦は別途確認が必要です。

実ポインター操作と配布用HTMLの確認：`node tools/build-preview.mjs` の後に `CHROME_PATH=/usr/bin/chromium node tools/test/presentation.mjs`。クラウドの管理ポリシーで file:// を開けないため、単一HTMLをHTTPで配信し他のHTTP通信を遮断して検証します。

スマホ用PWA：`node tools/build-mobile-preview.mjs` の後に `CHROME_PATH=/usr/bin/chromium node tools/test/mobile-preview.mjs`。タップでの画面遷移、スワイプ投球、本番保存キーの保持、サービスワーカーによるオフライン再起動を確認します。実際のSafariや端末へのインストールは実機確認が必要です。

挿絵・会話と新ルール：`node tools/test/story-design.mjs`。320×568・390×844・1280×800で画像の読み込み、文字と絵の分離、ボタンの収まり、前章の一時停止後も初球が自動で来ることを確認。ビースト未発動・9点差・発動後10点差の勝ち/負けを分けてコールド判定を確認します。

終幕の演出：`node tools/test/ending-design.mjs`。3サイズで街・跳躍・手元の画像読込とレイアウト、風船の一方向の上昇、無音、動き軽減設定、再プレイ時のリセットを確認します。

山場と文字：`node tools/test/story-peaks.mjs`。320/390/1280幅でタイトルの単語内改行なし・メニュー全ボタンの収まり、襲来2カット、実打席後の覚醒3カットと発動/試合復帰、スキップと動き軽減を確認します。

動画：`node tools/test/story-movies.mjs`。3サイズで実再生/終了/スキップ/覚醒後の挿絵接続/音声オフ/章変更の破棄/読込失敗時の進行を確認。ローカルサーバーはMP4の範囲読込にも対応。試験環境のシークが待機する場合があるため、終了判定は実際に最後まで再生して検証する。`mobile-preview.mjs` ではオフラインの埋込MP4も再生する。

第8話の覚醒前は投球側で、野球星人がコース・球種に関わらず3球連続でホームランを打つ。3本目の後に覚醒会話・任意動画・意思決定へ進み、打撃側の新しい挑戦へ切り替える。前半の3失点は得点目標へ加算せず、覚醒後1点でクリア。再挑戦は投球からやり直す。`story-opening.mjs` は中央・隅・大きく外れたボール球を実際に投げ、各HRと3本目だけでの覚醒開始を検証する（smoke/story-peaks/story-moviesから使用）。

ストーリー音楽の仕上げ：6曲のオリジナル合成BGMを場面別に再生。曲と生成手順は `design/story-music.md`、検証は `node tools/test/story-music.mjs`。`node tools/build-mobile-preview.mjs` 後の `node tools/test/story-music.mjs --preview` では、外部素材通信を遮断して配布HTML内の全6曲を実デコードする。街から最後の問いまでは無音を維持。

オンライン隠しコマンド：試合中メニュー見出し5回タップ→BEAST入力（PCはBEASTキー入力も可）。要求を共有し、次の投球に添えたチーム別状態で確定する。詳細は `design/online-beast.md`、2タブ同期試験は `node tools/test/online-beast.mjs`。終了・退出・新規試合でリセットし、ストーリーのコールド条件はオンラインに適用しない。

`tac7.js` は同期検証に不要な3D描画とBGMをテストフックで省略し、投球の実時間・作戦・通信処理を維持する。タイムアウト時は両端末のロビー状態を出力し、失敗時もブラウザを閉じる。
