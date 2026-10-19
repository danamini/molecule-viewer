import { LIBRARY } from '../molecules.js';
import { element, L_LETTER, FAMILY_COLORS, BY_Z, ELEMENTS, configuration } from './elements.js';
import { TABLE_VIEWS } from './worlds.js';
import { buildModel } from './structure.js';
import { createStage } from './stage.js';
import { ORBITAL_COLORS } from './cloud.js';
import { suggest, fetchCompound, wikipedia } from './sources.js';
import { magnification, analogy, RULER, RULER_MARKS, UNEXPLORED, pow10, formatHuman as formatHumanSize } from './scale.js';
import { WHERE } from './facts.js';
import { PARTICLES, PARTICLE_FAMILIES } from './particles.js';
import { THINGS, THING, THING_ICONS, partElements, elementBadges } from './things.js';

const $ = s => document.querySelector(s);
const hex = n => `#${n.toString(16).padStart(6, '0')}`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 2) => Number(n).toLocaleString('en-GB', { maximumFractionDigits: d });
// conventional order where Hill order reads oddly
const FORMULA_DISPLAY = { H3N: 'NH3' };
// lower-case ordinary words for mid-sentence use, keeping names and acronyms (Z80, PLA, ALU) as they are
const softLower = t => t.split(' ').map(w => (/^[A-Z][a-z]/.test(w) ? w.toLowerCase() : w)).join(' ');
const formulaHtml = f => esc(FORMULA_DISPLAY[f] || f).replace(/(\d+)/g, '<sub>$1</sub>');
const ZOOM_IC = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M11 8v6M8 11h6M16 16l5 5"/></svg>';

// Places that are not molecules in the library: the periodic table, the snowflake journey, single elements
const EXPLORE = [
  { key: 'table', name: 'Periodic table', meta: '118' },
  { key: 'particles', name: 'Particle zoo', meta: '17' },
];

const state = { entry: null, mode: 'cloud', tour: null, wikiAbort: null, searchAbort: null, labels: false, shown: null };

// ------------------------------------------------------------------ stage
let stage;
try {
  stage = createStage($('#stage'), {
    onLevels: (levels, current) => { renderLevel(current); renderCrumbs(); },
    onDiveStart: next => { previewLevel(next); },
    onHover: showTip,
    onPush: showPush,
    onFrame: updateScale,
    onMeasure: showMeasure,
  });
} catch (err) {
  $('#veil').classList.add('error');
  $('#veil span').textContent = 'This browser could not start WebGL, which the 3D view needs.';
  throw err;
}

// ------------------------------------------------------------------ library
// Each row carries a small drawing of the molecule itself: its real coordinates, flattened onto the plane
// it spreads out in most (its two principal axes), atoms in their element colours.
const glyphs = new Map();
function principalAxes(pts) {
  const n = pts.length, c = [0, 0, 0];
  pts.forEach(p => { c[0] += p[0] / n; c[1] += p[1] / n; c[2] += p[2] / n; });
  const q = pts.map(p => [p[0] - c[0], p[1] - c[1], p[2] - c[2]]);
  const C = [0, 1, 2].map(i => [0, 1, 2].map(j => q.reduce((s, p) => s + p[i] * p[j], 0)));
  const mul = v => C.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
  let a = norm([1, 0.3, 0.2]);
  for (let i = 0; i < 40; i++) a = norm(mul(a));
  let b = norm([0.2, 1, 0.4]);
  for (let i = 0; i < 40; i++) {
    b = mul(b);
    const d = b[0] * a[0] + b[1] * a[1] + b[2] * a[2];
    b = norm([b[0] - d * a[0], b[1] - d * a[1], b[2] - d * a[2]]);
  }
  return { q, a, b };
}
function glyph(entry) {
  if (glyphs.has(entry.key)) return glyphs.get(entry.key);
  const heavyOnly = entry.atoms.length > 28;
  const keep = entry.atoms.map((a, i) => (!heavyOnly || a[0] !== 'H' ? i : -1)).filter(i => i >= 0);
  const { q, a, b } = principalAxes(entry.atoms.map(t => t.slice(1)));
  const xy = q.map(p => [p[0] * a[0] + p[1] * a[1] + p[2] * a[2], p[0] * b[0] + p[1] * b[1] + p[2] * b[2]]);
  let r = 0.8;
  keep.forEach(i => { r = Math.max(r, Math.abs(xy[i][0]), Math.abs(xy[i][1])); });
  const S = 17 / r, P = i => [(22 + xy[i][0] * S).toFixed(1), (22 - xy[i][1] * S).toFixed(1)];
  const set = new Set(keep);
  const lines = entry.bonds.filter(([i, j, o]) => o > 0 && set.has(i) && set.has(j))
    .map(([i, j]) => { const [x1, y1] = P(i), [x2, y2] = P(j); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }).join('');
  const dot = Math.max(0.75, Math.min(3.4, 12 / Math.sqrt(keep.length)));
  const dots = keep.map(i => {
    const [x, y] = P(i), sym = entry.atoms[i][0];
    const col = sym === 'C' ? '#9aa6b8' : sym === 'H' ? '#dfe6f0' : hex(element(sym).color);
    return `<circle cx="${x}" cy="${y}" r="${(sym === 'H' ? dot * 0.7 : dot).toFixed(1)}" fill="${col}"/>`;
  }).join('');
  const svg = `<svg class="glyph" viewBox="0 0 44 44" aria-hidden="true"><g class="bonds">${lines}</g>${dots}</svg>`;
  glyphs.set(entry.key, svg);
  return svg;
}

// each group's colour and a small icon for its heading
const GROUP_STYLE = {
  Essentials: ['#7cc4ff', '<circle cx="8" cy="8" r="3"/><circle cx="3.5" cy="11.5" r="2"/><circle cx="12.5" cy="11.5" r="2"/>'],
  Everyday: ['#f2b45a', '<path d="M3 6h9v4a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4z"/><path d="M12 7h1.5a1.5 1.5 0 0 1 0 3H12M6 2v2M9 2v2"/>'],
  'Body and brain': ['#ff7a9a', '<path d="M8 14s-5.5-3.2-5.5-7A3 3 0 0 1 8 5a3 3 0 0 1 5.5 2c0 3.8-5.5 7-5.5 7z"/>'],
  DNA: ['#8ef0b0', '<path d="M4 2c0 4 8 8 8 12M12 2c0 4-8 8-8 12M5 5h6M5 11h6"/>'],
  Medicine: ['#e58cff', '<rect x="2.5" y="5.5" width="11" height="5" rx="2.5" transform="rotate(-35 8 8)"/><path d="M6 6l4 4" transform="rotate(10 8 8)"/>'],
  'Shapes and materials': ['#5fd6b4', '<path d="M8 2l5.2 3v6L8 14l-5.2-3V5z"/>'],
  Crystals: ['#b9d3ff', '<path d="M8 1.5l4.5 4-4.5 9-4.5-9z M3.5 5.5h9"/>'],
};

const GROUP_NOTES = {
  Essentials: 'Small, simple and everywhere',
  Everyday: 'In your kitchen, cupboard and coffee',
  'Body and brain': 'The chemistry running you right now',
  DNA: 'The four letters of the genetic code',
  Medicine: 'Molecules that changed how we live',
  'Shapes and materials': 'Rings, cages and chains',
  Crystals: 'Atoms stacked in repeating patterns',
};
const EXPLORE_ICONS = {
  table: '<svg viewBox="0 0 44 44" aria-hidden="true">' + [[0, 0], [8, 0], [0, 1], [1, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3]]
    .map(([c, r]) => `<rect x="${3 + c * 4.3}" y="${10 + r * 6}" width="3.4" height="5" rx="0.8" fill="${['#ff7a59', '#ffb04d', '#8fa6d8', '#8fa6d8', '#8fa6d8', '#6fb0c8', '#5fd6b4', '#9be36b', '#b48cff'][c]}"/>`).join('') + '</svg>',
  particles: '<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17" fill="none" stroke="#5b6578" stroke-dasharray="2 3"/><circle cx="16" cy="18" r="5" fill="#ff4060"/><circle cx="28" cy="18" r="5" fill="#40ff8a"/><circle cx="22" cy="28" r="5" fill="#4f8bff"/></svg>',
  snowflake: '<svg viewBox="0 0 44 44" aria-hidden="true" stroke="#cfe8ff" stroke-width="1.6" stroke-linecap="round">' + [0, 60, 120, 180, 240, 300].map(d => `<g transform="rotate(${d} 22 22)"><line x1="22" y1="22" x2="22" y2="4"/><line x1="22" y1="11" x2="17" y2="7"/><line x1="22" y1="11" x2="27" y2="7"/></g>`).join('') + '</svg>',
};
const EXPLORE_NOTES = { table: 'Every element; click one to go inside it', particles: 'The 17 things everything is made of' };

