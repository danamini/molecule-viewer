// End-to-end smoke tests: serve the site, drive it in Chromium, and fail on any broken step or console
// error. Run with `npm test` (first time: `npm install && npx playwright install chromium`).
// Set CHROME_PATH to use an existing Chromium instead. PubChem and Wikipedia are live services; the one
// test that needs PubChem is skipped when it cannot be reached.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif' };

const server = http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = path.endsWith('/') || path.endsWith('\\') ? `${path}index.html` : path;
  try {
    const body = await readFile(join(ROOT, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--ignore-gpu-blocklist', '--use-angle=metal', '--enable-unsafe-swiftshader'],
});

let failures = 0;
const results = [];
async function test(name, fn, { viewport = { width: 1440, height: 900 }, mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const t0 = Date.now();
  try {
    await fn(page);
    if (errors.length) throw new Error(`console errors:\n    ${errors.join('\n    ')}`);
    results.push(`  ok    ${name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (err) {
    if (err.skip) results.push(`  skip  ${name}: ${err.message}`);
    else { failures++; results.push(`  FAIL  ${name}\n    ${err.message}`); }
  }
  console.log(results[results.length - 1]);
  await ctx.close();
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const wait = (page, ms) => page.waitForTimeout(ms);
const levels = page => page.evaluate(() => viewer.stage.levels.map(l => l.kind).join('>'));
const title = page => page.evaluate(() => document.querySelector('#name').textContent);
const go = async (page, hash, ms = 2800) => { await page.goto(`${BASE}#${hash}`); await wait(page, ms); };
const clickHotspot = (page, label) => page.evaluate(l => {
  const h = [...document.querySelectorAll('.hotspot')].find(x => x.textContent.includes(l) && x.style.display !== 'none' && x.style.visibility !== 'hidden');
  h?.click();
  return !!h;
}, label);

// ------------------------------------------------------------------ the tests

await test('landing page shows over the snowflake', async page => {
  await page.goto(BASE);
  await wait(page, 2500);
  expect(await page.isVisible('#intro'), 'intro should be visible with no address');
  expect((await page.$$('.chapter')).length === 5, 'five chapters');
  expect(await levels(page) === 'snowflake', 'snowflake behind the intro');
  await page.click('#exploreFree');
  await wait(page, 2000);
  expect(!(await page.isVisible('#intro')), 'intro hides on Explore');
  expect(await title(page) === 'Caffeine', 'Explore opens caffeine');
});

await test('every library entry builds in every drawing style', async page => {
  await go(page, 'caffeine', 2500);
  const bad = await page.evaluate(async () => {
    const { LIBRARY } = await import('/molecules.js');
    const { buildModel } = await import('/js/structure.js');
    const out = [];
    for (const e of LIBRARY) for (const m of ['cloud', 'ball', 'space', 'stick']) {
      try { viewer.stage.showMolecule(buildModel(e), m); } catch (err) { out.push(`${e.key}/${m}: ${err.message}`); }
    }
    return { out, n: LIBRARY.length };
  });
  expect(bad.n >= 60, `library has ${bad.n} entries`);
  expect(!bad.out.length, bad.out.join('; '));
});

await test('powers of ten: molecule to the Planck length and back', async page => {
  await go(page, 'water');
  const chain = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Enter'); await wait(page, i === 3 ? 3800 : 2500); chain.push(await levels(page)); }
  expect(chain[3] === 'molecule>atom>nucleus>nucleon>planck', `reached ${chain[3]}`);
  expect(/Magnified .* times/.test(await page.textContent('#mag')), 'magnification readout');
  expect((await page.textContent('#analogy')).includes('light-years'), 'Planck comparison');
  await page.click('#crumbs button[data-depth="0"]');
  await wait(page, 3200);
  expect(await levels(page) === 'molecule', 'breadcrumb returns to the molecule');
});

await test('electron and neutron choices from atom and nucleus', async page => {
  await go(page, 'element-O', 4500);
  expect(await levels(page) === 'table>atom', 'element route flies in from the table');
  await page.click('[data-dive="electron"]');
  await wait(page, 2600);
  expect(await title(page) === 'Electron', 'electron level');
  await page.keyboard.press('Escape');
  await wait(page, 2000);
  await page.click('[data-dive="nucleus"]');
  await wait(page, 2600);
  await page.click('[data-dive="neutron"]');
  await wait(page, 2600);
  expect(await title(page) === 'Neutron', 'neutron level');
  expect(await page.isVisible('#cornerCard'), 'element card in the corner');
});

await test('periodic table: views, steady hover, keyboard', async page => {
  await go(page, 'table', 3800);
  for (const v of ['mass', 'state', 'body', 'sizes', 'made', 'library', 'family']) {
    await page.click(`[data-view="${v}"]`);
    expect(await page.evaluate(() => viewer.stage.current.view) === v, `view ${v}`);
  }
  await page.mouse.move(690, 390);
  await wait(page, 800);
  const seen = new Set();
  for (let i = 0; i < 15; i++) { seen.add(await page.evaluate(() => viewer.stage.current.hover?.userData.element.symbol ?? '-')); await wait(page, 60); }
  expect(seen.size === 1 && !seen.has('-'), `hover should hold steady, saw ${[...seen]}`);
  await page.mouse.move(1000, 820);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await wait(page, 2800);
  expect(await levels(page) === 'table>atom', 'Enter dives into the highlighted element');
});

await test('particle zoo', async page => {
  await go(page, 'particles', 3000);
  expect(await page.evaluate(() => viewer.stage.current.tiles.length) === 17, '17 particles');
  await go(page, 'particle-mu', 4200);
  expect(await title(page) === 'Muon', 'muon level');
});

await test('every journey opens and zooms in', async page => {
  const { THINGS } = await (async () => { await go(page, 'caffeine', 1500); return page.evaluate(async () => ({ THINGS: (await import('/js/things.js')).THINGS.map(t => t.key) })); })();
  expect(THINGS.length >= 9, `${THINGS.length} journeys`);
  for (const k of THINGS) {
    await go(page, `thing-${k}`, 2500);
    await page.keyboard.press('Enter');
    await wait(page, 2500);
    const lv = await levels(page);
    expect(lv.split('>').length === 2, `${k} should zoom one level, got ${lv}`);
  }
});

await test('composite parts lead to their own materials', async page => {
  const cases = [['chip', [['Silicon die', 'Silicon'], ['Gold bond wire', 'Gold'], ['Copper trace', 'Copper'], ['Black package', 'Epoxy resin'], ['Circuit board', 'Quartz']]],
    ['coffee', [['Caffeine', 'Caffeine'], ['Steel spoon', 'Iron']]], ['pencil', [['Eraser', 'Isoprene'], ['Graphite tip', 'Graphene']]]];
  for (const [thing, parts] of cases) {
    await go(page, `thing-${thing}`);
    for (const [label, expected] of parts) {
      expect(await clickHotspot(page, label), `${thing}: hotspot ${label}`);
      await wait(page, 2500);
      expect(await title(page) === expected, `${thing} / ${label} should open ${expected}, got ${await title(page)}`);
      await page.keyboard.press('Escape');
      await wait(page, 2000);
    }
  }
});

await test('Z80: package, die, transistor, material', async page => {
  await go(page, 'thing-z80');
  expect(await clickHotspot(page, 'Silicon die'), 'die hotspot');
  await wait(page, 2700);
  expect(await title(page) === 'The Z80 die', 'die level');
  expect(await clickHotspot(page, 'Register file'), 'register file hotspot');
  await wait(page, 2700);
  expect(await title(page) === 'One transistor', 'transistor level');
  expect(await clickHotspot(page, 'Gate oxide'), 'gate oxide hotspot');
  await wait(page, 2700);
  expect(await levels(page) === 'thing>thing>thing>molecule', 'four levels deep');
  expect(await title(page) === 'Quartz', 'gate oxide is silicon dioxide');
});

await test('guided journey descends with captions', async page => {
  await page.goto(BASE);
  await wait(page, 2000);
  await page.click('#startJourney');
  await wait(page, 13000);
  expect(await levels(page) === 'snowflake>molecule', `after the first step: ${await levels(page)}`);
  expect((await page.textContent('#caption span')).startsWith('Ice.'), 'ice caption');
  await page.click('#captionStop');
  expect(!(await page.isVisible('#caption')), 'Stop hides the caption');
});

await test('search finds elements and library molecules', async page => {
  await go(page, 'caffeine', 2000);
  await page.keyboard.press('/');
  await page.keyboard.type('iron', { delay: 30 });
  await wait(page, 300);
  const first = await page.textContent('#results li[data-i="0"] span');
  expect(first === 'Iron', `first result ${first}`);
  await page.keyboard.press('Enter');
  await wait(page, 4500);
  expect(await title(page) === 'Iron atom', 'Enter on the element flies into its atom');
});

await test('search reaches PubChem', async page => {
  await go(page, 'caffeine', 2000);
  const reachable = await page.evaluate(() => fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/2244/property/Title/JSON').then(r => r.ok, () => false));
  if (!reachable) throw Object.assign(new Error('PubChem not reachable'), { skip: true });
  await page.keyboard.press('/');
  await page.keyboard.type('psilocybin', { delay: 30 });
  await wait(page, 1500);
  await page.keyboard.press('Enter');
  await wait(page, 5000);
  expect(await title(page) === 'Psilocybin', `loaded ${await title(page)}`);
  expect((await page.evaluate(() => location.hash)).startsWith('#cid-'), 'shareable CID address');
});

await test('library folds away and back', async page => {
  await go(page, 'caffeine', 2000);
  await page.click('#collapseBtn');
  expect(await page.evaluate(() => document.body.classList.contains('lib-collapsed')), 'collapsed');
  await page.keyboard.press('[');
  expect(!(await page.evaluate(() => document.body.classList.contains('lib-collapsed'))), '[ expands it again');
});

await test('random and tour', async page => {
  await go(page, 'caffeine', 2000);
  for (let i = 0; i < 3; i++) { await page.keyboard.press('r'); await wait(page, 3500); }
  await page.click('#tourBtn');
  await wait(page, 1500);
  expect(await page.evaluate(() => !!viewer.state.tour), 'tour running');
  await page.keyboard.press('x');
  expect(await page.evaluate(() => !viewer.state.tour), 'any key stops the tour');
});

await test('phone layout', async page => {
  await go(page, 'caffeine', 3000);
  await page.tap('#sheetHandle');
  expect(await page.isVisible('#detailsBody'), 'details sheet opens');
  await page.tap('#sheetHandle');
  await page.tap('#libraryToggle');
  expect(await page.isVisible('#libraryList'), 'library drawer opens');
}, { viewport: { width: 430, height: 932 }, mobile: true });

await browser.close();
server.close();
console.log(`\n${results.length - failures} of ${results.length} passed${failures ? `, ${failures} failed` : ''}`);
process.exit(failures ? 1 : 0);
