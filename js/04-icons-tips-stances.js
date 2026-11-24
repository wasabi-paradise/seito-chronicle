function ic(name, cls = "ic") { return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`; }
// 吹き出し：data-tip の内容をタップ／クリックで表示する
function tip(icon, label, html, extra = "") { return `<button type="button" class="tip" aria-label="${esc(label)}" aria-expanded="false" data-tip="${esc(html)}">${ic(icon)}${extra}</button>`; }
const bubble = document.getElementById("bubble");
let bubbleOwner = null;
function hideBubble() { bubble.hidden = true; if (bubbleOwner) bubbleOwner.setAttribute("aria-expanded", "false"); bubbleOwner = null; }
document.addEventListener("click", e => {
  const t = e.target.closest(".tip");
  if (!t) { if (!e.target.closest("#bubble")) hideBubble(); return; }
  e.preventDefault(); e.stopPropagation();
  if (bubbleOwner === t) { hideBubble(); return; }
  hideBubble();
  bubble.innerHTML = t.dataset.tip; t.after(bubble); bubble.hidden = false; bubbleOwner = t; t.setAttribute("aria-expanded", "true");
  const r = t.getBoundingClientRect(), bw = bubble.offsetWidth, bh = bubble.offsetHeight;
  let left = Math.min(Math.max(12, r.left + r.width / 2 - bw / 2), innerWidth - bw - 12);
  let top = r.bottom + 8; if (top + bh > innerHeight - 12) top = Math.max(12, r.top - bh - 8);
  bubble.style.left = left + "px"; bubble.style.top = top + "px";
}, true);
document.addEventListener("keydown", e => { if (e.key === "Escape") { const o = bubbleOwner; hideBubble(); if (o) o.focus(); } });
document.addEventListener("focusin", e => { if (bubbleOwner && e.target !== bubbleOwner && !bubble.contains(e.target)) hideBubble(); });
addEventListener("scroll", hideBubble, { passive: true, capture: true });
const TIPS = {
  ctxrule: `<p><strong>背景・論点と結果の書き方</strong></p><p>0. 「選挙の前に起きていたこと」は、国会会議録（採決の結果・演説・討論など）や政府資料、調査機関の報告書に書かれた事実を、日付と出典をつけて並べます。国会での賛否が分かれた出来事は、賛成側と反対側の両方の説明を載せます。</p><p>1. 「論点」は、選挙公約や選挙報道を分析した研究者の論文（学会誌など）から引用します。選挙のあとに当事者が述べた発言は、論点には入れません。</p><p>2. 「有権者が考慮した問題」は、明るい選挙推進協会が選挙後に全国の有権者に行った調査の単純集計（割合）をそのまま載せます。この協会の報告書から使うのは、調査の数字と、記述であることを明記した事実だけです。割合の母数（回答者全体か、投票した人だけか）、選択肢の数、調査方法や回収率は報告書ごとに違うため、比べるときは出典の報告書で確かめてください。</p><p>3. 「この選挙についての研究者の分析」は、その選挙を調査・分析した研究者の論文から、誰の分析かを示して引用します。分析が扱っているのは結果の理由に限らず、報道のされ方・候補者の発信・有権者の政策の好みなどさまざまです。分析が複数あれば並べます。</p><p>論文はいずれも日本選挙学会『選挙研究』（J-STAGEで公開）の<strong>要旨（抄録）</strong>から引用しています。本文全体の要約ではありません。調査の対象や方法（無作為に選んだ標本か、オンラインのモニター調査かなど）は論文ごとに違うため、出典の論文で確かめてください。</p><p>4. 当事者の受け止めは、選挙後に首相が行った最初の所信表明演説と、野党第一党の代表質問のうち、選挙結果に触れた部分を同じくらいの長さで引用します。所信表明がない場合は、選挙後最初の国会審議の発言を使います。「勝った」「負けた」といった評価の言葉は使わず、役職で示します。</p><p>5. 英語の要旨しかない論文は、原文を引用したうえで和訳を添えます（和訳はこのサイトによる）。</p><p>6. 報道機関の解説記事やまとめ記事は使いません。どの説明が正しいかを、このサイトは判断しません。資料が見つからない欄には「該当資料なし」と、確認した時点を書きます。</p>`,
  gevrule: `<p><strong>経緯の書き方</strong></p><p>1. 冒頭の要約と出来事は、資料に書かれた事実だけを日付と出典つきで書きます。前提（前の首相の退陣など）と結末（次の内閣・連立の構成）も入れます。</p><p>2. 当事者の説明は、主な当事者ごとに1つずつ、本人の発言や党の発表を引用します。首相本人と、新しく政権・与党に加わった側も含めます。並び順は「動いた側 → 受けた側 → その他」です。反論に対する再反論は載せません。</p><p>3. 本人の説明が資料で見つからない場合は、そのことを書き、推測で補いません。</p><p>4. 資料どうしが食い違う場合は、まず会議録などの一次資料で確かめ、それでも決まらないものだけを注記に両論で書きます。</p><p>5. 研究者の資料（論文など）は、誰の資料かを示して載せます。報道機関の解説記事は使いません。</p>`,
  about: `<p><strong>このサイトについて</strong></p><p>1945年から現在までの主要政党が、どこから生まれ、どう合流し分かれてきたか。各党が政策にどんな立場をとり、公約がその後どうなったかをたどります。</p><p>小政党や短命の政党の多くは省略しています。</p>`,
  keifu: `<p>帯（スマホでは一覧の行）を選ぶと、前身・後継・与党だった期間と出典が出ます。その党につながる系譜が強調されます。</p><p>上端の「首相・政権」の帯を選ぶと、その内閣の与党が強調されます。</p>`,
  gov: `<p><strong>政権・与党</strong></p><p>図の上端の帯は首相の在任期間で、色は首相の党の系統です。帯を選ぶと内閣と与党の構成が出ます。</p><p>各党の帯の下端の線は与党だった期間です。<br>濃い線：首相を出した党<br>薄い線：連立与党（閣僚を出した）<br>点線：閣外協力</p><p>首相が替わるごとに区切り、連立の組み替えは同じ首相の中でも区切っています。</p>`,
  lines: `<p>線の種類</p><p>━ 合流・改称<br>┅ 分裂・離党<br>┈ 議員の移籍（党ではなく所属議員の多くが移ったこと）</p>`,
  party: `<p><strong>政党で見る</strong></p><p>党を選ぶと、その党がテーマごとにどんな立場をとってきたかを、選挙ごとに並べます。前身の党の時期は「民進党として」のように示します。</p><p>2026年衆院選では、立憲民主党と公明党の衆院議員は中道改革連合として戦ったため、その公約を表示しています。</p><p>「比べる党」を選ぶと、2つの党の立場を上下に並べて比べられます。</p>`,
  seisaku: `<p>「テーマで見る」ではテーマごとに全党を、「政党で見る」では党ごとに全テーマを比べられます。</p><p>テーマを選ぶと、2016年以降の国政選挙（8回）で各党が掲げた立場と、「表明とその後」の記録が表示されます。マスや記録を選ぶと出典をたどれます。</p>`,
  unverified: `<p><strong>未確認</strong></p><p>一次資料（公約原文・公式発表・国会資料など）と照合できていない項目です。</p>`,
  temp: `<p><strong>扱いの大きさ</strong>：公約の中での扱いの大きさ（2026年衆院選のみ）</p><p>■■■ 最重点　■■□ 具体的に記載<br>■□□ 触れる程度　□□□ 記載なし<br>点線 未判定（資料が足りない）</p>`
};
function tempIcon(v, basis) {
  const lab = v === null || v === undefined ? "未判定" : ST.temperatureScale.find(t => t.v === v).label;
  const bars = `<span class="temp${v === null || v === undefined ? " none" : ""}">${[1, 2, 3].map(i => `<i class="${v !== null && v !== undefined && i <= v ? "f" : ""}"></i>`).join("")}</span>`;
  return `<span class="tip" role="img" aria-label="扱いの大きさ：${lab}">${bars}</span>`;
}
function tempTip(v, basis) {
  const lab = v === null || v === undefined ? "未判定" : ST.temperatureScale.find(t => t.v === v).label;
  const bars = `<span class="temp${v === null || v === undefined ? " none" : ""}">${[1, 2, 3].map(i => `<i class="${v !== null && v !== undefined && i <= v ? "f" : ""}"></i>`).join("")}</span>`;
  return `<button type="button" class="tip" aria-label="扱いの大きさ：${lab}" aria-expanded="false" data-tip="${esc(`<p><strong>扱いの大きさ：${lab}</strong></p>` + (basis ? `<p>${esc(basis)}</p>` : "") + TIPS.temp.replace(/^<p><strong>温度感<\/strong>：公約での扱いの大きさ<\/p>/, ""))}">${bars}</button>`;
}
const CM_SVG = { definite: '<circle cx="5" cy="5" r="4" fill="currentColor"/>', aim: '<circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 1a4 4 0 0 1 0 8z" fill="currentColor"/>', consider: '<circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/>' };
function cmIcon(c) { return c ? `<svg class="cm" viewBox="0 0 10 10" aria-hidden="true">${CM_SVG[c]}</svg>` : ""; }
function cmLabel(c) { const x = (ST.commitScale || []).find(y => y.id === c); return x ? x.label : "未判定"; }
function verLegend() {
  const ok = ST.stances.filter(s => s.verified).length, all = ST.stances.length;
  return tip("ok", "確認状況", `<p><strong>確認状況</strong></p><p>表示している${all}件はすべて、党の公約原文・選挙公報・党の公式資料、または党が回答した政策アンケートで文言を確認しています（マスの詳細に✓の印と引用）。報道や第三者の比較表・まとめ記事は根拠に使っていません。党の資料で確認できなかったマスは「${NDTXT}」としています。</p>`, `<span>党の資料で確認 ${ok}/${all}件（全テーマ）</span>`);
}
const VER = s => { const k = (ST.sources[s.sources[0]] || {}).kind || ""; const w = s.wording || ""; const lab = (w.startsWith("アンケート") || w.startsWith("（公約に記載なし）アンケート") || k === "政党の回答") ? "党のアンケート回答で確認済み" : k === "政党の公式資料" ? "党の公式資料で確認済み" : k === "政党の機関紙" ? "党の機関紙掲載の公約で確認済み" : "公約原文で確認済み"; return `<span class="tip" role="img" aria-label="${lab}">${ic("ok")}</span><span>${lab}${s.verifiedOn ? "（" + fmt(s.verifiedOn) + "）" : ""}</span>`; };
const UNV = () => tip("unverified", "未確認", TIPS.unverified);
// 党の資料（公約・公式資料・アンケート回答）で立場を確認できなかったマス
const isND = (pid, th, eid) => (ST.nodata || []).some(x => x.party === pid && x.theme === th && x.election === eid);
const NDTXT = "党の資料で確認できず";
const ndLabel = (pid, th, eid) => isND(pid, th, eid) ? NDTXT : "未調査";
const NDTIP = () => tip("info", "党の資料で確認できず", "<p><strong>党の資料で確認できず</strong></p><p>党の公約・公式資料・党が回答したアンケートのいずれでも、このテーマの立場を確認できなかったマスです。報道や第三者の比較表・まとめ記事は根拠に使わないため、空欄にしています。</p>");
const FLAG = t => tip("flag", "要確認", `<p><strong>要確認</strong></p><p>${esc(t)}</p>`);
const COMMIT_ICON = { manifesto: "doc", leader: "mic", partyline: "banner", agreement: "agree" };
const KIND_ICON = { after: "after", between: "between", merger: "merger", temperature: "temp" };

// ---- stances view ----
const KIND_LABEL = { after: "選挙後の実施内容", between: "選挙間での公約の変化", merger: "合流による変化", temperature: "扱いの大きさの変化" };
const SP = Object.fromEntries(ST.parties.map(p => [p.id, p]));
let curTheme = ST.themes[0].id, curCell = null, curElection = null, curAxis = "theme", curParty = "jimin", curParty2 = null; let ptMode = "election", cmpOpen = false;

function tempHTML(v) {
  if (v === null || v === undefined) return '<span>扱いの大きさ：未判定</span>';
  const lab = ST.temperatureScale.find(t => t.v === v).label;
  return `<span class="temp" aria-label="扱いの大きさ ${v}/3 ${lab}">${[1, 2, 3].map(i => `<i class="${i <= v ? "f" : ""}"></i>`).join("")}</span><span>${lab}</span>`;
}
function posStyle(theme, posId) {
  const i = theme.scale.findIndex(s => s.id === posId);
  const bg = readableBg(theme.palette[i]);
  return `background:${bg};color:${onColor(bg)}`;
}
function srcLinks(ids) {
  return ids.map((id, n) => `<a href="${esc(ST.sources[id].url)}" target="_blank" rel="noopener" title="${esc(ST.sources[id].title)}">[${n + 1}] ${esc(ST.sources[id].kind)}</a>`).join("");
}
function renderThemebar() {
  const bar = document.getElementById("themebar");
  bar.innerHTML = allThemes().map(t => `<button type="button" class="tbtn" data-theme="${t.id}" aria-pressed="${t.id === curTheme}">${themeIc(t.id)}${esc(t.name)}</button>`).join("")
    + `<button type="button" class="tbtn tall" data-theme="all" aria-pressed="${curTheme === "all"}">${themeIc("all")}すべてのテーマ</button>`
    + `<span class="soon" style="display:inline-flex">${tip("info", "この画面の見方", TIPS.seisaku)}</span>`;
  bar.querySelectorAll("[data-theme]").forEach(b => b.addEventListener("click", () => { curTheme = b.dataset.theme; curCell = null; oFilter = null; pFilter = null; renderStances(); setHash("seisaku-" + curTheme); }));
}
function seisakuHash() { return curAxis === "party" ? "seito-" + curParty + (curParty2 ? "~" + curParty2 : "") : "seisaku-" + curTheme + (curCell ? "~" + curCell.replace("|", "~") : ""); }
// #seisaku-テーマ~党~選挙 を読み取る（マス単位のURL）
function parseSeisaku(h) {
  const [base, pid, eid] = h.split("~"); const t = base.split("-")[1];
  const ok = t && (t === "all" || allThemes().some(x => x.id === t));
  const cell = ok && pid && eid && ST.stances.some(x => x.party === pid && x.theme === t && x.election === eid) ? pid + "|" + eid : null;
  return { t: ok ? t : null, cell };
}
function openCellFromHash(cell) {
  if (!cell) return;
  requestAnimationFrame(() => {
    const c = document.querySelector(`#matrix .cell[data-key="${cell}"]`); if (!c) return;
    renderCellDetail(); openSheet("spanel");
    const w = document.getElementById("matrix").parentElement; w.scrollLeft = Math.max(0, c.offsetLeft - w.clientWidth / 2);
    if (!isMobile()) c.scrollIntoView({ block: "center" });
  });
}
function renderAxisSeg() {
  document.querySelectorAll("#axisSeg [data-axis]").forEach(b => b.setAttribute("aria-pressed", b.dataset.axis === curAxis));
}
document.querySelectorAll("#axisSeg [data-axis]").forEach(b => b.addEventListener("click", () => {
  if (curAxis === b.dataset.axis) return;
  curAxis = b.dataset.axis; curCell = null; oFilter = null; pFilter = null;
  if (curAxis === "theme" && !allThemes().some(t => t.id === curTheme) && curTheme !== "all") curTheme = ST.themes[0].id;
  renderStances(); setHash(seisakuHash());
}));
// 政党で見る：ある党の、テーマ × 選挙の立場
function stanceFor(pid, themeId, e) {
  const p = SP[pid];
  if (notYetFor(p, e)) return { notYet: true };
  if (p.mergedInto && p.mergedInto[e.id]) {
    const ps = p.mergedInto[e.id];
    return { s: ST.stances.find(x => x.party === ps && x.theme === themeId && x.election === e.id), ps, via: SP[ps].name };
  }
  return { s: ST.stances.find(x => x.party === pid && x.theme === themeId && x.election === e.id), ps: pid };
}
function partyCellInner(theme, r) {
  const s = r.s;
  const as = r.via ? `<span class="as">${esc(r.via)}として</span>` : asTag(s);
  return `${as}<span class="pos" style="${posStyle(theme, s.position)}">${esc(theme.scale.find(x => x.id === s.position).label)}</span>
        <span class="cellmeta">${s.commit ? `<span class="tip" role="img" aria-label="言い切り方：${cmLabel(s.commit)}">${cmIcon(s.commit)}</span>` : ""}${s.temp === null || s.temp === undefined ? "" : tempIcon(s.temp)}${s.flag ? `<span class="tip" role="img" aria-label="要確認">${ic("flag")}</span>` : ""}</span>`;
}
function openPartyCell(themeId, key) {
  curTheme = themeId; curCell = key;
  document.querySelectorAll("#matrix .cell").forEach(x => x.classList.toggle("sel", x.dataset.key === key && x.dataset.theme === themeId));
  renderCellDetail(); openSheet("spanel");
}
function renderPartyView() {
  const p = SP[curParty];
  const bar = document.getElementById("themebar");
  bar.innerHTML = ST.parties.map(x => `<button type="button" class="pbtn" data-party="${x.id}" aria-pressed="${x.id === curParty}">${esc(x.short)}</button>`).join("")
    + `<span class="soon" style="display:inline-flex">${tip("info", "政党で見る", TIPS.party)}</span>`;
  bar.querySelectorAll("[data-party]").forEach(b => b.addEventListener("click", () => { curParty = b.dataset.party; if (curParty2 === curParty) curParty2 = null; curCell = null; oFilter = null; renderStances(); setHash(seisakuHash()); }));
  const p2 = curParty2 ? SP[curParty2] : null;
  document.getElementById("posmap").hidden = true;
  document.getElementById("recprev").hidden = true;
  document.getElementById("chgOnlyWrap").hidden = true;
  document.getElementById("nomatrix").hidden = true;
  document.getElementById("matrixArea").hidden = false;
  document.getElementById("themeq").innerHTML = p2 ? `${esc(p.short)}と${esc(p2.short)}：テーマごとの立場を並べて比べる（上が${esc(p.short)}、下が${esc(p2.short)}）` : `${esc(p.name)}：テーマごとの立場の移り変わり`;
  // 比べる党：ボタンで党の一覧を開き、選ぶと2党を上下に並べる
  const cmp = p2 ? `<span class="cmpbar"><button type="button" class="ibtn" data-cmp-off>${ic("close")}<span>${esc(p2.short)}との比較をやめる</span></button></span>`
    : cmpOpen ? `<span class="cmpbar" role="group" aria-label="並べる党を選ぶ"><span class="pending">並べる党：</span>${ST.parties.filter(x => x.id !== curParty).map(x => `<button type="button" class="pbtn" data-cmp="${x.id}">${esc(x.short)}</button>`).join("")}<button type="button" class="linkbtn" data-cmp-off>やめる</button></span>`
    : `<span class="cmpbar"><button type="button" class="ibtn cmp-open" data-cmp-open><b aria-hidden="true">＋</b><span>ほかの党と並べて比べる</span></button></span>`;
  document.getElementById("themeq").insertAdjacentHTML("beforeend", cmp + partyCtxHTML(curParty));
  document.querySelectorAll("#themeq [data-cmp]").forEach(b => b.addEventListener("click", () => { curParty2 = b.dataset.cmp; cmpOpen = false; curCell = null; renderStances(); setHash(seisakuHash()); }));
  document.querySelectorAll("#themeq [data-cmp-off]").forEach(b => b.addEventListener("click", () => { curParty2 = null; cmpOpen = false; curCell = null; renderStances(); setHash(seisakuHash()); }));
  document.querySelectorAll("#themeq [data-cmp-open]").forEach(b => b.addEventListener("click", () => { cmpOpen = true; renderStances(); const f = document.querySelector("#themeq [data-cmp]"); if (f) f.focus(); }));
  const head = `<thead><tr><th>テーマ</th>${ST.elections.map(e => `<th>${esc(e.name)}<span class="sub">${fmt(e.date)}投開票</span></th>`).join("")}</tr></thead>`;
  const rows = ST.themes.map(theme => {
    const one = (pid, e, lab) => {
      const r = stanceFor(pid, theme.id, e), who = lab ? `<span class="who2">${esc(SP[pid].short)}</span>` : "";
      if (r.notYet) return `<div class="empty">${who}（未結成）</div>`;
      if (!r.s) return `<div class="empty">${who}${r.via ? esc(r.via) + "として：" : ""}${ndLabel(r.ps, theme.id, e.id)}${isND(r.ps, theme.id, e.id) ? NDTIP() : ""}</div>`;
      const key = `${r.ps}|${e.id}`;
      return `<button type="button" class="cell${curCell === key && curTheme === theme.id ? " sel" : ""}" data-key="${key}" data-theme="${theme.id}"><span class="go" aria-hidden="true">›</span>${who}${partyCellInner(theme, r)}</button>`;
    };
    const cells = ST.elections.map(e => p2 ? `<td><div class="pair">${one(curParty, e, true)}${one(curParty2, e, true)}</div></td>` : `<td>${one(curParty, e, false)}</td>`).join("");
    return `<tr><th class="party trow" scope="row"><button type="button" class="linkbtn" data-goto-theme="${theme.id}">${themeIc(theme.id)}${esc(theme.name)}</button></th>${cells}</tr>`;
  }).join("");
  const m = document.getElementById("matrix");
  m.innerHTML = head + "<tbody>" + rows + "</tbody>";
  m.parentElement.scrollLeft = m.parentElement.scrollWidth;
  m.querySelectorAll(".cell").forEach(c => c.addEventListener("click", () => openPartyCell(c.dataset.theme, c.dataset.key)));
  m.querySelectorAll("[data-goto-theme]").forEach(b => b.addEventListener("click", () => { curAxis = "theme"; curTheme = b.dataset.gotoTheme; curCell = null; renderStances(); setHash(seisakuHash()); }));
  // スマホ：選挙を切り替えてテーマを縦に並べる
  if (!curElection) curElection = ST.elections[ST.elections.length - 1].id;
  const seg = document.getElementById("eseg");
  seg.innerHTML = ST.elections.map(e => `<button type="button" data-e="${e.id}" aria-pressed="${e.id === curElection}">${esc(e.name)}</button>`).join("");
  seg.querySelectorAll("[data-e]").forEach(b => b.addEventListener("click", () => { curElection = b.dataset.e; renderPartyView(); }));
  const curB = seg.querySelector('[aria-pressed="true"]'); if (curB) seg.scrollLeft = curB.offsetLeft - seg.clientWidth / 2 + curB.offsetWidth / 2;
  const e = ST.elections.find(x => x.id === curElection);
  const mHTML = notYetFor(p, e) && !p2 ? `<div class="mrow na"><span class="pt"></span><span>この選挙の時点では未結成</span></div>` : ST.themes.map(theme => {
    const row = (pid, lab) => {
      const pp = SP[pid];
      if (notYetFor(pp, e)) return `<div class="mrow na"><span class="pt">${lab}</span><span>${esc(pp.short)}：未結成</span></div>`;
      const r = stanceFor(pid, theme.id, e);
      if (!r.s) return `<div class="mrow na"><span class="pt">${lab}</span><span>${p2 ? esc(pp.short) + "：" : ""}${ndLabel(r.ps, theme.id, e.id)}</span></div>`;
      return `<button type="button" class="mrow" data-key="${r.ps}|${e.id}" data-theme="${theme.id}"><span class="go" aria-hidden="true">›</span><span class="pt">${lab}</span><span class="mpos">${p2 ? `<span class="as">${esc(pp.short)}</span>` : ""}${partyCellInner(theme, r)}</span></button>`;
    };
    return row(curParty, esc(theme.name)) + (p2 ? row(curParty2, "") : "");
  }).join("");
  const ptToggle = `<div class="seg" id="ptmode" role="group" aria-label="表示のしかた" style="margin:10px;display:flex"><button type="button" data-pt="election" aria-pressed="${ptMode === "election"}" style="flex:1">選挙ごと</button><button type="button" data-pt="trend" aria-pressed="${ptMode === "trend"}" style="flex:1">テーマごとの推移</button></div>`;
  seg.style.display = ptMode === "trend" ? "none" : "";
  const trendHTML = ST.themes.map(theme => `<div class="mtrend"><h3>${themeIc(theme.id)}${esc(theme.name)}</h3><ul class="trend">${ST.elections.map(el => {
    const one = pid => { const pp = SP[pid]; if (notYetFor(pp, el)) return '<span class="pending">（未結成）</span>';
      const r = stanceFor(pid, theme.id, el); if (!r.s) return `<span class="pending">${ndLabel(r.ps, theme.id, el.id)}</span>`;
      return `<button type="button" class="mtb" data-key="${r.ps}|${el.id}" data-theme="${theme.id}" style="background:none;border:none;padding:0;text-align:left">${p2 ? `<span class="as">${esc(pp.short)} </span>` : ""}<span class="pos" style="${posStyle(theme, r.s.position)}">${esc(theme.scale.find(z => z.id === r.s.position).label)}</span></button>`; };
    return `<li><span class="pending">${esc(el.name)}</span><span style="display:grid;gap:4px;justify-items:start">${one(curParty)}${p2 ? one(curParty2) : ""}</span></li>`;
  }).join("")}</ul></div>`).join("");
  document.getElementById("mrows").innerHTML = ptToggle + (ptMode === "trend" ? trendHTML : mHTML);
  document.querySelectorAll("#ptmode [data-pt]").forEach(b => b.addEventListener("click", () => { ptMode = b.dataset.pt; renderPartyView(); }));
  document.querySelectorAll("#mrows .mtb").forEach(b => b.addEventListener("click", () => openPartyCell(b.dataset.theme, b.dataset.key)));
  document.querySelectorAll("#mrows .mrow[data-key]").forEach(b => b.addEventListener("click", () => openPartyCell(b.dataset.theme, b.dataset.key)));
  document.getElementById("mlegend").innerHTML = `<span class="mlg-temp">${tip("temp", "扱いの大きさの見方", TIPS.temp, "<span>扱いの大きさ</span>")}</span><span>${verLegend()}</span><span>${tip("flag", "要確認の印", "<p>この印は、資料が足りない・資料どうしが食い違うなど、区分がまだ確かでない項目です。根拠の説明や区分の変更の経緯は、詳細の「注記」に書いています。</p>", "<span>要確認</span>")}</span><span class="pending">テーマ名を選ぶと、そのテーマで全党を比べられます</span>`;
  if (!curCell) {
    const n = ST.stances.filter(s => s.party === curParty).length;
    const lin = (p.lineage || []).filter(id => P[id]).map(id => P[id].name);
    document.getElementById("spanelBody").innerHTML = `<h2>${esc(p.name)}</h2><p class="pending">マスを選ぶと根拠と出典が出ます。</p>
      <p class="meta-row" style="font-size:13px">立場 ${n}件 ${UNV()}</p>${lin.length > 1 ? `<div><h3>この表と記録に含めた党</h3><p style="font-size:13px">${lin.map(esc).join("・")}</p></div>` : ""}<p><button type="button" class="linkbtn" data-keifu="${p.genealogy}">系譜図でこの党を見る</button></p>`;
    document.querySelectorAll("#spanelBody [data-keifu]").forEach(b => b.addEventListener("click", () => { showView("keifu"); select(b.dataset.keifu); scrollToParty(b.dataset.keifu); }));
  } else renderCellDetail();
  renderRecords();
}