function renderLibrary() {
  const groups = [...new Set(LIBRARY.map(e => e.group))];
  $('#libraryList').innerHTML = `
    <div class="explore">${EXPLORE.map(e => `
      <button type="button" class="feature" data-key="${e.key}">${EXPLORE_ICONS[e.key]}<span><b>${esc(e.name)}</b><small>${esc(EXPLORE_NOTES[e.key])}</small></span></button>`).join('')}
    </div>
    <h2 style="--g:#cfe8ff"><svg class="gi" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5v13M2.4 4.8l11.2 6.4M13.6 4.8L2.4 11.2"/></svg><span>Journeys<small>Start with something you can hold</small></span><em>${THINGS.length}</em></h2>
    <ul style="--g:#cfe8ff">${THINGS.map(t => `
      <li><button type="button" data-key="thing-${t.key}"><svg class="glyph" viewBox="0 0 44 44" aria-hidden="true">${THING_ICONS[t.icon]}</svg><span class="txt"><span>${esc(t.name)}</span><small>${esc(t.note)}</small></span></button></li>`).join('')}
    </ul>
    ${groups.map(g => {
      const [col, icon] = GROUP_STYLE[g] || ['#8b96aa', '<circle cx="8" cy="8" r="4"/>'];
      const n = LIBRARY.filter(e => e.group === g).length;
      return `
    <h2 style="--g:${col}"><svg class="gi" viewBox="0 0 16 16" aria-hidden="true">${icon}</svg><span>${esc(g)}<small>${esc(GROUP_NOTES[g] || '')}</small></span><em>${n}</em></h2>
    <ul style="--g:${col}">${LIBRARY.filter(e => e.group === g).map(e => `
      <li><button type="button" data-key="${e.key}">${glyph(e)}<span class="txt"><span>${esc(e.name)}</span><small>${formulaHtml(e.formula)}</small></span></button></li>`).join('')}
    </ul>`;
    }).join('')}`;
}
$('#libraryList').addEventListener('click', e => {
  const b = e.target.closest('button[data-key]');
  if (!b) return;
  stopTour();
  go(b.dataset.key);
  $('#library').classList.remove('open');
  $('#libraryToggle').setAttribute('aria-expanded', 'false');
});
// the library can fold away to a slim rail; remembered between visits
function setLibraryCollapsed(on) {
  document.body.classList.toggle('lib-collapsed', on);
  $('#collapseBtn').setAttribute('aria-expanded', String(!on));
  try { localStorage.setItem('mv-lib-collapsed', on ? '1' : ''); } catch { /* private mode */ }
  requestAnimationFrame(() => { renderRuler(); stage.reframe(); });
}
$('#collapseBtn').addEventListener('click', () => setLibraryCollapsed(true));
$('#expandBtn').addEventListener('click', () => setLibraryCollapsed(false));
$('#railSearch').addEventListener('click', () => { setLibraryCollapsed(false); setTimeout(() => $('#search').focus(), 50); });
try { if (localStorage.getItem('mv-lib-collapsed')) document.body.classList.add('lib-collapsed'); } catch { /* private mode */ }

$('#libraryToggle').addEventListener('click', () => {
  const open = $('#library').classList.toggle('open');
  $('#libraryToggle').setAttribute('aria-expanded', String(open));
});

function markCurrent() {
  const k = state.entry?.key ?? '';
  const key = k.startsWith('element-') ? 'table' : k.startsWith('particle-') ? 'particles' : k === 'snowflake' ? 'thing-snowflake' : k;
  document.querySelectorAll('#libraryList button').forEach(b => {
    const on = b.dataset.key === key;
    b.setAttribute('aria-current', String(on));
    if (on) b.scrollIntoView({ block: 'nearest' });
  });
}

// ------------------------------------------------------------------ loading
function setHash(key, title) {
  if (location.hash !== `#${key}`) history.replaceState(null, '', `#${key}`);
  document.title = `${title} · Molecule Viewer`;
}

function go(key) {
  if (key === 'table') return loadTable();
  if (key === 'snowflake' || key === 'thing-snowflake') return loadSnowflake();
  const tk = /^thing-(\w+)$/.exec(key)?.[1];
  if (tk && THING[tk]) return loadThing(tk);
  if (key === 'particles') return loadParticles();
  const pk = /^particle-(\w+)$/.exec(key)?.[1];
  if (pk) return loadParticle(pk);
  const sym = /^element-([A-Za-z]{1,3})$/.exec(key)?.[1];
  if (sym && ELEMENTS[sym]) return loadElement(sym);
  const entry = LIBRARY.find(e => e.key === key);
  if (entry) return load(entry);
  const cid = /^cid-(\d+)$/.exec(key)?.[1];
  if (cid) return loadRemote({ cid: +cid });
}

function load(entry) {
  state.entry = entry;
  stage.showMolecule(buildModel(entry), state.mode);
  setHash(entry.key, entry.name);
  markCurrent();
}

async function loadTable() {
  state.entry = { key: 'table', name: 'Periodic table' };
  setHash('table', 'Periodic table');
  markCurrent();
  await stage.showTable(elementCounts(), state.tableView);
}
// how many library molecules each element appears in, for the table's 'In these molecules' view
function elementCounts() {
  const c = {};
  LIBRARY.filter(e => !e.crystal).forEach(e => new Set(e.atoms.map(a => a[0])).forEach(s => { c[s] = (c[s] || 0) + 1; }));
  return c;
}

// the table first, then the flight into the element, so you see where it lives
async function loadElement(sym) {
  const el = ELEMENTS[sym];
  await loadTable();
  state.entry = { key: `element-${sym}`, name: el.name };
  setHash(state.entry.key, el.name);
  await new Promise(r => setTimeout(r, 1300));
  if (stage.current?.kind === 'table') stage.dive(el.Z - 1);
}

async function loadParticles() {
  state.entry = { key: 'particles', name: 'Particle zoo' };
  setHash('particles', 'Particle zoo');
  markCurrent();
  await stage.showParticles();
}

async function loadParticle(k) {
  const i = PARTICLES.findIndex(p => p.key === k);
  if (i < 0) return loadParticles();
  await loadParticles();
  state.entry = { key: `particle-${k}`, name: PARTICLES[i].name };
  setHash(state.entry.key, PARTICLES[i].name);
  await new Promise(r => setTimeout(r, 1100));
  if (stage.current?.kind === 'particles') stage.dive(i);
}

function loadThing(k) {
  const t = THING[k];
  state.entry = { key: `thing-${k}`, name: t.title };
  stage.showThing(t, key => LIBRARY.find(e => e.key === key));
  setHash(state.entry.key, t.title);
  markCurrent();
}

function loadSnowflake() {
  state.entry = { key: 'thing-snowflake', name: 'A snowflake' };
  stage.showSnowflake(LIBRARY.find(e => e.key === 'ice'), LIBRARY.find(e => e.key === 'water'));
  setHash('thing-snowflake', 'A snowflake');
  markCurrent();
}

async function loadRemote(query) {
  stopTour();
  toast(`Fetching ${query.name ? `“${query.name}”` : `compound ${query.cid}`} from PubChem…`, 0);
  state.searchAbort?.abort();
  const ctrl = state.searchAbort = new AbortController();
  try {
    const entry = await fetchCompound(query, ctrl.signal);
    if (entry.atoms.length > 1500) {
      toast(`${entry.name} has ${entry.atoms.length} atoms, too many to draw smoothly here.`);
      return;
    }
    load(entry);
    toast(entry.flat ? `${entry.name}: PubChem has no 3D model for this one, so it is drawn flat.` : `${entry.name}, from PubChem.`);
  } catch (err) {
    if (err.name === 'AbortError') return;
    toast(err.message === 'not-found'
      ? `PubChem has no compound called “${query.name ?? query.cid}”. Check the spelling or try its common name.`
      : 'PubChem did not respond. Check your connection and try again.', 5000);
  }
}

// a random molecule, element or the snowflake journey
function randomPick() {
  const r = Math.random();
  if (r < 0.12) return { key: `thing-${THINGS[Math.floor(Math.random() * THINGS.length)].key}` };
  if (r < 0.18) return { key: `particle-${PARTICLES[Math.floor(Math.random() * PARTICLES.length)].key}` };
  if (r < 0.42) {
    const pool = BY_Z.filter(e => e.Z <= 94);
    return { key: `element-${pool[Math.floor(Math.random() * pool.length)].symbol}` };
  }
  return { key: LIBRARY[Math.floor(Math.random() * LIBRARY.length)].key };
}
function surprise() {
  stopTour();
  let pick;
  do pick = randomPick(); while (pick.key === state.entry?.key);
  go(pick.key);
}

// ------------------------------------------------------------------ the specimen label and details
function setSpecimen(name, formula, subline) {
  const s = $('.specimen');
  $('#name').textContent = name;
  $('#name').classList.toggle('long', name.length > 13);
  $('#formula').innerHTML = formula;
  $('#subline').textContent = subline;
  s.classList.remove('swap');
  void s.offsetWidth;
  s.classList.add('swap');
}

function composition(mol) {
  const mass = {}, count = {};
  for (const a of mol.atoms) {
    const el = element(a.symbol);
    mass[a.symbol] = (mass[a.symbol] || 0) + el.mass;
    count[a.symbol] = (count[a.symbol] || 0) + 1;
  }
  const total = Object.values(mass).reduce((s, x) => s + x, 0);
  return Object.keys(mass).sort((a, b) => mass[b] - mass[a]).map(s => ({ s, share: mass[s] / total, n: count[s], el: element(s) }));
}
const dotColor = el => hex(el.color === 0x909090 ? 0x9aa3b0 : el.color);
const parentOf = level => stage.levels[stage.levels.indexOf(level) - 1];

function toggleChip(id, label, on) {
  return `<button type="button" class="chip" id="${id}" aria-pressed="${on}">${label}</button>`;
}

