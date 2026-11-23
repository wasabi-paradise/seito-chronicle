function closeSheet() {
  const was = document.querySelector(".sheet.open");
  document.querySelectorAll(".sheet.open").forEach(s => { s.classList.remove("open"); s.removeAttribute("role"); s.removeAttribute("aria-modal"); });
  document.getElementById("backdrop").hidden = true;
  document.body.style.overflow = "";
  if (was && sheetOpener && document.contains(sheetOpener)) { try { sheetOpener.focus({ preventScroll: true }); } catch (e) {} }
  sheetOpener = null;
}
// シートが開いている間は、Tabキーの移動をシートの中に閉じ込める
document.addEventListener("keydown", e => {
  if (e.key !== "Tab") return;
  const el = document.querySelector(".sheet.open"); if (!el) return;
  const f = [...el.querySelectorAll('button, a[href], input, select, [tabindex]:not([tabindex="-1"])')].filter(n => n.offsetParent !== null);
  if (!f.length) return;
  const a = f[0], z = f[f.length - 1];
  if (e.shiftKey && (document.activeElement === a || !el.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
  else if (!e.shiftKey && (document.activeElement === z || !el.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
});
// 詳細の見出しを読み上げ用に知らせる
["panelBody", "spanelBody"].forEach(id => new MutationObserver(() => { const h = document.querySelector("#" + id + " h2"); if (h) document.getElementById("live").textContent = h.textContent; }).observe(document.getElementById(id), { childList: true }));
document.getElementById("backdrop").addEventListener("click", closeSheet);
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", closeSheet));
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
function renderMobileList(q = "") {
  const span = NOW - X0;
  const row = p => {
      const f = { color: pc(p) };
      const a = (toYear(p.start) - X0) / span * 100, b = ((p.end ? toYear(p.end) : NOW) - X0) / span * 100;
      const y1 = p.start.slice(0, 4), y2 = p.end ? p.end.slice(0, 4) : "現在";
      return `<button type="button" class="prow${current === p.id ? " sel" : ""}" data-id="${p.id}"><span class="pn">${esc(p.name)}</span><span class="pp">${y1}〜${y2}</span><span class="pbar" aria-hidden="true"><i style="left:${a.toFixed(2)}%;width:${(b - a).toFixed(2)}%;background:${f.color}"></i>${partyGov(p.id).map(r => `<b class="${r.role}" style="left:${((r.a - X0) / span * 100).toFixed(2)}%;width:${((r.b - r.a) / span * 100).toFixed(2)}%"></b>`).join("")}</span></button>`;
  };
  const alive = DATA.parties.filter(p => !p.end && (!q || p.name.includes(q))).sort((a, b) => a.lane - b.lane);
  const nowHTML = alive.length ? `<div class="fam now"><h3>いまの政党（${alive.length}）・選ぶと前身や与党だった時期が出ます</h3>${alive.map(row).join("")}</div>` : "";
  const hist = Object.entries(fam).map(([k, f]) => {
    const ps = DATA.parties.filter(p => p.family === k && p.end && (!q || p.name.includes(q))).sort((a, b) => toYear(a.start) - toYear(b.start));
    if (!ps.length) return "";
    return `<div class="fam"><h3><span class="sw" style="background:${f.color}"></span>${esc(f.name)}（${ps.length}）</h3>${ps.map(row).join("")}</div>`;
  }).join("");
  const groups = nowHTML + (hist ? `<p class="fam-sep">これまでの政党（系統別・結成順）</p>` + hist : "");
  const el = document.getElementById("mlist");
  el.innerHTML = groups || '<p class="pending" style="padding:14px">該当する党はありません。</p>';
  el.querySelectorAll(".prow").forEach(b => b.addEventListener("click", () => select(b.dataset.id)));
}
document.getElementById("psearch").addEventListener("input", e => renderMobileList(e.target.value.trim()));
document.querySelectorAll("#kmode [data-m]").forEach(b => b.addEventListener("click", () => {
  document.body.dataset.kmode = b.dataset.m;
  document.querySelectorAll("#kmode [data-m]").forEach(x => x.setAttribute("aria-pressed", x === b));
  if (b.dataset.m === "chart") { const s = document.getElementById("scroller"); s.scrollTo({ left: s.scrollWidth }); }
}));
document.body.dataset.kmode = "list";

// ---- views ----
let booting = true;
const BASE_TITLE = document.title, SITE = "政党クロニクル";
function titleFor(h) {
  if (!h) return BASE_TITLE;
  let x = h === "keifu" ? "政党の系譜" : "";
  if (h.startsWith("rec-")) { const r = allRecords().find(r => r.id === h); x = r ? r.title : ""; }
  else if (parseSeHash(h)) { const q = parseSeHash(h), el = q.n && HSE[q.house].find(e => e.n === q.n); x = el ? `${q.house === "up" ? "参院選" : "衆院選"}${seLabel(el)}（${seYear(el)}）の結果と背景` : (q.house === "up" ? "参議院選挙の当選人数" : "衆議院選挙の当選人数"); }
  else if (h.startsWith("seito-")) { const [a, b] = h.slice(6).split("~"); x = SP[a] ? SP[a].name + (SP[b] ? "と" + SP[b].name : "") + "の政策の立場" : ""; }
  else if (h.startsWith("seisaku")) { const q = parseSeisaku(h);
    if (q.cell) { const [pid, eid] = q.cell.split("|"); x = `${SP[pid].name}：${themeName(q.t)}（${ST.elections.find(e => e.id === eid).name}）`; }
    else x = q.t === "all" ? "公約のその後（全テーマ）" : q.t === "other" ? "公約のその後（その他のテーマ）" : q.t ? `${themeName(q.t)}：各党の立場` : "政策の立場"; }
  else if (P[h]) x = P[h].name + "の系譜";
  return x ? `${x} ｜ ${SITE}` : BASE_TITLE;
}
function setHash(h, replace) {
  try { document.title = titleFor(h); } catch (e) {}
  if (location.hash === (h ? "#" + h : "")) return;
  try { history[(replace || booting) ? "replaceState" : "pushState"](null, "", h ? "#" + h : location.pathname + location.search); } catch (e) {}
  if (!booting) setTimeout(() => GA.page(), 0);
}
let keifuShown = false;
function showView(v) {
  closeSheet();
  window.scrollTo(0, 0);
  if (v === "keifu" && !keifuShown) { keifuShown = true; requestAnimationFrame(() => { if (!current) { const sc = document.getElementById("scroller"); sc.scrollLeft = sc.scrollWidth; } }); }
  document.getElementById("view-keifu").hidden = v !== "keifu";
  document.getElementById("view-seisaku").hidden = v !== "seisaku";
  document.getElementById("view-giseki").hidden = v !== "giseki";
  ["keifu", "seisaku", "giseki"].forEach(k => document.getElementById("tab-" + k).setAttribute("aria-pressed", v === k));
  if (v === "seisaku") {
    const w = document.getElementById("matrix").parentElement; w.scrollLeft = w.scrollWidth;
    const mh = document.getElementById("mhint"); if (mh) mh.hidden = !(w.scrollWidth > w.clientWidth + 4);
    const seg = document.getElementById("eseg"), cb = seg.querySelector('[aria-pressed="true"]');
    if (cb) seg.scrollLeft = cb.offsetLeft - seg.clientWidth / 2 + cb.offsetWidth / 2;
  }
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  document.getElementById("intro").hidden = true;
  showView(t.dataset.view);
  if (t.dataset.view === "seisaku") setHash(seisakuHash()); else if (t.dataset.view === "giseki") setHash(seHash()); else setHash(current || "keifu");
}));

// ---- init ----
document.getElementById("asof").textContent = `${fmt(DATA.asOf)}時点`;
document.querySelector('[data-tipslot="about"]').outerHTML = tip("info", "このサイトについて", TIPS.about);
document.querySelector('[data-tipslot="chart"]').outerHTML = '<span class="hint">' + tip("info", "系譜図の見方", TIPS.keifu) + "</span>";
// 党の色は図の右端の党名でも分かるため、凡例ではたたんでおく
{ const alive = DATA.parties.filter(p => !p.end).sort((a, b) => a.lane - b.lane);
document.getElementById("legend").innerHTML =
  `<details class="lgfold"><summary>党の色（いまの${alive.length}党）</summary><span class="lgparties">${alive.map(p => `<span><span class="sw" style="background:${pc(p)}"></span>${esc(p.name)}</span>`).join("")}</span></details>`
  + `<span>${tip("info", "党の色について", `<p><strong>党の色</strong></p><p>${esc(DATA.colorNote.text)}</p><p>系統の色（過去の党）：${Object.values(fam).map(f => esc(f.name.replace(/（.*）/, ""))).join("・")}は、その系統のいまの党に近い色です。</p><p><a href="${esc(DATA.colorNote.source.url)}" target="_blank" rel="noopener">出典：${esc(DATA.colorNote.source.title)}</a></p>`, "<span>色</span>")}</span>`
  + '<span>' + tip("lines", "線の種類", TIPS.lines, "<span>線</span>") + '</span>'
  + '<span class="lg"><span class="grole pm"></span>首相の党</span><span class="lg"><span class="grole partner"></span>連立与党</span><span class="lg"><span class="grole outside"></span>閣外協力（閣僚は出さずに協力）</span>'
  + '<span>' + tip("info", "与党期間の見方", TIPS.gov) + '</span>'; }
document.getElementById("toStart").addEventListener("click", () => document.getElementById("scroller").scrollTo({ left: 0 }));
document.getElementById("toNow").addEventListener("click", () => { const s = document.getElementById("scroller"); s.scrollTo({ left: s.scrollWidth }); });
document.getElementById("clear").addEventListener("click", () => select(null));

// はじめは立場だけを見せる。扱いの大きさ・言い切り方の印はチェックで表示
let showDetail = false;
try { showDetail = localStorage.getItem("showDetail") === "1"; } catch (e) {}
document.body.classList.toggle("simple", !showDetail);
const dt = document.getElementById("detailToggle");
dt.checked = showDetail;
const co = document.getElementById("chgOnly");
co.addEventListener("change", () => document.body.classList.toggle("chgonly", co.checked));
dt.addEventListener("change", () => { showDetail = dt.checked; document.body.classList.toggle("simple", !showDetail); try { localStorage.setItem("showDetail", showDetail ? "1" : "0"); } catch (e) {} });
let introHidden = false, introSeen = false;
try { introHidden = localStorage.getItem("introClosed") === "1"; introSeen = localStorage.getItem("introSeen") === "1"; localStorage.setItem("introSeen", "1"); } catch (e) {}
// 2回目からは案内を1行に縮める
if (introSeen) document.getElementById("intro").classList.add("mini");
function hideIntro(remember) {
  document.getElementById("intro").hidden = true;
  if (remember) { try { localStorage.setItem("introClosed", "1"); } catch (e) {} }
}
document.getElementById("introClose").addEventListener("click", () => hideIntro(true));
document.querySelectorAll("#intro [data-go]").forEach(b => b.addEventListener("click", () => {
  const g = b.dataset.go;
  hideIntro(false);
  if (g === "keifu") { showView("keifu"); setHash(current || "keifu"); return; }
  if (g === "giseki") { goSeats(0, "lo"); return; }
  curAxis = g === "party" ? "party" : "theme"; curCell = null; oFilter = null; pFilter = null;
  if (g === "records") curTheme = "all";
  if (curAxis === "theme" && !ST.themes.some(t => t.id === curTheme) && curTheme !== "all") curTheme = ST.themes[0].id;
  renderStances(); showView("seisaku"); setHash(seisakuHash());
  if (g === "records") requestAnimationFrame(() => document.getElementById("recTitle").scrollIntoView({ block: "start" }));
}));
matchMedia("(max-width: 720px)").addEventListener("change", () => { setLayout(); render(); if (current) select(current); });
(function () {
  const yr = s => s ? s.slice(0, 4) : "現在";
  const opts = DATA.parties.map(p => ({ id: p.id, label: `${p.name}（${yr(p.start)}〜${yr(p.end)}）` }));
  document.getElementById("plist").innerHTML = opts.map(o => `<option value="${esc(o.label)}"></option>`).join("");
  const inp = document.getElementById("dsearch");
  const go = () => { const v = inp.value.trim(); const o = opts.find(x => x.label === v) || (v && opts.find(x => x.label.startsWith(v))); if (o) { select(o.id); scrollToParty(o.id); } if (v) GA.ev("search", { search_term: v.slice(0, 40), matched: o ? o.id : "" }); };
  inp.addEventListener("change", go);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
})();
(function () {
  { const a2 = document.getElementById("asof2"); if (a2) a2.textContent = fmt(DATA.asOf); }
  const q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  // claude.ai 上ではダウンロード機能（downloads）を通し、それ以外の公開先では通常のファイル保存を使う
  const dlP = window.claude && window.claude.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);
  const save = async (name, text, type) => {
    GA.ev("file_download", { file_name: name, file_extension: name.split(".").pop() });
    const dl = await dlP;
    if (dl) { try { await dl.save({ filename: name, data: text }); } catch (e) {} return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  const day = DATA.asOf.replace(/-/g, "");
  const stCSV = only => {
    const rows = [["ID", "選挙", "投開票日", "テーマ", "政党", "選挙時の党名", "区分", "区分ID", "党の資料の文言（引用）", "注記", "根拠の種類", "確認日", "出典", "出典URL", "このサイトのURL"]];
    const here = location.protocol.startsWith("http") ? location.origin + location.pathname : "";
    ST.stances.filter(s => !only || s.theme === only).forEach(s => { const t = ST.themes.find(x => x.id === s.theme), e = ST.elections.find(x => x.id === s.election);
      rows.push([`${s.theme}~${s.party}~${s.election}`, e.name, e.date, t.name, SP[s.party].name, s.asName || "", t.scale.find(x => x.id === s.position).label, s.position, s.wording || "", s.note || "", [...new Set(s.sources.map(i => ST.sources[i].kind || ""))].join(" / "), s.verifiedOn || "", s.sources.map(i => ST.sources[i].title).join(" / "), s.sources.map(i => ST.sources[i].url).join(" "), here ? `${here}#seisaku-${s.theme}~${s.party}~${s.election}` : ""]); });
    (ST.nodata || []).filter(n => !only || n.theme === only).forEach(n => { const t = ST.themes.find(x => x.id === n.theme), e = ST.elections.find(x => x.id === n.election);
      rows.push([`${n.theme}~${n.party}~${n.election}`, e.name, e.date, t.name, SP[n.party].name, n.asName || "", NDTXT, "nodata", "", n.reason, "", "", "", "", ""]); });
    save(`seito-chronicle_stances${only ? "_" + only : ""}_${day}.csv`, "\ufeff" + rows.map(r => r.map(q).join(",")).join("\r\n"), "text/csv");
  };
  document.getElementById("dlCsv").addEventListener("click", () => stCSV(null));
  // 比較表の下のリンク：テーマで見ているときはそのテーマ、政党で見ているときはその党の立場だけ
  document.getElementById("dlTheme").addEventListener("click", () => { if (curAxis === "theme") stCSV(curTheme); else stCSV(null); });
  document.getElementById("dlRec").addEventListener("click", () => {
    const rows = [["ID", "記録", "政党", "テーマ", "表明の日付", "表明", "結果の区分", "その後（日付・内容）", "出典の種類", "出典URL"]];
    PL.records.forEach(r => { const ids = [...new Set([...r.statement.sources, ...r.steps.flatMap(x => x.sources)])];
      rows.push([r.id, r.title, P[r.party].name, themeName(r.theme), r.statement.date, r.statement.text, PL.outcomes.find(o => o.id === r.outcome).label, r.steps.map(x => `${x.date} ${x.label}：${x.text}`).join(" ／ "), [...new Set(ids.map(i => PL.sources[i].kind || ""))].join(" / "), ids.map(i => PL.sources[i].url).join(" ")]); });
    save(`seito-chronicle_records_${day}.csv`, "\ufeff" + rows.map(r => r.map(q).join(",")).join("\r\n"), "text/csv");
  });
  document.getElementById("dlJson").addEventListener("click", () => save(`seito-chronicle_${day}.json`, JSON.stringify({ asOf: DATA.asOf, genealogy: DATA, governments: GOV, stances: ST, records: PL, seats: SEATS }, null, 1), "application/json"));
})();
function openRecord(id) {
  const r = allRecords().find(x => x.id === id); if (!r) return false;
  curAxis = "theme"; curTheme = r.group; curCell = null; oFilter = null; pFilter = null;
  renderStances(); showView("seisaku");
  requestAnimationFrame(() => { const el = document.getElementById(id); if (el) { const d = el.querySelector("details.more"); if (d) d.open = true; el.scrollIntoView({ block: "start" }); } });
  return true;
}
function start() {
  if (introHidden || location.hash.length > 1) document.getElementById("intro").hidden = true;
  render();
  renderEvents();
  renderMobileList();
  renderCriteria();
  document.querySelectorAll("#houseSeg [data-house]").forEach(b => b.addEventListener("click", () => { setHouse(b.dataset.house); setHash(seHash()); }));
  renderSeats();
  let h = location.hash.slice(1);
  if (h === "koyaku") h = "seisaku-all";
  if (h.startsWith("seisaku-") && isExtra(h.slice(8))) h = "seisaku-other";
  if (h.startsWith("rec-")) { renderOverview(); if (openRecord(h)) return; }
  if (parseSeHash(h)) { const q = parseSeHash(h); renderOverview(); renderStances(); goSeats(q.n, q.house); return; }
  if (h.startsWith("seito-") && SP[h.slice(6).split("~")[0]]) {
    curAxis = "party"; curParty = h.slice(6).split("~")[0]; curParty2 = SP[h.split("~")[1]] ? h.split("~")[1] : null;
    renderOverview(); renderStances(); showView("seisaku");
    return;
  }
  if (h.startsWith("seisaku")) {
    const q = parseSeisaku(h);
    if (q.t) curTheme = q.t;
    curCell = q.cell;
    renderOverview(); renderStances(); showView("seisaku"); setHash(seisakuHash());
    openCellFromHash(q.cell);
    return;
  }
  renderStances();
  if (h === "keifu" || (h && P[h])) {
    showView("keifu");
    if (P[h]) { select(h); scrollToParty(h); } else renderOverview();
    return;
  }
  // 何も指定がなければ、政策の立場（いまの構図）から始める
  renderOverview(); showView("seisaku");
}
start();
try { document.title = titleFor(location.hash.slice(1)); } catch (e) {}
booting = false;
GA.init(); GA.page();
document.addEventListener("click", e => {
  const a = e.target.closest && e.target.closest('a[href^="http"]'); if (!a) return;
  try { const u = new URL(a.href); if (u.hostname === location.hostname) return; GA.ev("click_source", { link_url: a.href.slice(0, 300), link_domain: u.hostname, link_text: (a.textContent || "").trim().slice(0, 80) }); } catch (er) {}
}, true);
(() => {
  const st = document.getElementById("gaStatus"), bt = document.getElementById("gaToggle");
  const draw = () => {
    if (!GA_ID) { st.textContent = "現在、アクセス解析は使っていません（公開時に開始します）。"; bt.hidden = true; return; }
    if (!GA.allowed()) { st.textContent = "この表示環境ではアクセス解析は動いていません。"; bt.hidden = true; return; }
    st.textContent = GA.optedOut() ? "このブラウザでは計測を停止しています。" : "このブラウザでは計測しています。";
    bt.hidden = false; bt.textContent = GA.optedOut() ? "このブラウザでの計測を再開する" : "このブラウザでは計測しない";
  };
  bt.addEventListener("click", () => { GA.setOptOut(!GA.optedOut()); draw(); });
  draw();
})();
(() => {
  const il = document.getElementById("issueLink");
  il.innerHTML = ISSUE_URL ? `<a href="${ISSUE_URL}">GitHub の Issues</a>` : "GitHub の Issues（公開時にリンクを掲載します）";
  const url = location.protocol.startsWith("http") ? location.origin + location.pathname : "（サイトのURL）";
  const d = new Date(), today = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  document.getElementById("citeEx").textContent = `政党クロニクル（運営：Michisus）「各党の立場の一覧」${fmt(ST.asOf)}時点、${url}（${today}閲覧）。CC BY 4.0`;
})();
