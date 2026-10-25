# Japanese IT Pathway — キャリアトーク（CADT向け）

CADTの学生向けキャリアトークのスライド（HTML）と、紹介動画の作成一式です。

## スライド
- `index.html` をChromeで開き、**F** で全画面。→ / Space で次へ、← で戻る、G で一覧、P で発表者ウィンドウ、B で黒画面。
- 2枚目で紹介動画（ショート版）が音つきで自動再生されます。動画をクリックで一時停止、→ で次へ（動画は止まります）。
- オンラインで見る: https://tomy1031.github.io/japanese-it-pathway-talk/ （検索エンジンには出ない設定です）
- 2枚目の動画は、Web用に軽くした版（`video/japanese-it-pathway-program_short.mp4`）を同梱しています。元の高画質版は **Releases** にあります。
- ネットなしで動きます（フォント・画像はすべてフォルダ内）。持ち出すときはフォルダごとコピー。

## 紹介動画（`video/`）
- `video/src/build.py` — 動画を組み立てるスクリプト（ffmpeg-full が必要）。
  - ロング版: `python build.py`
  - ショート版: `VARIANT=short python build.py`
  - MPTCを文字で出す版: `MPTC=text`、後半ピアノ: `--remix --piano`
  - 字幕・音の差し替えだけ: `--remix`（映像の書き出しを省略）
- `video/src/titles.py` — 字幕・章タイトル・パネルなどの文字デザイン（ASS）。
- ナレーション: Gemini 3.8 Flash TTS（声 Charon）。1日の回数制限があるため、台本をまとめて2回で生成し、文ごとに切り分けたもの（`video/src/narration/`, `video/short/narration/`）。
- 学生スピーチ・写真・動画の元素材は `~/Downloads/CADT JapaneseIT Pathway動画` を参照します（このリポジトリには入っていません）。
- BGM: Pixabay（NastelBom「Corporate Music」 https://pixabay.com/music/corporate-corporate-corporate-music-602439/ 、alex-morgan「Calm Piano」 https://pixabay.com/music/modern-classical-calm-piano-541028/ ）。Pixabay Content License により元ファイル単体の再配布はできないため、このリポジトリには入れていません。作り直すときは上のページから `video/src/music/` にダウンロードしてください。

## 主な出典（スライド内にも記載）
- METI（2019）IT人材需給、Human Holdings（2024）調査、MHLW 賃金構造基本統計調査 2025、Paylab Cambodia、出入国在留管理庁 在留外国人基礎調査 FY2025、TokyoDev。為替 ¥157 = $1（2026年9月）。