function renderMolecule(level) {
  const mol = level.mol;
  if (mol.key === 'ice') return renderIce(level);
  const inIce = parentOf(level)?.child;
  const bonds = mol.bonds.filter(b => b.order > 0).length;
  const comp = composition(mol);
  const weight = mol.weight ?? comp.reduce((s, c) => s + c.el.mass * c.n, 0);
  setSpecimen(mol.name, formulaHtml(mol.formula), mol.crystal ? `A fragment of the crystal, ${mol.atoms.length} atoms` : `${fmt(weight)} g/mol`);
  const source = mol.cid
    ? `${esc(mol.source)}, <a href="https://pubchem.ncbi.nlm.nih.gov/compound/${mol.cid}" target="_blank" rel="noopener">CID ${mol.cid}</a>`
    : esc(mol.source);
  $('#detailsBody').innerHTML = `
    ${mol.blurb ? `<p class="blurb">${esc(mol.blurb)}</p>` : ''}
    ${level.partOf ? `<p class="hint-line">${ZOOM_IC}<span>Inside the ${esc(softLower(level.partOf.part.label))} of ${esc(softLower(level.partOf.thing.title))}. ${esc(level.partOf.part.note)}</span></p>` : ''}
    ${inIce ? `<p class="hint-line">${ZOOM_IC}<span>One molecule out of the ice. In the crystal this bend opens a little, towards the tetrahedral 109.5°, so each molecule can reach four neighbours.</span></p>` : ''}
    <dl class="stats">
      <div><dt>Atoms</dt><dd>${mol.atoms.length}</dd></div>
      <div><dt>${mol.crystal && !bonds ? 'Contacts' : 'Bonds'}</dt><dd>${bonds || mol.bonds.length}</dd></div>
      <div><dt>${mol.crystal ? 'Formula unit' : 'Molar mass'}</dt><dd>${fmt(weight, 1)}<small>g/mol</small></dd></div>
      <div><dt>Across</dt><dd>${fmt(mol.extent / 10, 2)}<small>nm</small></dd></div>
    </dl>
    <div>
      <div class="comp-bar" role="img" aria-label="Share of mass by element">${comp.map(c => `<i style="flex:${c.share};background:${dotColor(c.el)}"></i>`).join('')}</div>
      <ul class="comp-legend">${comp.map(c => `<li><button type="button" class="el-link" data-element="${c.s}"><span class="dot" style="color:${dotColor(c.el)};background:currentColor"></span><b>${c.el.name}</b> ${Math.round(c.share * 100)}%</button></li>`).join('')}</ul>
    </div>
    ${inIce ? '' : `<p class="hint-line">${ZOOM_IC}<span>Scroll in past the molecule, or double-click an atom, to go inside it: its orbitals, its nucleus, a proton.</span></p>`}
    ${mol.iupac ? `<p class="iupac">${esc(mol.iupac)}</p>` : ''}
    <div class="wiki" id="wiki"><div class="skeleton"></div><div class="skeleton"></div></div>
    <p class="source">Structure: ${source}</p>`;
  loadWiki(mol.wiki || mol.name);
}

function renderIce(level) {
  const journey = !!level.child;
  setSpecimen('Ice', 'H<sub>2</sub>O, hexagonal ice (ice I<sub>h</sub>)', 'Looking down the crystal’s six-fold axis');
  $('#detailsBody').innerHTML = `
    <p class="blurb">Each water molecule holds four neighbours with hydrogen bonds (dashed blue): two through its hydrogens, two through its oxygen.</p>
    <p class="blurb">Four bonds each, but they close into rings of <strong>six</strong> molecules. Seen from above the rings are hexagons, and a hexagon looks the same every 60° you turn it. A snowflake grows that hexagon, ten million times bigger.</p>
    <div class="chips">${toggleChip('ringsBtn', 'Show the hexagonal rings', true)}</div>
    <dl class="stats">
      <div><dt>Oxygen to oxygen</dt><dd>2.76<small>Å</small></dd></div>
      <div><dt>Hydrogen bonds each</dt><dd>4</dd></div>
      <div><dt>Molecules per ring</dt><dd>6</dd></div>
      <div><dt>Turns to repeat</dt><dd>60<small>°</small></dd></div>
    </dl>
    <p class="hint-line">${ZOOM_IC}<span>${journey ? 'Scroll in, or double-click an oxygen, to lift out one water molecule.' : 'Scroll in, or double-click an atom, to go inside it.'}</span></p>
    <p class="note">${level.mol.atoms.length / 3} molecules at real ice spacing. Which hydrogen sits on each link follows the ‘ice rules’ and is random, as in real ice.</p>`;
  stage.setRings(true);
  $('#ringsBtn').addEventListener('click', e => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    stage.setRings(on);
  });
}

async function loadWiki(title) {
  state.wikiAbort?.abort();
  const ctrl = state.wikiAbort = new AbortController();
  try {
    const w = await wikipedia(title, ctrl.signal);
    const box = $('#wiki');
    if (!box) return;
    box.innerHTML = `<p>${esc(w.extract)}</p>
      <a class="more" href="${esc(w.url)}" target="_blank" rel="noopener">Read more on Wikipedia</a>
      <p class="note">Text from Wikipedia, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>.</p>`;
  } catch (err) {
    if (err.name === 'AbortError') return;
    const box = $('#wiki');
    if (box) box.innerHTML = `<p class="note">Wikipedia's summary could not be loaded.</p>`;
  }
}

function atomSize(el) { return 2 * el.vdw * 100; } // pm
function nucleusFm(el) { return 2 * 1.2 * Math.cbrt(el.A); }
const findEntry = key => LIBRARY.find(e => e.key === key);
const foundIn = sym => LIBRARY.filter(e => e.atoms.some(a => a[0] === sym));

function renderAtom(level) {
  const { el, subshells } = level.data;
  const conf = subshells.map(s => `${s.label}<sup>${s.electrons}</sup>`).join(' ');
  setSpecimen(`${el.name} atom`, conf, `${el.Z} protons, ${el.A - el.Z} neutrons, ${el.Z} electrons`);
  const ratio = (atomSize(el) * 1e-12) / (nucleusFm(el) * 1e-15);
  const valence = subshells[subshells.length - 1];
  const found = foundIn(el.symbol);
  $('#detailsBody').innerHTML = `
    ${WHERE[el.symbol] ? `<p class="blurb where">${esc(WHERE[el.symbol])}</p>` : ''}
    ${found.length ? `<div><p class="label-line">Found in</p><div class="chips">${found.slice(0, 14).map(e => `<button type="button" class="chip link" data-go="${e.key}">${esc(e.name)}</button>`).join('')}${found.length > 14 ? `<span class="note">and ${found.length - 14} more</span>` : ''}</div></div>` : ''}
    <p class="blurb">Each point is a place one of its ${el.Z} electron${el.Z > 1 ? 's' : ''} could be found if you looked. Where the points crowd, an electron is more likely to be.</p>
    <ul class="shells" aria-label="Subshells: tap to show or hide">${subshells.map(s => `
      <li><button type="button" data-shell="${s.label}" aria-pressed="true" style="--c:${hex(ORBITAL_COLORS[L_LETTER[s.l]])}">
        <b>${s.label}</b>${s.electrons} e<small>${s.orbitals.length > 1 && s.orbitals.length < 6 ? s.orbitals.join(' ') : ''}</small></button></li>`).join('')}
    </ul>
    <p class="legend-line"><span><span class="dot" style="color:var(--s);background:currentColor"></span> s spheres</span><span><span class="dot" style="color:var(--p);background:currentColor"></span> p dumbbells</span><span><span class="dot" style="color:var(--d);background:currentColor"></span> d clovers</span><span><span class="dot" style="color:var(--f);background:currentColor"></span> f</span></p>
    <dl class="stats">
      <div><dt>Atomic number</dt><dd>${el.Z}</dd></div>
      <div><dt>Atomic mass</dt><dd>${fmt(el.mass, 3)}<small>u</small></dd></div>
      <div><dt>Across</dt><dd>${Math.round(atomSize(el))}<small>pm</small></dd></div>
      <div><dt>Outer shell feels</dt><dd>${fmt(valence.zeff, 2)}<small>of +${el.Z}</small></dd></div>
    </dl>
    <div class="seg small" role="radiogroup" aria-label="Nucleus size">
      <button type="button" role="radio" data-truescale="0" aria-checked="${!level.trueScale}">Nucleus enlarged</button>
      <button type="button" role="radio" data-truescale="1" aria-checked="${!!level.trueScale}">True size</button>
    </div>
    <p class="blurb" id="scaleNote">${level.trueScale
      ? `Now drawn to scale: the nucleus is about ${fmt(Math.round(ratio / 1000) * 1000, 0)} times narrower than the atom, far too small for one pixel. A pea in the middle of a football stadium.`
      : `The nucleus at the centre is drawn far too big. Switch to true size to see how small it really is.`}</p>
    <div class="chips"><button type="button" class="chip go" data-dive="nucleus">${ZOOM_IC}Zoom into the nucleus</button><button type="button" class="chip go" data-dive="electron">${ZOOM_IC}Zoom into an electron</button></div>
    <p class="note">${el.family}${el.predicted ? ' (predicted)' : ''}. Shapes are hydrogen-like orbitals with each shell's charge set by Slater's rules: a textbook approximation, not a full quantum calculation.</p>`;
  $('#detailsBody').querySelectorAll('[data-shell]').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    stage.setSubshellVisible(b.dataset.shell, on);
  }));
  $('#detailsBody').querySelectorAll('[data-truescale]').forEach(b => b.addEventListener('click', () => {
    stage.setTrueScale(b.dataset.truescale === '1');
    renderAtom(level);
  }));
}

