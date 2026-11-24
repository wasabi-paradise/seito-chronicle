function renderMobileStance(theme) {
  document.getElementById("eseg").style.display = "";
  if (!curElection) curElection = ST.elections[ST.elections.length - 1].id;
  document.getElementById("eseg").innerHTML = ST.elections.map(e => `<button type="button" data-e="${e.id}" aria-pressed="${e.id === curElection}">${esc(e.name.replace("年", "年\u200b"))}</button>`).join("");
  document.querySelectorAll("#eseg [data-e]").forEach(b => b.addEventListener("click", () => { curElection = b.dataset.e; renderMobileStance(theme); }));
  const seg = document.getElementById("eseg"), curB = seg.querySelector('[aria-pressed="true"]');
  if (curB) seg.scrollLeft = curB.offsetLeft - seg.clientWidth / 2 + curB.offsetWidth / 2;
  const e = ST.elections.find(x => x.id === curElection);
  document.getElementById("mrows").innerHTML = `<p class="abbr">${tip("info", "党名の略称", `<p><strong>党名の略称</strong></p><p>${ST.parties.map(p => `${esc(p.short)}＝${esc(p.name)}`).join("<br>")}</p>`, "<span>党名の略称</span>")}</p>` + ST.parties.map(p => {
    if (notYetFor(p, e)) return "";
    if (p.mergedInto && p.mergedInto[e.id]) return `<div class="mrow na"><span class="pt">${esc(p.short)}</span><span>${esc(SP[p.mergedInto[e.id]].name)}として選挙に臨んだ</span></div>`;
    const s = ST.stances.find(x => x.party === p.id && x.theme === curTheme && x.election === e.id);
    if (!s) return `<div class="mrow na"><span class="pt">${esc(p.short)}</span><span>${ndLabel(p.id, curTheme, e.id)}</span></div>`;
    const pcm = prevChange(p.id, curTheme, e.id);
    return `<button type="button" class="mrow${pcm && pcm.kind === "chg" ? " chgd" : ""}" data-key="${p.id}|${e.id}"><span class="go" aria-hidden="true">›</span><span class="pt">${esc(p.short)}${pcm ? "<br>" + CHG(pcm) : ""}</span>
      <span class="mpos">${s.asName ? `<span class="as">${esc(s.asName)}として</span>` : ""}<span class="pos" style="${posStyle(theme, s.position)}">${esc(theme.scale.find(x => x.id === s.position).label)}</span></span>
      <span class="cellmeta">${s.commit ? `<span class="tip" role="img" aria-label="言い切り方：${cmLabel(s.commit)}">${cmIcon(s.commit)}</span>` : ""}${s.temp === null || s.temp === undefined ? "" : tempIcon(s.temp)}${s.flag ? `<span class="tip" role="img" aria-label="要確認">${ic("flag")}</span>` : ""}</span></button>`;
  }).join("");
  document.querySelectorAll("#mrows .mrow[data-key]").forEach(b => b.addEventListener("click", () => { curCell = b.dataset.key; renderCellDetail(); openSheet("spanel"); }));
}
const OUT_COLOR = { realized: "#3f7f8c", modified: "#5f81a8", postponed: "#7b6ea8", inprogress: "#8c7a45", disputed: "#7d7d7d", reversed: "#a8613f", changed: "#8a6a8f", emphasis: "#6d8662" };
Object.keys(OUT_COLOR).forEach(k => { OUT_COLOR[k] = readableBg(OUT_COLOR[k]); });
// 結果の区分は色だけでなく形の違う記号でも示す
function outIc(id) { return ICONS["o_" + id] ? ic("o_" + id) : ""; }
const CMP_ICON = { action: "after", pledge: "between", merger: "merger" };
let oFilter = null, pFilter = null;
const PRIMARY_KINDS = new Set(["政府資料", "国会会議録", "国会資料", "政党の公式発表", "政党間の合意文書", "政府間の合意文書", "政党の公約原文", "政党の回答", "選挙公報", "政党の公式資料"]);
function pSrc(ids) {
  return ids.map((id, n) => `<a href="${esc(PL.sources[id].url)}" target="_blank" rel="noopener" title="${esc(PL.sources[id].title)}"${PRIMARY_KINDS.has(PL.sources[id].kind) ? ' style="font-weight:600"' : ""}>[${n + 1}] ${esc(PL.sources[id].kind)}</a>`).join("");
}
// 比較表のあるテーマ＋「その他」（比較表のないテーマの記録をまとめる）
function allThemes() {
  return [...ST.themes.map(t => ({ id: t.id, name: t.name, matrix: true })), { id: "other", name: "その他（税・給付など）", matrix: false }];
}
const isExtra = id => PL.extraThemes.some(t => t.id === id);
function themeName(id) { const t = [...ST.themes, ...PL.extraThemes].find(x => x.id === id); return t ? t.name : ""; }
// 記録：ある時点の表明（公約・発言など）と、その後（決定・次の公約・合流後の公約）を並べたもの
function allRecords() {
  return PL.records.map(r => ({ ...r, id: "rec-" + r.id, group: isExtra(r.theme) ? "other" : r.theme })).sort((a, b) => toYear(a.date) - toYear(b.date));
}
function recordHTML(r) {
  const O = Object.fromEntries(PL.outcomes.map(o => [o.id, o]));
  const o = O[r.outcome];
  const steps = r.steps.length ? `<ol class="steps">${r.steps.map(e => `<li><div class="d">${fmt(e.date)}</div><div class="l">${esc(e.label)}</div><div>${esc(e.text)}</div><div class="s">${pSrc(e.sources)}</div></li>`).join("")}</ol>` : "";
  const st = r.statement;
  const ck = PL.commitKinds[r.commit];
  return `<article class="pledge compact" id="${r.id}">
    <header>
      <div class="who">${tip(CMP_ICON[r.compare], PL.compares[r.compare], `<p><strong>${esc(PL.compares[r.compare])}</strong></p>`)}${tip(COMMIT_ICON[r.commit] || "doc", ck, `<p><strong>最初の表明：${esc(ck)}</strong></p>` + (r.commit === "leader" ? "<p>選挙公約の文書ではなく、党の代表が選挙戦などで約束した内容です。</p>" : ""))}${r.fromParty ? `<button type="button" class="linkbtn" data-keifu="${r.fromParty}">${esc(P[r.fromParty].name)}</button><span>→</span>` : ""}<button type="button" class="linkbtn" data-keifu="${r.party}">${esc(P[r.party].name)}</button><span>${r.fromParty ? `${fmt(r.date)}の公約から` : fmt(r.date)}</span>${curAxis === "party" || curTheme === "all" || curTheme === "other" ? `<span class="kindpill">${esc(themeName(r.theme))}</span>` : ""}${r.era === "pre2003" ? tip("info", "2003年以前の事例", "<p>マニフェスト導入（2003年）より前の大きな事例です。</p>") : ""}${r.flag ? FLAG(r.flag) : ""}</div>
      <h3>${esc(r.title)}</h3>
    </header>
    ${r.steps.length ? `<p class="flow"><span><small>${fmt(st.date)}</small>${esc(st.label || ck)}</span><span class="rp-arrow" aria-label="その後">→</span><span><small>${fmt(r.steps[r.steps.length - 1].date)}</small>${esc(r.steps[r.steps.length - 1].label)}</span></p>` : ""}
    <div class="res"><span class="opill" style="background:${OUT_COLOR[r.outcome]}">${outIc(r.outcome)}${esc(o.label)}</span>${tip("info", "結果の区分", `<p><strong>${esc(o.label)}</strong></p><p>${esc(o.desc)}</p>`)}${recCheckIcon(r)}<span class="rshare"><button type="button" class="linkbtn" data-rec-share="${r.id}">${ic("share")}<span>この記録を共有</span></button><span class="pending" data-act-msg role="status"></span></span></div>
    <details class="more"><summary>${ic("chev")}詳しく（最初の表明と、その後${r.steps.length}件）</summary>
      <div class="inner">
        ${recCheckLine(r)}<div class="col"><h4>最初の表明${st.label ? "：" + esc(st.label) : ""}（${fmt(st.date)}）</h4><blockquote>${esc(st.text)}</blockquote><div class="srcs">${pSrc(st.sources)}</div>${r.summary ? `<h4>${r.compare === "action" ? "結果" : "背景"}</h4><p style="margin:0">${esc(r.summary)}</p>` : ""}${r.note ? `<p class="note">${ic("info")}<span><strong>注記</strong>　${esc(r.note)}</span></p>` : ""}</div>
        <div class="col"><h4>その後</h4>${steps}</div>
      </div>
    </details>
  </article>`;
}
// 記録の照合状況：full＝表明とその後のすべての項目に一次資料がある／partial＝一部の項目のみ
function recCheckLabel(r) {
  const c = r.check; if (!c) return "一次資料との照合前（未確認）";
  return c.level === "full" ? "一次資料で照合済み" : c.level === "partial" ? `一部（${c.of}項目中${c.n}項目）を一次資料で照合` : "一次資料との照合前（未確認）";
}
function recCheckIcon(r) {
  const c = r.check, lab = recCheckLabel(r);
  return c && c.level === "full" ? `<span class="tip" role="img" aria-label="${lab}" title="${lab}">${ic("ok")}</span>` : tip("unverified", lab, `<p><strong>${esc(lab)}</strong></p>${c && c.text ? `<p>${esc(c.text)}</p>` : ""}`);
}
function recCheckLine(r) {
  const c = r.check; if (!c) return "";
  const lab = recCheckLabel(r);
  const txt = c.text || "表明とその後の各項目に、官公庁・国会・党の公式文書などの一次資料を付けて確認しました。";
  return `<p class="meta-row" style="font-size:13px;grid-column:1/-1;margin:0 0 4px">${c.level === "full" ? ic("ok") : UNV()}<span>${esc(lab)}（${fmt(c.on)}）：${esc(txt)}</span></p>`;
}
function renderRecords() {
  // 党の画面：その党の記録と、前身の党（系譜上の流れ）の記録。前身の党の記録は、その流れをくむすべての党に同じように出す
  const lin = curAxis === "party" ? new Set(SP[curParty].lineage || [SP[curParty].genealogy]) : null;
  const own = curAxis === "party" ? SP[curParty].genealogy : null;
  const rq = (document.getElementById("rsearch").value || "").trim();
  const hit = r => [r.title, r.statement.text, r.summary || "", ...r.steps.map(x => x.label + x.text), P[r.party].name].join(" ").includes(rq);
  const inTheme = rq ? allRecords().filter(hit) : curAxis === "party" ? allRecords().filter(r => lin.has(r.party) || (r.fromParty && lin.has(r.fromParty))) : allRecords().filter(r => curTheme === "all" || r.group === curTheme);
  document.getElementById("recTitle").textContent = rq ? `「${rq}」を含む記録（すべてのテーマ）` : curAxis === "party" ? `${SP[curParty].short}の表明とその後` : curTheme === "all" ? "すべての記録" : "表明とその後";
  const obar = document.getElementById("obar");
  obar.hidden = !inTheme.length;
  obar.innerHTML = PL.outcomes.map(o => {
    const n = inTheme.filter(r => r.outcome === o.id).length;
    return n ? `<button type="button" class="ofilter" data-o="${o.id}" aria-pressed="${oFilter === o.id}"><span class="opill" style="background:${OUT_COLOR[o.id]}">${outIc(o.id)}${esc(o.label)}</span><b>${n}</b></button>` : "";
  }).join("");
  let list = oFilter ? inTheme.filter(r => r.outcome === oFilter) : inTheme;
  const parties = [...new Set(list.map(r => r.party))];
  const pbar = document.getElementById("pbar");
  pbar.hidden = parties.length < 3 || curAxis === "party";
  pbar.innerHTML = '<button type="button" data-p="" aria-pressed="' + (!pFilter) + '">すべての党</button>'
    + parties.map(id => `<button type="button" data-p="${id}" aria-pressed="${pFilter === id}">${esc(P[id].name)}</button>`).join("");
  if (pFilter) list = list.filter(r => r.party === pFilter);
  document.getElementById("chcount").textContent = `${list.length}件`;
  const nFull = PL.records.filter(r => r.check && r.check.level === "full").length, nPart = PL.records.filter(r => r.check && r.check.level === "partial").length;
  document.getElementById("recUnv").innerHTML = tip("info", "確認状況", `<p><strong>確認状況</strong></p><p>${PL.records.length}件のうち${nFull}件は、表明とその後のすべての項目を一次資料（官公庁・国会の資料、党の公約・公式発表など）で照合済み（${ic("ok")}）。${nPart}件は一部の項目のみ照合済みで、残りは報道・研究などによります。</p><p>出典のリンクは一次資料を先に並べています。</p>`) + " " + tip("info", "記録の選び方", `<p><strong>記録は事例集です（網羅ではありません）</strong></p><p>党の公約や表明のうち、その後の決定・次の公約・合流後の公約を資料で確かめられたものを選んで載せています。各党の公約をすべて判定したものではありません。「その後の決定」は政権を担った党で確かめやすいため、与党の期間が長い党の記録が多くなります。</p><p>前身の党の記録（例：民主党）は、その流れをくむすべての党の画面に同じように表示しています。</p><p>党ごとの件数：${Object.entries(PL.records.reduce((a, r) => (a[r.party] = (a[r.party] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${esc(P[id].name)} ${n}`).join("、")}</p>`, "<span>記録の選び方</span>");
  if (curAxis === "party" && !rq) {
    const isMine = r => r.party === own || r.fromParty === own, mine = list.filter(isMine), pred = list.filter(r => !isMine(r));
    const predNames = [...new Set(pred.map(r => P[r.party].name))].join("・");
    document.getElementById("records").innerHTML = (mine.length ? mine.map(recordHTML).join("") : `<p class="pending">${esc(SP[curParty].name)}自身の記録はまだありません。記録は網羅的なものではなく、選んだ事例です（与党の期間が長い党ほど、政府としての実行を追える事例が多くなります）。</p>`)
      + (pred.length ? `<h3 class="recsub">前身の党の記録（${esc(predNames)}）</h3><p class="pending" style="font-size:13px">系譜の上で前身にあたる党の記録です。同じ前身をもつ党（例：民主党の記録は立憲民主党と国民民主党）には、同じように表示しています。</p>` + pred.map(recordHTML).join("") : "");
  } else document.getElementById("records").innerHTML = list.map(recordHTML).join("") || '<p class="pending">このテーマの記録はまだありません。</p>';
  document.querySelectorAll("#obar [data-o]").forEach(b => b.addEventListener("click", () => { oFilter = oFilter === b.dataset.o ? null : b.dataset.o; renderRecords(); }));
  document.querySelectorAll("#pbar [data-p]").forEach(b => b.addEventListener("click", () => { pFilter = b.dataset.p || null; renderRecords(); }));
  document.querySelectorAll("#records [data-keifu]").forEach(b => b.addEventListener("click", () => { showView("keifu"); select(b.dataset.keifu); scrollToParty(b.dataset.keifu); }));
  document.querySelectorAll("#records [data-rec-share]").forEach(b => b.addEventListener("click", () => { const r = allRecords().find(x => x.id === b.dataset.recShare); shareLink(pageURL(b.dataset.recShare), (r ? r.title + " ｜ " : "") + "政党クロニクル", b.parentElement.querySelector("[data-act-msg]")); }));
}
document.getElementById("rsearch").addEventListener("input", () => { oFilter = null; pFilter = null; renderRecords(); });
function renderCriteria() {
  document.getElementById("criteria").innerHTML = `
    <p><strong>立場</strong>は、各選挙で党が発表した公約・政策集の内容を、テーマごとの区分に当てはめています。</p>
    <p><strong>根拠にする資料の順番</strong>は次のとおりです。上の資料で判断できない場合に、下の資料を使います。</p>
    <ol style="margin:0;padding-left:1.4em">
      <li>党の公約の原文（公約パンフレット・政策BANKなど、選挙公報を含む）。公約本体と政策集で書き方が違う場合は公約本体を採り、政策集の内容は注記します</li>
      <li>公約に記載がない場合は、党が回答した政策アンケート（選挙ドットコム）</li>
      <li>選挙公約の文書が見つからない場合は、党の基本政策などの公式資料</li>
    </ol>
    <p id="surveyShare"></p>
    <p>報道、第三者がまとめた公約比較表・まとめ記事、団体による公約の抜粋は、根拠に使いません。上の資料で立場を確認できないマスは「党の資料で確認できず」として空欄にしています。</p>
    <p><strong>テーマの選び方</strong>：各党の立場が区分で分かれ、党の資料（公約・選挙公報・党のアンケート回答）で比べられるテーマを選んでいます。景気対策・医療や介護・年金などは、有権者が選挙で考慮した問題の上位にあります（選挙と議席の画面の「有権者が考慮した問題」）が、多くの党が拡充や充実を掲げていて立場の違いを区分にしにくいため、対象にしていません。</p>
    <p>テーマごとの区分の決め方は、各テーマの問いの横にある説明に載せています。</p>
    <p><strong>扱いの大きさ</strong>は、公約の中でそのテーマをどれだけ大きく扱っているかで判定します。判定がそろっている2026年衆院選のマスだけに表示し、それ以外の年は表示していません。資料が足りない場合は「未判定」です。</p>
    <dl>${ST.temperatureScale.map(t => `<dt>${"■".repeat(t.v)}${"□".repeat(3 - t.v)} ${esc(t.label)}</dt><dd>${esc(t.desc)}</dd>`).join("")}</dl>
    <p><strong>言い切り方</strong>は、公約の文末の表現で判定します（原文の表現は各マスの詳細に載せています）。</p>
    <dl>${(ST.commitScale || []).map(c => `<dt>${cmIcon(c.id)} ${esc(c.label)}</dt><dd>${esc(c.desc)}</dd>`).join("")}</dl>
    <p><strong>表明とその後</strong>は、党がある時点で掲げたこと（公約・党首の発言など）と、その後に起きたこと（決定・次の公約・合流後の公約）を、評価の言葉を使わずに並べたものです。結果の区分は次のとおりです。</p>
    <dl>${PL.outcomes.map(o => `<dt><span class="opill" style="background:${OUT_COLOR[o.id]}">${outIc(o.id)}${esc(o.label)}</span></dt><dd>${esc(o.desc)}</dd>`).join("")}</dl>
    <p>比べた相手はアイコンで示しています：${ic("after")} その後の決定・実施　${ic("between")} 次の公約　${ic("merger")} 合流後の公約</p>
    <p>2003年（マニフェスト導入）以降を中心にし、それ以前は大きな事例だけを載せています。</p>
    <p>記録は、党の公約や表明について、その後の決定・次の公約・合流後の公約を資料で確かめられたものを載せています。「その後の決定」は政権を担った党で確かめやすいため、与党経験のある党の記録が多くなっています。</p>`;
  const sv = ST.stances.filter(x => evClass(x) === "survey");
  const by = ST.parties.map(p => { const all = ST.stances.filter(x => x.party === p.id), n = all.filter(x => evClass(x) === "survey").length; return all.length ? `${p.short || p.name} ${n}/${all.length}` : ""; }).filter(Boolean);
  document.getElementById("surveyShare").innerHTML = `<strong>アンケートの回答だけが根拠のマス</strong>は、全${ST.stances.length}マスのうち${sv.length}マスです。党によって割合が違うため、比べるときは各マスの根拠の種類も見てください（党ごと：${esc(by.join("、"))}）。`;
}

// ---- mobile: list & sheets ----
const isMobile = () => matchMedia("(max-width: 720px)").matches;
let sheetOpener = null;
function openSheet(id) {
  if (!isMobile()) return;
  document.querySelectorAll(".sheet.open").forEach(s => { if (s.id !== id) s.classList.remove("open"); });
  const el = document.getElementById(id);
  if (!el.classList.contains("open")) sheetOpener = document.activeElement;
  el.classList.add("open"); el.scrollTop = 0;
  el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  const h = el.querySelector("h2"); if (h) { el.setAttribute("aria-label", h.textContent); h.setAttribute("tabindex", "-1"); setTimeout(() => h.focus({ preventScroll: true }), 50); }
  document.getElementById("backdrop").hidden = false;
  document.body.style.overflow = "hidden";
}
