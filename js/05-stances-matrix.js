function renderStances() {
  renderAxisSeg();
  if (curAxis === "party") { renderPartyView(); return; }
  renderThemebar();
  renderPosmap();
  renderRecPreview();
  document.getElementById("chgOnlyWrap").hidden = false;
  const theme = ST.themes.find(t => t.id === curTheme);
  document.getElementById("matrixArea").hidden = !theme;
  document.getElementById("nomatrix").hidden = !!theme || curTheme === "all";
  if (!theme) {
    document.getElementById("nomatrixText").textContent = curTheme === "all" ? "全テーマの記録（日付順）" : `比較表のないテーマの記録です（${PL.extraThemes.map(t => t.name).join("、")}）`;
    renderRecords();
    return;
  }
  const chgAll = ST.parties.flatMap(p => ST.elections.filter(e => !(p.mergedInto && p.mergedInto[e.id]) && ST.stances.some(x => x.party === p.id && x.theme === curTheme && x.election === e.id)).map(e => prevChange(p.id, curTheme, e.id)).filter(Boolean));
  const nChg = chgAll.filter(x => x.kind === "chg").length, nDiff = chgAll.length - nChg;
  document.getElementById("themeq").innerHTML = `問い：${esc(theme.question)}` + (theme.note ? " " + tip("info", "区分の決め方", `<p><strong>区分の決め方</strong></p><p>${esc(theme.note)}</p>`) : "") + ` <span class="pending">前回の選挙から区分が変わったマス：${nChg}件${nDiff ? `（ほかに、党の名義か根拠資料の種類が前回と異なり区分が違うマス：${nDiff}件。「前回と区分が違う*」と表示）` : ""}</span>`;
  const head = `<thead><tr><th>政党</th>${ST.elections.map(e => `<th>${esc(e.name)}<span class="sub">${fmt(e.date)}投開票</span></th>`).join("")}</tr></thead>`;
  const rows = ST.parties.map(p => {
    const cells = ST.elections.map(e => {
      if (notYetFor(p, e)) return '<td><div class="empty">（未結成）</div></td>';
      if (p.mergedInto && p.mergedInto[e.id]) return `<td><div class="empty">衆院議員は${esc(SP[p.mergedInto[e.id]].name)}として選挙に臨んだ</div></td>`;
      const s = ST.stances.find(x => x.party === p.id && x.theme === curTheme && x.election === e.id);
      if (!s) return `<td><div class="empty">${ndLabel(p.id, curTheme, e.id)}${isND(p.id, curTheme, e.id) ? NDTIP() : ""}</div></td>`;
      const key = `${p.id}|${e.id}`;
      const pos = theme.scale.find(x => x.id === s.position).label;
      const pc_ = prevChange(p.id, curTheme, e.id);
      return `<td><button type="button" class="cell${curCell === key ? " sel" : ""}${pc_ && pc_.kind === "chg" ? " chgd" : ""}" data-key="${key}">
        <span class="go" aria-hidden="true">›</span>${pc_ ? CHG(pc_) : ""}${asTag(s)}<span class="pos" style="${posStyle(theme, s.position)}">${esc(pos)}</span>
        <span class="cellmeta">${s.commit ? `<span class="tip" role="img" aria-label="言い切り方：${cmLabel(s.commit)}">${cmIcon(s.commit)}</span>` : ""}${s.temp === null || s.temp === undefined ? "" : tempIcon(s.temp)}${s.flag ? `<span class="tip" role="img" aria-label="要確認">${ic("flag")}</span>` : ""}</span>
      </button></td>`;
    }).join("");
    return `<tr><th class="party" scope="row"><button type="button" class="linkbtn" data-keifu="${p.genealogy}">${esc(p.short)}</button><span class="sub">${esc(p.name)}</span></th>${cells}</tr>`;
  }).join("");
  const m = document.getElementById("matrix");
  m.innerHTML = head + "<tbody>" + rows + "</tbody>";
  m.parentElement.scrollLeft = m.parentElement.scrollWidth;
  m.querySelectorAll(".cell").forEach(c => c.addEventListener("click", () => { curCell = c.dataset.key; m.querySelectorAll(".cell").forEach(x => x.classList.toggle("sel", x === c)); renderCellDetail(); openSheet("spanel"); setHash(seisakuHash(), true); }));
  renderMobileStance(theme);
  m.querySelectorAll("[data-keifu]").forEach(b => b.addEventListener("click", () => { showView("keifu"); select(b.dataset.keifu); scrollToParty(b.dataset.keifu); }));
  document.getElementById("mlegend").innerHTML = theme.scale.map(s => `<span><span class="pos" style="${posStyle(theme, s.id)}">${esc(s.label)}</span></span>`).join("")
    + `<span class="mlg-temp">${tip("temp", "扱いの大きさの見方", TIPS.temp, "<span>扱いの大きさ</span>")}</span><span>${verLegend()}</span><span>${tip("flag", "要確認の印", "<p>この印は、資料が足りない・資料どうしが食い違うなど、区分がまだ確かでない項目です。根拠の説明や区分の変更の経緯は、詳細の「注記」に書いています。</p>", "<span>要確認</span>")}</span>`;
  renderCellDetail();
  renderRecords();
}
// 前回の選挙（データのある直近の選挙）から区分が変わったか
function stanceAt(pid, themeId, e) {
  const p = SP[pid]; if (notYetFor(p, e)) return null;
  const ps = p.mergedInto && p.mergedInto[e.id] ? p.mergedInto[e.id] : pid;
  return ST.stances.find(x => x.party === ps && x.theme === themeId && x.election === e.id) || null;
}
// 根拠資料の種類：党のアンケート回答だけか、それ以外の党の資料（公約・選挙公報・公式資料）か
function evClass(st) { return st.sources.length && st.sources.every(id => (ST.sources[id] || {}).kind === "政党の回答") ? "survey" : "doc"; }
// 区分が変わったとき、同じ党（名義）・同じ種類の根拠資料どうしなら「前回から変化」、そうでなければ「前回と区分が違う（党の名義か資料の種類が異なる）」
function prevChange(pid, themeId, eid) {
  const i = ST.elections.findIndex(x => x.id === eid), cur = stanceAt(pid, themeId, ST.elections[i]);
  if (!cur) return null;
  for (let j = i - 1; j >= 0; j--) {
    const pr = stanceAt(pid, themeId, ST.elections[j]);
    if (!pr) continue;
    if (pr.position === cur.position) return null;
    const same = (pr.asName || "") === (cur.asName || "") && evClass(pr) === evClass(cur);
    return { e: ST.elections[j], kind: same ? "chg" : "diff", why: (pr.asName || "") !== (cur.asName || "") ? "党の名義が異なる" : "根拠資料の種類（公約か党のアンケート回答か）が異なる" };
  }
  return null;
}
const CHG = (pc) => pc.kind === "chg"
  ? `<span class="chg" title="${esc(pc.e.name)}から区分が変わった（同じ党の、同じ種類の資料どうしの比較）">前回から変化</span>`
  : `<span class="chg diff" title="${esc(pc.e.name)}と区分が違う。${esc(pc.why)}ため、立場の変化とは限らない">前回と区分が違う*</span>`;