function renderNucleus(level) {
  const el = element(level.parentSymbol);
  setSpecimen(`${el.name}-${level.A}`, `${level.protons} protons + ${level.neutrons} neutrons`, `A nucleus about ${fmt(nucleusFm(el), 1)} femtometres across`);
  const ratio = (atomSize(el) * 1e-12) / (nucleusFm(el) * 1e-15);
  $('#detailsBody').innerHTML = `
    <p class="blurb">Almost all of the atom's mass, packed into a hundred-thousandth of its width. The protons repel each other; the strong force, reaching barely further than their neighbours, holds them anyway.</p>
    <dl class="stats">
      <div><dt><span class="dot" style="color:#e8432a;background:currentColor"></span> Protons</dt><dd>${level.protons}</dd></div>
      <div><dt><span class="dot" style="color:#6f8fc4;background:currentColor"></span> Neutrons</dt><dd>${level.neutrons}</dd></div>
      <div><dt>Across</dt><dd>${fmt(nucleusFm(el), 1)}<small>fm</small></dd></div>
      <div><dt>Smaller than the atom</dt><dd>${fmt(Math.round(ratio / 1000), 0)}k<small>×</small></dd></div>
    </dl>
    <div class="chips"><button type="button" class="chip go" data-dive="proton">${ZOOM_IC}Zoom into a proton</button><button type="button" class="chip go" data-dive="neutron">${ZOOM_IC}Zoom into a neutron</button></div>
    <p class="note">Or click any one of them.</p>
    <p class="note">${el.name}'s ${el.predicted || el.Z > 82 ? 'longest-lived' : 'commonest'} isotope. Nucleons are not hard balls in fixed places: this shows how many there are, not where they sit.</p>`;
}

function renderNucleon(level) {
  const proton = level.nucleon === 'proton';
  setSpecimen(proton ? 'Proton' : 'Neutron', proton ? 'up + up + down' : 'up + down + down', `About 1.7 femtometres across, charge ${proton ? '+1' : '0'}`);
  const q = f => f === 'up' ? '+⅔' : '−⅓';
  $('#detailsBody').innerHTML = `
    <ul class="quarks">${level.flavours.map(f => `<li><b>${f === 'up' ? 'u' : 'd'}</b>${f}<br><small>${q(f)} charge</small></li>`).join('')}</ul>
    <p class="blurb">Three quarks, ${proton ? 'two up and one down, so the charges add to +1' : 'one up and two down, so the charges cancel to zero'}. They are never seen alone: pull one away and the energy makes new quarks instead.</p>
    <p class="blurb">The quarks' own masses are only about 1% of the ${level.nucleon}'s. The rest is the energy of the gluon field binding them, the flickering cloud you see here.</p>
    ${proton ? '' : '<p class="blurb">Inside a nucleus a neutron can last for ever; on its own it decays in about 15 minutes, into a proton, an electron and an antineutrino.</p>'}
    <p class="hint-line">${ZOOM_IC}<span>Keep scrolling to fall to the Planck length, twenty powers of ten further down.</span></p>
    <div class="chips"><button type="button" class="chip link" data-go="particles">See all 17 fundamental particles</button></div>
    <p class="note">The colours are the quarks' colour charge, which they keep swapping as they trade gluons. It has nothing to do with real colour. As far as anyone has measured, quarks have no size at all.</p>`;
}

function renderPlanck() {
  setSpecimen('Planck length', `1.6 × ${pow10(-35)} m`, 'A hundred billion billion times smaller than a proton');
  $('#detailsBody').innerHTML = `
    <p class="blurb">The smallest length physics can talk about. Down here our two best theories, quantum mechanics and gravity, would both matter at once, and no one yet knows how they fit together.</p>
    <p class="blurb">Nothing has ever been measured at this scale. The best particle colliders reach about ${pow10(-19)} metres, sixteen powers of ten short.</p>
    <dl class="stats">
      <div><dt>Length</dt><dd>1.6<small>× ${pow10(-35)} m</small></dd></div>
      <div><dt>Below a proton</dt><dd>${pow10(20)}<small>×</small></dd></div>
    </dl>
    <p class="note">What you see is a guess, not a picture: John Wheeler's idea of ‘quantum foam’, space itself bubbling. Some theories say there is no smaller distance at all. This is the bottom.</p>`;
}

function renderSnowflake(level) {
  setSpecimen('Snowflake', 'H<sub>2</sub>O, frozen', 'About 3 millimetres across, six arms 60° apart');
  $('#detailsBody').innerHTML = `
    <p class="blurb">Every snowflake has six arms, set 60° apart. The weather doesn't choose that angle: it comes from how water molecules hold on to each other. Zoom in and watch the same hexagon appear, ten million times smaller.</p>
    <div class="chips">${toggleChip('symBtn', 'Show the 60° symmetry', level.showSymmetry !== false)}</div>
    <dl class="stats">
      <div><dt>Across</dt><dd>3<small>mm</small></dd></div>
      <div><dt>Arms</dt><dd>6</dd></div>
      <div><dt>Between arms</dt><dd>60<small>°</small></dd></div>
      <div><dt>Water molecules</dt><dd>${pow10(18)}</dd></div>
    </dl>
    <p class="hint-line">${ZOOM_IC}<span>Scroll in to see the ice crystal inside.</span></p>
    <p class="note">Drawn procedurally. Real snowflakes branch as they fall through changing temperature and humidity, so no two match; the six-fold symmetry is the part that never changes.</p>`;
  $('#symBtn').addEventListener('click', e => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    stage.setSymmetry(on);
  });
}

function renderTable(level) {
  setSpecimen('Periodic table', '118 elements', 'Click any element to go inside it');
  const view = level?.view || 'family';
  const families = Object.keys(FAMILY_COLORS);
  $('#detailsBody').innerHTML = `
    <p class="blurb">Every atom in the universe is one of these 118. Each row adds a shell of electrons; each column shares the same outer electrons, and so behaves alike.</p>
    <div><p class="label-line">Show the table by</p>
    <div class="chips views">${Object.entries(TABLE_VIEWS).map(([k, v]) => `<button type="button" class="chip" data-view="${k}" aria-pressed="${k === view}">${esc(v.label)}</button>`).join('')}</div></div>
    <p class="blurb view-note" id="viewNote">${esc(TABLE_VIEWS[view].note)}</p>
    <ul class="families" aria-label="Families: point to highlight" ${view === 'family' ? '' : 'hidden'}>${families.map(f => `
      <li><button type="button" data-family="${esc(f)}"><span class="swatch" style="background:${hex(FAMILY_COLORS[f])}"></span>${esc(f)}<small>${BY_Z.filter(e => e.family === f).length}</small></button></li>`).join('')}
    </ul>
    <p class="hint-line">${ZOOM_IC}<span>Click an element to fly inside it. Arrow keys move along the table; Enter goes in.</span></p>`;
  $('#detailsBody').querySelectorAll('[data-family]').forEach(b => {
    b.addEventListener('pointerenter', () => stage.highlightFamily(b.dataset.family));
    b.addEventListener('pointerleave', () => stage.highlightFamily(null));
    b.addEventListener('focus', () => stage.highlightFamily(b.dataset.family));
    b.addEventListener('blur', () => stage.highlightFamily(null));
  });
  $('#detailsBody').querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    state.tableView = b.dataset.view;
    stage.setTableView(b.dataset.view);
    renderTable(stage.current);
  }));
}

// a little Bohr picture for the hover card: shells as rings, electrons circling at their own pace
function bohr(sym) {
  const shells = [];
  configuration(sym).forEach(([n, , e]) => { shells[n - 1] = (shells[n - 1] || 0) + e; });
  const N = shells.length, R = 52;
  const rings = shells.map((count, i) => {
    const r = 12 + (i + 1) * ((R - 12) / N);
    const dots = Array.from({ length: count }, (_, k) => {
      const a = (k / count) * Math.PI * 2;
      return `<circle cx="${(60 + Math.cos(a) * r).toFixed(1)}" cy="${(60 + Math.sin(a) * r).toFixed(1)}" r="${count > 18 ? 1.3 : 2}"/>`;
    }).join('');
    return `<circle class="ring" cx="60" cy="60" r="${r.toFixed(1)}"/><g class="orbit" style="animation-duration:${(5 + i * 3).toFixed(1)}s;animation-direction:${i % 2 ? 'reverse' : 'normal'}">${dots}</g>`;
  }).join('');
  return `<svg class="bohr" viewBox="0 0 120 120" aria-hidden="true">${rings}<circle class="core" cx="60" cy="60" r="${Math.min(9, 4 + N)}"/></svg>`;
}
function elementCard(el, hover) {
  const col = hex(FAMILY_COLORS[el.family]);
  return `<div class="card" style="--c:${col}">
    <div class="card-head"><span class="big">${el.symbol}</span><span><b>${esc(el.name)}</b><small>${esc(el.family)}${el.predicted ? ' (predicted)' : ''}</small></span><span class="z">${el.Z}</span></div>
    ${bohr(el.symbol)}
    <dl><div><dt>Mass</dt><dd>${fmt(el.mass, 3)} u</dd></div><div><dt>Electrons per shell</dt><dd>${shellLine(el.symbol)}</dd></div></dl>
    ${hover && WHERE[el.symbol] ? `<p>${esc(WHERE[el.symbol])}</p>` : ''}
    ${hover ? '<p class="go">Click to go inside</p>' : ''}</div>`;
}
function particleCard(p, hover) {
  const col = hex(PARTICLE_FAMILIES[p.family].color);
  return `<div class="card" style="--c:${col}">
    <div class="card-head"><span class="big">${esc(p.symbol)}${p.sub ? `<sub>${esc(p.sub)}</sub>` : ''}</span><span><b>${esc(p.name)}</b><small>${esc(PARTICLE_FAMILIES[p.family].name.replace(/s$/, ''))}, found ${esc(p.found)}</small></span></div>
    <dl class="three"><div><dt>Mass</dt><dd>${esc(p.mass)}</dd></div><div><dt>Charge</dt><dd>${esc(p.charge)}</dd></div><div><dt>Spin</dt><dd>${esc(p.spin)}</dd></div></dl>
    ${hover ? `<p>${esc(p.where)}</p><p class="go">Click to go inside</p>` : ''}</div>`;
}
// inside an element (its atom, nucleus, a nucleon, an electron) or a particle, its card stays in the corner
function updateCornerCard(level) {
  const box = $('#cornerCard');
  const sym = level.kind === 'atom' ? level.data.el.symbol : ['nucleus', 'nucleon', 'planck'].includes(level.kind) || (level.kind === 'particle' && level.parentSymbol) ? level.parentSymbol : null;
  const html = level.kind === 'particle' ? particleCard(level.particle) : sym ? elementCard(element(sym)) : '';
  if (!html) { box.hidden = true; box.dataset.key = ''; return; }
  const key = `${level.kind}-${sym}-${level.particle?.key}`;
  if (box.dataset.key !== key) { box.innerHTML = html; box.dataset.key = key; }
  box.hidden = false;
}

