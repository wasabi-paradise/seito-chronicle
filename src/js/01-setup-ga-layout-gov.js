
const DATA = /*DATA*/;
const ST = /*STANCES*/;
// 運営・連絡先（GitHub のリポジトリが決まったら ISSUE_URL を入れる）
const ISSUE_URL = "https://github.com/wasabi-paradise/seito-chronicle/issues";
// ---- アクセス解析（Google アナリティクス 4）----
// 公開時に測定ID（G-…）を入れる。空のあいだ・claude.ai 上・ローカルでは何も送信しない
const GA_ID = "";
const GA = (() => {
  let off = false; try { off = localStorage.getItem("gaOptOut") === "1"; } catch (e) {}
  const host = location.hostname;
  const allowed = !!GA_ID && /^https:$/.test(location.protocol) && !/(^|\.)claude(usercontent)?\.(ai|com)$/.test(host) && host !== "localhost";
  let on = false, lastPath = null;
  const start = () => {
    if (on || !allowed || off) return; on = true;
    window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date()); gtag("config", GA_ID, { send_page_view: false });
    const sc = document.createElement("script"); sc.async = true; sc.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID); document.head.appendChild(sc);
  };
  return {
    allowed: () => allowed, optedOut: () => off,
    setOptOut(v) { off = !!v; try { localStorage.setItem("gaOptOut", v ? "1" : "0"); } catch (e) {} if (GA_ID) window["ga-disable-" + GA_ID] = off; if (!off) { start(); this.page(); } },
    init() { if (GA_ID) window["ga-disable-" + GA_ID] = off; start(); },
    page() { if (!on || off) return; const loc = location.href; if (loc === lastPath) return; lastPath = loc; gtag("event", "page_view", { page_location: loc, page_title: document.title }); },
    ev(name, params) { if (on && !off) gtag("event", name, params || {}); }
  };
})();
// 公約での扱いの大きさ（旧称：温度感）は、判定がそろっている最新の選挙（2026年衆院選）だけに表示する
const TEMP_ELECTION = ST.elections[ST.elections.length - 1].id;
ST.stances.forEach(s => { if (s.election !== TEMP_ELECTION) { s.temp = null; delete s.tempBasis; } });
const PL = /*RECORDS*/;
const GOV = /*GOV*/;
const SEATS = /*SEATS*/;

const TYPE_LABEL = { merge: "合流", split: "分裂・離党", rename: "改称", transfer: "議員の移籍", found: "結成", rebuild: "再建" };
const P = Object.fromEntries(DATA.parties.map(p => [p.id, p]));
const fam = DATA.families;
const pc = p => p.color || fam[p.family].color;

function toYear(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!m) return y + 0.5;
  const daysIn = new Date(y, m, 0).getDate();
  return y + (m - 1) / 12 + ((d ? d - 1 : daysIn / 2) / daysIn) / 12;
}
function fmt(s) {
  if (!s) return "現在";
  const [y, m, d] = s.split("-").map(Number);
  if (!m) return `${y}年`;
  if (!d) return `${y}年${m}月`;
  return `${y}年${m}月${d}日`;
}
const NOW = toYear(DATA.asOf);

