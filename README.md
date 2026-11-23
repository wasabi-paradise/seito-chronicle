# 政党クロニクル ― 政党の政策・議席・ルーツがわかる

戦後の政党の結成・合流・分裂の系譜と、2016〜2026年の国政選挙での各党の政策の立場、公約のその後を、出典つきでまとめたサイトです。

- サイト：https://seito-chronicle.michisus.co.jp/
- 運営：Michisus

## 方針

- 記述は出典に書かれている範囲にとどめ、推測や独自の解釈は加えません。各項目に出典（種類つき）を示します。
- 政策の立場は、党の公約・公式資料・党が回答したアンケートだけを根拠にします。
- 「表明とその後」の記録は、政府・国会・政党の一次資料を中心に、日付などの確認に報道機関の記事や学術論文も使います。まとめ記事・個人のブログ・Wikipedia は使いません。
- 区分の決め方は、サイトの各テーマの説明と「立場の決め方」に載せています。
- 資料の検索・抜き出し・照合には AI（Anthropic 社の Claude）を使っています。引用は出典の原文と照合したうえで掲載しています。

## 誤りの報告

[Issues](https://github.com/wasabi-paradise/seito-chronicle/issues) で受け付けています。該当する画面のURL（マスごとのリンクを「このマスのリンクをコピー」で取れます）と、根拠となる資料のURLを添えてください。いただいた指摘は一次資料で確認し、訂正した内容と日付は同じ場所で公開します。

## 構成

ふだんの修正が小さなファイル1〜2個で済むように、テンプレートとデータを役割ごとに分けています。ビルド（`build.py`）がこれらを組み立てて、1つの `dist/index.html` にします。

| パス | 内容 |
|---|---|
| `src/page.html` | ページの骨組み（HTML）。`/*@CSS*/` と `/*@JS*/` の位置に下の2つが入る |
| `src/css/*.css` | スタイル。ファイル名の順に連結 |
| `src/js/*.js` | プログラム。ファイル名の順に連結（01 初期化・アクセス解析・系譜図の配置 … 08 起動） |
| `data/genealogy/` | 政党の系譜（結成・合流・分裂、出典）。`index.json` が目次、`parties-NN.json` が政党 |
| `data/governments/` | 政権と与党の構成 |
| `data/stances/` | テーマ・区分・各党の立場。立場は `stances-<テーマ>.json`、確認できなかったマスは `nodata-<テーマ>.json`、出典は `sources-NN.json` |
| `data/records/` | 表明とその後の記録 |
| `data/seats/` | 党派別当選人数と各選挙の背景・論点。衆院選は `shugiin-<回>.json`、参院選は `sangiin-<回>.json` |
| `public/` | そのまま公開するファイル（`_headers`、`404.html`、共有用画像 `og/`） |
| `tools/make-og.js` | 共有用画像を作るスクリプト（Node.js と Playwright が必要） |

データの目次（`data/<名前>/index.json`）の書き方：`{"$parts": ["a.json", "b.json"]}` は分けたファイルを順につなぐ（配列は連結、オブジェクトは合わせる）、`{"$items": [...]}` は1ファイルに1要素ずつ入った配列を表します。新しいファイルを足したときは目次にも加えてください。

## ビルド

```sh
python3 build.py              # dist/ ができる
SITE_URL=https://example.jp python3 build.py   # 独自ドメインで公開するとき
```

共有用画像を作り直すとき（テーマや党を追加したとき）：

```sh
npm install playwright && npx playwright install chromium
node tools/make-og.js
```

## 公開（Cloudflare Pages）

- ビルドコマンド：`python3 build.py`
- 出力ディレクトリ：`dist`
- 環境変数：`SITE_URL=https://seito-chronicle.michisus.co.jp`
- 独自ドメイン：`seito-chronicle.michisus.co.jp`（DNS に CNAME `seito-chronicle` → `seito-chronicle.pages.dev.`）

アクセス解析（Google アナリティクス 4）の測定IDは `build.py` の `GA_ID`（または環境変数 `GA_ID`）で設定します。空にすると何も送信しません。公開先（https の本番ドメイン）以外では読み込みません。

## ライセンス

- 文章とデータ：CC BY 4.0（[LICENSE-CONTENT.md](LICENSE-CONTENT.md)）
- プログラム：MIT（[LICENSE](LICENSE)）