const shellLine = sym => {
  const shells = [];
  configuration(sym).forEach(([n, , e]) => { shells[n - 1] = (shells[n - 1] || 0) + e; });
  return shells.join(' · ');
};

function renderParticles() {
  setSpecimen('Particle zoo', '17 fundamental particles', 'Everything known to be made of nothing smaller');
  $('#detailsBody').innerHTML = `
    <p class="blurb">The Standard Model: every particle known to have no parts. Matter is quarks and leptons, in three generations, each heavier than the last; only the first makes up ordinary atoms. Forces are carried by bosons, and the Higgs field gives the others their mass.</p>
    <ul class="families" aria-label="Families: point to highlight">${Object.entries(PARTICLE_FAMILIES).map(([k, f]) => `
      <li><button type="button" data-family="${k}"><span class="swatch" style="background:${hex(f.color)}"></span>${esc(f.name)}<small>${PARTICLES.filter(p => p.family === k).length}</small></button></li>`).join('')}
    </ul>
    <p class="hint-line">${ZOOM_IC}<span>Click a particle to fly in. Each tile shows its mass (top left) and charge (top right).</span></p>
    <p class="note">Gravity is missing: no one has yet fitted it into this scheme. Its carrier, the graviton, is still hypothetical.</p>`;
  $('#detailsBody').querySelectorAll('[data-family]').forEach(b => {
    b.addEventListener('pointerenter', () => stage.highlightFamily(b.dataset.family));
    b.addEventListener('pointerleave', () => stage.highlightFamily(null));
  });
}

function renderParticle(level) {
  const p = level.particle;
  const fam = PARTICLE_FAMILIES[p.family];
  setSpecimen(p.name, `${esc(p.symbol)}${p.sub ? `<sub>${esc(p.sub)}</sub>` : ''}, ${fam.name.toLowerCase().replace(/s$/, '')}`, `Charge ${p.charge}, spin ${p.spin}, found ${p.found}`);
  const seen = p.ghost ? 'A neutrino barely touches anything: the faint line is its path straight through.'
    : p.wave ? 'A force carrier: what you see are ripples spreading out, the way it passes a force from one particle to another.'
      : p.colour ? 'The flicker around it is colour charge, the strong force’s version of electric charge.'
        : 'The lines are its electric field reaching out in every direction. The fizz around it is short-lived particle pairs that partly screen its charge.';
  $('#detailsBody').innerHTML = `
    <p class="blurb where">${esc(p.where)}</p>
    <dl class="stats">
      <div><dt>Mass</dt><dd style="font-size:19px">${esc(p.mass)}</dd></div>
      <div><dt>Charge</dt><dd>${esc(p.charge)}</dd></div>
      <div><dt>Spin</dt><dd>${esc(p.spin)}</dd></div>
      <div><dt>Found</dt><dd>${esc(p.found)}</dd></div>
    </dl>
    <p class="blurb">As far as anyone has measured, it is a point: no size and nothing inside, down to about ${pow10(-18)} metres. ${seen}</p>
    <p class="hint-line">${ZOOM_IC}<span>Keep scrolling to fall to the Planck length.</span></p>
    <div class="chips"><button type="button" class="chip link" data-go="particles">All 17 particles</button></div>
    <p class="note">Masses are in electronvolts, physicists' energy unit (E = mc²): a proton is 938 MeV. Spin is quantum: not a ball turning, but it makes ${p.q ? 'charged particles tiny magnets' : 'particles behave as if they had angular momentum'}.</p>`;
}

function renderThing(level) {
  const t = level.thing;
  setSpecimen(t.title, esc(t.formula), t.note);
  const within = level.partOf ? `<p class="hint-line">${ZOOM_IC}<span>Inside ${esc(softLower(level.partOf.thing.title).replace(/^(a|the) /i, 'the '))}: ${esc(level.partOf.part.note)}</span></p>` : '';
  $('#detailsBody').innerHTML = `
    ${within}
    <p class="blurb">${esc(t.blurb)}</p>
    <dl class="stats">${t.stats.map(([k, v, u]) => `<div><dt>${esc(k)}</dt><dd${v.length > 6 ? ' style="font-size:18px"' : ''}>${esc(v)}${u ? `<small>${esc(u)}</small>` : ''}</dd></div>`).join('')}</dl>
    ${t.compare ? `<p class="blurb where">${esc(t.compare)}</p>` : ''}
    ${t.made ? `<div><p class="label-line">Made of</p><div class="parts"><button type="button" class="part" data-dive-part="0"><b>${esc(t.made.map(([k, sh]) => `${findEntry(k).name} ${sh}%`).join(', '))} <span class="badges">${elementBadges(partElements({ made: t.made }, findEntry))}</span></b><small>${esc(t.madeNote || '')}</small></button></div></div>` : ''}
    ${t.parts ? `<div><p class="label-line">Zoom into a part</p><div class="parts">${t.parts.map((pt, i) => `
      <button type="button" class="part" data-dive-part="${i}"><b>${esc(pt.label)} <span class="badges">${elementBadges(partElements(pt, findEntry))}</span></b><small>${esc(pt.note)}</small>${pt.made?.length > 1 ? `<small class="mixline">${pt.made.map(([k, sh]) => `${esc(findEntry(k).name)} ${sh}%`).join(', ')}</small>` : ''}</button>`).join('')}</div></div>`
      : `<p class="hint-line">${ZOOM_IC}<span>Scroll in to see what it is made of.</span></p>`}
    <div ${t.inner ? 'hidden' : ''}><p class="label-line">Other journeys</p><div class="chips">${THINGS.filter(o => o.key !== t.key).map(o => `<button type="button" class="chip link" data-go="thing-${o.key}">${esc(o.name)}</button>`).join('')}</div></div>
    <p class="note">${t.source ? `${esc(t.source)} ` : ''}${t.inner ? 'A drawing to explain the structure, not a photograph; proportions are approximate.' : 'The object is drawn, not photographed; what is inside it is real structural data.'}</p>`;
}

function renderMixture(level) {
  const part = level.part;
  setSpecimen(part.label, level.members.map(m => esc(m.entry.formula)).join(' + '), 'A mixture: more than one material');
  $('#detailsBody').innerHTML = `
    <p class="blurb">${esc(part.note)}</p>
    <p class="blurb">Each material is shown side by side at true relative scale, labelled with its share by weight. Click one to zoom into it.</p>
    <div class="parts">${level.members.map((m, i) => `
      <button type="button" class="part" data-dive-part="${i}"><b>${esc(m.entry.name)} ${m.share}% <span class="badges">${elementBadges(partElements({ child: m.key }, findEntry))}</span></b><small>${esc(m.entry.blurb || '')}</small></button>`).join('')}
    </div>
    <div class="share-bar" role="img" aria-label="Share by weight">${level.members.map((m, i) => `<i style="flex:${m.share};--h:${i * 47}"></i>`).join('')}</div>`;
}

const RENDER = { mixture: renderMixture, thing: renderThing, particles: renderParticles, particle: renderParticle, atom: renderAtom, nucleus: renderNucleus, nucleon: renderNucleon, planck: renderPlanck, snowflake: renderSnowflake, table: renderTable, molecule: renderMolecule };
function previewLevel(level) {
  // as a dive starts, show the destination's name at once
  state.shown = level;
  RENDER[level.kind](level);
  updateCornerCard(level);
  $('#analogy').textContent = analogy(level);
  updateDock(level);
}

function renderLevel(level) {
  if (!level) return;
  if (state.shown !== level) previewLevel(level);
  updateDock(level);
}

// links from the details panel: an element to its atom, a molecule to its page
$('#detailsBody').addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { stopTour(); go(g.dataset.go); return; }
  const el = e.target.closest('[data-element]');
  if (el) { stopTour(); go(`element-${el.dataset.element}`); return; }
  const d = e.target.closest('[data-dive]');
  if (d) { stopTour(); stage.dive(d.dataset.dive); return; }
  const dp = e.target.closest('[data-dive-part]');
  if (dp) { stopTour(); stage.dive(+dp.dataset.divePart); }
});