// ---- layout ----
const X0 = 1945, X1 = 2031.5, PADL = 14, AXIS = 28;
const lanes = Math.max(...DATA.parties.map(p => p.lane)) + 1;
// 図の寸法。スマホでは年の幅と行の高さを詰め、文字も小さくして全体を見渡しやすくする
let MOB, PPY, LANE, BAR, GOVH, TOP, W, H, FS, FSS, GROW;
function setLayout() {
  MOB = matchMedia("(max-width: 720px)").matches;
  PPY = MOB ? 15 : 30; LANE = MOB ? 30 : 44; BAR = MOB ? 11 : 16;
  FS = MOB ? 10.5 : 12; FSS = MOB ? 9.5 : 10.5; GROW = MOB ? 11 : 12;
  GOVH = MOB ? 18 + 8 + GROW * 3 + 4 : 66; TOP = AXIS + GOVH;
  W = Math.round((X1 - X0) * PPY + PADL * 2);
  H = TOP + AXIS + lanes * LANE;
}
setLayout();
const x = yr => PADL + (yr - X0) * PPY;
const yc = lane => TOP + lane * LANE + LANE / 2;
// ---- 政権：内閣・連立の時期ごとに区切った区間 ----
const ROLE_LABEL = { pm: "首相の党", partner: "連立与党", outside: "閣外協力" };
const govSegs = [];
GOV.governments.forEach((g, gi) => {
  g.phases.forEach((ph, pi) => {
    const s = ph.from, e = g.phases[pi + 1] ? g.phases[pi + 1].from : g.end;
    govSegs.push({ gi, s, e, pm: g.pmParty, partners: ph.partners, outside: ph.outside, note: ph.note });
  });
});
function partyGov(id) {
  const p = P[id]; if (!p) return [];
  const ps = toYear(p.start), pe = p.end ? toYear(p.end) : NOW, out = [];
  govSegs.forEach(sg => {
    const role = sg.pm.includes(id) ? "pm" : sg.partners.includes(id) ? "partner" : sg.outside.includes(id) ? "outside" : null;
    if (!role) return;
    const a = Math.max(ps, toYear(sg.s)), b = Math.min(pe, sg.e ? toYear(sg.e) : NOW);
    if (b > a) out.push({ role, a, b, gi: sg.gi, s: sg.s, e: sg.e });
  });
  return out;
}
function partyGovRuns(id) {
  const runs = [];
  partyGov(id).forEach(x => {
    const last = runs[runs.length - 1];
    if (last && last.role === x.role && Math.abs(last.b - x.a) < 0.01) { last.b = x.b; last.e = x.e; if (!last.gis.includes(x.gi)) last.gis.push(x.gi); }
    else runs.push({ ...x, gis: [x.gi] });
  });
  return runs;
}
function govParties(gi) {
  const ids = new Set();
  govSegs.filter(sg => sg.gi === gi).forEach(sg => [...sg.pm, ...sg.partners, ...sg.outside].forEach(i => ids.add(i)));
  return ids;
}

