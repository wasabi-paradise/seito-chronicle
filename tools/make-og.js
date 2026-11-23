// 共有用画像（1200×630）を public/og/ に、サイトのアイコン（icon.svg・favicon.ico・apple-touch-icon.png・logo.png）を public/ に作る。使い方：node tools/make-og.js
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
  jobs.push(['elections', page('選挙ごとに見る：党派別の当選人数', '戦後の衆院選・参院選の結果', '総務省の結果調の数字／選挙の背景と有権者の調査')]);
  jobs.push(['data', page('データのダウンロード（CC BY 4.0）', '政党クロニクルのデータ', '各党の立場・公約のその後・当選人数・系譜（CSV・JSON）')]);
  for (const [name, h] of jobs) { await pg.setContent(h); await pg.screenshot({ path: path.join(out, name + '.png') }); }
  // アイコン：系譜図の線（分かれて、合わさる）を図案にしたもの
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#25282d"/><path d="M7 10h9M7 16h18M16 22h9M16 10c3 0 3 6 6 6M13 16c3 0 3 6 6 6" fill="none" stroke="#f6f4ef" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  const pub = path.join(root, 'public'); fs.writeFileSync(path.join(pub, 'icon.svg'), svg + '\n');
  const png = async (size, pad) => { const ip = await b.newPage({ viewport: { width: size, height: size } });
    await ip.setContent(`<html><body style="margin:0;background:${pad ? '#25282d' : 'transparent'}"><div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center">${svg.replace('<svg ', `<svg width="${pad ? Math.round(size * .86) : size}" height="${pad ? Math.round(size * .86) : size}" `)}</div></body></html>`);
    const buf = await ip.screenshot({ omitBackground: !pad }); await ip.close(); return buf; };
  fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), await png(180, true));
  fs.writeFileSync(path.join(pub, 'logo.png'), await png(512, false));
  // favicon.ico：48×48 の PNG を1つ入れた ICO
  const p48 = await png(48, false), h = Buffer.alloc(22);
  h.writeUInt16LE(0, 0); h.writeUInt16LE(1, 2); h.writeUInt16LE(1, 4); h[6] = 48; h[7] = 48; h[8] = 0; h[9] = 0;
  h.writeUInt16LE(1, 10); h.writeUInt16LE(32, 12); h.writeUInt32LE(p48.length, 14); h.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(pub, 'favicon.ico'), Buffer.concat([h, p48]));
  await b.close(); console.log('ok', jobs.length);
})();