const DIVE_LABEL = {
  molecule: l => (l.child ? 'Zoom into a water molecule' : 'Zoom into an atom'),
  atom: () => 'Zoom into the nucleus', nucleus: () => 'Zoom into a proton', nucleon: () => 'Zoom to the Planck length',
  planck: () => 'Smallest level', snowflake: () => 'Zoom into the ice', table: () => 'Zoom into an element',
  particles: () => 'Zoom into a particle', particle: () => 'Zoom to the Planck length',
  mixture: l => `Zoom into the ${softLower(l.members[0].entry.name)}`,
  thing: l => (l.thing.made ? 'Zoom into what it is made of' : l.thing.parts ? `Zoom into the ${softLower(l.thing.parts[0].label)}` : l.childEntry?.crystal ? 'Zoom into the crystal' : 'Zoom into a molecule'),
};
function updateDock(level) {
  const kind = level.kind;
  $('#diveLabel').textContent = DIVE_LABEL[kind](level);
  $('#diveBtn').disabled = kind === 'planck';
  $('#upBtn').hidden = stage.levels.length < 2;
  // drawing styles and labels only apply to molecules
  $('#modes').hidden = $('#labelsBtn').hidden = kind !== 'molecule';
  $('#trail').classList.toggle('no-scale', !!level.noScale);
  $('.specimen').classList.toggle('compact', !!level.tiles); // a smaller title under the tables
  requestAnimationFrame(renderRuler); // the dock's width changes with the level
}

// ------------------------------------------------------------------ breadcrumb, scale and the ruler
function crumbName(l) {
  if (l.kind === 'molecule') return [l.mol.name, `${fmt(l.mol.extent / 10, 1)} nm`];
  if (l.kind === 'atom') { const el = l.data.el; return [`${el.name} atom`, `${Math.round(atomSize(el))} pm`]; }
  if (l.kind === 'nucleus') return ['Nucleus', `${fmt(nucleusFm(element(l.parentSymbol)), 1)} fm`];
  if (l.kind === 'nucleon') return [l.nucleon === 'proton' ? 'Proton' : 'Neutron', '1.7 fm'];
  if (l.kind === 'planck') return ['Planck length', `${pow10(-35)} m`];
  if (l.kind === 'snowflake') return ['Snowflake', '3 mm'];
  if (l.kind === 'particle') return [l.particle.name, `< ${pow10(-18)} m`];
  if (l.kind === 'particles') return ['Particle zoo', ''];
  if (l.kind === 'thing') return [l.thing.name, formatHumanSize(l.sizeMetres)];
  if (l.kind === 'mixture') return [l.part.label, 'mixture'];
  return ['Periodic table', ''];
}
function renderCrumbs() {
  const levels = stage.levels;
  $('#crumbs').innerHTML = levels.map((l, i) => {
    const [name, size] = crumbName(l);
    const last = i === levels.length - 1;
    return `<li><button type="button" data-depth="${i}" ${last ? 'aria-current="true"' : ''}>${esc(name)}<small>${size}</small></button></li>`;
  }).join('');
}
$('#crumbs').addEventListener('click', e => {
  const b = e.target.closest('button[data-depth]');
  if (b && !b.hasAttribute('aria-current')) { stopTour(); stage.surfaceTo(+b.dataset.depth); }
});

// The ruler fits the gap between the breadcrumb's left edge and the dock, up to 440 px
let RULER_W = 440;
const rulerX = log => ((RULER.top - log) / (RULER.top - RULER.bottom)) * RULER_W;
function renderRuler() {
  const trail = $('#trail').getBoundingClientRect(), dock = $('#dock').getBoundingClientRect();
  RULER_W = Math.max(220, Math.min(440, (innerWidth > 900 ? dock.left : innerWidth) - trail.left - 40));
  const ticks = [];
  for (let p = RULER.top; p >= RULER.bottom; p--) ticks.push(`<line x1="${rulerX(p)}" x2="${rulerX(p)}" y1="21" y2="${p % 5 === 0 ? 27 : 24}"/>`);
  const [u0, u1] = UNEXPLORED.map(rulerX);
  const last = RULER_MARKS.length - 1;
  const marks = RULER_MARKS.map(([m, name], i) => {
    const x = rulerX(Math.log10(m)), up = i % 2 === 0 && i !== last;
    return `<g class="mark"><circle cx="${x}" cy="21" r="2.2"/><text x="${x}" y="${up ? 13 : 39}" text-anchor="${i === 0 ? 'start' : i === last ? 'end' : 'middle'}">${name}</text></g>`;
  }).join('');
  $('#ruler').innerHTML = `<svg viewBox="-6 0 ${RULER_W + 12} 44" width="${RULER_W + 12}" height="44" aria-hidden="true">
    <rect class="unexplored" x="${u0}" y="17" width="${u1 - u0}" height="8" rx="1"/>
    <text class="unexplored-label" x="${(u0 + u1) / 2}" y="13" text-anchor="middle">never measured</text>
    <line class="axis" x1="0" x2="${RULER_W}" y1="21" y2="21"/>${ticks.join('')}${marks}
    <g id="rulerMarker"><line y1="15" y2="27"/><path d="M-4 30 L4 30 L0 25 Z"/></g>
  </svg>`;
  $('#analogy').style.maxWidth = `${RULER_W + 12}px`;
}
addEventListener('resize', () => renderRuler());
// the title sits just above the trail, however tall the trail's text makes it
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--trail-h', `${$('#trail').offsetHeight}px`);
}).observe($('#trail'));

function updateScale() {
  const s = stage.scaleBar();
  if (!s) return;
  $('#scalebar i').style.width = `${s.px.toFixed(1)}px`;
  $('#scalebar span').textContent = s.label;
  const mag = magnification(s.metresPerPx);
  $('#mag').textContent = `Magnified ${mag.text}`;
  const view = Math.log10(s.metresPerPx * 110);
  const marker = document.getElementById('rulerMarker');
  if (marker) marker.setAttribute('transform', `translate(${Math.max(0, Math.min(RULER_W, rulerX(view))).toFixed(1)},0)`);
}

// ------------------------------------------------------------------ dock
function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('#modes button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
  stage.setMode(mode);
}
$('#modes').addEventListener('click', e => { const b = e.target.closest('button[data-mode]'); if (b) setMode(b.dataset.mode); });
$('#labelsBtn').addEventListener('click', toggleLabels);
$('#spinBtn').addEventListener('click', toggleSpin);
$('#diveBtn').addEventListener('click', () => { stopTour(); stage.dive(); });
$('#upBtn').addEventListener('click', () => { stopTour(); stage.surface(); });
$('#randomBtn').addEventListener('click', surprise);
function toggleLabels() {
  state.labels = !state.labels;
  stage.setLabels(state.labels);
  $('#labelsBtn').setAttribute('aria-pressed', String(state.labels));
}
function toggleSpin() {
  stage.setAutoRotate(!stage.autoRotate);
  $('#spinBtn').setAttribute('aria-pressed', String(stage.autoRotate));
}
$('#spinBtn').setAttribute('aria-pressed', String(stage.autoRotate));

// ------------------------------------------------------------------ pointer: hover, measure, dive
const canvas = stage.renderer.domElement;
let down = null, lastTap = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; stopTour(); stopGuided(); });
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse' && !e.buttons) {
    const h = stage.hoverAt(e.clientX, e.clientY);
    canvas.style.cursor = h ? 'pointer' : 'grab';
    positionTip(e.clientX, e.clientY);
  }
});
canvas.addEventListener('pointerleave', () => showTip(null));
canvas.addEventListener('pointerup', e => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const quick = performance.now() - down.t < 450;
  down = null;
  if (moved > 6 || !quick) return;
  const hit = stage.pickAt(e.clientX, e.clientY);
  const now = performance.now();
  const double = lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24;
  lastTap = { t: now, x: e.clientX, y: e.clientY };
  if (!hit) { if (!double) stage.clearSelection(); return; }
  if (hit.kind === 'nucleon' || hit.kind === 'tile' || hit.kind === 'part') {
    if (hit.element) { state.entry = { key: `element-${hit.element.symbol}`, name: hit.element.name }; setHash(state.entry.key, hit.element.name); }
    if (hit.particle) { state.entry = { key: `particle-${hit.particle.key}`, name: hit.particle.name }; setHash(state.entry.key, hit.particle.name); }
    stage.dive(hit.kind === 'part' ? hit.part : hit.index);
    return;
  }
  if (double) { stage.clearSelection(); stage.dive(hit.journey && hit.atom.symbol !== 'O' ? undefined : hit.index); lastTap = null; return; }
  const sel = stage.toggleSelect(hit.index);

});

// the measurement readout: every distance and the angle, spelled out
function showMeasure(r) {
  const box = $('#measureCard');
  if (!r) { box.hidden = true; return; }
  const a = n => r.atoms[n - 1];
  box.innerHTML = `
    <div class="mc-head"><b>Measuring</b><span>${r.atoms.map(x => `<i>${x.n}</i>${esc(x.symbol)}`).join(' ')}</span><button type="button" id="measureClear" title="Clear (Esc)">Clear</button></div>
    ${r.distances.map(d => `<div class="mc-row"><span>${d.from} → ${d.to} <small>${esc(a(d.from).symbol)}–${esc(a(d.to).symbol)}${d.bonded ? ', bonded' : ''}</small></span><b>${d.d.toFixed(2)} Å</b><small>${(d.d / 10).toFixed(3)} nm</small></div>`).join('')}
    ${r.angle != null ? `<div class="mc-row"><span>Angle at ${2} <small>${esc(a(1).symbol)}–${esc(a(2).symbol)}–${esc(a(3).symbol)}</small></span><b>${r.angle.toFixed(1)}°</b><small></small></div>` : ''}
    <p>${r.atoms.length === 1 ? 'Click a second atom for the distance between them.' : r.atoms.length === 2 ? 'Click a third atom for the angle.' : 'A fourth click starts again from that atom.'} 1 Å (ångström) is a ten-billionth of a metre.</p>`;
  box.hidden = false;
  $('#measureClear').addEventListener('click', () => stage.clearSelection());
}