function notYetFor(p, e) {
  if (!p.from) return false;
  return toYear(e.date) < toYear(ST.elections.find(x => x.id === p.from).date);
}
function asTag(s) { return s && s.asName ? `<span class="as">${esc(s.asName)}として</span>` : ""; }
function renderCellDetail() {
  const panel = document.getElementById("spanelBody");
  const theme = ST.themes.find(t => t.id === curTheme);
  if (!curCell) {
    const n = ST.stances.filter(s => s.theme === curTheme).length;
    const ch = allRecords().filter(r => r.theme === curTheme).length;
    panel.innerHTML = `<h2>${esc(theme.name)}</h2><p class="pending">マスを選ぶと根拠と出典が出ます。</p>
      <p class="meta-row" style="font-size:13px">立場 ${n}件・記録 ${ch}件 ${UNV()}</p>`;
    return;
  }
  const [pid, eid] = curCell.split("|");
  const s = ST.stances.find(x => x.party === pid && x.theme === curTheme && x.election === eid);
  const e = ST.elections.find(x => x.id === eid), p = SP[pid];
  const t = s.temp === null || s.temp === undefined ? null : ST.temperatureScale.find(x => x.v === s.temp);
  const related = allRecords().filter(r => r.theme === curTheme && (r.party === p.genealogy || (r.compare === "merger" && p.mergedInto)));
  panel.innerHTML = `
    ${actsHTML()}<div><span class="chip">${esc(e.full)}・${esc(theme.name)}</span><h2>${s.asName ? esc(s.asName) + `<span class="pending" style="font-size:13px;font-weight:400">（現在の${esc(p.short)}につながる党）</span>` : esc(p.name)}</h2></div>
    <span class="pos" style="${posStyle(theme, s.position)}">${esc(theme.scale.find(x => x.id === s.position).label)}</span>
    <div><h3>党の資料の文言（引用）</h3><blockquote class="quote">${esc(s.wording || "")}</blockquote></div>
    ${s.note ? `<p class="note">${ic("info")}<span><strong>注記</strong>　${esc(s.note)}</span></p>` : ""}
    <p class="meta-row" style="font-size:13px">${tempTip(s.temp, t ? (s.tempBasis || t.desc) : "根拠になる資料をまだ確認できていません。")}<span>扱いの大きさ：${t ? esc(t.label) : "未判定"}</span>${s.verified ? "" : UNV()}${s.flag ? FLAG(s.flag) : ""}</p>
    ${s.verified ? `<p class="meta-row" style="font-size:13px">${VER(s)}</p>` : ""}
    ${s.commit !== undefined ? `<p class="meta-row" style="font-size:13px">${cmIcon(s.commit)}<span>言い切り方：${cmLabel(s.commit)}</span></p>` : ""}
    <div><h3>出典</h3><ol class="src">${s.sources.map(id => `<li><a href="${esc(ST.sources[id].url)}" target="_blank" rel="noopener">${esc(ST.sources[id].title)}</a> <span class="pending">（${esc(ST.sources[id].kind)}）</span></li>`).join("")}</ol></div>
    <div><h3>この党の推移（${esc(theme.name)}）</h3><ul class="trend">${ST.elections.map(el => {
      const ps = SP[pid].mergedInto && SP[pid].mergedInto[el.id] ? SP[pid].mergedInto[el.id] : pid;
      const x = ST.stances.find(y => y.party === ps && y.theme === curTheme && y.election === el.id);
      const notYet = notYetFor(SP[ps], el);
      const lab = notYet ? '<span class="pending">（未結成）</span>' : x ? `<span class="pos" style="${posStyle(theme, x.position)}">${esc(theme.scale.find(z => z.id === x.position).label)}</span>` : `<span class="pending">${ndLabel(ps, curTheme, el.id)}</span>`;
      return `<li class="${el.id === eid ? "cur" : ""}"><span class="pending">${esc(el.name)}${ps !== pid ? "（" + esc(SP[ps].short) + "）" : x && x.asName ? "（" + esc(x.asName) + "）" : ""}</span>${x && el.id !== eid ? `<button type="button" data-cell="${ps}|${el.id}">${lab}</button>` : lab}</li>`;
    }).join("")}</ul></div>
    ${curAxis === "theme" ? `<p><button type="button" class="linkbtn" data-to-party="${pid}">${esc(p.short)}の全テーマを見る</button>　<button type="button" class="linkbtn" data-to-party="${pid}" data-cmp="1">${esc(p.short)}をほかの党と並べて比べる</button></p>` : ""}
    ${related.length ? `<div><h3>関連する記録</h3><ul class="rel">${related.map(r => `<li><a href="#${r.id}" data-jump>${esc(r.title)}</a></li>`).join("")}</ul></div>` : ""}`;
  bindTrend();
  bindActs(panel, () => "seisaku-" + curTheme + "~" + curCell.replace("|", "~"));
  panel.querySelectorAll("[data-jump]").forEach(x => x.addEventListener("click", closeSheet));
  panel.querySelectorAll("[data-to-party]").forEach(b => b.addEventListener("click", () => { closeSheet(); curAxis = "party"; curParty = b.dataset.toParty; curParty2 = null; cmpOpen = !!b.dataset.cmp; curCell = null; oFilter = null; pFilter = null; renderStances(); setHash(seisakuHash()); document.getElementById("axisSeg").scrollIntoView({ block: "start" }); }));
}
function bindTrend() {
  document.querySelectorAll("#spanelBody [data-cell]").forEach(b => b.addEventListener("click", () => { curCell = b.dataset.cell; renderCellDetail();
    if (curAxis === "theme") { document.querySelectorAll("#matrix .cell").forEach(x => x.classList.toggle("sel", x.dataset.key === curCell)); setHash(seisakuHash(), true); } }));
}
// いまの構図：各党の直近の国政選挙での立場を、立場ごとにまとめる
function currentStance(pid, themeId) {
  for (let i = ST.elections.length - 1; i >= 0; i--) {
    const s = ST.stances.find(x => x.party === pid && x.theme === themeId && x.election === ST.elections[i].id);
    if (s) return s;
  }
  return null;
}
// いまの構図：pmElection が null なら各党の直近の立場、選挙を選べばその選挙の時点の立場
let pmElection = null, pmTimer = null;
const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function pmEntries(theme, eid) {
  if (!eid) return ST.parties.filter(p => p.active).map(p => ({ p, s: currentStance(p.id, theme.id) }));
  const e = ST.elections.find(x => x.id === eid);
  return ST.parties.filter(p => !notYetFor(p, e) && !(p.mergedInto && p.mergedInto[eid]) && (p.active || ST.stances.some(x => x.party === p.id && x.election === eid)))
    .map(p => ({ p, s: ST.stances.find(x => x.party === p.id && x.theme === theme.id && x.election === eid) }));
}
function posmapTheme(theme, withTitle) {
  const last = ST.elections[ST.elections.length - 1].id;
  const ents = pmEntries(theme, pmElection);
  const rows = theme.scale.map(sc => {
    const ps = ents.filter(x => x.s && x.s.position === sc.id);
    // 軸がずれないよう、党がいない行も常に表示する（「公約で言及なし」は最後に区切って置く）
    return `<div class="pm-row${sc.id === "none" ? " pm-nonerow" : ""}${ps.length ? "" : " pm-zero"}"><span class="pos" style="${posStyle(theme, sc.id)}">${esc(sc.label)}</span><span class="pm-parties">${ps.length ? ps.map(({ p, s }) => {
      const el = ST.elections.find(e => e.id === s.election);
      const old = !pmElection && s.election !== last;
      const tcls = s.temp === null || s.temp === undefined ? "" : " t" + s.temp;
      const sub = old ? `<small>${el.date.slice(2, 4)}年</small>` : s.asName ? `<small>${esc(s.asName.replace(/（旧）|の会$/g, ""))}</small>` : "";
      return `<button type="button" class="pchip${old ? " old" : ""}${tcls}" data-k="${theme.id}|${p.id}" data-pm="${theme.id}|${p.id}|${s.election}" aria-label="${esc(s.asName || p.name)}：${esc(el.name)}">${cmIcon(s.commit)}${esc(p.short)}${sub}${s.flag ? ic("flag") : ""}</button>`;
    }).join("") : '<span class="pm-dash">—</span>'}</span></div>`;
  }).join("");
  const none = ents.filter(x => !x.s).map(x => x.p);
  return `<div class="pm-theme">${withTitle ? `<h3><button type="button" class="linkbtn" data-goto-theme="${theme.id}">${themeIc(theme.id)}${esc(theme.name)}</button></h3>` : ""}${rows}${none.length ? `<div class="pm-row pm-empty"><span class="pending">データなし</span><span class="pm-parties">${none.map(p => esc(p.short)).join("・")}</span></div>` : ""}</div>`;
}
function pmBodyHTML() {
  const theme = ST.themes.find(t => t.id === curTheme);
  return theme ? posmapTheme(theme, false) : `<div class="pm-themes">${ST.themes.map(t => posmapTheme(t, true)).join("")}</div>`;
}
function pmBind(root) {
  root.querySelectorAll("[data-pm]").forEach(b => b.addEventListener("click", () => {
    const [t, pid, eid] = b.dataset.pm.split("|");
    stopPm();
    if (curTheme !== t) { curTheme = t; renderStances(); setHash("seisaku-" + t); }
    curCell = `${pid}|${eid}`;
    renderCellDetail(); openSheet("spanel");
    if (!isMobile()) document.getElementById("spanel").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }));
  root.querySelectorAll("[data-goto-theme]").forEach(b => b.addEventListener("click", () => { stopPm(); curTheme = b.dataset.gotoTheme; curCell = null; renderStances(); setHash("seisaku-" + curTheme); }));
}
// 札の移動：切り替え前の位置を覚えておき、切り替え後の位置から滑らせる（FLIP）
function setPmElection(eid) {
  pmElection = eid;
  const box = document.getElementById("pmBody"); if (!box) return;
  const before = {};
  box.querySelectorAll(".pchip[data-k]").forEach(c => { before[c.dataset.k] = { r: c.getBoundingClientRect(), pos: c.closest(".pm-row").querySelector(".pos").textContent }; });
  box.innerHTML = pmBodyHTML();
  pmBind(box);
  pmLabel();
  if (RM()) return;
  box.querySelectorAll(".pchip[data-k]").forEach(c => {
    const b = before[c.dataset.k], a = c.getBoundingClientRect();
    if (!b) { c.animate([{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: "ease-out" }); return; }
    const dx = b.r.left - a.left, dy = b.r.top - a.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    const changed = b.pos !== c.closest(".pm-row").querySelector(".pos").textContent;
    c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)" });
    if (changed) { c.classList.add("moved"); setTimeout(() => c.classList.remove("moved"), 1600); }
  });
}
function pmLabel() {
  const e = ST.elections.find(x => x.id === pmElection);
  const sub = document.getElementById("pmSub"); if (sub) sub.textContent = e ? "選挙を選ぶと、その時点の立場に党が移ります" : "各党が直近の国政選挙で掲げた立場";
  const h = document.getElementById("pmTitle"); if (h) h.textContent = e ? `${e.name}の時点の構図` : "いまの構図" + (ST.themes.some(t => t.id === curTheme) ? "" : "（全テーマ）");
  const nt = document.getElementById("pmNote"); if (nt) nt.innerHTML = e ? "" : pmNoteText();
  document.querySelectorAll("#pmSeg [data-pe]").forEach(b => b.setAttribute("aria-pressed", (b.dataset.pe || null) === pmElection));
  const seg = document.getElementById("pmSeg"), cb = seg && seg.querySelector('[aria-pressed="true"]');
  if (cb) seg.scrollLeft = cb.offsetLeft - seg.clientWidth / 2 + cb.offsetWidth / 2;
}
function stopPm() {
  if (pmTimer) { clearInterval(pmTimer); pmTimer = null; }
  const pb = document.getElementById("pmPlay"); if (pb) { pb.innerHTML = `${ic("play")}<span>2016→2026 各党の立場の移り変わりを再生</span>`; pb.setAttribute("aria-pressed", "false"); }
}
let pmOpen = null;
function renderPosmap() {
  const el = document.getElementById("posmap");
  const theme = ST.themes.find(t => t.id === curTheme);
  if (!theme && curTheme !== "all") { el.hidden = true; return; }
  el.hidden = false;
  const note = "<p><strong>いまの構図</strong></p><p>活動中の各党について、直近の国政選挙で掲げた立場ごとに党を並べています。選挙を選ぶと、その時点の立場に党が移動します。点線の党は、最新（2026年衆院選）ではなく、表示した年の選挙での立場です。</p><p>立憲民主党と公明党は、2026年衆院選では中道改革連合として戦ったため、それぞれ2025年参院選の立場を表示しています。</p>";
  const legend = `<div class="pm-legend"><span class="pchip t3">最重点</span><span class="pchip">記載あり</span><span class="pchip t1">触れる程度</span><span class="lg">${cmIcon("definite")}明言</span><span class="lg">${cmIcon("aim")}目標</span><span class="lg">${cmIcon("consider")}検討</span>${tip("info", "印の見方", "<p><strong>党名の太さ＝扱いの大きさ</strong>（公約の中での扱い。2026年衆院選のみ）</p><p>太字：公約の柱や冒頭に掲げる／通常：本文に記載または未判定／薄字：触れる程度</p><p><strong>丸印＝言い切り方</strong>（公約の文末）</p><p>● 明言（〜します・〜を実現）<br>◐ 目標（〜を目指します・推進）<br>○ 検討（検討を加速・議論を深める）</p><p>丸印がない党は未判定です。</p>")}</div>`;
  if (pmOpen === null) pmOpen = true;
  stopPm();
  const timebar = `<div class="pm-time"><button type="button" id="pmPlay" class="ibtn pm-play" aria-pressed="false"></button><div class="seg pm-eseg" id="pmSeg" role="group" aria-label="時点を選ぶ"><button type="button" data-pe="" aria-pressed="true">いま</button>${ST.elections.map(e => `<button type="button" data-pe="${e.id}" aria-pressed="false">${e.date.slice(0, 4)}${e.name.includes("参") ? "参" : "衆"}</button>`).join("")}</div></div>`;
  el.innerHTML = `<details class="pmfold"${pmOpen ? " open" : ""}><summary class="pm-head"><h2 id="pmTitle">いまの構図${theme ? "" : "（全テーマ）"}</h2><span class="pending" id="pmSub"></span></summary><div class="posmap">` + timebar
    + `<div id="pmBody">${pmBodyHTML()}</div><p class="pm-note" id="pmNote"></p><div class="pm-foot">${tip("info", "いまの構図とは", note, "<span>いまの構図とは</span>")}${legend}</div></div></details>`;
  el.querySelector("details").addEventListener("toggle", e => { pmOpen = e.target.open; if (!pmOpen) stopPm(); });
  el.querySelectorAll("#pmSeg [data-pe]").forEach(b => b.addEventListener("click", () => { stopPm(); setPmElection(b.dataset.pe || null); }));
  document.getElementById("pmPlay").addEventListener("click", e => {
    if (pmTimer) { stopPm(); return; }
    let i = 0; setPmElection(ST.elections[0].id); e.currentTarget.innerHTML = `${ic("stop")}<span>停止</span>`; e.currentTarget.setAttribute("aria-pressed", "true");
    pmTimer = setInterval(() => { i++; if (i >= ST.elections.length) { stopPm(); return; } setPmElection(ST.elections[i].id); }, 1800);
  });
  stopPm();
  pmLabel();
  pmBind(el);
}
// 最新の選挙の立場がない党（点線）について、理由をデータから1行で示す
function pmNoteText() {
  const theme = ST.themes.find(t => t.id === curTheme); if (!theme) return "";
  const last = ST.elections[ST.elections.length - 1];
  const olds = pmEntries(theme, null).filter(x => x.s && x.s.election !== last.id);
  if (!olds.length) return "";
  const merged = {}, other = [];
  olds.forEach(({ p, s }) => { const m = p.mergedInto && p.mergedInto[last.id]; const y = ST.elections.find(e => e.id === s.election).name; if (m) (merged[m] = merged[m] || []).push({ p, y }); else other.push({ p, y }); });
  const who = xs => xs.map(x => `${esc(x.p.name)}（${esc(x.y)}）`).join("・");
  const parts = Object.entries(merged).map(([m, xs]) => `${esc(last.name)}に${esc(SP[m].name)}として臨んだ党：${who(xs)}`)
    .concat(other.length ? [`${esc(last.name)}の立場がない党：${who(other)}`] : []);
  return `点線の党名は、それより前の選挙の立場です（かっこ内の選挙。党名の横の数字はその年）。${parts.join("。")}。`;
}
