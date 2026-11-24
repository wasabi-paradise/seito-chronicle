// ---- 共有・印刷 ----
// スマホは OS の共有シート、それ以外はリンクのコピー。どちらも送るのはこのサイトのURLだけ
// 共有するURL：テーマ・政党・選挙の画面は、要約ページ（SNSのカード画像と説明を持つ）のURLにする
function shareURL(hash) {
  if (location.protocol.startsWith("http")) {
    let m;
    if ((m = /^seisaku-([a-z0-9]+)$/.exec(hash || ""))) return location.origin + "/theme/" + m[1] + "/";
    if ((m = /^seito-([a-z0-9]+)$/.exec(hash || ""))) return location.origin + "/party/" + m[1] + "/";
    if ((m = /^rec-([a-z0-9-]+)$/.exec(hash || ""))) return location.origin + "/record/" + m[1] + "/";
    if ((m = /^(giseki|sangiin)-(\d+)$/.exec(hash || ""))) return location.origin + "/election/" + (m[1] === "giseki" ? "shugiin" : "sangiin") + "-" + m[2] + "/";
  }
  return pageURL(hash);
}
function pageURL(hash) { return location.protocol.startsWith("http") ? location.origin + location.pathname + (hash ? "#" + hash : "") : location.href.split("#")[0] + (hash ? "#" + hash : ""); }
async function shareLink(url, title, msg) {
  const os = !!navigator.share && isMobile();
  GA.ev("share", { method: os ? "os_share" : "copy_link", item_id: (url.split("#")[1] || "").slice(0, 80) });
  if (os) { try { await navigator.share({ title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); if (msg) msg.textContent = "リンクをコピーしました"; } catch (e) { if (msg) msg.textContent = url; }
}
function actsHTML(withPrint = true) {
  return `<div class="acts"><button type="button" class="ibtn" data-act-share>${ic("share")}<span>リンクを共有</span></button>${withPrint ? `<button type="button" class="ibtn" data-act-print>${ic("print")}<span>印刷</span></button>` : ""}<span class="pending" data-act-msg role="status"></span></div>`;
}
// getHash：共有するURLの「#」以降を返す関数
function bindActs(root, getHash) {
  root.querySelectorAll(".acts").forEach(box => {
    const m = box.querySelector("[data-act-msg]");
    const s = box.querySelector("[data-act-share]"); if (s) s.addEventListener("click", () => shareLink(shareURL(getHash()), document.title, m));
    const p = box.querySelector("[data-act-print]"); if (p) p.addEventListener("click", () => window.print());
  });
}

// ---- 構図の直後：このテーマの「表明とその後」の一部 ----
function renderRecPreview() {
  const box = document.getElementById("recprev");
  const theme = ST.themes.find(t => t.id === curTheme);
  if (curAxis !== "theme" || !theme) { box.hidden = true; box.innerHTML = ""; return; }
  const recs = allRecords().filter(r => r.group === curTheme);
  if (!recs.length) { box.hidden = true; box.innerHTML = ""; return; }
  const O = Object.fromEntries(PL.outcomes.map(o => [o.id, o]));
  const pick = [...recs].sort((a, b) => toYear(b.date) - toYear(a.date)).slice(0, 4);
  box.hidden = false;
  box.innerHTML = `<div class="rp-head"><h2>${themeIc(curTheme)}${esc(theme.name)}の公約、その後どうなった？</h2><span class="pending">${recs.length}件の記録から、新しい順に${pick.length}件</span><button type="button" class="linkbtn" data-rp-all>すべての記録を見る（${recs.length}件）</button></div>
    <ul class="rp-list">${pick.map(r => { const last = r.steps[r.steps.length - 1];
      return `<li><button type="button" class="rp-card" data-rp="${r.id}"><span class="opill" style="background:${OUT_COLOR[r.outcome]}">${outIc(r.outcome)}${esc(O[r.outcome].label)}</span><b>${esc(r.title)}</b>${last ? `<span class="rp-flow"><span>${fmt(r.statement.date)}<br>${esc(r.statement.label || PL.commitKinds[r.commit])}</span><span class="rp-arrow" aria-hidden="true">→</span><span>${fmt(last.date)}<br>${esc(last.label)}</span></span>` : ""}</button></li>`; }).join("")}</ul>`;
  const go = id => { const el = document.getElementById(id) || document.querySelector(".records"); if (!el) return; const d = el.querySelector && el.querySelector("details.more"); if (d) d.open = true; el.scrollIntoView({ block: "start", behavior: RM() ? "auto" : "smooth" }); };
  box.querySelectorAll("[data-rp]").forEach(b => b.addEventListener("click", () => { oFilter = null; pFilter = null; document.getElementById("rsearch").value = ""; renderRecords(); go(b.dataset.rp); }));
  box.querySelector("[data-rp-all]").addEventListener("click", () => go("recTitle"));
}