function showTip(h) {
  const tip = $('#tip');
  tip.classList.remove('tile-tip');
  if (!h) { tip.hidden = true; return; }
  if (h.kind === 'atom') {
    const n = h.atom.bonds.filter(b => b.order > 0).length;
    tip.innerHTML = `<div class="el"><b>${h.element.symbol}</b>${h.element.name}<span class="z">${h.element.Z}</span></div>
      <p>${n ? `Bonded to ${n} atom${n > 1 ? 's' : ''}. ` : ''}Click to measure; double-click to go inside.</p>`;
  } else if (h.kind === 'part') {
    tip.innerHTML = h.part === 'nucleus'
      ? '<div class="el"><b>●</b>Nucleus</div><p>Click to go inside it.</p>'
      : '<div class="el"><b>e</b>Electron cloud</div><p>Click to zoom into one electron.</p>';
  } else if (h.particle) {
    tip.innerHTML = particleCard(h.particle, true);
    tip.classList.add('tile-tip');
  } else if (h.kind === 'tile') {
    tip.innerHTML = elementCard(h.element, true);
    tip.classList.add('tile-tip');
  } else {
    tip.innerHTML = `<div class="el"><b>${h.nucleon === 'proton' ? 'p' : 'n'}</b>${h.nucleon === 'proton' ? 'Proton' : 'Neutron'}</div><p>Click to see its quarks.</p>`;
  }
  tip.hidden = false;
}
function positionTip(x, y) {
  const tip = $('#tip');
  if (tip.hidden) return;
  y = Math.max(tip.offsetHeight / 2 + 70, Math.min(innerHeight - tip.offsetHeight / 2 - 20, y));
  const gap = tip.classList.contains('tile-tip') ? 90 : 0;
  const flip = x > innerWidth - tip.offsetWidth - 60 - gap;
  tip.style.left = `${flip ? x - tip.offsetWidth - 36 - gap : x + gap}px`;
  tip.style.top = `${y}px`;
}
const NEXT_NAME = { thing: 'what it is made of', mixture: 'one of its materials',  atom: 'the nucleus', nucleus: 'a proton', nucleon: 'the Planck length', particle: 'the Planck length', snowflake: 'the ice', table: 'an element', particles: 'a particle' };
function showPush(p, dir) {
  const el = $('#push');
  el.style.opacity = p > 0.02 ? '1' : '0';
  el.querySelector('.arc').style.strokeDashoffset = String(100.5 * (1 - p));
  const cur = stage.current;
  const next = cur?.kind === 'molecule' ? (cur.child ? 'a water molecule' : 'an atom') : NEXT_NAME[cur?.kind];
  el.querySelector('span').textContent = dir > 0 ? (next ? `Keep scrolling to enter ${next}` : '') : 'Keep scrolling to zoom out';
}

// ------------------------------------------------------------------ search
const input = $('#search'), results = $('#results');
let suggestTimer = null, items = [], active = -1;
input.addEventListener('input', () => {
  clearTimeout(suggestTimer);
  const q = input.value.trim();
  if (!q) { closeResults(); return; }
  const lq = q.toLowerCase();
  const elements = BY_Z.filter(e => e.name.toLowerCase().startsWith(lq) || e.symbol.toLowerCase() === lq).slice(0, 3)
    .map(e => ({ type: 'local', key: `element-${e.symbol}`, label: e.name, meta: `Element ${e.Z}`, plain: true }));
  const local = LIBRARY.filter(e => e.name.toLowerCase().includes(lq) || e.key.includes(lq) || e.formula.toLowerCase() === lq).slice(0, 5)
    .map(e => (e.crystal ? { type: 'local', key: e.key, label: `${e.name} crystal`, meta: 'Crystal', plain: true } : { type: 'local', key: e.key, label: e.name, meta: e.formula }));
  const near = [...elements, ...local];
  renderResults(near, true);
  suggestTimer = setTimeout(async () => {
    state.searchAbort?.abort();
    const ctrl = state.searchAbort = new AbortController();
    try {
      const terms = await suggest(q, ctrl.signal);
      if (input.value.trim() !== q) return;
      const seen = new Set(near.map(l => l.label.toLowerCase()));
      const remote = terms.filter(t => !seen.has(t.toLowerCase())).map(t => ({ type: 'remote', label: t, meta: 'PubChem' }));
      // what was typed comes first among PubChem's suggestions, so Enter takes it rather than a stranger match
      if (!remote.some(r => r.label.toLowerCase() === lq) && !seen.has(lq)) remote.unshift({ type: 'remote', label: q, meta: 'Search PubChem' });
      renderResults([...near, ...remote], false);
    } catch (err) {
      if (err.name !== 'AbortError') renderResults([...near, { type: 'remote', label: q, meta: 'Search PubChem' }], false);
    }
  }, 180);
});
function renderResults(list, pending) {
  items = list;
  const typed = input.value.trim().toLowerCase();
  const exact = list.findIndex(it => it.label.toLowerCase() === typed);
  active = exact >= 0 ? exact : list.length ? 0 : -1;
  results.innerHTML = list.map((it, i) => `<li role="option" id="opt-${i}" data-i="${i}" aria-selected="${i === active}"><span>${esc(it.label)}</span><small>${it.type === 'local' && !it.plain ? formulaHtml(it.meta) : esc(it.meta)}</small></li>`).join('')
    + (pending ? '<li class="note">Searching PubChem…</li>' : list.length ? '' : '<li class="note">No matches</li>');
  results.hidden = false;
  input.setAttribute('aria-expanded', 'true');
}
function closeResults() { results.hidden = true; input.setAttribute('aria-expanded', 'false'); items = []; }
function choose(it) {
  if (!it) return;
  closeResults();
  input.value = '';
  input.blur();
  stopTour();
  if (it.type === 'local') go(it.key);
  else loadRemote({ name: it.label });
}
results.addEventListener('pointerdown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); choose(items[+li.dataset.i]); } });
input.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!items.length) return;
    active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    results.querySelectorAll('li[data-i]').forEach(li => li.setAttribute('aria-selected', String(+li.dataset.i === active)));
    input.setAttribute('aria-activedescendant', `opt-${active}`);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    choose(items[active] ?? (input.value.trim() && { type: 'remote', label: input.value.trim() }));
  } else if (e.key === 'Escape') {
    closeResults();
    input.blur();
  }
});
input.addEventListener('blur', () => setTimeout(closeResults, 120));

// ------------------------------------------------------------------ tour: a random mix, each stop followed down a few levels
const TOUR_PACE = 1.6; // every pause in the tour, stretched so there is time to read and look
const sleep = (ms, token) => new Promise((res, rej) => {
  const id = setTimeout(res, ms * TOUR_PACE);
  token.cancel = () => { clearTimeout(id); rej(new Error('stopped')); };
});
async function tour() {
  const token = {};
  state.tour = token;
  $('#tourBtn').setAttribute('aria-pressed', 'true');
  toast('Touring at random: molecules, elements and the snowflake. Drag, click or press any key to stop.');
  const down = async (steps, waits) => {
    for (let i = 0; i < steps; i++) { stage.dive(); await sleep(waits[i] ?? 4500, token); }
  };
  let first = true;
  try {
    for (;;) {
      const pick = first && state.entry ? { key: state.entry.key } : randomPick();
      first = false;
      if (!(pick.key === state.entry?.key && stage.levels.length === 1)) await go(pick.key);
      if (pick.key.startsWith('thing-')) {
        await sleep(5500, token);
        await down(3, [6000, 5000, 5000]);
      } else if (pick.key.startsWith('element-')) {
        await sleep(4500, token);
        await down(Math.random() < 0.3 ? 3 : 2, [4500, 4500, 5500]);
      } else {
        await sleep(7000, token);
        if (Math.random() < 0.6) await down(Math.random() < 0.3 ? 3 : 2, [5500, 4500, 4500]);
      }
      if (stage.levels.length > 1) { stage.surfaceTo(0); await sleep(2400, token); }
    }
  } catch { /* stopped */ }
}
function stopTour() {
  if (!state.tour) return;
  state.tour.cancel?.();
  state.tour = null;
  $('#tourBtn').setAttribute('aria-pressed', 'false');
}
$('#tourBtn').addEventListener('click', () => (state.tour ? stopTour() : tour()));

// ------------------------------------------------------------------ picture, help, toast, cinema
function photo() {
  const url = stage.screenshot();
  const a = document.createElement('a');
  const name = stage.levels.map(l => crumbName(l)[0]).pop();
  a.href = url;
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
  a.click();
  toast('Picture saved.');
}
$('#photoBtn').addEventListener('click', photo);
$('#helpBtn').addEventListener('click', () => $('#help').showModal());
let toastTimer;
function toast(msg, ms = 3200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}
$('#sheetHandle').addEventListener('click', () => {
  const open = $('#details').classList.toggle('open');
  $('#sheetHandle').setAttribute('aria-expanded', String(open));
});

