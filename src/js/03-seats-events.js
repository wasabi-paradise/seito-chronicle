const ctxSrc = ids => ids.length ? '<span class="s">' + ids.map(id => `<a href="${esc(SSRC(id).url)}" target="_blank" rel="noopener" title="${esc(SSRC(id).title)}">${esc(SSRC(id).short || SSRC(id).kind)}</a>`).join(" ") + "</span>" : "";
function seCtxHTML(e) {
  const c = e.context; if (!c) return "";
  const NONE = '<p class="svq">該当資料なし（2026年11月時点）</p>';
  const list = (h, xs, k) => `<h4 data-sd="${k}">${h}</h4>` + (xs && xs.length ? `<dl class="sides">${xs.map(x => `<dt>${esc(x.who)}</dt><dd>${esc(x.text)} ${ctxSrc(x.sources)}</dd>`).join("")}</dl>` : NONE);
  const bg = `<h4 data-sd="bg">選挙の前に起きていたこと</h4>` + (c.background && c.background.length ? `<ol class="steps">${c.background.map(f => `<li><div class="d">${f.dateLabel ? esc(f.dateLabel) : fmt(f.date)}</div><div>${esc(f.text)}</div><div class="s">${ctxSrc(f.sources)}</div></li>`).join("")}</ol>` : NONE);
  let sv = "";
  if (c.survey) {
    const S = c.survey, max = Math.max(...S.items.map(x => x[1]));
    sv = `<h4 data-sd="sv">有権者が考慮した問題（選挙後の全国調査）</h4><p class="svq">質問：「${esc(S.q)}」（回答者 ${esc(S.n)}人）。いくつでも選べる質問のため、合計は100%を超えます。選択肢の一部を割合の高い順に表示しています。選択肢は年ごとに異なるため、年をまたいだ比較はできません。</p>
      <ul class="svbars">${S.items.map(([l, v]) => `<li><span class="svl">${esc(l)}</span><span class="svb"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span><span class="svv">${v.toFixed(1)}%</span></li>`).join("")}</ul>
      ${(S.extra || []).map(x => `<p class="svq">${esc(x)}</p>`).join("")}<p class="svq">出典：${ctxSrc([S.src])}（全国の有権者を対象に、明るい選挙推進協会が選挙後に行った調査の単純集計${SSRC(S.src).where ? "。" + esc(SSRC(S.src).where) : ""}）</p>`;
  } else sv = `<h4 data-sd="sv">有権者が考慮した問題</h4>` + (c.surveyNote ? `<p class="svq">${esc(c.surveyNote)}</p>` : NONE);
  const th = c.themes && c.themes.length ? `<p class="svq">この選挙での各党の公約の立場：${c.themes.map(id => { const t = ST.themes.find(x => x.id === id); return t ? `<a href="#seisaku-${id}">${esc(t.name)}</a>` : ""; }).join("・")}</p>` : "";
  return `<div class="semoves sectx"><h3>この選挙の背景・論点と結果</h3>
    ${bg}
    ${list("論点（研究者の分析）", c.issues, "is")}
    ${sv}${th}
    ${list("この選挙についての研究者の分析", c.research, "rs")}
    ${list("結果について：首相と野党第一党の受け止め", c.parties, "pt")}
    ${c.note ? `<p class="note">${ic("info")}<span>${esc(c.note)}</span></p>` : ""}
    <p class="pending" style="font-size:12px;margin:0">${tip("info", "背景・論点と結果の書き方", TIPS.ctxrule, "<span>書き方</span>")}　出来事は国会会議録・政府資料など、有権者の考えは選挙後の全国調査の数字、分析は研究者の論文を、誰の資料かを示して載せています。有権者がなぜその選択をしたのかを、このサイトが判断することはしていません。</p></div>`;
}
function seMovesHTML(e) {
  const { newGovs, evs } = seGovMoves(e);
  if (!newGovs.length && !evs.length) return "";
  return `<div class="semoves"><h3 data-sd="mv">その後の政権の動き（選挙のあと3か月）</h3>
    ${newGovs.length ? `<p class="pending" style="font-size:13px;margin:0">発足した内閣：${newGovs.map(x => `<button type="button" class="linkbtn" data-gogov="${x.gi}">${esc(x.g.pm)}（${esc(x.g.cabinets)}、${fmt(x.g.start)}）</button>`).join("、")}</p>` : ""}
    ${evs.map(x => `<div class="sevt"><b>経緯：${esc(x.ev.title)}</b>${x.ev.summary ? `<p>${esc(x.ev.summary.text)}</p>` : ""}<button type="button" class="linkbtn" data-gogov="${x.gi}">事実と当事者の説明を出典つきで読む</button></div>`).join("")}
    <p class="pending" style="font-size:12px;margin:0">選挙の日から3か月以内に発足した内閣と、その期間に出来事が重なる「経緯」を、日付で機械的に並べています。選挙と政権の動きの因果関係をこのサイトが判断したものではありません。</p></div>`;
}
// 参議院全体の議席（非改選を含む）：結果調の「通常選挙の結果による参議院の党派別議席数」の表がある回だけ
function houseBlock(e, withTable) {
  const H = e.house; if (!H) return "";
  const maj = Math.floor(H.total / 2) + 1, pct = v => (v / H.total * 100).toFixed(2) + "%";
  const rows = [...H.rows].sort((a, b) => (/無所属|諸派/.test(a.label) ? 1 : 0) - (/無所属|諸派/.test(b.label) ? 1 : 0) || b.total - a.total);
  const gi = govAt(e.date), ru = rulingAt(gi, e.date);
  let gov = "";
  if (ru) {
    const ids = [...new Set([...ru.pm, ...ru.partners])], got = ids.map(id => ({ id, r: H.rows.find(r => r.party === id) })).filter(x => x.r), sum = got.reduce((a, x) => a + x.r.total, 0);
    const out = ru.outside.map(id => ({ id, r: H.rows.find(r => r.party === id) })).filter(x => x.r);
    gov = `<div class="gsrow"><div><strong>選挙時の与党の合計</strong>　${got.map(x => `${esc(P[x.id].name)} ${x.r.total}`).join("＋")}${got.length > 1 ? ` ＝ <strong>${sum}</strong>` : ""}／${H.total}（過半数 ${maj}）${out.length ? `<span class="pending">　閣外協力：${out.map(x => `${esc(P[x.id].name)} ${x.r.total}`).join("・")}</span>` : ""}</div>
      <div class="gsbar" role="img" aria-label="与党の議席 ${sum}、過半数 ${maj}、合計 ${H.total}">${got.map(x => `<span style="width:${pct(x.r.total)};background:${pc(P[x.id])}"></span>`).join("")}<span class="maj" style="left:${pct(maj)}"></span></div></div>`;
  }
  const bar = `<div class="sbar" role="img" aria-label="参議院全体の議席。合計${H.total}、過半数${maj}">${rows.filter(r => r.total > 0).map(r => { const w = r.total / H.total, c = w > 0.035 ? readableBg(rowColor(r)) : rowColor(r); return `<span style="width:${pct(r.total)};background:${c};color:${onColor(c)}" title="${esc(r.label)} ${r.total}">${w > 0.07 ? esc(r.label) + " " + r.total : w > 0.035 ? r.total : ""}</span>`; }).join("")}<span class="maj" style="left:${pct(maj)}"></span></div>`;
  const tbl = withTable ? `<details class="gmore"><summary>党派別の内訳（今回の当選・非改選）</summary><table><thead><tr><th>党派（結果調の表記）</th><th class="n">今回の当選</th><th class="n">非改選</th><th class="n">計</th></tr></thead><tbody>${rows.map(r => `<tr><td><span class="sw" style="background:${rowColor(r)}"></span>${r.party && P[r.party] ? `<button type="button" class="linkbtn" data-goto="${r.party}">${esc(r.label)}</button>` : esc(r.label)}</td><td class="n">${r.nowA + r.nowB}</td><td class="n">${r.nonA + r.nonB}</td><td class="n"><strong>${r.total}</strong></td></tr>`).join("")}<tr><td>計</td><td class="n">${H.rows.reduce((a, r) => a + r.nowA + r.nowB, 0)}</td><td class="n">${H.rows.reduce((a, r) => a + r.nonA + r.nonB, 0)}</td><td class="n"><strong>${H.total}</strong></td></tr></tbody></table></details>` : "";
  return `<div class="semoves"><h3 data-sd="house">参議院全体の議席（この選挙の結果、${fmt(H.asOf)}現在）</h3>${bar}${gov}${tbl}
    <p class="pending" style="font-size:12px;margin:0">今回の当選人と非改選議員を合わせた党派別の議席（結果調の「通常選挙の結果による参議院の党派別議席数」）。${esc(H.basis)}点線は過半数のライン。出典：<a href="${esc(SSRC(H.source).url)}" target="_blank" rel="noopener">${esc(SSRC(H.source).title)}</a>（${esc(H.where)}）</p></div>`;
}
let seHouse = "lo", seOpen = null;
function seHash() { return (seHouse === "up" ? "sangiin" : "giseki") + (seOpen ? "-" + seOpen : ""); }
function renderSeats() {
  const els = HSE[seHouse], up = seHouse === "up";
  document.querySelectorAll("#houseSeg [data-house]").forEach(b => b.setAttribute("aria-pressed", b.dataset.house === seHouse));
  document.getElementById("seatsTitle").textContent = up ? "参議院選挙の党派別の当選人数（改選分）" : "衆議院選挙の党派別の当選人数";
  document.getElementById("seatsCount").textContent = `${seLabel(els[0])}（${seYear(els[0])}）〜${seLabel(els[els.length - 1])}（${seYear(els[els.length - 1])}）・${els.length}回`;
  document.getElementById("seatsNote").textContent = up ? SEATS.upper.note : SEATS.note;
  document.getElementById("majLegend").hidden = up;
  document.getElementById("houseLegend").hidden = !up;
  const list = document.getElementById("seatsList");
  list.innerHTML = [...els].reverse().map(e => {
    const maj = majOf(e), pct = v => (v / e.total * 100).toFixed(2) + "%";
    const segs = sortedRows(e).filter(r => r.seats > 0).map(r => { const w = r.seats / e.total, c = w > 0.035 ? readableBg(rowColor(r)) : rowColor(r); return `<span style="width:${pct(r.seats)};background:${c};color:${onColor(c)}" title="${esc(r.label)} ${r.seats}">${w > 0.07 ? esc(r.label) + " " + r.seats : w > 0.035 ? r.seats : ""}</span>`; }).join("");
    const top = sortedRows(e).slice(0, 3).map(r => `${r.label}${r.seats}`).join("、");
    const open = seOpen === e.n;
    return `<li class="serow${open ? " open" : ""}" id="se-${e.n}"><button type="button" aria-expanded="${open}" aria-controls="sedet-${e.n}"><span class="sel"><b>${seLabel(e)}</b>${seYear(e)}${e.context || seGovMoves(e).evs.length || e.house ? `<span class="evbs">${e.context ? `<span class="evb" title="背景・分析">${ic("doc")}<span class="vh">背景・分析あり</span></span>` : ""}${seGovMoves(e).evs.length ? `<span class="evb" title="政権の動き">${ic("change")}<span class="vh">政権の動きあり</span></span>` : ""}${e.house ? `<span class="evb" title="参議院全体の議席">${ic("chamber")}<span class="vh">参議院全体の議席あり</span></span>` : ""}</span>` : ""}</span><span class="sbar" role="img" aria-label="${HNAME[seHouse]}${seLabel(e)}（${fmt(e.date)}）。${up ? "改選数" : "合計"}${e.total}${up ? "" : "、過半数" + maj}。多い順に ${esc(top)}">${segs}${up ? "" : `<span class="maj" style="left:${pct(maj)}"></span>`}</span></button>
      <div class="sedet" id="sedet-${e.n}"${open ? "" : " hidden"}>${open ? seDetailHTML(e, seHouse) : ""}</div></li>`;
  }).join("");
  list.querySelectorAll(".serow > button").forEach(b => b.addEventListener("click", () => {
    const n = +b.parentElement.id.slice(3); toggleSe(n, b.getAttribute("aria-expanded") !== "true");
  }));
  if (seOpen) bindSeatLinks(document.getElementById("sedet-" + seOpen));
}
function setHouse(h) { if (seHouse === h) return; seHouse = h; seOpen = null; renderSeats(); }
function toggleSe(n, on) {
  const li = document.getElementById("se-" + n); if (!li) return;
  const b = li.querySelector("button"), d = li.querySelector(".sedet"), e = HSE[seHouse].find(x => x.n === n);
  if (on && seOpen && seOpen !== n) { const o = document.getElementById("se-" + seOpen); if (o) { o.classList.remove("open"); o.querySelector("button").setAttribute("aria-expanded", "false"); const od = o.querySelector(".sedet"); od.hidden = true; od.innerHTML = ""; } }
  b.setAttribute("aria-expanded", on); li.classList.toggle("open", on); d.hidden = !on;
  if (on) { d.innerHTML = seDetailHTML(e, seHouse); bindSeatLinks(d); seOpen = n; }
  else { d.innerHTML = ""; if (seOpen === n) seOpen = null; }
  setHash(seHash());
}
function bindSeatLinks(root) {
  if (!root) return;
  bindActs(root, () => seHash());
  root.querySelectorAll("[data-sdgo]").forEach(b => b.addEventListener("click", () => { const t = root.querySelector(`[data-sd="${b.dataset.sdgo}"]`); if (t) t.scrollIntoView({ block: "start", behavior: RM() ? "auto" : "smooth" }); }));
  root.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => { showView("keifu"); select(b.dataset.goto); scrollToParty(b.dataset.goto); }));
  root.querySelectorAll("[data-gogov]").forEach(b => b.addEventListener("click", () => { showView("keifu"); selectGov(+b.dataset.gogov); }));
}
function goSeats(n, house) {
  showView("giseki");
  if (house) setHouse(house);
  if (n) { if (seOpen !== n) toggleSe(n, true); else setHash(seHash()); requestAnimationFrame(() => { const li = document.getElementById("se-" + n); if (li) { li.scrollIntoView({ block: "start" }); li.querySelector("button").focus({ preventScroll: true }); } }); }
  else setHash(seHash());
}
function bindGoSeki(root) { root.querySelectorAll("[data-goseki]").forEach(b => b.addEventListener("click", () => goSeats(+b.dataset.goseki || 0, b.dataset.house || "lo"))); }
function parseSeHash(h) { const m = h.match(/^(giseki|sangiin)(?:-(\d+))?$/); return m ? { house: m[1] === "sangiin" ? "up" : "lo", n: +m[2] || 0 } : null; }
function renderDetail(p) {
  const f = fam[p.family];
  const srcs = p.sources && p.sources.length
    ? '<ol class="src">' + p.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>${s.kind ? ` <span class="pending">（${esc(s.kind)}）</span>` : ""}</li>`).join("") + "</ol>"
    : '<p class="pending">この項目の出典は準備中です。</p>';
  const dc = p.datesCheck;
  const chk = dc ? `<p class="meta-row" style="font-size:13px">${dc.level === "full" ? ic("ok") : UNV()}<span>${dc.level === "full" ? "日付は出典で確認済み" : "日付の一部が未確認"}：${esc(dc.text)}</span></p>` : `<p class="meta-row" style="font-size:13px">${UNV()}<span>日付は未確認</span></p>`;
  const panel = document.getElementById("panelBody");
  panel.innerHTML = `
    <div><span class="chip"><span class="sw" style="background:${pc(p)}"></span>${esc(f.name)}</span>
    <h2>${esc(p.name)}</h2>
    <div class="period">${fmt(p.start)}${p.startType === "rebuild" ? "（戦後の再建）" : ""} 〜 ${p.end ? fmt(p.end) : "現在（存続）"}</div></div>
    ${p.note ? `<p>${esc(p.note)}</p>` : ""}
    ${isMobile() ? miniLineage(p.id) : ""}
    <div><h3>政権との関わり</h3>${govRunsHTML(p.id)}</div>
    ${partySeatsHTML(p.id)}
    <div><h3>前身</h3>${relList(inL[p.id] || [], "in")}</div>
    <div><h3>その後</h3>${(outL[p.id] || []).length ? relList(outL[p.id], "out") : `<p class="pending">${p.end ? "後継なし" : "現在も存続"}</p>`}</div>
    <div><h3>出典</h3>${srcs}${chk}</div>`;
  bindGoto(panel); bindGoSeki(panel);
  panel.querySelectorAll("[data-mini]").forEach(g => g.addEventListener("click", () => { if (g.dataset.mini !== p.id) { select(g.dataset.mini); document.getElementById("panel").scrollTop = 0; } }));
}
function renderOverview() {
  const alive = DATA.parties.filter(p => !p.end).sort((a, b) => a.lane - b.lane);
  const panel = document.getElementById("panelBody");
  panel.innerHTML = `
    <h2>現在の政党</h2>
    <p class="pending" style="font-size:13px">図の上端の首相の帯を押すと、その内閣の与党と、政権交代・連立の組み替えの経緯（一部の内閣）が出ます。</p>
    <div><h3>存続している党（${alive.length}）・帯を選ぶと詳細</h3>
    <div class="chips">${alive.map(p => `<button type="button" data-goto="${p.id}"><span class="sw" style="background:${pc(p)}"></span>${esc(p.name)}</button>`).join("")}</div></div>`;
  bindGoto(panel);
  if (!booting) setHash("keifu");
}
function bindGoto(root) {
  root.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => {
    select(b.dataset.goto);
    scrollToParty(b.dataset.goto);
  }));
}
function scrollToParty(id) {
  const p = P[id], sc = document.getElementById("scroller");
  const target = x(toYear(p.start)) * SCALE - sc.clientWidth / 3;
  sc.scrollTo({ left: Math.max(0, target), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

// ---- events table ----

function renderEvents() {
  const rows = [];
  const groups = {};
  DATA.links.forEach(l => {
    if (l.type === "merge") {
      const k = l.to + "|" + l.date;
      (groups[k] ||= { date: l.date, type: "merge", to: [l.to], from: [] }).from.push(l.from);
    } else if (l.type === "split") {
      const k = l.from + "|" + l.date + "|split";
      (groups[k] ||= { date: l.date, type: "split", from: [l.from], to: [] }).to.push(l.to);
    } else {
      rows.push({ date: l.date, type: l.type, from: [l.from], to: [l.to], note: l.note });
    }
  });
  rows.push(...Object.values(groups));
  DATA.parties.forEach(p => {
    if (!(inL[p.id] || []).length) rows.push({ date: p.start, type: p.startType === "rebuild" ? "rebuild" : "found", from: [], to: [p.id] });
  });
  rows.sort((a, b) => toYear(a.date) - toYear(b.date));
  const name = id => `<button type="button" class="linkbtn" data-goto="${id}">${esc(P[id].name)}</button>`;
  document.getElementById("evbody").innerHTML = rows.map(r => {
    let text;
    if (r.type === "found") text = `${name(r.to[0])}が結成`;
    else if (r.type === "rebuild") text = `${name(r.to[0])}が戦後に再建`;
    else if (r.type === "merge") text = `${r.from.map(name).join("・")} → ${name(r.to[0])}`;
    else if (r.type === "split") text = `${name(r.from[0])}から ${r.to.map(name).join("・")} が分かれる`;
    else if (r.type === "rename") text = `${name(r.from[0])} → ${name(r.to[0])}`;
    else text = `${name(r.from[0])} → ${name(r.to[0])}${r.note ? "（" + esc(r.note) + "）" : ""}`;
    return `<tr><td class="date">${fmt(r.date)}</td><td class="kind"><span class="kind-pill">${TYPE_LABEL[r.type]}</span></td><td>${text}</td></tr>`;
  }).join("");
  document.getElementById("evcount").textContent = `${rows.length}件`;
  bindGoto(document.getElementById("evbody"));
}


const ICONS = {
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  unverified: '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><path d="M12 16v.5M10 9.5a2 2 0 1 1 3 1.7c-.7.4-1 .9-1 1.6"/>',
  flag: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17v.5"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/>',
  banner: '<path d="M6 21V4h11l-2 4 2 4H6"/>',
  agree: '<path d="M8 12l3 3 5-6"/><rect x="3" y="4" width="18" height="16" rx="3"/>',
  pledge: '<path d="M6 4h12v16H6z"/><path d="M9 9l2 2 4-4M9 15h6"/>',
  change: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  between: '<path d="M4 12h14l-4-4M18 12l-4 4"/><circle cx="4" cy="12" r="1.5"/>',
  after: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M9 15l2 2 4-4"/>',
  merger: '<path d="M6 4v5c0 3 6 4 6 8v3M18 4v5c0 3-6 4-6 8"/>',
  temp: '<path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  start: '<path d="M6 5v14M18 6l-8 6 8 6"/>',
  end: '<path d="M18 5v14M6 6l8 6-8 6"/>',
  lines: '<path d="M3 7h18"/><path d="M3 12h18" stroke-dasharray="4 3"/><path d="M3 17h18" stroke-dasharray="1 3"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v8h14v-8"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  chamber: '<path d="M3 19a9 9 0 0 1 18 0z"/><path d="M8 19a4 4 0 0 1 8 0"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1"/>',
  // テーマ
  t_shohizei: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  t_genpatsu: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
  t_kenpo: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 7h6M9 10h4"/>',
  t_anpo: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  t_hosei: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 10h6M9 14h6"/>',
  t_bessei: '<circle cx="9" cy="13" r="5"/><circle cx="15" cy="13" r="5"/><path d="M8 5l1-2 1 2M14 5l1-2 1 2"/>',
  t_gaikokujin: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  t_kenkin: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  t_kosodate: '<path d="M4 6h3l2 8h10l2-6H8"/><circle cx="10" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  t_other: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
  t_all: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  // 表明とその後：結果の区分
  o_realized: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  o_modified: '<path d="M4 12.5l4 4 5-6"/><path d="M14 16c1.5-1.5 3-1.5 4 0s2.5 1.5 3 0"/>',
  o_postponed: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  o_inprogress: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  o_disputed: '<path d="M12 4v16M5 20h14M6 8h12M6 8l-3 6h6zM18 8l-3 6h6z"/>',
  o_reversed: '<path d="M9 20V9a4 4 0 0 1 8 0v4"/><path d="M14 10l3 3 3-3"/>',
  o_changed: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  o_emphasis: '<path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>'
};
const themeIc = id => ICONS["t_" + id] ? ic("t_" + id) : "";