const measureCtx = document.createElement("canvas").getContext("2d");
function textW(t, size) {
  measureCtx.font = `${size}px ${getComputedStyle(document.body).fontFamily}`;
  return measureCtx.measureText(t).width;
}
// 背景色に対して、白と濃紺のうちコントラスト比が高い方の文字色を返す
function relLum(hex) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
// 文字が小さい札では、白・濃紺のどちらでもコントラスト比4.5に届かない中間色を、白文字で4.5以上になるまで少し濃くする
const RB = {};
function readableBg(hex) {
  if (RB[hex]) return RB[hex];
  const ratio = h => { const L = relLum(h), d = relLum("#1d2433"); return Math.max(1.05 / (L + 0.05), (L + 0.05) / (d + 0.05)); };
  let h = hex;
  for (let k = 0; k < 20 && ratio(h) < 4.6; k++) {
    const n = parseInt(h.slice(1), 16); h = "#" + [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(v * 0.94).toString(16).padStart(2, "0")).join("");
  }
  return (RB[hex] = h);
}
function onColor(hex) {
  const L = relLum(hex), dark = relLum("#1d2433");
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / (dark + 0.05)) ? "#ffffff" : "#1d2433";
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let SCALE = 1;
function render() {
  const svg = document.getElementById("chart");
  svg.classList.toggle("mob", MOB);
  svg.setAttribute("width", Math.round(W * SCALE));
  svg.setAttribute("height", Math.round(H * SCALE));
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  let out = "";

  // grid & axis
  out += '<g class="grid">';
  for (let yr = 1945; yr <= 2025; yr += 5) {
    out += `<line x1="${x(yr)}" x2="${x(yr)}" y1="${AXIS - 4}" y2="${H - AXIS + 4}" stroke-opacity="${yr % 10 === 0 ? 1 : .45}"/>`;
  }
  out += "</g><g class=\"axis\">";
  for (let yr = 1945; yr <= 2025; yr += 5) {
    out += `<text x="${x(yr)}" y="${AXIS - 10}" text-anchor="middle">${yr}</text>`;
    out += `<text x="${x(yr)}" y="${H - AXIS + 18}" text-anchor="middle">${yr}</text>`;
  }
  out += "</g>";
  out += `<g class="now"><line x1="${x(NOW)}" x2="${x(NOW)}" y1="${AXIS - 4}" y2="${H - AXIS + 4}"/><text x="${x(NOW) + 4}" y="${AXIS - 10}">現在</text></g>`;

  // 政権の帯：帯の中に名前が入らない首相は、帯の下の3段に名前を出して引き出し線でつなぐ
  const GB = AXIS + 6, GBH = MOB ? 16 : 18, ROWS = [1, 2, 3].map(k => GB + GBH + GROW * k);
  out += '<g id="gov">' + `<text class="govlab" x="${PADL}" y="${GB - 2}">首相</text>`;
  const rowEnd = ROWS.map(() => -Infinity);
  GOV.governments.forEach((g, gi) => {
    const x1 = x(toYear(g.start)), x2 = x(g.end ? toYear(g.end) : NOW), w = x2 - x1, mid = (x1 + x2) / 2;
    const pid = g.pmParty.find(i => P[i] && toYear(P[i].start) <= toYear(g.start) + 0.01) || g.pmParty[0];
    const color = g.nonparty ? "#a8a397" : pc(P[pid]);
    let inner = "";
    if (textW(g.pm, FSS) + 6 <= w) inner = g.pm;
    else if (textW(g.short, FSS) + 4 <= w) inner = g.short;
    let outside = "";
    if (!inner) {
      const tw = textW(g.short, FSS);
      let r = ROWS.findIndex((_, i) => mid - tw / 2 > rowEnd[i] + 3);
      if (r < 0) r = rowEnd.indexOf(Math.min(...rowEnd));
      const lx = Math.max(mid - tw / 2, rowEnd[r] + 3);
      rowEnd[r] = lx + tw;
      outside = `<line class="gleader" x1="${mid}" x2="${mid}" y1="${GB + GBH}" y2="${ROWS[r] - GROW + 2}"/><text class="gout" x="${lx}" y="${ROWS[r]}">${esc(g.short)}</text>`;
    }
    out += `<g class="gseg" tabindex="0" role="button" data-gi="${gi}" aria-label="${esc(g.pm)}（${esc(g.cabinets)}、${fmt(g.start)}〜${g.end ? fmt(g.end) : "現在"}）"><title>${esc(g.pm)}　${esc(g.cabinets)}</title>`
      + `<rect x="${x1}" y="${GB}" width="${Math.max(1, w - 1)}" height="${GBH}" fill="${color}"/>`
      + (inner ? `<text x="${mid}" y="${GB + GBH - 5}" text-anchor="middle" style="fill:${onColor(color)}">${esc(inner)}</text>` : outside) + "</g>";
  });
  out += "</g>";

  // links
  out += '<g id="links">';
  DATA.links.forEach((l, i) => {
    const a = P[l.from], b = P[l.to];
    const t = toYear(l.date);
    const xx = x(t);
    if (a.lane === b.lane) {
      out += `<circle class="dot link-dot" data-i="${i}" cx="${xx}" cy="${yc(a.lane)}" r="2.4"/>`;
      return;
    }
    const y1 = yc(a.lane), y2 = yc(b.lane);
    const dir = y2 > y1 ? 1 : -1;
    const ys = y1 + dir * BAR / 2, ye = y2 - dir * BAR / 2;
    out += `<path class="link ${l.type}" data-i="${i}" d="M${xx - 8} ${ys} C ${xx} ${ys}, ${xx} ${ye}, ${xx + 8} ${ye}"/>`;
  });
  out += "</g>";

  // bars with label placement
  out += '<g id="bars">';
  const byLane = {};
  DATA.parties.forEach(p => (byLane[p.lane] ||= []).push(p));
  Object.values(byLane).forEach(list => {
    list.sort((a, b) => toYear(a.start) - toYear(b.start));
    let lastInline = -Infinity, lastAbove = -Infinity, lastBelow = -Infinity;
    list.forEach((p, idx) => {
      const s = toYear(p.start), e = p.end ? toYear(p.end) : NOW;
      const x1 = x(s), x2 = Math.max(x(e), x1 + 4);
      const cy = yc(p.lane);
      const color = pc(p);
      const label = p.short || p.name;
      const nextStart = list[idx + 1] ? x(toYear(list[idx + 1].start)) : Infinity;
      const tw12 = textW(label, FS);
      let tx, ty, cls = "";
      let fillAttr = "";
      if (tw12 + 10 <= x2 - x1) { tx = x1 + 5; ty = cy + FS / 3; lastInline = tx + tw12; cls = "in"; fillAttr = ` style="fill:${onColor(color)}"`; }
      else if (x2 + 4 + tw12 + 6 < nextStart && x2 + 4 > lastInline) { tx = x2 + 4; ty = cy + FS / 3; lastInline = tx + tw12; }
      else {
        const tw = textW(label, FSS); cls = "small";
        if (x1 > lastAbove + 4) { tx = x1; ty = cy - BAR / 2 - 3; lastAbove = tx + tw; }
        else { tx = Math.max(x1, lastBelow + 4); ty = cy + BAR / 2 + FSS + 1; lastBelow = tx + tw; }
      }
      const ongoing = !p.end;
      const fill = ongoing ? `url(#fade-${p.id})` : color;
      out += `<g class="bar" tabindex="0" role="button" data-id="${p.id}" aria-label="${esc(p.name)}（${fmt(p.start)}〜${fmt(p.end)}）">`
        + `<title>${esc(p.name)}　${fmt(p.start)}〜${fmt(p.end)}</title>`
        + `<rect x="${x1}" y="${cy - BAR / 2}" width="${x2 - x1}" height="${BAR}" rx="3" fill="${fill}"/>`
        + partyGov(p.id).map(r => {
          const a = x(r.a), b = x(r.b), yy = cy + BAR / 2 + 1;
          return r.role === "outside"
            ? `<line class="gstrip outside" x1="${a}" x2="${b}" y1="${yy + 1.5}" y2="${yy + 1.5}"/>`
            : `<rect class="gstrip ${r.role}" x="${a}" y="${yy}" width="${Math.max(1, b - a)}" height="3"/>`;
        }).join("")
        + `<text class="${cls}" x="${tx}" y="${ty}"${fillAttr}>${esc(label)}</text>`
        + (ongoing && tx < x(NOW) - 160 ? `<text class="nowlab" x="${x(NOW) + 6}" y="${cy + FS / 3}">${esc(label)}</text>` : "") + "</g>";
    });
  });
  out += "</g>";

  const defs = DATA.parties.filter(p => !p.end).map(p => { const c = pc(p);
    return `<linearGradient id="fade-${p.id}" x1="0" x2="1"><stop offset="0" stop-color="${c}"/><stop offset=".85" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".45"/></linearGradient>`; }).join("");
  svg.innerHTML = `<defs>${defs}</defs>` + out;

  svg.querySelectorAll(".gseg").forEach(g => {
    g.addEventListener("click", () => selectGov(+g.dataset.gi));
    g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); selectGov(+g.dataset.gi); } });
  });
  svg.querySelectorAll(".bar").forEach(g => {
    g.addEventListener("click", () => select(g.dataset.id));
    g.addEventListener("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(g.dataset.id); } });
  });
  // キーボード：図の中は止まり先を1つにし、矢印キーで帯を移る（政権の帯と政党の帯は別のグループ）
  const groups = [[...svg.querySelectorAll(".gseg")], [...svg.querySelectorAll(".bar")].sort((a, b) => P[a.dataset.id].lane - P[b.dataset.id].lane || toYear(P[a.dataset.id].start) - toYear(P[b.dataset.id].start))];
  groups.forEach((list, gi) => {
    list.forEach(n => n.setAttribute("tabindex", "-1"));
    const first = gi === 1 ? (list.find(n => n.dataset.id === (current || "jimin")) || list[0]) : list[list.length - 1];
    if (first) first.setAttribute("tabindex", "0");
    list.forEach((n, i) => n.addEventListener("keydown", ev => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
      if (ev.key === "Home" || ev.key === "End") { ev.preventDefault(); const t = ev.key === "Home" ? list[0] : list[list.length - 1]; n.setAttribute("tabindex", "-1"); t.setAttribute("tabindex", "0"); t.focus(); return; }
      if (!d) return;
      ev.preventDefault();
      const t = list[(i + d + list.length) % list.length];
      n.setAttribute("tabindex", "-1"); t.setAttribute("tabindex", "0"); t.focus();
    }));
  });
}
// マウスでドラッグして図を横に動かす
(function () {
  const sc = document.getElementById("scroller"); let sx = 0, sl = 0, moved = false, on = false;
  sc.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse" || e.button !== 0) return; on = true; moved = false; sx = e.clientX; sl = sc.scrollLeft; });
  addEventListener("pointermove", e => { if (!on) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; sc.classList.add("drag"); } if (moved) sc.scrollLeft = sl - dx; });
  addEventListener("pointerup", () => { on = false; setTimeout(() => sc.classList.remove("drag"), 0); });
  sc.addEventListener("click", e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
})();

