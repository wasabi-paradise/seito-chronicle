// ---- 見ている内容から、関係する別の画面へのつながり ----
// 政党で見る画面：この党の系譜（前身・当選人数・政権との関わり）と、公約のその後へ
function partyCtxHTML(spId) {
  const p = SP[spId], g = P[p.genealogy];
  return `<span class="xlinks"><span class="pending">${esc(p.short)}について：</span>${g ? `<a class="linkbtn" href="#${g.id}" data-x="keifu:${g.id}">前身・当選人数・政権との関わり（系譜図）</a>` : ""}<a class="linkbtn" href="#recTitle" data-x="recs:here">表明とその後（この下）</a></span>`;
}
// 系譜図の党の詳細：その党（またはその流れをくむ党）の政策の立場へ
function keifuPolicyHTML(gid) {
  const own = ST.parties.filter(x => x.genealogy === gid);
  const heirs = ST.parties.filter(x => x.genealogy !== gid && (x.lineage || []).includes(gid));
  if (!own.length && !heirs.length) return "";
  const a = x => `<a class="linkbtn" href="#seito-${x.id}" data-x="party:${x.id}">${esc(x.name)}</a>`;
  return `<div class="xbox"><h3>政策の立場と公約のその後（2016〜2026年）</h3>
    ${own.length ? `<p>${own.map(x => `<a class="ibtn" href="#seito-${x.id}" data-x="party:${x.id}"><span>${esc(x.short)}の政策の立場と公約のその後を見る</span></a>`).join(" ")}</p>` : ""}
    ${heirs.length ? `<p class="pending" style="font-size:13px">この党の流れをくむ党（記録は前身の党の分も含めて表示）：${heirs.map(a).join("・")}</p>` : ""}</div>`;
}
// 選挙の詳細：その選挙で各党が掲げた立場（いまの構図をその時点で見る）
function seStanceHTML(e) {
  const se = ST.elections.find(x => x.date === e.date);
  if (!se) return "";
  return `<p class="xlinks"><span class="pending">この選挙で各党が掲げた立場：</span>${ST.themes.map(t => `<a class="linkbtn" href="#seisaku-${t.id}" data-x="pmat:${t.id}~${se.id}">${esc(t.name)}</a>`).join("・")}</p>`;
}

function xgo(kind, v) {
  if (kind !== "recs") closeSheet();
  const toPolicy = () => { curCell = null; curParty2 = null; cmpOpen = false; oFilter = null; pFilter = null; renderStances(); showView("seisaku"); setHash(seisakuHash()); };
  if (kind === "party" && SP[v]) { curAxis = "party"; curParty = v; toPolicy(); window.scrollTo(0, 0); return; }
  if (kind === "pm" || kind === "pmat") {
    const [t, eid] = v.split("~"); stopPm(); curAxis = "theme"; curTheme = t; pmElection = null; toPolicy();
    if (eid) setPmElection(eid);
    requestAnimationFrame(() => { const pm = document.getElementById("posmap"); if (pm && !pm.hidden) pm.scrollIntoView({ block: "start" }); });
    return;
  }
  if (kind === "records") { curAxis = "theme"; curTheme = "all"; toPolicy(); requestAnimationFrame(() => document.getElementById("recTitle").scrollIntoView({ block: "start" })); return; }
  if (kind === "recs") { document.getElementById("recTitle").scrollIntoView({ block: "start" }); return; }
  if (kind === "seats") { goSeats(+v || 0, "lo"); return; }
  if (kind === "keifu") {
    showView("keifu");
    if (v === "all" || !P[v]) { if (current) select(null); setHash("keifu"); return; }
    select(v); scrollToParty(v); setHash(v);
  }
}
document.addEventListener("click", ev => {
  const a = ev.target.closest("[data-x]");
  if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
  ev.preventDefault();
  const s = a.dataset.x, i = s.indexOf(":");
  xgo(s.slice(0, i), s.slice(i + 1));
});
