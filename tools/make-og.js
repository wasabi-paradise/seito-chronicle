// 共有用画像（1200×630）を public/og/ に、サイトのアイコン（icon.svg・favicon.ico・apple-touch-icon.png・logo.png）を public/ に作る。使い方：node tools/make-og.js
// 立場の区分や党の色は載せない（画像だけが切り取られても誤解されないように）。画面の写し（PC・スマホ）は区分が出る手前までを切り取る
// 先に python3 build.py で dist/ を作ってから実行し、そのあともう一度 build.py を実行して public/ の画像を dist/ に入れる
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
// data/stances/index.json の目次から、分けたファイルを組み立てる（build.py と同じ規則）
const dir = path.join(root, 'data/stances');
const rd = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const asm = n => n && typeof n === 'object' && !Array.isArray(n) ? (n.$parts ? (v => v.every(Array.isArray) ? v.flat() : Object.assign({}, ...v))(n.$parts.map(rd)) : n.$items ? n.$items.map(rd) : Object.fromEntries(Object.entries(n).map(([k, v]) => [k, asm(v)]))) : n;
const st = asm(rd('index.json'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 画面の写し：区分や党の色が写らない範囲（案内・タブ・テーマや政党のボタンまで）だけを切り取る
const U = 'file://' + path.join(root, 'dist/index.html');
const shotCache = {};
async function shots(b, hash) {
  if (shotCache[hash]) return shotCache[hash];
  const grab = async (w, h, dsf, mob, cut) => {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: mob, hasTouch: mob });
    const p = await c.newPage(); await p.goto(U + (hash ? '#' + hash : '')); await p.waitForTimeout(500);
    const y = await p.evaluate(() => { const i = document.getElementById('intro'); i.hidden = false; i.classList.remove('mini');
      const s = [...document.querySelectorAll('.tbtn[aria-pressed="true"], .pbtn[aria-pressed="true"]')].find(e => e.offsetParent !== null); if (s) s.scrollIntoView({ block: 'nearest', inline: 'center' });
      window.scrollTo(0, 0);
      const t = ['#posmap', '#matrixArea'].map(q => document.querySelector(q)).filter(e => e && e.offsetParent !== null).map(e => e.getBoundingClientRect().top + scrollY);
      return Math.min(...t); });
    const buf = await p.screenshot({ clip: { x: 0, y: 0, width: w, height: Math.min(cut, y - 12) } }); await c.close();
    return 'data:image/png;base64,' + buf.toString('base64');
  };
  return (shotCache[hash] = { pc: await grab(1280, 800, 1.5, false, 560), sp: await grab(390, 844, 2, true, 700) });
}
const page = (kicker, title, sub, sh, top) => `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#f6f4ef;color:#25282d;font-family:"Noto Sans CJK JP","Noto Sans JP",sans-serif}
.bar{position:absolute;left:0;top:0;width:1200px;height:12px;background:#25282d}
.txt{position:absolute;left:64px;top:62px;width:${title.length > 12 ? 520 : 500}px}
.k{font-size:24px;color:#6b6760;font-weight:700;letter-spacing:.03em}
.t{font-size:${Math.max(50, Math.min(76, Math.floor(470 / Math.max(...title.split('\n').map(l => l.length)))))}px;font-weight:900;line-height:1.22;margin-top:14px;letter-spacing:.01em}
.s{font-size:24px;line-height:1.6;margin-top:18px;color:#3d4046}
.brand{position:absolute;left:64px;bottom:44px}
.brand b{display:block;font-size:36px;font-weight:900;letter-spacing:.04em}
.brand span{display:block;font-size:19px;color:#5b5a55;margin-top:4px}
.url{position:absolute;left:64px;bottom:18px;font-size:15px;color:#8a857a;letter-spacing:.02em}
.pc{position:absolute;left:670px;top:64px;width:720px;border-radius:12px;overflow:hidden;background:#fffdf9;box-shadow:0 14px 44px rgba(40,35,20,.20),0 0 0 1px rgba(0,0,0,.07)}
.pc .chrome{height:22px;background:#ebe7dd;display:flex;gap:6px;align-items:center;padding-left:12px}
.pc .chrome i{width:9px;height:9px;border-radius:50%;background:#cfc9bb}
.pc img{display:block;width:100%}
.sp{position:absolute;left:584px;top:206px;width:180px;border-radius:26px;background:#1d1f23;padding:7px;box-shadow:0 16px 40px rgba(40,35,20,.30)}
.sp img{display:block;width:100%;border-radius:20px}
.fade{position:absolute;left:0;right:0;bottom:0;height:24px;background:linear-gradient(rgba(255,253,249,0),#fffdf9)}
.note{position:absolute;right:28px;bottom:18px;font-size:15px;color:#8a857a}
</style></head><body><div class="bar"></div>
<div class="txt"><div class="k">${esc(kicker)}</div><div class="t">${esc(title).replace(/\n/g, "<br>")}</div>${sub ? `<div class="s">${esc(sub).replace(/\n/g, "<br>")}</div>` : ''}</div>
<div class="brand"><b>政党クロニクル</b>${top ? "" : "<span>政党の政策・議席・ルーツがわかる</span>"}</div><div class="url">seito-chronicle.michisus.co.jp</div>
<div class="pc"><div class="chrome"><i></i><i></i><i></i></div><img src="${sh.pc}"><div class="fade"></div></div>
<div class="sp"><img src="${sh.sp}"></div>
<div class="note">党の資料などの出典つき・登録不要・無料</div></body></html>`;
(async () => {
  const out = path.join(root, 'public/og'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const jobs = [['default', page('出典つきでたどる、戦後の政党', '政党の政策・議席・\nルーツがわかる', '各党の政策の立場／戦後の選挙の議席／\n結成・合流・分裂の系譜', await shots(b, ''), true)]];
  for (const t of st.themes) jobs.push(['theme-' + t.id, page('テーマで比べる：各党の立場', t.name, '問い：' + t.question, await shots(b, 'seisaku-' + t.id))]);
  for (const p of st.parties) jobs.push(['party-' + p.id, page('政党ごとに見る：政策の立場の移り変わり', p.name.replace(/（.*?）/, ''), ((p.name.match(/（(.*?)）/) || [])[1] ? (p.name.match(/（(.*?)）/)[1] + '／') : '') + '2016〜2026年の国政選挙', await shots(b, 'seito-' + p.id))]);
  jobs.push(['elections', page('選挙ごとに見る：党派別の当選人数', '戦後の衆院選・\n参院選の結果', '総務省の結果調の数字／\n選挙の背景と有権者の調査', await shots(b, ''))]);
  jobs.push(['data', page('データのダウンロード（CC BY 4.0）', '政党クロニクルの\nデータ', '各党の立場・公約のその後・\n当選人数・系譜（CSV・JSON）', await shots(b, ''))]);
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
