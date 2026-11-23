(() => {
  const yr = d => d ? d.slice(0, 4) : "";
  const by = {}; DATA.parties.forEach(p => (by[p.name] = by[p.name] || []).push(p));
  document.getElementById("sameName").innerHTML = Object.entries(by).filter(([, v]) => v.length > 1).map(([n, v]) => `${esc(n)}（${v.slice().sort((x, y) => x.start < y.start ? -1 : 1).map(p => `<button type="button" class="linkbtn" data-goto="${p.id}">${yr(p.start)}〜${p.end ? yr(p.end) : "現在"}</button>`).join("・")}）`).join("、");
  const ab = new Map(); [...HSE.lo, ...HSE.up].forEach(e => e.rows.forEach(r => { if (r.party && P[r.party] && r.label !== P[r.party].name) { const k = r.label + "=" + r.party; if (!ab.has(k)) ab.set(k, r); } }));
  document.getElementById("abbrList").innerHTML = [...ab.values()].map(r => `${esc(r.label)}＝<button type="button" class="linkbtn" data-goto="${r.party}">${esc(P[r.party].name)}（${yr(P[r.party].start)}〜${P[r.party].end ? yr(P[r.party].end) : "現在"}）</button>`).join("、");
  document.getElementById("glossary").querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => { document.getElementById("intro").hidden = true; showView("keifu"); select(b.dataset.goto); scrollToParty(b.dataset.goto); setHash(b.dataset.goto); }));
})();
window.addEventListener("beforeprint", () => { GA.ev("print", { page_location: location.href }); const n = document.getElementById("printnote"); if (n) n.textContent = `印刷元：${location.href}（${fmt(DATA.asOf)}時点のデータ）。内容は政党クロニクル（運営：Michisus）、CC BY 4.0。`; });
(() => { const w = document.getElementById("matrix").parentElement, mh = document.getElementById("mhint");
  document.getElementById("mhintBtn").addEventListener("click", () => { w.scrollTo({ left: 0, behavior: RM() ? "auto" : "smooth" }); });
  w.addEventListener("scroll", () => { if (w.scrollLeft < 8) mh.hidden = true; }, { passive: true }); })();
window.addEventListener("hashchange", () => {
  const h = location.hash.slice(1);
  try { document.title = titleFor(h); } catch (e) {}
  setTimeout(() => GA.page(), 0);
  if (h.startsWith("rec-")) { openRecord(h); return; }
  if (parseSeHash(h)) { const q = parseSeHash(h); showView("giseki"); setHouse(q.house); if (q.n && seOpen !== q.n) toggleSe(q.n, true); if (!q.n && seOpen) toggleSe(seOpen, false); return; }
  if (!h) { goHome(false); return; }
  if (h === "keifu") { showView("keifu"); if (current) select(null); return; }
  if (h.startsWith("seito-") && SP[h.slice(6).split("~")[0]]) { const a = h.slice(6).split("~")[0], b2 = SP[h.split("~")[1]] ? h.split("~")[1] : null; if (curAxis !== "party" || curParty !== a || curParty2 !== b2) { curAxis = "party"; curParty = a; curParty2 = b2; curCell = null; renderStances(); } showView("seisaku"); return; }
  if (h.startsWith("seisaku")) { if (curAxis !== "theme") { curAxis = "theme"; curCell = null; } const q = parseSeisaku(h), t = q.t; if (t && (t !== curTheme || q.cell !== curCell || !document.querySelector("#themebar [data-theme]"))) { curTheme = t; curCell = q.cell; renderStances(); } showView("seisaku"); document.title = titleFor(h); openCellFromHash(q.cell); return; }
  if (h && P[h]) { showView("keifu"); if (h !== current) select(h); scrollToParty(h); }
});
