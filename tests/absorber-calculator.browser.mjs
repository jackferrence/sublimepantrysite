import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/claude/sublime-pantry/dist';
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = path.join(ROOT, u.pathname);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('nf'); }
  const ext = path.extname(p);
  const mime = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.json':'application/json' }[ext] || 'application/octet-stream';
  res.writeHead(200, {'content-type': mime + '; charset=utf-8'});
  res.end(fs.readFileSync(p));
});
await new Promise(r => server.listen(4321, r));
const URLBASE = 'http://localhost:4321/tools/absorber-calculator';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const fail = [];
const ok = (c, m) => { console.log((c?'PASS  ':'FAIL  ')+m); if(!c) fail.push(m); };

// ---- 1. default state + reactivity ----
let page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.goto(URLBASE);
const visible = () => page.locator('.oa-result:not([hidden])');
ok(await visible().count() === 1, 'exactly one result visible on load');
ok((await visible().innerText()).includes('Gallon'), 'default is Gallon x porous');
ok((await visible().locator('.oa-figure').innerText()).trim() === '750cc', 'gallon/porous -> 750cc');

await page.getByRole('radio', { name: 'Pint' }).check();
ok(await visible().count() === 1, 'still exactly one result after change');
ok((await visible().locator('.oa-figure').innerText()).trim() === '100cc', 'pint/porous -> 100cc');
await page.getByRole('radio', { name: /Dense/ }).check();
ok((await visible().locator('.oa-figure').innerText()).trim() === '50cc', 'pint/dense -> 50cc');

// half-gallon gap
await page.getByRole('radio', { name: 'Half-gallon' }).check();
ok((await visible().innerText()).includes('No manufacturer or extension source'), 'half-gallon states the gap');
ok(await visible().locator('.oa-published').count() === 0, 'half-gallon shows no invented published figures');

// 5-gal dense
await page.getByRole('radio', { name: '5-gallon' }).check();
ok((await visible().locator('.oa-figure').innerText()).trim() === '1,500cc', '5gal/dense -> 1500cc');
ok((await visible().innerText()).includes('Utah State University Extension'), '5gal shows dissenting USU figure');
ok((await visible().innerText()).includes('Dry & Dry'), '5gal shows dissenting Dry & Dry figure');

// ---- 2. no network, no storage ----
const reqs = [];
page.on('request', r => { if (!r.url().startsWith('http://localhost:4321')) reqs.push(r.url()); });
await page.getByRole('radio', { name: 'Quart' }).check();
ok(reqs.length === 0, 'no off-page network requests: ' + JSON.stringify(reqs));
const store = await page.evaluate(() => ({ ls: localStorage.length, ss: sessionStorage.length, c: document.cookie }));
ok(store.ls === 0 && store.ss === 0 && store.c === '', 'no localStorage/sessionStorage/cookies written');

// ---- 3. shelf-life / banned words ----
const body = (await page.locator('body').innerText()).toLowerCase();
for (const w of ['shelf life','shelf-life','25 year','guarantee','unlock','revolutionize','game-changing','ultimate','elevate','delve','perfect','whether you’re a beginner','in today’s'])
  ok(!body.includes(w), `no banned/forbidden phrase: "${w}"`);
ok(!/\bbest\b/.test(body), 'no "best"');
ok(body.includes('the short version:'), 'opens with "The short version:"');
ok(body.includes('what we could not source'), 'has "What we could not source"');
ok(body.includes('sublime pantry has no affiliate relationships'), 'disclosure verbatim');
ok(body.includes('sold by sublime pantry'), 'product labeled "Sold by Sublime Pantry"');
ok((body.match(/reserve starter kit/g)||[]).length === 1, 'product mentioned exactly once');
const fnHits = body.split('footnote').length - 1;
ok(fnHits === 1 && body.includes('not chart footnotes'), `"footnote" appears only in the correction that they are NOT footnotes (${fnHits} hits)`);
ok(body.includes('marbles'), 'particle-size passage present');
ok(body.includes('quart bags can hold more than a quart'), 'quart-bag passage present');
ok(body.includes('2026-09-06'), 'access date on page');

// ---- 4. keyboard operability ----
await page.goto(URLBASE);
await page.keyboard.press('Tab'); // skip/nav
let guard = 0, reached = false;
while (guard++ < 15) {
  const t = await page.evaluate(() => { const a = document.activeElement; return a?.getAttribute('name') || a?.tagName; });
  if (t === 'container') { reached = true; break; }
  await page.keyboard.press('Tab');
}
ok(reached, 'container radios reachable by Tab');
await page.keyboard.press('ArrowDown');
const kbName = await page.evaluate(() => document.activeElement.value);
ok(kbName === 'five-gallon', `arrow keys move within the radio group (got ${kbName})`);
ok(await visible().count() === 1, 'keyboard change updates the result');

