# Japanese IT Pathway — キャリアトーク（CADT向け）

CADTの学生向けキャリアトークのスライド（HTML）と、紹介動画の作成一式です。

## フォルダ構成
- トップ（`index.html`）は鍵なしでは「404」と表示されるだけのページです。鍵つきリンク（`…/#k=…`）で開いたときだけ、各回へのリンク集が出ます（AES-GCMで暗号化。鍵はURLの # 部分にあり、サーバーには送られません）。
- 各回のスライドは推測されにくい名前のフォルダにあります: `talk1-*/`（第1回）、`talk2-*/`（第2回）。
- リンク集の作り直し: `private/hub.html`（git管理外）を編集して `python3 tools/build_hub.py`。鍵は `private/hub.key` か環境変数 `HUB_KEY`。

## 第1回スライド（`talk1-*/`）
- `index.html` をChromeで開き、**F** で全画面。→ / Space で次へ、← で戻る、G で一覧、P で発表者ウィンドウ、B で黒画面。
- 2枚目で紹介動画（ショート版）が音つきで自動再生されます。動画をクリックで一時停止、→ で次へ（動画は止まります）。
- オンラインで見る: 鍵つきのリンク集から（検索エンジンには出ない設定です）
- 2枚目の動画は、Web用に軽くした版（`video/japanese-it-pathway-program_short.mp4`）を同梱しています。元の高画質版は **Releases** にあります。
- ネットなしで動きます（フォント・画像はすべてフォルダ内）。持ち出すときはフォルダごとコピー。
- 2026-10-27の発表では8枚（AI関連4枚・不安/サポート/コミュニティ/体験クラス4枚）を外しました。外す前の全32枚版は `index_full_2026-10-27.html`（ローカルのみ・git管理外）に保管しています。

## 第2回スライド（`talk2-*/`）「AI writes the code. What will you bring?」
- `index.html` を開いて操作は第1回と同じ（F 全画面、P 発表者ウィンドウ、N ノート、G 一覧）。全36枚・約60分（本編 約50分＋Japanese IT Pathway 約9分）。Japanese IT Pathway 部分（27〜35枚目）は Google Slides「Japanese IT Pathway Program」の内容と写真（`img/jitp/`）から作成。質問用QRは載せていません。
- 質問タイム（19枚目のQR → スマホで質問 → 20枚目のダッシュボード）はネット接続が必要です。それ以外はオフラインで動きます。
- **リハーサル**はURLに `?s=test` を付けて開く（例 `index.html?s=test`）。QRコードも同じセッションを指すので、本番（セッション `live`）のデータと混ざりません。
- イラストは `img/<名前>.jpg`（なければ `.png`）を自動で読みます。まだないものは薄い仮画像が出ます。作成指示は `img/_codex/PROMPTS.md`。
- `ask/` スマホ用の質問フォーム、`live/` ダッシュボード単体ページと共通部品（`config.js`, `live.js`, `live.css`）。

### 質問の自動分類（Supabase + gemini-decision-1）
- Supabase プロジェクト `it-pathway-live`（シンガポール）。テーブル `questions`（ダッシュボードが読む）と `questions_private`（元の文章。サービスロールのみ）。
- Edge Function `questions`（ソース: `server/supabase/functions/questions/index.ts`）が保存 → `gemini-decision-1` で8つの観点に分類＋「オープンな質問か」「本質に迫るか（0〜3）」「話題に沿っているか」「不適切か」を1回で判定 → Flash-Lite で英訳・和訳。
- **必要な設定**: Supabase ダッシュボード → Edge Functions → Secrets に `GEMINI_API_KEY`（Google AI Studio のキー）。未設定の間はキーワードによる簡易分類（画面に「keywords (backup)」と表示）。設定後、ダッシュボードの「↻ Re-sort」で分類し直せます。
- 無料プランのプロジェクトは7日間使わないと自動停止します。発表の前日にダッシュボードを開くか、Supabase で Restore してください。
- 本番データを消すとき（SQL Editor）: `delete from questions where session = 'live';`

## 紹介動画（`talk1-*/video/`）
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
