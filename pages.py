"""検索とSNS共有のための静的ページ（build.py から呼ぶ）。

アプリ（index.html）と同じデータから、テーマ・政党・選挙ごとの要約ページと、データの配布ページを作る。
どのページも、全員に同じ HTML を返し、自動で別の場所へ移動しない。アプリへは通常のリンクで案内する。

- /theme/ と /theme/<id>/        : テーマごとの各党の立場（党の資料の文言と出典）
- /party/ と /party/<id>/        : 政党ごとのテーマ別の立場
- /election/ と /election/<種類>-<回>/ : 選挙ごとの党派別当選人数と背景
- /data/                         : CSV・JSON の配布（CC BY 4.0）
"""
import csv
import html
import io
import json

E = html.escape
SITE = "政党クロニクル"
LICENSE = "https://creativecommons.org/licenses/by/4.0/"
CSS = """body{margin:0;background:#f6f4ef;color:#25282d;font:16px/1.75 "Hiragino Sans","Hiragino Kaku Gothic ProN","BIZ UDPGothic","Yu Gothic UI","Meiryo",system-ui,sans-serif}
.w{max-width:960px;margin:0 auto;padding:20px 20px 60px}a{color:#25282d}header a.s{font-weight:800;font-size:20px;text-decoration:none}
nav.bc{font-size:13px;color:#6b6860;margin:6px 0 18px}nav.bc a{color:#6b6860}h1{font-size:26px;line-height:1.4;margin:0 0 10px}
h2{font-size:20px;margin:34px 0 8px;padding-top:10px;border-top:1px solid #ddd8cc}h3{font-size:16px;margin:22px 0 6px}
.lead{font-size:16px}.app{display:inline-block;margin:10px 0 4px;padding:8px 16px;border:2px solid #25282d;border-radius:8px;font-weight:700;text-decoration:none}
.note{font-size:13px;color:#6b6860}table{border-collapse:collapse;width:100%;font-size:14px;margin:6px 0 10px;background:#fffdf9}
th,td{border:1px solid #ddd8cc;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f0ede5;font-weight:600}td.n{text-align:right;font-variant-numeric:tabular-nums}
.pos{font-weight:700;white-space:nowrap}ul.links{columns:2;padding-left:1.2em}footer{margin-top:40px;font-size:13px;color:#6b6860;border-top:1px solid #ddd8cc;padding-top:12px}
td,th{overflow-wrap:anywhere}
@media(max-width:640px){ul.links{columns:1}h1{font-size:22px}table{font-size:13px}table.st thead{display:none}table.st,table.st tbody,table.st tr,table.st th,table.st td{display:block;width:auto}table.st tr{border:1px solid #ddd8cc;margin:0 0 8px}table.st th,table.st td{border:0;border-bottom:1px solid #eee9de}}"""


def ymd(s):
    if not s:
        return "現在"
    p = [int(x) for x in s.split("-")]
    return f"{p[0]}年" + (f"{p[1]}月" if len(p) > 1 else "") + (f"{p[2]}日" if len(p) > 2 else "")


