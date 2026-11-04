# どうぶつベースボール

スマホのブラウザで遊べる、どうぶつたちの3D野球アクション。

- **ストーリー**：仲間と野球をしながら、自分たちの出生と選択をたどる全10話（試合・研究施設の調査・ビーストモード・後日談）
- **フリー対戦**：CPU相手に打つ・投げる
- **オンライン対戦**：部屋番号で友達と1対1（3回表裏）

## 遊び方

- 打つ：ボールがミットに届く直前に、ボールが通る位置をタップ
- 投げる：指を弾く向きで球種、指を離した位置でコース、弾く速さで球速
- 作戦：投球前に画面下のボタンから盗塁・エンドラン・バント・スクイズ

## 開発

現在の新ストーリー・モデル変更は作業ブランチ `feature/story-and-mascots` 上の開発版です。main への変更・push・merge・本番公開は、Take のプレイ確認後の明示的な指示まで行いません。

Node.js 24 と Chrome/Chromium を使います。Chromium の場合は `export CHROME_PATH=/usr/bin/chromium` を設定してください。
開発版の確認は `node build.mjs` の後、`python3 -m http.server 8000 --directory docs` で配信します。
`node tools/build-preview.mjs` で画像・音声込みの単一HTML `dist/animal-baseball-playtest.html` を生成できます。PCのChrome/Edgeで開くプレイ確認用です。
「ストーリー」から続き・章選択・キャラクター確認を開けます。進行は話ごとに保存され、旧版の進行は保持したまま新作の第1話から始まります。


```
npm install                               # 初回のみ（開発・テスト用の依存を入れる）
git config core.hooksPath .githooks       # 初回のみ（pre-push フックを有効化。clone しただけでは有効にならない）
node build.mjs                            # src/ から docs/index.html と dist/artifact.html を作る
node tools/check.mjs                      # ビルド・構文・乱数検査＋起動スモーク＆全モード自動テスト
node tools/check.mjs --full               # 上記に加えて thr / hbp / tac7 / online-beast の詳細テストも実行
```

> **注意**：`.githooks/pre-push`（`git push` 前に自動で `node tools/check.mjs` を走らせて失敗時に push を止める仕組み）は、`git clone` しただけでは有効になりません。クローン後に必ず `git config core.hooksPath .githooks` を1回実行してください。

公開は GitHub Pages（main ブランチの `/docs`）。構成と約束ごとは `CLAUDE.md` を参照。

## スマホで確認する開発版

ストーリー各話の球場と実装・確認方法は [design/story-stadiums.md](design/story-stadiums.md) を参照。

`node tools/build-mobile-preview.mjs` で `dist/mobile-preview/` と `dist/mobile-preview.zip` を作れます。これは本番と別のHTTPS URLで配信するPWA確認版です。AndroidのChrome、iPhoneのSafariでURLを開き、ブラウザの「ホーム画面に追加」から使います。HTMLファイルをスマホのファイルアプリから開く配布方法には依存しません。

GitHub Pagesを使う場合は、本番の `baseball` とは別の `baseball-preview` リポジトリを用意し、`preview` ブランチのルートへ生成されたファイルを置く構成を推奨します。現在の本番Pagesのソース設定は変更しません。`.nojekyll` は生成物に含まれます。公開操作はビルドスクリプトに含めていません。

同じ `saboten-apps.github.io` 内でも本番とデータが混ざらないよう、確認版の保存キー・対戦ルーム・共有URLと、サービスワーカーのキャッシュを分離しています。最初にオンラインで開くとキャッシュされ、次回はストーリーをオフラインでも開始できます。

検証：`CHROME_PATH=/usr/bin/chromium node tools/test/mobile-preview.mjs`（タッチ対応ChromiumでAndroidとiPhone相当の画面を検証。Safari実機の検証を意味しません）。

## 実況の音声ファイル

実況は、`docs/audio/<id>.mp3` があればそのファイルを再生する（無いセリフは字幕だけ）。ファイルを足したら `node build.mjs` で一覧が更新される。
セリフの一覧は `node tools/export-voice-script.mjs` で `voice-script.csv`（id・セリフ・読み方）に出る。
AI音声などで作ったファイルを id の名前（例 `hr_1.mp3`）で `docs/audio/` に置いてコミットすればよい。

## スマホにアプリとして入れる

https://baseball.umimachilab.com/ をスマホのブラウザで開き、Chrome なら メニュー → 「アプリをインストール」（または「ホーム画面に追加」）。iPhone の Safari は 共有 → 「ホーム画面に追加」。全画面で開き、一度開いたあとは電波が弱くても起動する（オンライン対戦は通信が必要）。

## クレジット

- 投球・打撃フォームは CMU Graphics Lab Motion Capture Database のデータをもとにしています。The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.
- 効果音の一部は「効果音ラボ」（https://soundeffect-lab.info/）の素材です。
- 実況の声は Gemini TTS、試合曲は Lyria で生成しています。ストーリーBGMは本作用のオリジナル曲（合成音源）です。