// ------------------------------------------------------------------ keyboard
addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, dialog')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!$('#intro').hidden) return;
  if (guide && e.key === 'Escape') { stopGuided(); return; }
  if (state.tour && e.key !== 't' && e.key !== 'T') stopTour();
  const idx = LIBRARY.indexOf(state.entry);
  const atRootMolecule = stage.levels.length === 1 && stage.current?.kind === 'molecule';
  if (stage.current?.kind === 'table' && e.key.startsWith('Arrow')) {
    e.preventDefault();
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    const i = stage.tableMove(d[0], d[1]);
    if (i != null) {
      const el = BY_Z[i];
      showTip({ kind: 'tile', index: i, element: el });
      const at = stage.tileScreen(i);
      if (at) positionTip(at.x + 20, at.y);
    }
    return;
  }
  if (stage.current?.kind === 'table' && e.key === 'Enter' && $('#tip').classList.contains('tile-tip')) {
    const name = $('#tip .card-head b')?.textContent;
    const el = BY_Z.find(x => x.name === name);
    if (el) { showTip(null); state.entry = { key: `element-${el.symbol}`, name: el.name }; setHash(state.entry.key, el.name); stage.dive(el.Z - 1); return; }
  }
  switch (e.key) {
    case '/':
      e.preventDefault();
      if (document.body.classList.contains('lib-collapsed')) setLibraryCollapsed(false);
      if (innerWidth <= 900) { $('#library').classList.add('open'); }
      input.focus(); // at once, so the next keystroke lands in the box
      break;
    case '[': setLibraryCollapsed(!document.body.classList.contains('lib-collapsed')); break;
    case 'ArrowRight': if (atRootMolecule) load(LIBRARY[(idx + 1) % LIBRARY.length]); break;
    case 'ArrowLeft': if (atRootMolecule) load(LIBRARY[(idx - 1 + LIBRARY.length) % LIBRARY.length]); break;
    case '1': case '2': case '3': case '4': if (stage.current?.kind === 'molecule') setMode(['cloud', 'ball', 'space', 'stick'][+e.key - 1]); break;
    case 'Enter': case 'z': case 'Z': stage.dive(); break;
    case 'Escape': case 'Backspace':
      if (stage.selection.length) stage.clearSelection(); else stage.surface();
      break;
    case ' ': e.preventDefault(); toggleSpin(); break;
    case 'l': case 'L': if (stage.current?.kind === 'molecule') toggleLabels(); break;
    case 'r': case 'R': surprise(); break;
    case 'e': case 'E': stopTour(); go('table'); break;
    case 'q': case 'Q': stopTour(); go('particles'); break;
    case 't': case 'T': state.tour ? stopTour() : tour(); break;
    case 'p': case 'P': photo(); break;
    case 'h': case 'H': document.body.classList.toggle('cinema'); break;
    case '?': $('#help').showModal(); break;
    default: return;
  }
});
addEventListener('hashchange', () => { const k = location.hash.slice(1); if (k && k !== state.entry?.key) { stopTour(); stopGuided(); hideIntro(); go(k); } });

// ------------------------------------------------------------------ the landing page and the guided journey
const CHAPTERS = [
  { size: '3 mm', title: 'Things you can hold', line: 'A snowflake, a grain of salt, a diamond. Each shape is a clue to what is inside.', c: '#cfe8ff', things: true },
  { size: '1 nm', title: 'Molecules', line: 'Atoms joined into shapes: water, caffeine, the letters of DNA. Real 3D structures, and any of PubChem’s millions.', c: '#7cc4ff', go: 'caffeine' },
  { size: '0.3 nm', title: 'Elements', line: 'Every molecule is built from just 118 kinds of atom.', c: '#f2b45a', go: 'table', elements: ['H', 'C', 'O', 'Fe', 'Au', 'U'] },
  { size: `${pow10(-15)} m`, title: 'Particles', line: 'Every atom is built from a few of 17 particles that have no parts at all.', c: '#b53cff', go: 'particles', particles: ['u', 'd', 'e', 'gamma', 'g', 'H'] },
  { size: `${pow10(-35)} m`, title: 'The Planck length', line: 'Below this, nobody knows. Physics, as we have it, runs out.', c: '#b48cff', guided: true },
];
function renderChapters() {
  $('#chapters').innerHTML = CHAPTERS.map((ch, i) => `
    <li style="--c:${ch.c}"><div class="chapter" role="button" tabindex="0" data-chapter="${i}">
      <span class="size">${ch.size}</span><b>${esc(ch.title)}</b><span class="line">${esc(ch.line)}</span>
      ${ch.elements ? `<span class="icons">${ch.elements.map(sym => { const el = ELEMENTS[sym]; return `<button type="button" class="mini" data-go="element-${sym}" title="${esc(el.name)}" aria-label="${esc(el.name)}" style="--c:${hex(FAMILY_COLORS[el.family])}">${sym}</button>`; }).join('')}</span>` : ''}
      ${ch.particles ? `<span class="icons">${ch.particles.map(k => { const pt = PARTICLES.find(x => x.key === k); return `<button type="button" class="mini" data-go="particle-${k}" title="${esc(pt.name)}" aria-label="${esc(pt.name)}" style="--c:${hex(PARTICLE_FAMILIES[pt.family].color)}">${esc(pt.symbol)}${pt.sub ? `<sub>${esc(pt.sub)}</sub>` : ''}</button>`; }).join('')}</span>` : ''}
      ${ch.things ? `<span class="icons">${THINGS.map(t => `<button type="button" data-thing="${t.key}" title="${esc(t.title)}" aria-label="${esc(t.title)}"><svg viewBox="0 0 44 44">${THING_ICONS[t.icon]}</svg></button>`).join('')}</span>` : ''}
    </div></li>`).join('');
}
function showIntro() {
  stopTour();
  stopGuided();
  $('#intro').hidden = false;
  document.body.classList.add('on-intro');
  if (stage.current?.kind !== 'snowflake') loadSnowflake();
  history.replaceState(null, '', location.pathname);
  document.title = 'Molecule Viewer';
}
function hideIntro() {
  $('#intro').hidden = true;
  document.body.classList.remove('on-intro');
}
$('#chapters').addEventListener('click', e => {
  const t = e.target.closest('[data-thing]');
  if (t) { hideIntro(); go(`thing-${t.dataset.thing}`); return; }
  const g = e.target.closest('[data-go]');
  if (g) { hideIntro(); go(g.dataset.go); return; }
  const c = e.target.closest('[data-chapter]');
  if (!c) return;
  const ch = CHAPTERS[+c.dataset.chapter];
  hideIntro();
  if (ch.guided) guided();
  else if (ch.things) go('thing-snowflake');
  else go(ch.go);
});
$('#chapters').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-chapter]')) { e.preventDefault(); e.target.click(); } });
$('#startJourney').addEventListener('click', () => { hideIntro(); guided(); });
$('#exploreFree').addEventListener('click', () => { hideIntro(); go('caffeine'); });
$('.mark').addEventListener('click', e => { e.preventDefault(); showIntro(); });

// the guided journey: from a snowflake to the Planck length, a caption at every step
const GUIDE = [
  ['A snowflake, about 3 millimetres across. Six arms, each 60° from the next. Why six? Let’s look inside.', 9000],
  ['Ice. Water molecules holding on to each other in rings of six. The snowflake’s hexagon starts here, ten million times smaller.', 10000],
  ['One water molecule: an oxygen and two hydrogens, bent at 104.5°. That bend is why the rings form.', 9000],
  ['The oxygen atom. Its eight electrons are not little planets but clouds of probability: each point is somewhere one might be found.', 10000],
  ['Its nucleus: eight protons and eight neutrons, about fifty thousand times smaller than the atom around it.', 9000],
  ['A proton. Three quarks, held by gluons. Almost all of its mass is the energy of that binding.', 10000],
  ['The Planck length, 1.6 × 10⁻³⁵ m. Below here, physics as we know it runs out. That is the end of the journey; scroll out, or explore on your own.', 0],
];
let guide = null;
async function guided() {
  stopTour();
  stopGuided();
  const token = {};
  guide = token;
  const say = text => {
    const span = $('#caption span');
    span.textContent = text;
    span.classList.remove('swap'); void span.offsetWidth; span.classList.add('swap');
    $('#caption').hidden = false;
  };
  const wait = ms => new Promise((res, rej) => { const id = setTimeout(res, ms); token.cancel = () => { clearTimeout(id); rej(new Error('stopped')); }; });
  try {
    loadSnowflake();
    for (let i = 0; i < GUIDE.length; i++) {
      say(GUIDE[i][0]);
      if (!GUIDE[i][1]) break;
      await wait(GUIDE[i][1]);
      // in the ice, pick out a water molecule; in the water, the oxygen; in the nucleus, a proton
      stage.dive(i === 4 ? 'proton' : undefined);
      await wait(i === 5 ? 3400 : 2200);
    }
    await wait(14000);
    $('#caption').hidden = true;
  } catch { /* stopped */ }
  if (guide === token) guide = null;
}
function stopGuided() {
  if (!guide) return;
  guide.cancel?.();
  guide = null;
  $('#caption').hidden = true;
}
$('#captionStop').addEventListener('click', stopGuided);

// ------------------------------------------------------------------ start
renderLibrary();
renderRuler();
renderChapters();
// no address: the landing page, over a slowly turning snowflake
const startKey = location.hash.slice(1);
if (!startKey) showIntro();
else Promise.resolve(go(startKey)).then(() => { if (!state.entry) load(LIBRARY.find(e => e.key === 'caffeine')); });
requestAnimationFrame(() => requestAnimationFrame(() => {
  $('#veil').classList.add('gone');
  setTimeout(() => $('#veil').remove(), 1600);
}));
window.viewer = { stage, state }; // for poking at from the console