class Ctx:
    def __init__(self, site_url, dist, data, gov, st, seats, records):
        self.U, self.dist = site_url, dist
        self.data, self.gov, self.st, self.seats, self.rec = data, gov, st, seats, records
        self.P = {p["id"]: p for p in data["parties"]}
        self.SP = {p["id"]: p for p in st["parties"]}
        self.asof = data["asOf"]
        self.urls = []

    # ---- 共通 ----
    def page(self, path, title, desc, crumbs, body, app, image="default", alt=None, ld_extra=None):
        url = f"{self.U}/{path}" if path else f"{self.U}/"
        t = f"{title} ｜ {SITE}"
        bc = [("トップ", f"{self.U}/")] + crumbs
        ld = [{"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(bc)]},
              {"@context": "https://schema.org", "@type": "WebPage", "name": title, "url": url, "inLanguage": "ja",
               "dateModified": self.asof, "license": LICENSE, "description": desc,
               "isPartOf": {"@id": f"{self.U}/#website"}, "publisher": {"@id": f"{self.U}/#org"}}]
        if ld_extra:
            ld.append(ld_extra)
        img = f"{self.U}/og/{image}.png"
        alt = alt or title
        doc = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{E(t)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{E(t)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{E(alt)}">
<meta property="og:site_name" content="{SITE}">
<meta property="og:locale" content="ja_JP">
<meta property="article:modified_time" content="{self.asof}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@michisus_co">
<meta name="twitter:image:alt" content="{E(alt)}">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>{CSS}</style>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body><div class="w">
<header><a class="s" href="/">{SITE}</a> <span class="note">政党の政策・議席・ルーツがわかる</span></header>
<nav class="bc" aria-label="パンくず">{" › ".join(f'<a href="{E(u)}">{E(n)}</a>' for n, u in bc[:-1])} › {E(bc[-1][0])}</nav>
<main>
<h1>{E(title)}</h1>
{f'<p><a class="app" href="{E(app)}">図と表で見る（{SITE}）</a></p>' if app else ""}
{body}
</main>
<footer>
<p>{SITE}（運営：Michisus）。{ymd(self.asof)}時点のデータ。記述は出典に書かれている範囲にとどめ、推測や評価は加えていません。立場の区分・結果の区分は、サイトで公開している基準による整理です。</p>
<p>文章とデータは <a href="{LICENSE}" rel="license">CC BY 4.0</a>（引用している党の資料・会議録などの文言は、それぞれの著作権者の権利のまま）。<a href="/data/">データのダウンロード</a>・<a href="https://github.com/wasabi-paradise/seito-chronicle/issues">誤りの報告</a></p>
<p><a href="/theme/">テーマの一覧</a>・<a href="/party/">政党の一覧</a>・<a href="/election/">選挙の一覧</a></p>
</footer>
</div></body>
</html>
"""
        d = self.dist / path if path else self.dist
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(doc, encoding="utf-8")
        self.urls.append(url)

    def quote(self, w):
        # 文言に「」が含まれるとき（アンケートの設問と回答など）はそのまま、そうでなければ「」でくくる
        return E(w) if "「" in w or not w else f"「{E(w)}」"

    def src(self, s):
        return f'<a href="{E(s["url"])}" rel="nofollow noopener">{E(s.get("title", ""))}</a>（{E(s.get("kind", ""))}）'

    # ---- 立場 ----
    def stance_rows(self, pid, theme):
        st, p = self.st, self.SP[pid]
        rows = []
        for e in st["elections"]:
            if p.get("from") and e["date"] < next(x["date"] for x in st["elections"] if x["id"] == p["from"]):
                continue
            rid = f"{pid}-{e['id']}"
            m = (p.get("mergedInto") or {}).get(e["id"])
            if m:
                rows.append(f'<tr id="{rid}"><th>{E(e["name"])}</th><td colspan="3">衆院議員は{E(self.SP[m]["name"])}として選挙に臨んだ</td></tr>')
                continue
            s = next((x for x in st["stances"] if x["party"] == pid and x["theme"] == theme["id"] and x["election"] == e["id"]), None)
            if not s:
                nd = next((x for x in st.get("nodata", []) if x["party"] == pid and x["theme"] == theme["id"] and x["election"] == e["id"]), None)
                rows.append(f'<tr id="{rid}"><th>{E(e["name"])}</th><td colspan="3">{"党の資料で確認できず（" + E(nd["reason"]) + "）" if nd else "未調査"}</td></tr>')
                continue
            lab = next(x["label"] for x in theme["scale"] if x["id"] == s["position"])
            as_ = f'<br><span class="note">{E(s["asName"])}として</span>' if s.get("asName") else ""
            srcs = "<br>".join(self.src(st["sources"][i]) for i in s["sources"] if i in st["sources"])
            note = f'<br><span class="note">注記：{E(s["note"])}</span>' if s.get("note") else ""
            rows.append(f'<tr id="{rid}"><th>{E(e["name"])}</th><td class="pos">{E(lab)}{as_}</td><td>{self.quote(s.get("wording") or "")}{note}</td><td>{srcs}</td></tr>')
        return rows

    def table(self, rows):
        return '<table class="st"><thead><tr><th>選挙</th><th>区分</th><th>党の資料の文言（引用）</th><th>出典</th></tr></thead><tbody>' + "".join(rows) + "</tbody></table>"

    def records_for(self, pred):
        out = [r for r in self.rec["records"] if pred(r)]
        O = {o["id"]: o["label"] for o in self.rec["outcomes"]}
        return "".join(f'<li><a href="/#rec-{E(r["id"])}">{E(r["title"])}</a>（{E(O.get(r["outcome"], ""))}）</li>' for r in out)

    def themes(self):
        st = self.st
        for t in st["themes"]:
            parts = [f'<p class="lead">問い：{E(t["question"])}。2016年から2026年までの国政選挙{len(st["elections"])}回で、各党が公約などに掲げた立場を、根拠にした党の資料の文言と出典つきで並べています。</p>',
                     "<h2>区分</h2><ul>" + "".join(f"<li>{E(x['label'])}</li>" for x in t["scale"]) + "</ul>"]
            if t.get("note"):
                parts.append(f'<p class="note">区分の決め方：{E(t["note"])}</p>')
            for p in st["parties"]:
                parts.append(f'<h2 id="{p["id"]}">{E(p["name"])}</h2><p class="note"><a href="/party/{p["id"]}/">{E(p["name"])}の全テーマの立場</a></p>' + self.table(self.stance_rows(p["id"], t)))
            rl = self.records_for(lambda r: r["theme"] == t["id"])
            if rl:
                parts.append(f"<h2>表明とその後（{E(t['name'])}）</h2><p class=\"note\">選んだ事例を集めたもので、すべての公約を判定したものではありません。</p><ul>{rl}</ul>")
            desc = f"問い：{t['question']}。2016〜2026年の国政選挙での各党の立場を、党の資料の文言と出典つきで比べられます。"
            self.page(f"theme/{t['id']}/", f"{t['name']}：各党の立場（2016〜2026年の国政選挙）", desc,
                      [("テーマ", f"{self.U}/theme/"), (t["name"], f"{self.U}/theme/{t['id']}/")], "".join(parts),
                      f"/#seisaku-{t['id']}", f"theme-{t['id']}", f"{t['name']}：各党の立場 ｜ {SITE}")
        li = "".join(f'<li><a href="/theme/{t["id"]}/">{E(t["name"])}</a>：{E(t["question"])}</li>' for t in st["themes"])
        self.page("theme/", "テーマの一覧", "消費税・原発・憲法改正など、テーマごとに各党の立場を党の資料の文言と出典つきで比べられます。",
                  [("テーマ", f"{self.U}/theme/")], f"<ul>{li}</ul>", "/#seisaku-shohizei")

    def parties(self):
        st = self.st
        for p in st["parties"]:
            g = self.P.get(p["genealogy"])
            lin = [x for x in (p.get("lineage") or [p["genealogy"]]) if x in self.P]
            parts = [f'<p class="lead">{E(p["name"])}が2016年から2026年までの国政選挙で、テーマごとにどんな立場をとってきたかを、党の資料の文言と出典つきで並べています。</p>']
            if g:
                pre = [l["from"] for l in self.data["links"] if l["to"] == g["id"] and l["from"] in self.P]
                parts.append(f'<p>結成：{ymd(g["start"])}' + (f'。前身：{"・".join(E(self.P[x]["name"]) for x in pre)}' if pre else "") +
                             f'。<a href="/#{g["id"]}">系譜図で見る</a></p>')
            if len(lin) > 1:
                parts.append(f'<p class="note">この表と記録に含めた党：{"・".join(E(self.P[x]["name"]) for x in lin)}</p>')
            for t in st["themes"]:
                parts.append(f'<h2 id="{t["id"]}">{E(t["name"])}</h2><p class="note">問い：{E(t["question"])}（<a href="/theme/{t["id"]}/">全党で比べる</a>）</p>' + self.table(self.stance_rows(p["id"], t)))
            seat = []
            for house, key, lab in (("lo", "shugiin", "衆院選"), ("up", "sangiin", "参院選")):
                els = self.seats["elections"] if house == "lo" else self.seats["upper"]["elections"]
                for e in els:
                    r = next((x for x in e["rows"] if x.get("party") == p["genealogy"]), None)
                    if r:
                        seat.append(f'<li><a href="/election/{key}-{e["n"]}/">第{e["n"]}回{lab}（{e["date"][:4]}年）</a>：{r["seats"]}</li>')
            if seat:
                parts.append(f"<h2>選挙での当選人数</h2><p class=\"note\">総務省の結果調の党派別当選人数（参院選は改選分）。</p><ul>{''.join(seat)}</ul>")
            rl = self.records_for(lambda r: r["party"] in lin or r.get("fromParty") in lin)
            if rl:
                parts.append(f"<h2>表明とその後</h2><p class=\"note\">選んだ事例を集めたもので、すべての公約を判定したものではありません。前身の党の記録を含みます。</p><ul>{rl}</ul>")
            desc = f"{p['name']}が2016〜2026年の国政選挙で、消費税・原発・憲法などのテーマにどんな立場をとってきたかを、党の資料の文言と出典つきでたどれます。"
            self.page(f"party/{p['id']}/", f"{p['name']}の政策の立場（2016〜2026年の国政選挙）", desc,
                      [("政党", f"{self.U}/party/"), (p["name"], f"{self.U}/party/{p['id']}/")], "".join(parts),
                      f"/#seito-{p['id']}", f"party-{p['id']}", f"{p['name']}の政策の立場 ｜ {SITE}")
        li = "".join(f'<li><a href="/party/{p["id"]}/">{E(p["name"])}</a></li>' for p in st["parties"])
        self.page("party/", "政党の一覧", "いまの主な政党の、テーマごとの立場の移り変わりを、党の資料の文言と出典つきでたどれます。",
                  [("政党", f"{self.U}/party/")], f'<ul class="links">{li}</ul><p><a href="/#keifu">戦後のすべての政党の系譜図</a></p>', "/#keifu")

    # ---- 選挙 ----
    def gov_at(self, d):
        for g in self.gov["governments"]:
            if g["start"] <= d and (not g.get("end") or d < g["end"]):
                return g
        return None

    def ssrc(self, ids):
        S = self.seats["sources"]
        return "、".join(self.src(S[i]) for i in ids if i in S)

    def ctx(self, c):
        if not c:
            return ""
        out = ["<h2>この選挙の背景・論点と結果</h2>"]
        if c.get("background"):
            out.append("<h3>選挙の前に起きていたこと</h3><ul>" + "".join(
                f'<li>{E(f.get("dateLabel") or ymd(f["date"]))}：{E(f["text"])}<br><span class="note">出典：{self.ssrc(f["sources"])}</span></li>' for f in c["background"]) + "</ul>")
        for key, h in (("issues", "論点（研究者の分析）"), ("research", "この選挙についての研究者の分析"), ("parties", "結果について：首相と野党第一党の受け止め")):
            if c.get(key):
                out.append(f"<h3>{h}</h3><ul>" + "".join(f'<li><b>{E(x["who"])}</b>：{E(x["text"])}<br><span class="note">出典：{self.ssrc(x["sources"])}</span></li>' for x in c[key]) + "</ul>")
        if c.get("survey"):
            s = c["survey"]
            out.append(f'<h3>有権者が考慮した問題（選挙後の全国調査）</h3><p class="note">質問：「{E(s["q"])}」（回答者 {E(s["n"])}人）。いくつでも選べる質問のため、合計は100%を超えます。選択肢の一部を割合の高い順に表示しています。</p>'
                       "<table><thead><tr><th>問題</th><th>割合</th></tr></thead><tbody>" + "".join(f'<tr><td>{E(l)}</td><td class="n">{v:.1f}%</td></tr>' for l, v in s["items"]) + "</tbody></table>"
                       + "".join(f'<p class="note">{E(x)}</p>' for x in s.get("extra", [])) + f'<p class="note">出典：{self.ssrc([s["src"]])}</p>')
        elif c.get("surveyNote"):
            out.append(f'<h3>有権者が考慮した問題</h3><p class="note">{E(c["surveyNote"])}</p>')
        if c.get("themes"):
            ts = [t for t in self.st["themes"] if t["id"] in c["themes"]]
            out.append("<p>この選挙での各党の公約の立場：" + "・".join(f'<a href="/theme/{t["id"]}/">{E(t["name"])}</a>' for t in ts) + "</p>")
        return "".join(out)

    def elections(self):
        lists = {}
        for house, key, full, lab in (("lo", "shugiin", "衆議院議員総選挙", "衆院選"), ("up", "sangiin", "参議院議員通常選挙", "参院選")):
            els = self.seats["elections"] if house == "lo" else self.seats["upper"]["elections"]
            lists[key] = []
            for i, e in enumerate(els):
                up = house == "up"
                rows = sorted(e["rows"], key=lambda r: (1 if (not r.get("party") and any(w in r["label"] for w in ("無所属", "諸派", "本人"))) else 0, -r["seats"]))
                split = up or any("smd" in r for r in e["rows"])
                ca, cb = (e["tier"][0], e["tier"][1]) if up else ("小選挙区", "比例代表")
                va = (lambda r: r.get("a")) if up else (lambda r: r.get("smd"))
                vb = (lambda r: r.get("b")) if up else (lambda r: r.get("pr"))
                head = "<tr><th>党派（結果調の表記）</th><th>当選</th>" + (f"<th>{E(ca)}</th><th>{E(cb)}</th>" if split else "") + "</tr>"
                body = ""
                for r in rows:
                    nm = E(r["label"])
                    if r.get("party") in self.P and self.P[r["party"]]["name"] != r["label"]:
                        nm += f'<span class="note">（{E(self.P[r["party"]]["name"])}）</span>'
                    by = f'（＋{r["by"]}）' if r.get("by") else ""
                    body += f'<tr><td>{nm}</td><td class="n">{r["seats"]}{by}</td>' + (f'<td class="n">{va(r) if va(r) is not None else ""}</td><td class="n">{vb(r) if vb(r) is not None else ""}</td>' if split else "") + "</tr>"
                body += f'<tr><th>計{"（改選数）" if up else ""}</th><td class="n">{e["total"]}</td>' + ("<td></td><td></td>" if split else "") + "</tr>"
                g = self.gov_at(e["date"])
                top = "、".join(f'{r["label"]} {r["seats"]}' for r in rows[:4])
                summ = f'<p class="lead">{ymd(e["date"])}に投票。当選人数の多い順に、{E(top)}{"（改選分）" if up else ""}。'
                if not up:
                    summ += f'当選人数の合計は{e["total"]}で、過半数は{e["total"] // 2 + 1}。'
                summ += (f'選挙時の内閣は{E(g["cabinets"])}（{E(g["pm"])}首相）。' if g else "") + "</p>"
                hb = ""
                if up and e.get("house"):
                    H = e["house"]
                    hb = (f"<h2>参議院全体の議席（{ymd(H['asOf'])}現在）</h2><p class=\"note\">今回の当選と非改選を合わせた党派別の議席。{E(H['basis'])}出典：{self.ssrc([H['source']])}</p>"
                          "<table><thead><tr><th>党派</th><th>計</th></tr></thead><tbody>" + "".join(f'<tr><td>{E(r["label"])}</td><td class="n">{r["total"]}</td></tr>' for r in H["rows"]) + f'<tr><th>計</th><td class="n">{H["total"]}</td></tr></tbody></table>')
                nav = []
                if i > 0:
                    nav.append(f'<a href="/election/{key}-{els[i - 1]["n"]}/">← 第{els[i - 1]["n"]}回（{els[i - 1]["date"][:4]}年）</a>')
                if i < len(els) - 1:
                    nav.append(f'<a href="/election/{key}-{els[i + 1]["n"]}/">第{els[i + 1]["n"]}回（{els[i + 1]["date"][:4]}年） →</a>')
                body_html = (summ + "<h2>党派別の当選人数</h2>" + f"<table><thead>{head}</thead><tbody>{body}</tbody></table>"
                             + (f'<p class="note">注：{E(e["note"])}</p>' if e.get("note") else "")
                             + f'<p class="note">出典（議席）：{self.ssrc(e["sources"])}。当選後の入党・離党、追加公認、会派の組み替えは含みません。</p>'
                             + hb + self.ctx(e.get("context")) + f'<p>{"　".join(nav)}</p>')
                title = f"第{e['n']}回{full}（{e['date'][:4]}年）の結果"
                desc = f"第{e['n']}回{full}（{ymd(e['date'])}投票）の党派別当選人数{'（改選分）' if up else ''}を、総務省の結果調の数字で示します。" + ("選挙の背景、研究者の分析、有権者の調査も出典つきで。" if e.get("context") else "")
                self.page(f"election/{key}-{e['n']}/", title, desc,
                          [("選挙", f"{self.U}/election/"), (f"第{e['n']}回{lab}", f"{self.U}/election/{key}-{e['n']}/")], body_html,
                          f"/#{'sangiin' if up else 'giseki'}-{e['n']}", "elections", f"{title} ｜ {SITE}")
                lists[key].append(f'<li><a href="/election/{key}-{e["n"]}/">第{e["n"]}回（{ymd(e["date"])}）</a></li>')
        body = ("<h2>衆議院議員総選挙</h2><ul class=\"links\">" + "".join(reversed(lists["shugiin"])) + "</ul>"
                "<h2>参議院議員通常選挙</h2><ul class=\"links\">" + "".join(reversed(lists["sangiin"])) + "</ul>")
        self.page("election/", "選挙の一覧", "戦後すべての衆院選・参院選の党派別当選人数を、総務省の結果調の数字で示します。",
                  [("選挙", f"{self.U}/election/")], body, "/#giseki", "elections")

    # ---- データの配布 ----
    def data_files(self):
        st, d = self.st, self.dist / "data"
        d.mkdir(parents=True, exist_ok=True)

        def wcsv(name, rows):
            b = io.StringIO()
            csv.writer(b, lineterminator="\r\n").writerows(rows)
            (d / name).write_text("﻿" + b.getvalue(), encoding="utf-8")
        T = {t["id"]: t for t in st["themes"]}
        EL = {e["id"]: e for e in st["elections"]}
        rows = [["ID", "選挙", "投開票日", "テーマ", "政党", "選挙時の党名", "区分", "区分ID", "党の資料の文言（引用）", "注記", "根拠の種類", "確認日", "出典", "出典URL", "このサイトのURL"]]
        for s in st["stances"]:
            t, e = T[s["theme"]], EL[s["election"]]
            ss = [st["sources"][i] for i in s["sources"] if i in st["sources"]]
            rows.append([f'{s["theme"]}~{s["party"]}~{s["election"]}', e["name"], e["date"], t["name"], self.SP[s["party"]]["name"], s.get("asName") or "",
                         next(x["label"] for x in t["scale"] if x["id"] == s["position"]), s["position"], s.get("wording") or "", s.get("note") or "",
                         " / ".join(sorted({x.get("kind", "") for x in ss})), s.get("verifiedOn") or "", " / ".join(x["title"] for x in ss), " ".join(x["url"] for x in ss),
                         f'{self.U}/#seisaku-{s["theme"]}~{s["party"]}~{s["election"]}'])
        for n in st.get("nodata", []):
            t, e = T[n["theme"]], EL[n["election"]]
            rows.append([f'{n["theme"]}~{n["party"]}~{n["election"]}', e["name"], e["date"], t["name"], self.SP[n["party"]]["name"], n.get("asName") or "",
                         "党の資料で確認できず", "nodata", "", n["reason"], "", "", "", "", ""])
        wcsv("stances.csv", rows)
        O = {o["id"]: o["label"] for o in self.rec["outcomes"]}
        rr = [["ID", "記録", "政党", "テーマ", "表明の日付", "表明", "結果の区分", "その後（日付・内容）", "出典の種類", "出典URL"]]
        for r in self.rec["records"]:
            ids = list(dict.fromkeys(r["statement"]["sources"] + [i for x in r["steps"] for i in x["sources"]]))
            rr.append([r["id"], r["title"], self.P[r["party"]]["name"], r["theme"], r["statement"]["date"], r["statement"]["text"], O.get(r["outcome"], ""),
                       " ／ ".join(f'{x["date"]} {x["label"]}：{x["text"]}' for x in r["steps"]),
                       " / ".join(sorted({self.rec["sources"][i].get("kind", "") for i in ids if i in self.rec["sources"]})), " ".join(self.rec["sources"][i]["url"] for i in ids if i in self.rec["sources"])])
        wcsv("records.csv", rr)
        sr = [["選挙", "回", "投票日", "党派（結果調の表記）", "系譜図の党ID", "当選人数", "小選挙区・選挙区等", "比例代表等"]]
        for house, lab in (("lo", "衆院選"), ("up", "参院選")):
            for e in (self.seats["elections"] if house == "lo" else self.seats["upper"]["elections"]):
                for r in e["rows"]:
                    sr.append([lab, e["n"], e["date"], r["label"], r.get("party") or "", r["seats"], r.get("smd", r.get("b", "")), r.get("pr", r.get("a", ""))])
        wcsv("seats.csv", sr)
        (d / "all.json").write_text(json.dumps({"asOf": self.asof, "license": LICENSE, "genealogy": self.data, "governments": self.gov,
                                                "stances": st, "records": self.rec, "seats": self.seats}, ensure_ascii=False), encoding="utf-8")
        files = [("stances.csv", "各党の立場の一覧（テーマ×党×選挙。党の資料の文言・出典つき）"), ("records.csv", "表明とその後の記録"),
                 ("seats.csv", "衆院選・参院選の党派別当選人数（総務省の結果調）"), ("all.json", "すべてのデータ（系譜・政権・立場・記録・議席）")]
        ds = {"@context": "https://schema.org", "@type": "Dataset", "name": "政党クロニクル データセット（戦後日本の政党の系譜・各党の政策の立場・国政選挙の当選人数）",
              "description": "戦後日本の政党の結成・合流・分裂、2016〜2026年の国政選挙での各党の政策の立場（党の資料の文言と出典つき）、公約のその後の記録、戦後すべての衆院選・参院選の党派別当選人数をまとめたデータ。",
              "url": f"{self.U}/data/", "license": LICENSE, "inLanguage": "ja", "dateModified": self.asof,
              "creator": {"@id": f"{self.U}/#org"}, "temporalCoverage": f"1945/{self.asof[:4]}", "spatialCoverage": "日本",
              "keywords": ["政党", "選挙", "公約", "衆議院", "参議院", "政治"],
              "isBasedOn": ["総務省 衆議院議員総選挙・最高裁判所裁判官国民審査結果調", "総務省 参議院議員通常選挙結果調", "各党の公約・公式資料・政策アンケートへの回答"],
              "distribution": [{"@type": "DataDownload", "encodingFormat": "application/json" if f.endswith(".json") else "text/csv", "contentUrl": f"{self.U}/data/{f}", "name": n} for f, n in files]}
        body = ('<p class="lead">このサイトのデータは、出典を示せば授業・報道・研究・商用を含めて自由に使えます（CC BY 4.0）。CSV は Excel で開ける UTF-8（BOM つき）です。</p><ul>'
                + "".join(f'<li><a href="/data/{f}" download>{f}</a>：{E(n)}</li>' for f, n in files)
                + '</ul><p>引用の例：政党クロニクル（運営：Michisus）「各党の立場の一覧」' + ymd(self.asof) + f'時点、{self.U}/ 。CC BY 4.0</p>'
                '<p class="note">立場の区分・結果の区分は、このサイトの基準による整理です。引用するときは、その旨と各項目の出典（党の資料・政府資料など）も添えてください。</p>')
        self.page("data/", "データのダウンロード", "政党クロニクルのデータ（各党の立場・公約のその後・国政選挙の当選人数・政党の系譜）を CSV・JSON で配布しています（CC BY 4.0）。",
                  [("データ", f"{self.U}/data/")], body, None, image="data", alt=f"データのダウンロード ｜ {SITE}", ld_extra=ds)


def build(site_url, dist, data, gov, st, seats, records):
    c = Ctx(site_url, dist, data, gov, st, seats, records)
    c.themes()
    c.parties()
    c.elections()
    c.data_files()
    return c.urls
