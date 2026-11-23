function govSrc(ids) {
  return ids.length ? '<ol class="src">' + ids.map(id => `<li><a href="${esc(GOV.sources[id].url)}" target="_blank" rel="noopener">${esc(GOV.sources[id].title)}</a> <span class="pending">（${esc(GOV.sources[id].kind)}）</span></li>`).join("") + "</ol>" : '<p class="pending">準備中</p>';
}
function renderGovDetail(gi) {
  const g = GOV.governments[gi];
  const names = ids => ids.filter(i => P[i]).map(i => partyBtn(i)).join("・");
  const segs = govSegs.filter(sg => sg.gi === gi);
  const pmNames = names(g.pmParty);
  const phases = segs.map(sg => `<li><span class="t">${fmt(sg.s)}〜</span>${sg.partners.length ? `<span>連立：${names(sg.partners)}</span>` : "<span>単独</span>"}${sg.outside.length ? `<span>閣外協力：${names(sg.outside)}</span>` : ""}${sg.note ? `<span class="t">${esc(sg.note)}</span>` : ""}</li>`).join("");
  const panel = document.getElementById("panelBody");
  panel.innerHTML = `
    <div><span class="chip">${esc(g.cabinets)}</span><h2>${esc(g.pm)}</h2>
    <div class="period">${fmt(g.start)} 〜 ${g.end ? fmt(g.end) : "現在"}</div></div>
    ${g.note ? `<p>${esc(g.note)}</p>` : ""}
    <div><h3>首相の党</h3>${g.nonparty ? '<p class="pending">政党内閣ではない</p>' : `<p>${pmNames}</p>`}</div>
    ${g.nonparty ? "" : `<div><h3>与党の構成 ${gl("閣外協力", "", "閣外協力とは")}</h3><ul class="rel">${phases}</ul>${g.others ? `<p class="pending">ほかに：${esc(g.others)}</p>` : ""}</div>`}
    ${govSeatsHTML(gi)}
    ${govEvents(g)}
    <div><h3>出典</h3>${govSrc([...new Set([...g.sources, ...(g.events || []).flatMap(ev => [...(ev.summary ? ev.summary.sources : []), ...ev.facts.flatMap(f => f.sources), ...ev.sides.flatMap(x => x.sources), ...(ev.background || []).flatMap(x => x.sources)])])])}<p class="meta-row" style="font-size:13px">${g.datesVerified ? `${ic("ok")}<span>在任期間は首相官邸の「歴代内閣」と照合済み</span>` : `${UNV()}<span>未確認</span>`}</p>${g.partiesVerified ? `<p class="meta-row" style="font-size:13px">${ic("ok")}<span>与党の構成：${esc(g.partiesCheck.text)}</span></p>` : g.datesVerified ? `<p class="meta-row" style="font-size:13px">${UNV()}<span>与党の構成は未確認${toYear(g.start) >= 1982 ? "（報道の一覧と照合）" : ""}</span></p>` : ""}</div>`;
  bindGoto(panel); bindGoSeki(panel);
}
function govRunsHTML(id) {
  const runs = partyGovRuns(id);
  if (!runs.length) return '<p class="pending">与党になったことはない</p>';
  const yr = v => { const y = Math.floor(v), m = Math.floor((v - y) * 12) + 1; return `${y}年${m}月`; };
  return '<ul class="rel govruns">' + runs.map(r => {
    const pms = [...new Set(r.gis.map(i => GOV.governments[i].pm))];
    return `<li><span class="grole ${r.role}"></span><span>${ROLE_LABEL[r.role]}</span><span class="t">${yr(r.a)}〜${Math.abs(r.b - NOW) < 0.01 ? "現在" : yr(r.b)}・${esc(pms.length > 2 ? pms[0] + "〜" + pms[pms.length - 1] : pms.join("・"))}${pms.length > 2 ? "（" + pms.length + "人）" : ""}</span></li>`;
  }).join("") + "</ul>";
}
function partyBtn(id) {
  const p = P[id];
  return `<button type="button" class="linkbtn" data-goto="${id}">${esc(p.name)}</button>`;
}
function relList(items, side) {
  if (!items.length) return '<p class="pending">系譜図に載っている党からの流れはありません</p>';
  return '<ul class="rel">' + items.map(i => {
    const l = DATA.links[i];
    const other = side === "in" ? l.from : l.to;
    return `<li>${partyBtn(other)}<span class="t">${TYPE_LABEL[l.type]}・${fmt(l.date)}${l.note ? "・" + esc(l.note) : ""}</span></li>`;
  }).join("") + "</ul>";
}
// この党につながる系譜だけを、パネルの幅に収めて描く（スマホ向け）
function walkN(id, map, key, depth) {
  const seenP = new Set([id]), seenL = new Set(); let front = [id];
  for (let d = 0; d < depth; d++) {
    const nxt = [];
    front.forEach(cur => (map[cur] || []).forEach(i => { seenL.add(i); const n = DATA.links[i][key]; if (!seenP.has(n)) { seenP.add(n); nxt.push(n); } }));
    front = nxt;
  }
  return { seenP, seenL };
}
// この党の前後の系譜（前身は3代前まで、後継は2代先まで）を、1党1行で描く（スマホ向け）
function miniLineage(id) {
  const up = walkN(id, inL, "from", 3), down = walkN(id, outL, "to", 2);
  const ids = [...new Set([...up.seenP, ...down.seenP])];
  if (ids.length < 2) return "";
  const set = new Set(ids);
  const ls = [...new Set([...up.seenL, ...down.seenL])].filter(i => set.has(DATA.links[i].from) && set.has(DATA.links[i].to));
  const order = ids.map(i => P[i]).sort((a, b) => a.lane - b.lane || toYear(a.start) - toYear(b.start));
  const row = Object.fromEntries(order.map((q, k) => [q.id, k]));
  const t0 = Math.floor(Math.min(...ids.map(i => toYear(P[i].start)))) - 0.5, t1 = NOW + 0.5;
  const Wm = 340, pad = 4, LH = 24, B = 10, top = 18;
  const xm = t => pad + (t - t0) / (t1 - t0) * (Wm - pad * 2);
  const ym = q => top + row[q.id] * LH + LH / 2;
  const Hm = top + order.length * LH + 4;
  let o = "";
  const span = t1 - t0, step = span > 40 ? 20 : span > 15 ? 10 : 5;
  for (let y = Math.ceil(t0 / step) * step; y <= t1; y += step) o += `<line class="gl" x1="${xm(y)}" x2="${xm(y)}" y1="${top - 4}" y2="${Hm}"/><text class="ax" x="${xm(y)}" y="11" text-anchor="middle">${y}</text>`;
  ls.forEach(i => {
    const l = DATA.links[i], a = P[l.from], b = P[l.to], xx = xm(toYear(l.date));
    const y1 = ym(a), y2 = ym(b), dir = y2 > y1 ? 1 : -1;
    o += `<path class="lk ${l.type}" d="M${xx - 4} ${y1 + dir * B / 2} C ${xx} ${y1 + dir * B / 2}, ${xx} ${y2 - dir * B / 2}, ${xx + 4} ${y2 - dir * B / 2}"/>`;
  });
  order.forEach(q => {
    const x1 = xm(toYear(q.start)), x2 = Math.max(xm(q.end ? toYear(q.end) : NOW), x1 + 3), cy = ym(q), c = pc(q);
    const lab = q.short || q.name, tw = textW(lab, 10) + (q.id === id ? 6 : 0);
    let tx, anchor = "start", inside = false;
    if (tw + 8 <= x2 - x1) { tx = x1 + 4; inside = true; }
    else if (x2 + 4 + tw <= Wm) tx = x2 + 4;
    else { tx = x1 - 4; anchor = "end"; }
    o += `<g class="mb${q.id === id ? " sel" : ""}" data-mini="${q.id}"><rect x="${x1}" y="${cy - B / 2}" width="${x2 - x1}" height="${B}" rx="2" fill="${c}"/><text x="${tx}" y="${cy + 3.5}" text-anchor="${anchor}"${inside ? ` style="fill:${onColor(c)}"` : ""}${q.id === id ? ' font-weight="700"' : ""}>${esc(lab)}</text></g>`;
  });
  return `<div><h3>この党の前後の系譜</h3><p class="minicap">前身は3代前、後継は2代先まで。党を押すとその党の詳細に移ります</p><svg class="mini" viewBox="0 0 ${Wm} ${Hm}" role="img" aria-label="${esc(P[id].name)}の前後の系譜図">${o}</svg></div>`;
}