// ---- 5. aria-live region ----
const live = page.locator('[data-oa-results]');
ok(await live.getAttribute('aria-live') === 'polite', 'result region is aria-live=polite');
ok(await live.getAttribute('aria-atomic') === 'true', 'result region is aria-atomic');

// ---- 6. embed mode ----
const ep = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await ep.goto(URLBASE + '?embed=1');
ok(await ep.locator('body > header').isVisible() === false, 'embed: site header hidden');
ok(await ep.locator('body > footer').isVisible() === false, 'embed: site footer hidden');
ok(await ep.locator('h1').isVisible() === false, 'embed: page chrome hidden');
ok(await ep.locator('[data-oa-calc]').isVisible(), 'embed: calculator visible');
const attrib = ep.getByRole('link', { name: 'Calculator by Sublime Pantry' });
ok(await attrib.isVisible(), 'embed: attribution link visible');
ok((await attrib.getAttribute('href')).includes('/tools/absorber-calculator'), 'embed: attribution links back');
await ep.getByRole('radio', { name: 'Quart' }).check();
ok(await ep.locator('.oa-result:not([hidden])').count() === 1, 'embed: calculator still works');

// ---- 7. embed button ----
const ctx = await browser.newContext({ permissions: ['clipboard-read','clipboard-write'] });
const cp = await ctx.newPage();
await cp.goto(URLBASE);
const btn = cp.getByRole('button', { name: 'Embed this' });
const box = await btn.boundingBox();
ok(box.height >= 44 && box.width >= 44, `embed button >=44px (${Math.round(box.width)}x${Math.round(box.height)})`);
await btn.click();
const clip = await cp.evaluate(() => navigator.clipboard.readText());
ok(clip.startsWith('<iframe') && clip.includes('?embed=1'), 'copied snippet is an iframe with ?embed=1');
ok(clip.includes('title='), 'iframe snippet has a title attribute');
ok(!clip.includes('scrolling="no"'), 'iframe snippet does not disable scrolling');
ok((await cp.locator('[data-embed-status]').innerText()).includes('copied'), 'status announced after copy');

// ---- 8. 390px ----
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await m.goto(URLBASE);
let ow = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
ok(ow, 'no horizontal page scroll at 390px');
const small = await m.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('main a[href], main button, main input, main summary')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const t = el.closest('label') ?? el;
    const tr = t.getBoundingClientRect();
    // WCAG 2.5.8 inline exception: a link inside a sentence of non-target text.
    const inSentence = el.tagName === 'A' && (() => {
      const par = el.closest('p, li');
      if (!par) return false;
      return par.textContent.trim().length > (el.textContent || '').trim().length + 40
        && !el.className.includes('src') && !par.className.includes('next-links');
    })();
    if (inSentence) continue;
    if (tr.height < 44 || tr.width < 24) out.push((el.tagName+':'+(el.textContent||'').trim().slice(0,30)) + ` ${Math.round(tr.width)}x${Math.round(tr.height)}`);
  }
  return out;
});
ok(small.length === 0, 'all targets >=44px tall at 390px' + (small.length ? ': ' + JSON.stringify(small.slice(0,6)) : ''));
await m.screenshot({ path: '/tmp/shot-390.png', fullPage: false });

// ---- 9. 200% zoom ----
const z = await browser.newPage({ viewport: { width: 1280, height: 1024 }, deviceScaleFactor: 1 });
await z.goto(URLBASE);
await z.evaluate(() => { document.body.style.zoom = '2'; });
await z.waitForTimeout(200);
ok(await z.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), 'no horizontal scroll at 200% zoom');
// equivalent: 640px CSS viewport
const z2 = await browser.newPage({ viewport: { width: 640, height: 512 } });
await z2.goto(URLBASE);
ok(await z2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal scroll at 640px (200% of 1280)');
await z2.screenshot({ path: '/tmp/shot-zoom.png' });

// ---- 10. axe ----
for (const [name, target] of [['full page', URLBASE], ['embed', URLBASE + '?embed=1']]) {
  const actx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ap = await actx.newPage();
  await ap.goto(target);
  const r = await new AxeBuilder({ page: ap }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  ok(r.violations.length === 0, `axe: no WCAG 2.1 AA violations (${name})` +
    (r.violations.length ? ' -> ' + JSON.stringify(r.violations.map(v=>v.id+':'+v.nodes.length)) : ''));
  await actx.close();
}

// ---- 11. no-JS ----
const nj = await browser.newContext({ javaScriptEnabled: false });
const njp = await nj.newPage();
await njp.goto(URLBASE);
const allRes = await njp.locator('.oa-result').count();
ok(allRes === 15, `no-JS: all ${allRes} result blocks present in HTML`);

ok(errs.length === 0, 'no page errors: ' + JSON.stringify(errs));

await browser.close(); server.close();
console.log('\n' + (fail.length ? `${fail.length} FAILURES` : 'ALL PASSED'));
process.exit(fail.length ? 1 : 0);
