# 政党クロニクル ― 戦後の政党と、公約のその後

戦後の政党の結成・合流・分裂の系譜と、2016〜2026年の国政選挙での各党の政策の立場、公約のその後を、出典つきでまとめたサイトです。

- サイト：https://seito-chronicle.kimizuka-006.workers.dev/
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

| パス | 内容 |
|---|---|
| `data/genealogy.json` | 政党の系譜（結成・合流・分裂、出典） |
| `data/governments.json` | 政権と与党の構成 |
| `data/stances.json` | テーマ・区分・各党の立場（党の資料の文言と出典）、確認できなかったマスの理由 |
| `data/records.json` | 表明とその後の記録 |
| `data/seats.json` | 衆院選・参院選の党派別当選人数、各選挙の背景・論点 |
| `src/template.html` | サイト本体のテンプレート（HTML・CSS・JavaScript） |
| `build.py` | `dist/` を作るビルド（Python 3 の標準ライブラリのみ） |
| `public/` | そのまま公開するファイル（`_headers`、`404.html`、共有用画像 `og/`） |
| `tools/make-og.js` | 共有用画像を作るスクリプト（Node.js と Playwright が必要） |

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

## 公開（Cloudflare Workers の静的アセット）

- ビルドコマンド：`python3 build.py`
- デプロイコマンド：`npx wrangler deploy`（設定は `wrangler.jsonc`。`dist/` をそのまま公開）
- 変数（独自ドメインのとき）：`SITE_URL`

アクセス解析（Google アナリティクス 4）の測定IDは `build.py` の `GA_ID`（または環境変数 `GA_ID`）で設定します。空にすると何も送信しません。公開先（https の本番ドメイン）以外では読み込みません。

## ライセンス

- 文章とデータ：CC BY 4.0（[LICENSE-CONTENT.md](LICENSE-CONTENT.md)）
- プログラム：MIT（[LICENSE](LICENSE)）
