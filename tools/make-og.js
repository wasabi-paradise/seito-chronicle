// 共有用画像（1200×630）を public/og/ に作る。使い方：node tools/make-og.js
// 立場の区分や色は載せず、サイト名・テーマ名・問い・党名だけを載せる（画像だけが切り取られても誤解されないように）
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
// data/stances/index.json の目次から、分けたファイルを組み立てる（build.py と同じ規則）
const dir = path.join(root, 'data/stances');
const rd = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const asm = n => n && typeof n === 'object' && !Array.isArray(n) ? (n.$parts ? (v => v.every(Array.isArray) ? v.flat() : Object.assign({}, ...v))(n.$parts.map(rd)) : n.$items ? n.$items.map(rd) : Object.fromEntries(Object.entries(n).map(([k, v]) => [k, asm(v)]))) : n;
const st = asm(rd('index.json'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const page = (kicker, title, sub) => `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;background:#f6f4ef;color:#25282d;font-family:"Noto Sans CJK JP","Noto Sans JP",sans-serif}
.w{box-sizing:border-box;width:1200px;height:630px;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between;border-top:14px solid #25282d}
.k{font-size:32px;color:#6b6760;font-weight:500;letter-spacing:.04em}
.t{font-size:${title.length > 14 ? 64 : 80}px;font-weight:800;line-height:1.25;margin-top:18px}
.s{font-size:34px;line-height:1.5;margin-top:22px;color:#3d4046}
.f{display:flex;align-items:flex-end;justify-content:space-between;border-top:2px solid #d8d3c6;padding-top:26px}
.b{font-size:44px;font-weight:800}.b span{display:block;font-size:24px;font-weight:500;color:#6b6760;margin-top:6px}
.n{font-size:22px;color:#6b6760;text-align:right;line-height:1.6}
</style></head><body><div class="w"><div><div class="k">${esc(kicker)}</div><div class="t">${esc(title)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}</div>
<div class="f"><div class="b">政党クロニクル<span>戦後の政党と、公約のその後</span></div><div class="n">党の資料などの出典つき</div></div></div></body></html>`;
(async () => {
  const out = path.join(root, 'public/og'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const jobs = [['default', page('戦後の政党の系譜と、各党の政策の立場', 'その公約、そのあとどうなった？', '結成・合流・分裂の系譜／2016〜2026年の各党の立場')]];
  st.themes.forEach(t => jobs.push(['theme-' + t.id, page('テーマで比べる：各党の立場', t.name, '問い：' + t.question)]));
  st.parties.forEach(p => jobs.push(['party-' + p.id, page('政党ごとに見る：政策の立場の移り変わり', p.name.replace(/（.*?）/, ''), ((p.name.match(/（(.*?)）/) || [])[1] ? (p.name.match(/（(.*?)）/)[1] + '／') : '') + '2016〜2026年の国政選挙')]));
  for (const [name, h] of jobs) { await pg.setContent(h); await pg.screenshot({ path: path.join(out, name + '.png') }); }
  await b.close(); console.log('ok', jobs.length);
})();