// ---- lineage ----
const outL = {}, inL = {};
DATA.links.forEach((l, i) => { (outL[l.from] ||= []).push(i); (inL[l.to] ||= []).push(i); });
function walk(id, map, key) {
  const seenP = new Set([id]), seenL = new Set(), q = [id];
  while (q.length) {
    const cur = q.shift();
    (map[cur] || []).forEach(i => {
      seenL.add(i);
      const nxt = DATA.links[i][key];
      if (!seenP.has(nxt)) { seenP.add(nxt); q.push(nxt); }
    });
  }
  return { seenP, seenL };
}

let current = null;
function select(id) {
  current = id;
  const svg = document.getElementById("chart");
  if (!id) {
    svg.classList.remove("focus");
    svg.querySelectorAll(".on,.sel").forEach(n => n.classList.remove("on", "sel"));
    renderOverview();
    return;
  }
  const up = walk(id, inL, "from"), down = walk(id, outL, "to");
  const ps = new Set([...up.seenP, ...down.seenP]);
  const ls = new Set([...up.seenL, ...down.seenL]);
  svg.classList.add("focus");
  svg.querySelectorAll(".bar").forEach(g => {
    g.classList.toggle("on", ps.has(g.dataset.id));
    g.classList.toggle("sel", g.dataset.id === id);
  });
  svg.querySelectorAll(".link, .link-dot").forEach(n => n.classList.toggle("on", ls.has(+n.dataset.i)));
  svg.querySelectorAll(".gseg.sel").forEach(n => n.classList.remove("sel"));
  renderDetail(P[id]);
  document.querySelectorAll("#mlist .prow").forEach(r => r.classList.toggle("sel", r.dataset.id === id));
  openSheet("panel");
  setHash(id);
}

