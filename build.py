"""政党クロニクルのビルド。

小さなファイルに分けたテンプレートとデータを組み立てて dist/ を作る（Python 3 の標準ライブラリだけで動く）。

- src/page.html      : ページの骨組み（/*@CSS*/ と /*@JS*/ の位置に下の2つを入れる）
- src/css/*.css      : スタイル（ファイル名の順に連結）
- src/js/*.js        : プログラム（ファイル名の順に連結）
- data/<名前>/index.json : データの目次。{"$parts": [...]} は分けたファイルを連結（配列はつなぎ、
                        オブジェクトは合わせる）、{"$items": [...]} は1ファイル1要素の配列を表す
- public/            : そのまま dist/ にコピー（_headers・404.html・og/ の画像）

出力：
- dist/index.html   : サイト本体（1ファイル）
- dist/theme/・party/・election/・data/ : 検索とSNS共有のための静的ページとデータ配布（pages.py）
- dist/sitemap.xml・dist/robots.txt

公開URLは環境変数 SITE_URL で変えられる（既定は https://seito-chronicle.michisus.co.jp）。
Google アナリティクスの測定IDは環境変数 GA_ID で変えられる（既定は下の GA_ID）。
"""
import html
import json
import os
import pathlib
import re
import shutil

root = pathlib.Path(__file__).parent
SITE_URL = os.environ.get("SITE_URL", "https://seito-chronicle.michisus.co.jp").rstrip("/")
# Google アナリティクス 4 の測定ID（環境変数 GA_ID で上書き可。空にすると計測しない）
GA_ID = os.environ.get("GA_ID", "G-2B0WVY5TKK")
dist = root / "dist"


def read(p):
    return p.read_text(encoding="utf-8")


def assemble(d, node):
    """data/<名前>/index.json の目次をたどって、分けたファイルを1つのデータに戻す。"""
    if isinstance(node, dict):
        if "$parts" in node:
            vals = [json.loads(read(d / f)) for f in node["$parts"]]
            if all(isinstance(v, list) for v in vals):
                return [x for v in vals for x in v]
            merged = {}
            for v in vals:
                merged.update(v)
            return merged
        if "$items" in node:
            return [json.loads(read(d / f)) for f in node["$items"]]
        return {k: assemble(d, v) for k, v in node.items()}
    return node


def load(name):
    d = root / "data" / name
    return assemble(d, json.loads(read(d / "index.json")))


def template():
    page = read(root / "src" / "page.html")
    css = "".join(read(p) for p in sorted((root / "src" / "css").glob("*.css")))
    js = "".join(read(p) for p in sorted((root / "src" / "js").glob("*.js")))
    assert page.count("/*@CSS*/") == 1 and page.count("/*@JS*/") == 1
    return page.replace("/*@CSS*/", css, 1).replace("/*@JS*/", js, 1)


data, gov, st = load("genealogy"), load("governments"), load("stances")
seats, records = load("seats"), load("records")
tpl = template()
j = lambda x: json.dumps(x, ensure_ascii=False)
out = (tpl.replace("/*DATA*/", j(data)).replace("/*GOV*/", j(gov)).replace("/*STANCES*/", j(st))
       .replace("/*SEATS*/", j(seats)).replace("/*RECORDS*/", j(records)).replace("%%SITE_URL%%", SITE_URL))
if not re.fullmatch(r"(G-[A-Z0-9]+)?", GA_ID):
    raise SystemExit("GA_ID の形式が正しくありません: " + GA_ID)
assert 'const GA_ID = "";' in out
out = out.replace('const GA_ID = "";', f'const GA_ID = "{GA_ID}";')
# フッターの一覧（検索エンジンがたどれる通常のリンク。テーマ・政党・選挙の要約ページとデータ）
_e = html.escape
_links = ('<p><b>テーマ別</b>：' + "・".join(f'<a href="/theme/{t["id"]}/">{_e(t["name"])}</a>' for t in st["themes"]) + '</p>'
          '<p><b>政党別</b>：' + "・".join(f'<a href="/party/{p["id"]}/">{_e(re.sub(r"（.*?）", "", p["name"]))}</a>' for p in st["parties"]) + '</p>'
          '<p><b>選挙別</b>：<a href="/election/">戦後の衆院選・参院選の一覧</a>（直近：' + "・".join(
              f'<a href="/election/{k}-{e["n"]}/">{e["date"][:4]}年{lab}</a>' for k, lab, e in sorted(
                  [("shugiin", "衆院選", x) for x in seats["elections"][-2:]] + [("sangiin", "参院選", x) for x in seats["upper"]["elections"][-2:]],
                  key=lambda z: z[2]["date"], reverse=True)) + '）・<a href="/data/">データのダウンロード</a></p>')
assert out.count("<!--@LINKS-->") == 1
out = out.replace("<!--@LINKS-->", _links)

if dist.exists():
    shutil.rmtree(dist)
dist.mkdir()
(dist / "index.html").write_text(out, encoding="utf-8")

pub = root / "public"
if pub.exists():
    shutil.copytree(pub, dist, dirs_exist_ok=True)

import pages  # noqa: E402  検索とSNS共有のための静的ページ

urls = [f"{SITE_URL}/"] + pages.build(SITE_URL, dist, data, gov, st, seats, records)

sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
sm += [f"  <url><loc>{html.escape(u)}</loc><lastmod>{data['asOf']}</lastmod></url>" for u in urls]
sm.append("</urlset>")
(dist / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")
(dist / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")

print("ok", len(out), "static pages:", len(urls) - 1)
