"""政党クロニクルのビルド。

data/*.json と src/template.html から dist/ を作る（Python 3 の標準ライブラリだけで動く）。
- dist/index.html   : サイト本体（1ファイル）
- dist/theme/<id>/  : テーマ別の共有用ページ（SNS用のタイトル・画像を持ち、本体の該当画面へ移動する）
- dist/party/<id>/  : 政党別の共有用ページ
- dist/sitemap.xml  : サイトマップ
- public/ の中身（_headers・robots.txt・404.html・og/ の画像）をそのまま dist/ にコピー

公開URLは環境変数 SITE_URL で変えられる（既定は https://seito-chronicle.kimizuka-006.workers.dev）。
Google アナリティクスの測定IDは環境変数 GA_ID で変えられる（既定は下の GA_ID）。
"""
import html
import json
import os
import pathlib
import re
import shutil

root = pathlib.Path(__file__).parent
SITE_URL = os.environ.get("SITE_URL", "https://seito-chronicle.kimizuka-006.workers.dev").rstrip("/")
# Google アナリティクス 4 の測定ID（環境変数 GA_ID で上書き可。空にすると計測しない）
GA_ID = os.environ.get("GA_ID", "G-2B0WVY5TKK")
dist = root / "dist"


def load(name):
    return json.loads((root / "data" / name).read_text(encoding="utf-8"))


data, gov, st = load("genealogy.json"), load("governments.json"), load("stances.json")
seats, records = load("seats.json"), load("records.json")
tpl = (root / "src/template.html").read_text(encoding="utf-8")
j = lambda x: json.dumps(x, ensure_ascii=False)
out = (tpl.replace("/*DATA*/", j(data)).replace("/*GOV*/", j(gov)).replace("/*STANCES*/", j(st))
       .replace("/*SEATS*/", j(seats)).replace("/*RECORDS*/", j(records)).replace("%%SITE_URL%%", SITE_URL))
if not re.fullmatch(r"(G-[A-Z0-9]+)?", GA_ID):
    raise SystemExit("GA_ID の形式が正しくありません: " + GA_ID)
assert 'const GA_ID = "";' in out
out = out.replace('const GA_ID = "";', f'const GA_ID = "{GA_ID}";')

if dist.exists():
    shutil.rmtree(dist)
dist.mkdir()
(dist / "index.html").write_text(out, encoding="utf-8")

pub = root / "public"
if pub.exists():
    shutil.copytree(pub, dist, dirs_exist_ok=True)

SITE = "政党クロニクル"


def share_page(path, title, desc, hash_, image):
    url = f"{SITE_URL}/{path}/"
    target = f"/#{hash_}"
    t, d = html.escape(f"{title} ｜ {SITE}"), html.escape(desc)
    page = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{d}">
<meta property="og:type" content="article">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE_URL}/og/{image}.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:site_name" content="{SITE}">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}">
<meta http-equiv="refresh" content="0; url={target}">
<script>location.replace({json.dumps(target)});</script>
</head>
<body>
<p><a href="{target}">{html.escape(title)}（{SITE}）を開く</a></p>
</body>
</html>
"""
    p = dist / path
    p.mkdir(parents=True, exist_ok=True)
    (p / "index.html").write_text(page, encoding="utf-8")
    return url


urls = [f"{SITE_URL}/"]
for t in st["themes"]:
    urls.append(share_page(f"theme/{t['id']}", f"{t['name']}：各党の立場",
                           f"問い：{t['question']}。2016〜2026年の国政選挙での各党の立場を、党の資料の文言と出典つきで比べられます。",
                           f"seisaku-{t['id']}", f"theme-{t['id']}"))
for p in st["parties"]:
    urls.append(share_page(f"party/{p['id']}", f"{p['name']}の政策の立場",
                           f"{p['name']}が2016〜2026年の国政選挙で、消費税・原発・憲法などのテーマにどんな立場をとってきたかを、党の資料の文言と出典つきでたどれます。",
                           f"seito-{p['id']}", f"party-{p['id']}"))

sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
sm += [f"  <url><loc>{html.escape(u)}</loc><lastmod>{data['asOf']}</lastmod></url>" for u in urls]
sm.append("</urlset>")
(dist / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")
(dist / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")

print("ok", len(out), "share pages:", len(urls) - 1)