function selectGov(gi) {
  current = null;
  { const g = GOV.governments[gi], sc = document.getElementById("scroller"); const t = x(toYear(g.start)) * SCALE - sc.clientWidth / 3; sc.scrollTo({ left: Math.max(0, t), behavior: "auto" }); }
  const svg = document.getElementById("chart"), ids = govParties(gi);
  svg.classList.add("focus");
  svg.querySelectorAll(".bar").forEach(g => { g.classList.toggle("on", ids.has(g.dataset.id)); g.classList.remove("sel"); });
  svg.querySelectorAll(".link, .link-dot").forEach(n => n.classList.remove("on"));
  svg.querySelectorAll(".gseg").forEach(n => n.classList.toggle("sel", +n.dataset.gi === gi));
  renderGovDetail(gi);
  openSheet("panel");
}
// 政権交代・連立の組み替えの経緯：事実、当事者それぞれの説明、研究者の資料を出典つきで並べる（サイトの評価は加えない）
function gLinks(ids) { return '<span class="s">' + ids.map(id => `<a href="${esc(GOV.sources[id].url)}" target="_blank" rel="noopener" title="${esc(GOV.sources[id].title)}">${esc(GOV.sources[id].short || GOV.sources[id].kind)}</a>`).join(" ") + "</span>"; }
function govEvents(g) {
  if (!g.events || !g.events.length) return "";
  return g.events.map(ev => `<div class="gev"><h3>経緯：${esc(ev.title)}</h3>
    ${ev.summary ? `<p class="gsum">${esc(ev.summary.text)} ${gLinks(ev.summary.sources)}</p>` : ""}
    <ol class="steps">${ev.facts.map(f => `<li><div class="d">${fmt(f.date)}</div><div>${esc(f.text)}</div><div class="s">${gLinks(f.sources)}</div></li>`).join("")}</ol>
    <details class="gmore"${isMobile() ? "" : " open"}><summary>当事者それぞれの説明（${ev.sides.length}）</summary>
    <dl class="sides">${ev.sides.map(x => `<dt>${esc(x.who)}</dt><dd>${esc(x.text)} ${gLinks(x.sources)}</dd>`).join("")}</dl>
    ${ev.background && ev.background.length ? `<h4>研究者の資料</h4><dl class="sides">${ev.background.map(x => `<dd>${esc(x.text)} ${gLinks(x.sources)}</dd>`).join("")}</dl>` : ""}
    </details>
    ${ev.note ? `<p class="note">${ic("info")}<span><strong>注記</strong>　${esc(ev.note)}</span></p>` : ""}
    <p class="pending" style="font-size:12px">${tip("info", "経緯の書き方", TIPS.gevrule, "<span>経緯の書き方</span>")}　当事者の説明を発言・発表の出典つきで並べ、どの説明が正しいかの判断はしていません。</p>
  </div>`).join("");
}