// ---- 衆院選・参院選の議席（総務省の結果調の当選人数をそのまま使う。会派・追加公認などは含めない）----
// house: "lo"＝衆院選、"up"＝参院選（改選分だけ。参議院全体の議席ではない）
const HSE = { lo: SEATS.elections, up: SEATS.upper.elections };
const HNAME = { lo: "衆院選", up: "参院選" };
const SE = HSE.lo;
const SSRC = id => SEATS.sources[id];
const seLabel = e => `第${e.n}回`;
const seYear = e => e.date.slice(0, 4) + "年";
const majOf = e => Math.floor(e.total / 2) + 1;
const OTHER_C = "#b4b4b4";
const rowColor = r => r.party && P[r.party] ? pc(P[r.party]) : OTHER_C;
// 並び順：seats＝当選人数の多い順／family＝系譜図の系統の順（系統の中は多い順。系譜図にない党派は系統の後、無所属・諸派は最後）
function sortedRows(e, mode = "seats") {
  const tail = r => !r.party && /無所属|諸派|本人/.test(r.label) ? 1 : 0;
  const FK = Object.keys(fam), fi = r => r.party && P[r.party] ? FK.indexOf(P[r.party].family) : FK.length;
  return [...e.rows].sort((a, b) => tail(a) - tail(b) || (mode === "family" ? fi(a) - fi(b) : 0) || b.seats - a.seats);
}
const srcA = ids => ids.map(id => `<a href="${esc(SSRC(id).url)}" target="_blank" rel="noopener">${esc(SSRC(id).short)}</a>`).join(" ");
// その日に在任していた内閣と、その時点の与党（首相の党＋連立。閣外協力は別に数える）
function govAt(d) { return GOV.governments.findIndex(g => g.start <= d && (!g.end || d < g.end)); }
function rulingAt(gi, d) {
  const g = GOV.governments[gi]; if (!g || g.nonparty) return null;
  const ph = [...g.phases].filter(p => p.from <= d).pop() || g.phases[0];
  return { pm: g.pmParty, partners: ph.partners || [], outside: ph.outside || [] };
}
function rulingSeats(e, ids) { return ids.map(id => ({ id, r: e.rows.find(r => r.party === id) })).filter(x => x.r); }
function govSeatBlock(e, gi, d, caption, house) {
  const ru = rulingAt(gi, d); if (!ru) return "";
  const up = house === "up";
  const ids = [...new Set([...ru.pm, ...ru.partners])];
  const got = rulingSeats(e, ids), sum = got.reduce((a, x) => a + x.r.seats, 0), maj = majOf(e);
  const out = rulingSeats(e, ru.outside);
  const pct = v => (v / e.total * 100).toFixed(2) + "%";
  return `<div class="gsrow"><div><strong>${esc(caption)}</strong>　${got.length ? got.map(x => `${esc(P[x.id].name)} ${x.r.seats}`).join("＋") : "該当なし"}${got.length > 1 ? ` ＝ <strong>${sum}</strong>` : ""}／${up ? "改選" : ""}${e.total}${up ? "" : `（過半数 ${maj}）`}${out.length ? `<span class="pending">　閣外協力：${out.map(x => `${esc(P[x.id].name)} ${x.r.seats}`).join("・")}</span>` : ""}</div>
    <div class="gsbar" role="img" aria-label="与党の当選人数 ${sum}、${up ? "改選数" : "合計"} ${e.total}${up ? "" : "、過半数 " + maj}">${got.map(x => `<span style="width:${pct(x.r.seats)};background:${pc(P[x.id])}"></span>`).join("")}${up ? "" : `<span class="maj" style="left:${pct(maj)}"></span>`}</div></div>`;
}
function houseGovLine(e, gi) {
  const H = e.house, ru = rulingAt(gi, e.date); if (!H || !ru) return "";
  const maj = Math.floor(H.total / 2) + 1, ids = [...new Set([...ru.pm, ...ru.partners])];
  const got = ids.map(id => ({ id, r: H.rows.find(r => r.party === id) })).filter(x => x.r), sum = got.reduce((a, x) => a + x.r.total, 0);
  const pct = v => (v / H.total * 100).toFixed(2) + "%";
  return `<div class="gsrow"><div>└ 参議院全体（非改選を含む、${fmt(H.asOf)}現在）：${got.map(x => `${esc(P[x.id].name)} ${x.r.total}`).join("＋")}${got.length > 1 ? ` ＝ <strong>${sum}</strong>` : ""}／${H.total}（過半数 ${maj}）</div><div class="gsbar" role="img" aria-label="参議院全体での与党の議席 ${sum}、過半数 ${maj}">${got.map(x => `<span style="width:${pct(x.r.total)};background:${pc(P[x.id])}"></span>`).join("")}<span class="maj" style="left:${pct(maj)}"></span></div></div>`;
}
function govSeatsHTML(gi) {
  const g = GOV.governments[gi]; if (g.nonparty) return "";
  const before = [...SE].filter(e => e.date < g.start).pop();
  const during = SE.filter(e => e.date >= g.start && (!g.end || e.date < g.end));
  const upDuring = HSE.up.filter(e => e.date >= g.start && (!g.end || e.date < g.end));
  const blocks = [];
  if (before) blocks.push(govSeatBlock(before, gi, g.start, `発足前の直近の衆院選（${seLabel(before)}・${fmt(before.date)}）`, "lo"));
  during.forEach(e => blocks.push(govSeatBlock(e, gi, e.date, `在任中の衆院選（${seLabel(e)}・${fmt(e.date)}）`, "lo")));
  const ublocks = upDuring.map(e => govSeatBlock(e, gi, e.date, `在任中の参院選（${seLabel(e)}・${fmt(e.date)}）`, "up") + (e.house ? houseGovLine(e, gi) : "")).filter(Boolean);
  if (!blocks.filter(Boolean).length && !ublocks.length) return "";
  const srcs = [...new Set([...[before, ...during, ...upDuring].filter(Boolean).flatMap(e => e.sources), ...upDuring.filter(e => e.house).map(e => e.house.source)])];
  return `<div><h3>与党の当選人数</h3><div class="govseat">${blocks.join("")}${ublocks.join("")}</div>
    <p class="pending" style="font-size:12px">「与党の構成」に挙げた党（首相の党と連立与党）の、選挙での当選人数の合計です。発足時・選挙後の実際の議席数（当選後の入党・離党、会派の組み替えなど）とは異なることがあります。${g.others ? "「ほかに」に挙げた党派は合計に含めていません。" : ""}${ublocks.length ? "参院選は改選分の当選人数で、参議院全体の議席（非改選を含む）ではないため、過半数のラインは示していません（2007年以降は、結果調の表による参議院全体の議席も示しています）。" : ""}出典：${srcA(srcs)}　<button type="button" class="linkbtn" data-goseki="${(during[0] || before || {}).n || ""}" data-house="lo">衆院選の議席の一覧へ</button>${upDuring.length ? `　<button type="button" class="linkbtn" data-goseki="${upDuring[0].n}" data-house="up">参院選の一覧へ</button>` : ""}</p></div>`;
}
function partySeatsTable(id, house) {
  const list = HSE[house].map(e => ({ e, r: e.rows.find(r => r.party === id) })).filter(x => x.r);
  if (!list.length) return "";
  const max = Math.max(...list.map(x => x.r.seats), 1), c = pc(P[id]), up = house === "up";
  const srcs = [...new Set(list.flatMap(x => x.e.sources))];
  const ROW = ({ e, r }) => `<tr><td><button type="button" class="linkbtn" data-goseki="${e.n}" data-house="${house}">${seLabel(e)}</button></td><td class="pending">${seYear(e)}</td><td class="n"><strong>${r.seats}</strong>${r.by ? `<span class="pending">（＋${r.by}）</span>` : ""}</td><td><span class="mb" style="width:${Math.max(2, r.seats / max * 44)}px;background:${c}"></span></td><td class="pending">${up ? `${e.tier[0]}${r.a}・<wbr>${e.tier[1]}${r.b}` : r.smd != null ? `小選挙区${r.smd}・<wbr>比例${r.pr}` : ""}</td></tr>`;
  const K = 10, older = list.length > K ? list.slice(0, list.length - K) : [], recent = list.slice(older.length);
  return `<div><h3>${HNAME[house]}の当選人数${up ? "（改選分）" : ""}</h3><div class="pseatswrap"><table class="pseats"><tbody>${recent.map(ROW).join("")}</tbody></table></div>${older.length ? `<details class="pseatsold"><summary>それ以前の${older.length}回（${seYear(older[0].e)}〜${seYear(older[older.length - 1].e)}）</summary><div class="pseatswrap"><table class="pseats"><tbody>${older.map(ROW).join("")}</tbody></table></div></details>` : ""}
    <p class="pending" style="font-size:12px">${up ? "改選分の当選人数（参議院全体の議席ではない）。（＋）は同時に行われた補欠選挙の当選人。" : "総選挙での当選人数（当選後の入党・離党は含まない）。"}結果調の表記：${[...new Set(list.map(x => x.r.label))].map(esc).join("・")}。出典：${srcA(srcs)}</p></div>`;
}
function partySeatsHTML(id) { return partySeatsTable(id, "lo") + partySeatsTable(id, "up"); }
function seDetailHTML(e, house) {
  const up = house === "up";
  const ca = up ? e.tier[0] : "小選挙区", cb = up ? e.tier[1] : "比例代表";
  const va = r => up ? r.a : r.smd, vb = r => up ? r.b : r.pr;
  const hasSplit = up || e.rows.some(r => r.smd != null);
  const gi = govAt(e.date), g = GOV.governments[gi];
  const rows = sortedRows(e).map(r => `<tr><td><span class="sw" style="background:${rowColor(r)}"></span>${r.party && P[r.party] ? `<button type="button" class="linkbtn" data-goto="${r.party}">${esc(r.label)}</button>${P[r.party].name !== r.label ? `<span class="pending">（${esc(P[r.party].name)}）</span>` : ""}` : esc(r.label)}</td><td class="n"><strong>${r.seats}</strong>${r.by ? `<span class="pending">（＋${r.by}）</span>` : ""}</td>${hasSplit ? `<td class="n">${va(r)}</td><td class="n">${vb(r)}</td>` : ""}</tr>`).join("");
  const sumA = e.rows.reduce((a, r) => a + (va(r) || 0), 0), sumB = e.rows.reduce((a, r) => a + (vb(r) || 0), 0);
  // 目次：この選挙の詳細にある見出しへ移る
  const c = e.context || {}, mv = seGovMoves(e);
  const toc = [["tbl", "党派別の内訳"], c.background ? ["bg", "選挙の前に起きていたこと"] : null, c.issues ? ["is", "論点"] : null, e.context ? ["sv", "有権者が考慮した問題"] : null, c.research ? ["rs", "研究者の分析"] : null, c.parties ? ["pt", "首相と野党第一党の受け止め"] : null, g ? ["gov", "選挙時の与党"] : null, up && e.house ? ["house", "参議院全体の議席"] : null, mv.newGovs.length || mv.evs.length ? ["mv", "その後の政権の動き"] : null].filter(Boolean);
  return `${actsHTML()}${seSummaryHTML(e, house)}${toc.length > 2 ? `<nav class="setoc" aria-label="この選挙の詳細の目次">${toc.map(([k, l]) => `<button type="button" class="linkbtn" data-sdgo="${k}">${l}</button>`).join("")}</nav>` : ""}<table data-sd="tbl"><thead><tr><th>党派（結果調の表記）</th><th class="n">当選</th>${hasSplit ? `<th class="n">${ca}</th><th class="n">${cb}</th>` : ""}</tr></thead><tbody>${rows}<tr><td>計${up ? "（改選数）" : ""}</td><td class="n"><strong>${e.total}</strong>${e.by ? `<span class="pending">（＋${e.by}）</span>` : ""}</td>${hasSplit ? `<td class="n">${sumA}</td><td class="n">${sumB}</td>` : ""}</tr></tbody></table>
    ${e.note ? `<p class="pending" style="font-size:13px">注：${esc(e.note)}</p>` : ""}
    ${seCtxHTML(e)}
    ${g ? `<div class="govseat" data-sd="gov"><div class="pending" style="font-size:13px">選挙時の内閣：<button type="button" class="linkbtn" data-gogov="${gi}">${esc(g.pm)}（${esc(g.cabinets)}）</button></div>${govSeatBlock(e, gi, e.date, up ? "選挙時の与党（改選分）" : "選挙時の与党", house)}</div>` : ""}
    ${up ? houseBlock(e, true) : ""}
    ${seMovesHTML(e)}
    <p class="pending" style="font-size:12px">出典（議席）：${e.sources.map(id => `<a href="${esc(SSRC(id).url)}" target="_blank" rel="noopener">${esc(SSRC(id).title)}</a>（${esc(SSRC(id).kind)}・${esc(SSRC(id).where)}）`).join(" ")}</p>`;
}
// 選挙の日から3か月以内に起きた政権の動き：その間に発足した内閣と、出来事の期間が重なる「経緯」
const addDays = (d, n) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
function seGovMoves(e) {
  const end = addDays(e.date, 90);
  const newGovs = GOV.governments.map((g, gi) => ({ g, gi })).filter(x => x.g.start > e.date && x.g.start <= end);
  const evs = [];
  GOV.governments.forEach((g, gi) => (g.events || []).forEach(ev => {
    const ds = ev.facts.map(f => f.date).sort(); if (!ds.length) return;
    if (ds[0] <= end && ds[ds.length - 1] >= e.date) evs.push({ ev, gi });
  }));
  return { newGovs, evs };
}
// 冒頭の要約：結果調の当選人数と、このサイトの政権データから機械的に作る（評価の言葉は使わない）
function seSummaryHTML(e, house) {
  const up = house === "up", els = HSE[house], prev = els[els.indexOf(e) - 1];
  const named = sortedRows(e).filter(r => r.party && P[r.party] && r.seats > 0).slice(0, 4);
  const parts = named.map(r => { const pr = prev && prev.rows.find(x => x.party === r.party); return `${esc(r.label)} ${r.seats}${up || !prev ? "" : pr ? `（前回 ${pr.seats}）` : "（前回なし）"}`; }).join("、");
  const gi = govAt(e.date), ru = rulingAt(gi, e.date); let gov = "";
  if (ru) {
    const ids = [...new Set([...ru.pm, ...ru.partners])], nm = ids.filter(i => P[i]).map(i => P[i].name).join("・");
    if (!up) { const sum = rulingSeats(e, ids).reduce((a, x) => a + x.r.seats, 0), maj = majOf(e); gov = `選挙時の与党（${esc(nm)}）の当選は計${sum}で、過半数の${maj}${sum >= maj ? "に達した" : "に届かなかった"}。`; }
    else if (e.house) { const H = e.house, sum = ids.map(i => H.rows.find(r => r.party === i)).filter(Boolean).reduce((a, r) => a + r.total, 0), maj = Math.floor(H.total / 2) + 1; gov = `選挙後の参議院全体（非改選を含む）で、選挙時の与党（${esc(nm)}）は計${sum}で、過半数の${maj}${sum >= maj ? "に達した" : "に届かなかった"}。`; }
    else { const sum = rulingSeats(e, ids).reduce((a, x) => a + x.r.seats, 0); gov = `選挙時の与党（${esc(nm)}）の改選分の当選は計${sum}。`; }
  }
  let after = "";
  if (!up) { const ga = govAt(addDays(e.date, 60)), g = GOV.governments[ga]; if (g) after = ga !== gi ? `選挙後、${esc(g.pm)}内閣が発足した（${fmt(g.start)}）。` : `選挙後も首相は${esc(g.pm)}。`; }
  return `<p class="gsum"><strong>結果の要約</strong>　${up ? "改選分の当選" : "当選"}：${parts}${named.length < e.rows.filter(r => r.seats > 0).length ? " ほか" : ""}。${gov}${after}<span class="pending" style="font-size:12px">（総務省の結果調の数字と、このサイトの政権データから機械的に作成${up ? "。参院選の改選分は前回と議席の組が違うため前回比を示していません" : (prev ? "。前回比は同じ党どうし" : "。戦後最初の総選挙のため前回比はなし")}）</span></p>`;
}
// この選挙の論点と、結果について：研究者の分析と、首相と野党第一党の受け止めを、誰の説明かを示して出典つきで並べる
