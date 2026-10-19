// Levels that are not molecules: a snowflake (the top of the ice journey), the periodic table (a place to
// pick any atom), and the Planck scale (the bottom of everything). Each returns the same shape as the
// levels in dive.js: { kind, group, radius, metresPerUnit, update(t), fade(f) }, plus next() to dive.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { BY_Z, FAMILY_COLORS, tablePosition } from './elements.js';
import { PARTICLES, PARTICLE, PARTICLE_FAMILIES } from './particles.js';
import { cloudMaterial, pointsFrom, buffer, push, randomDir, atomOrbitals } from './cloud.js';
import { ELEMENTS } from './elements.js';
import { fadeMaterials, tick } from './dive.js';

const fading = m => { m.userData.fades = true; return m; };

// ---------------------------------------------------------------- snowflake

// A stellar dendrite: six arms along the crystal's a axes, side branches at 60° to each arm. Drawn
// procedurally (no two real snowflakes match); the six-fold, 60° geometry is the part that is always true.
export function snowflakeLevel(seed = 11) {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const R = 5.6, T = 0.07;
  const half = []; // segments on one side of one arm: [x0, y0, x1, y1, width]
  half.push([0.6, 0, R, 0, 0.24]);
  for (let t = 1.0; t < R - 0.5; t += 0.4 + rand() * 0.45) {
    const len = (R - t) * (0.3 + rand() * 0.45) * (t < 1.6 ? 0.55 : 1);
    const a = Math.PI / 3;
    const x1 = t + Math.cos(a) * len, y1 = Math.sin(a) * len;
    const w = 0.13 * (1 - 0.45 * t / R);
    half.push([t, 0, x1, y1, w]);
    for (let u = 0.35; u < len - 0.25; u += 0.35 + rand() * 0.4) { // twigs off the branch, again at 60°
      const bx = t + Math.cos(a) * u, by = Math.sin(a) * u, l2 = (len - u) * (0.25 + rand() * 0.3);
      half.push([bx, by, bx + l2, by, w * 0.6]);
    }
  }
  const geos = [];
  const addSeg = ([x0, y0, x1, y1, w], rot, mirror) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const g = new THREE.BoxGeometry(len, w, T);
    g.rotateZ(Math.atan2(mirror * (y1 - y0), x1 - x0));
    g.translate((x0 + x1) / 2, mirror * (y0 + y1) / 2, 0);
    g.rotateZ(rot);
    geos.push(g);
  };
  for (let k = 0; k < 6; k++) {
    const rot = k * Math.PI / 3;
    half.forEach(seg => { addSeg(seg, rot, 1); if (seg[1] !== 0 || seg[3] !== 0) addSeg(seg, rot, -1); });
    const tip = new THREE.CylinderGeometry(0.28, 0.28, T, 6);
    tip.rotateX(Math.PI / 2);
    tip.rotateZ(Math.PI / 6);
    tip.translate(R, 0, 0);
    tip.rotateZ(rot);
    geos.push(tip);
  }
  for (const [r, z] of [[0.95, 0], [0.62, 0.02]]) {
    const plate = new THREE.CylinderGeometry(r, r, T + z, 6);
    plate.rotateX(Math.PI / 2);
    plate.rotateZ(Math.PI / 6);
    geos.push(plate);
  }
  const geo = mergeGeometries(geos.map(g => g.toNonIndexed()));
  const ice = fading(new THREE.MeshPhysicalMaterial({
    color: 0xdff1ff, roughness: 0.1, metalness: 0, transmission: 0.6, thickness: 0.3, ior: 1.31,
    iridescence: 0.5, iridescenceIOR: 1.3, envMapIntensity: 1.8, emissive: 0x2a5a96, emissiveIntensity: 0.35,
    clearcoat: 1, clearcoatRoughness: 0.05,
  }));
  const flake = new THREE.Mesh(geo, ice);
  const group = new THREE.Group();
  group.add(flake);
  // glints along every edge
  const glint = buffer();
  const c = new THREE.Color(0xeaf6ff), v = new THREE.Vector3();
  const pos = geo.attributes.position;
  for (let i = 0; i < 9000; i++) {
    v.fromBufferAttribute(pos, Math.floor(rand() * pos.count));
    push(glint, v, v, c, 0.5 + rand() * 2);
  }
  const glints = pointsFrom(glint, cloudMaterial({ size: 0.06, rate: 0.35 }));
  group.add(glints);
  // the symmetry: six axes 60° apart, and the angle between two of them
  const sym = new THREE.Group();
  const dash = fading(new THREE.LineDashedMaterial({ color: 0xf2b45a, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.9, depthTest: false }));
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3;
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(Math.cos(a), Math.sin(a), 0).multiplyScalar(R * 1.12)]), dash);
    line.computeLineDistances();
    line.renderOrder = 5;
    sym.add(line);
  }
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 33 }, (_, i) => new THREE.Vector3(Math.cos(i / 32 * Math.PI / 3) * 2.1, Math.sin(i / 32 * Math.PI / 3) * 2.1, 0))),
  fading(new THREE.LineBasicMaterial({ color: 0xf2b45a, transparent: true, depthTest: false })));
  arc.renderOrder = 5;
  sym.add(arc);
  const label = document.createElement('div');
  label.className = 'measure-label';
  label.textContent = '60°';
  const lbl = new CSS2DObject(label);
  lbl.position.set(Math.cos(Math.PI / 6) * 2.55, Math.sin(Math.PI / 6) * 2.55, 0);
  sym.add(lbl);
  group.add(sym);
  return {
    kind: 'snowflake', group, radius: R * 1.15, metresPerUnit: 3e-3 / (2 * R), sizeMetres: 3e-3, noSpin: true,
    viewDir: new THREE.Vector3(0, -0.22, 1), symmetry: sym,
    update(t) { tick(group, t); flake.rotation.x = Math.sin(t * 0.4) * 0.06; flake.rotation.y = Math.sin(t * 0.3) * 0.08; glints.rotation.copy(flake.rotation); },
    fade(f) { fadeMaterials(group, f); label.style.opacity = f; sym.visible = f > 0.05 && this.showSymmetry !== false; },
    showSymmetry: true,
  };
}

// ---------------------------------------------------------------- periodic table

// Faces are neutral (white type on clear glass) so the tile body can carry whatever the current view
// colours it by.
async function tileAtlas() {
  try { await document.fonts.load('800 80px "Big Shoulders Display"'); } catch { /* fall back to the stack */ }
  const cell = 170, cols = 12;
  const c = document.createElement('canvas');
  c.width = c.height = cell * cols;
  const g = c.getContext('2d');
  BY_Z.forEach((el, i) => {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    const grd = g.createLinearGradient(x, y, x, y + cell);
    grd.addColorStop(0, 'rgba(255,255,255,0.10)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    grd.addColorStop(1, 'rgba(255,255,255,0.0)');
    g.fillStyle = grd;
    g.beginPath(); g.roundRect(x + 6, y + 6, cell - 12, cell - 12, 14); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(x + 7, y + 7, cell - 14, cell - 14, 13); g.stroke();
    g.fillStyle = '#ffffff';
    g.font = '600 22px "IBM Plex Sans", sans-serif';
    g.textAlign = 'left';
    g.fillText(String(el.Z), x + 18, y + 36);
    g.font = '400 17px "IBM Plex Sans", sans-serif';
    g.textAlign = 'right';
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillText(el.mass >= 100 ? el.mass.toFixed(el.mass % 1 ? 1 : 0) : el.mass.toFixed(2), x + cell - 18, y + 35);
    g.fillStyle = '#ffffff';
    g.font = `800 ${el.symbol.length > 2 ? 62 : 78}px "Big Shoulders Display", sans-serif`;
    g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10;
    g.fillText(el.symbol, x + cell / 2, y + 114);
    g.shadowBlur = 0;
    g.font = '500 17px "IBM Plex Sans", sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillText(el.name.length > 13 ? el.name.slice(0, 12) + '…' : el.name, x + cell / 2, y + 148);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, cols };
}

// Ways to look at the table: each gives every element a colour, a height (tiles rise as bars) and
// whether it is lit or dimmed. Human body figures are percent by mass.
const BODY = { O: 65, C: 18.5, H: 9.5, N: 3.2, Ca: 1.5, P: 1.0, K: 0.4, S: 0.3, Na: 0.2, Cl: 0.2, Mg: 0.1,
  Fe: 0.006, F: 0.0037, Zn: 0.0032, Si: 0.002, Cu: 0.0001, Se: 0.00002, Mn: 0.00002, I: 0.00002, Mo: 0.00001, Co: 0.00002, Cr: 0.00002 };
const GASES = new Set(['H', 'He', 'N', 'O', 'F', 'Ne', 'Cl', 'Ar', 'Kr', 'Xe', 'Rn']);
const LIQUIDS = new Set(['Br', 'Hg']);
const ramp = (t, stops) => {
  const c = new THREE.Color();
  const k = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
  return c.setHex(stops[k]).lerp(new THREE.Color(stops[k + 1]), t * (stops.length - 1) - k);
};
export const TABLE_VIEWS = {
  family: { label: 'Families', note: 'Coloured by family: elements in one family share their outer electrons, and so their chemistry.',
    of: el => ({ color: new THREE.Color(FAMILY_COLORS[el.family]).offsetHSL(0, 0.4, -0.1), rise: 0, lit: true }) },
  mass: { label: 'Weight', note: 'Height and colour by atomic mass: from hydrogen, 1, to oganesson, 294 times heavier.',
    of: el => ({ color: ramp(el.mass / 294, [0x3b6fd8, 0x7cc4ff, 0xf2b45a, 0xff5a3c]), rise: 0.05 + 2.4 * el.mass / 294, lit: true }) },
  state: { label: 'Gas, liquid, solid', note: 'At room temperature. The eleven gases float up; only bromine and mercury are liquid.',
    of: el => GASES.has(el.symbol) ? { color: new THREE.Color(0x7cc4ff), rise: 1.1, lit: true }
      : LIQUIDS.has(el.symbol) ? { color: new THREE.Color(0x5fd6b4), rise: 0.5, lit: true }
        : el.Z >= 100 ? { color: new THREE.Color(0x3a4256), rise: 0, lit: false }
          : { color: new THREE.Color(0x8f9ab8), rise: 0, lit: true } },
  body: { label: 'In your body', note: 'Height by share of your body’s mass, on a log scale: 65% oxygen, down to traces of cobalt and molybdenum.',
    of: el => BODY[el.symbol] ? { color: ramp((Math.log10(BODY[el.symbol]) + 5) / 7, [0x5a3cd8, 0xff7a9a, 0xffd36b]), rise: 0.15 + 0.32 * (Math.log10(BODY[el.symbol]) + 5), lit: true, scale: 0.5 + 0.075 * (Math.log10(BODY[el.symbol]) + 5) }
      : { color: new THREE.Color(0x283044), rise: 0, lit: false, scale: 0.42 } },
  block: { label: 'Orbital blocks', note: 'Coloured by the orbital shape being filled. Two s columns, six p, ten d and fourteen f: s holds 2 electrons, p 6, d 10, f 14. That is why the table has the shape it does.',
    of: el => {
      const p = tablePosition(el.Z);
      const l = p.f ? 'f' : el.Z === 2 || p.col <= 1 ? 's' : p.col >= 12 ? 'p' : 'd';
      return { color: new THREE.Color({ s: 0x7cc4ff, p: 0xf2b45a, d: 0xe58cff, f: 0x8ef0b0 }[l]).offsetHSL(0, 0.25, -0.12), rise: { s: 0.15, p: 0.3, d: 0.45, f: 0.6 }[l], lit: true };
    } },
  sizes: { label: 'Atom sizes', note: 'Each tile scaled to its atom’s true relative size (covalent radius). They shrink across each row as the nucleus pulls harder, and swell down each column as shells are added: caesium is eight times wider than hydrogen.',
    of: el => el.Z <= 96
      ? { color: new THREE.Color(FAMILY_COLORS[el.family]).offsetHSL(0, 0.3, -0.06), rise: 0.1, lit: true, scale: 0.22 + 0.78 * el.covalent / MAX_COV }
      : { color: new THREE.Color(0x283044), rise: 0, lit: false, scale: 0.22 } },
  made: { label: 'Made by people', note: 'Everything after plutonium has only ever been made in reactors and particle accelerators, often a few atoms at a time.',
    of: el => el.Z > 94 ? { color: ramp((el.Z - 95) / 23, [0xe58cff, 0xff5a8a]), rise: 0.25 + (el.Z - 95) * 0.04, lit: true }
      : { color: new THREE.Color(0x283044), rise: 0, lit: false } },
};

// A small electron cloud for a tile: the element's own orbitals, squeezed to unit radius
function miniAtom(symbol) {
  const data = atomOrbitals(symbol, { perElectron: 900, budget: 2200 });
  const b = buffer();
  const k = 1 / (data.outer * 2.1);
  for (const sub of data.subshells) {
    const { pos, alt, col, seed, size } = sub.buf;
    for (let i = 0; i < seed.length; i++) {
      b.pos.push(pos[i * 3] * k, pos[i * 3 + 1] * k, pos[i * 3 + 2] * k);
      b.alt.push(alt[i * 3] * k, alt[i * 3 + 1] * k, alt[i * 3 + 2] * k);
      b.col.push(col[i * 3], col[i * 3 + 1], col[i * 3 + 2]);
      b.seed.push(seed[i]); b.size.push(size[i]);
    }
  }
  for (let i = 0; i < 12; i++) push(b, new THREE.Vector3(), new THREE.Vector3(), new THREE.Color(0xffe2b0), 3);
  const pts = pointsFrom(b, cloudMaterial({ size: 0.1, rate: 0.25, scatter: 2 }));
  pts.material.uniforms.uOpacity.value = 0;
  return pts;
}
// biggest measured covalent radius (francium), for the sizes view
const MAX_COV = 2.6;

export async function tableLevel(counts = {}) {
  const atlas = await tileAtlas();
  const group = new THREE.Group();
  const tilt = new THREE.Group(); // leans gently toward the pointer
  group.add(tilt);
  const pitch = 1.12;
  const body = new RoundedBoxGeometry(1, 1, 0.18, 3, 0.07);
  const hitGeo = new THREE.PlaneGeometry(pitch, pitch);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const tiles = [], hits = [];
  if (Object.keys(counts).length) {
    const max = Math.max(...Object.values(counts));
    TABLE_VIEWS.library = { label: 'In these molecules', note: 'Height by how many of the library’s molecules each element appears in. Carbon, hydrogen and oxygen dominate.',
      of: el => counts[el.symbol] ? { color: ramp(counts[el.symbol] / max, [0x2f8f8a, 0x5fd6b4, 0xd8ff8a]), rise: 0.15 + 2.2 * counts[el.symbol] / max, lit: true }
        : { color: new THREE.Color(0x283044), rise: 0, lit: false } };
  }
  for (const el of BY_Z) {
    const p = tablePosition(el.Z);
    const tile = new THREE.Group();
    // lit, glossy blocks of colour: shaded by the lights, highlights from the clearcoat, only a little glow of their own
    const mat = fading(new THREE.MeshPhysicalMaterial({ color: 0x334, roughness: 0.5, metalness: 0.0, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.22, emissiveIntensity: 1 }));
    const box = new THREE.Mesh(body, mat);
    const face = new THREE.PlaneGeometry(0.96, 0.96);
    const i = el.Z - 1, u0 = (i % atlas.cols) / atlas.cols, v0 = 1 - (Math.floor(i / atlas.cols) + 1) / atlas.cols, du = 1 / atlas.cols;
    const uv = face.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * du, v0 + uv.getY(k) * du);
    // pulled towards the camera in the depth test too, so it can never flicker into the tile's face
    const front = new THREE.Mesh(face, fading(new THREE.MeshBasicMaterial({ map: atlas.tex, transparent: true, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8, depthWrite: false })));
    front.position.z = 0.1;
    front.renderOrder = 2;
    tile.add(box, front);
    const home = new THREE.Vector3((p.col - 8.5) * pitch, -(p.row - 4.4) * pitch + 1.9, 0); // raised: the title sits below
    tile.position.copy(home);
    // the pointer is tested against a fixed plane at the tile's home, so a lifted tile cannot slip out from
    // under the cursor and drop back (which made hovering flicker)
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.copy(home);
    hit.position.z = 0.2;
    hit.userData.tile = tile;
    tilt.add(hit);
    hits.push(hit);
    const spin = (el.Z / 118) * Math.PI * 4;
    tile.userData = { element: el, home, lift: 0, rise: 0, color: new THREE.Color(0x334455), lit: 1, atomShown: 0,
      delay: (el.Z / 118) * 1.1 + Math.random() * 0.1,
      // the entrance: each tile starts on a spiral and flips face-up as it lands
      from: new THREE.Vector3(Math.cos(spin) * (6 + el.Z * 0.05), Math.sin(spin) * (6 + el.Z * 0.05), -10) };
    box.userData.tile = front.userData.tile = tile;
    tilt.add(tile);
    tiles.push(tile);
  }
  const level = {
    kind: 'table', group, tiles, radius: 10.6, metresPerUnit: null, noScale: true, noSpin: true,
    viewDir: new THREE.Vector3(0, -0.28, 1), hover: null, family: null, born: 0, view: 'family', ripples: [], pointer: null, built: 0,
    setView(name) {
      this.view = TABLE_VIEWS[name] ? name : 'family';
      const t = performance.now() / 1000;
      tiles.forEach(tile => { tile.userData.target = TABLE_VIEWS[this.view].of(tile.userData.element); });
      this.ripples.push({ x: 0, y: 6, t0: t, a: 0.0 });
    },
    setHover(tile) {
      if (tile && tile !== this.hover) this.ripples.push({ x: tile.userData.home.x, y: tile.userData.home.y, t0: performance.now() / 1000, a: 0.22 });
      if (this.ripples.length > 6) this.ripples.shift();
      this.hover = tile;
    },
    update(t) {
      const age = t - this.born;
      const now = performance.now() / 1000;
      // lean toward the pointer, a few degrees at most; flat again while diving
      const want = this.pointer && !this.frozen ? this.pointer : { x: 0, y: 0 };
      tilt.rotation.y += (want.x * 0.09 - tilt.rotation.y) * 0.06;
      tilt.rotation.x += (-want.y * 0.06 - tilt.rotation.x) * 0.06;
      for (const tile of tiles) {
        const d = tile.userData;
        const tg = d.target || TABLE_VIEWS.family.of(d.element);
        const k = Math.min(1, Math.max(0, (age - d.delay) * 1.6));
        const e = 1 - Math.pow(1 - k, 3);
        let ripple = 0;
        for (const r of this.ripples) {
          const dt = now - r.t0, dist = Math.hypot(d.home.x - r.x, d.home.y - r.y);
          ripple += r.a * Math.exp(-((dist - dt * 9) ** 2) / 1.2) * Math.exp(-dt * 1.4);
        }
        const famOn = this.family ? d.element.family === this.family : true;
        const lift = (this.hover === tile ? 0.55 : 0) + (this.family && famOn ? 0.3 : 0) + ripple;
        d.lift += (lift - d.lift) * 0.18;
        d.rise += (tg.rise - d.rise) * 0.08;
        d.color.lerp(tg.color, 0.08);
        d.lit += ((tg.lit && famOn ? 1 : 0.22) - d.lit) * 0.1;
        const [box, front] = tile.children;
        box.scale.z = (0.18 + d.rise) / 0.18;
        box.position.z = -d.rise / 2;
        tile.position.set(d.home.x, d.home.y, d.home.z + d.rise + d.lift);
        if (e < 1) tile.position.lerpVectors(d.from, tile.position, e);
        tile.rotation.y = (1 - e) * Math.PI;
        d.scale = (d.scale ?? 1) + ((tg.scale ?? 1) - (d.scale ?? 1)) * 0.1; // views can grow or shrink the tiles themselves
        tile.scale.setScalar(Math.max(0.001, e) * d.scale * (this.hover === tile ? 1.12 : 1));
        // the atom above the tile: risen out of it on hover, or all of them in the sizes view
        const atomWant = (tg.atom || 0) * 1.25; // atoms only in the sizes view; hover is a lift and a glow
        if (atomWant > 0 && !d.cloud && this.built++ < 4) {
          d.cloud = miniAtom(d.element.symbol);
          tile.add(d.cloud);
        }
        if (d.cloud) {
          d.atomShown += (atomWant - d.atomShown) * 0.12;
          const r = Math.max(0.001, d.atomShown);
          d.cloud.scale.setScalar(r);
          d.cloud.position.set(0, 0, 0.15 + r * 0.9);
          d.cloud.material.uniforms.uOpacity.value = Math.min(1.8, d.atomShown * 4) * (this.fadeLevel ?? 1);
        }
        const hot = this.hover === tile ? 1.9 : 1;
        box.material.color.copy(d.color).multiplyScalar(0.12 + 0.26 * d.lit);
        box.material.emissive.copy(d.color).multiplyScalar((0.03 + 0.09 * d.lit) * hot * hot);
        front.material.opacity = (this.fadeLevel ?? 1) * (0.3 + 0.7 * d.lit) * e;
      }
      this.ripples = this.ripples.filter(r => now - r.t0 < 3);
      this.built = 0; // clouds are made a few per frame, so switching to the sizes view never stalls
      tick(group, t);
    },
    fade(f) { this.fadeLevel = f; fadeMaterials(group, f); },
    pickTargets() { return hits; },
  };
  level.setView('family');
  level.ripples = [];
  return level;
}

// ---------------------------------------------------------------- the Planck scale

// 1.6 × 10^-35 m. No experiment reaches anywhere near here, and no accepted theory describes it: this is
// John Wheeler's idea of "quantum foam", space itself fluctuating, drawn as a guess and labelled as one.
export function planckLevel() {
  const group = new THREE.Group();
  const foam = buffer();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < 26000; i++) {
    randomDir(a).multiplyScalar(5.5 * Math.cbrt(Math.random()));
    randomDir(b).multiplyScalar(5.5 * Math.cbrt(Math.random()));
    c.setHSL(0.68 + Math.random() * 0.12, 0.6, 0.55 + Math.random() * 0.3);
    push(foam, a, b, c, 0.6 + Math.random() * 1.8);
  }
  const pts = pointsFrom(foam, cloudMaterial({ size: 0.07, rate: 1.4, scatter: 20 }));
  pts.material.uniforms.uOpacity.value = 0.6;
  pts.material.userData.baseOpacity = 0.6;
  group.add(pts);
  const bubbles = [];
  const bubbleGeo = new THREE.IcosahedronGeometry(1, 2);
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(bubbleGeo, fading(new THREE.MeshBasicMaterial({ color: 0xb48cff, wireframe: true, transparent: true, opacity: 0.22 })));
    m.material.userData.baseOpacity = 0.22;
    m.position.copy(randomDir(new THREE.Vector3()).multiplyScalar(4.5 * Math.cbrt(Math.random())));
    m.userData = { phase: Math.random() * 6.28, speed: 0.6 + Math.random() * 1.2, size: 0.4 + Math.random() * 1.1 };
    group.add(m);
    bubbles.push(m);
  }
  return {
    kind: 'planck', group, radius: 7, metresPerUnit: 1.616e-35, sizeMetres: 1.616e-35,
    update(t) {
      tick(group, t);
      for (const m of bubbles) {
        const s = Math.max(0.001, Math.sin(t * m.userData.speed + m.userData.phase));
        m.scale.setScalar(s * m.userData.size);
        m.rotation.set(t * 0.3 + m.userData.phase, t * 0.2, 0);
      }
    },
    fade: f => fadeMaterials(group, f),
  };
}

// ---------------------------------------------------------------- one fundamental particle

// As far as anyone has measured, every fundamental particle is a point: no size, nothing inside
// (experiments find no structure down to about 10^-18 m). What can be drawn is around it: for a charged
// particle its electric field and the vacuum fizzing with short-lived pairs that screen it; for a quark or
// gluon a flicker of colour charge; for a force carrier, ripples; for a neutrino, almost nothing.
export function particleLevel(p = PARTICLE.e) {
  const group = new THREE.Group();
  const fam = new THREE.Color(PARTICLE_FAMILIES[p.family].color);
  const coreCol = fam.clone().lerp(new THREE.Color(1, 1, 1), 0.45);
  const core = pointsFrom((() => {
    const b = buffer();
    for (let i = 0; i < 40; i++) push(b, new THREE.Vector3(), new THREE.Vector3(), coreCol, 3);
    return b;
  })(), cloudMaterial({ size: p.ghost ? 0.12 : 0.25, rate: 0.8 }));
  if (p.ghost) { core.material.uniforms.uOpacity.value = 0.45; core.material.userData.baseOpacity = 0.45; }
  group.add(core);
  const extras = [];
  if (p.q) { // field lines, brightest near the charge (the field falls off as 1/r^2)
    const linePos = [], lineCol = [];
    const v = new THREE.Vector3();
    const n = Math.round(64 * Math.min(1, Math.abs(p.q) + 0.2));
    for (let i = 0; i < n; i++) {
      const t = Math.acos(1 - 2 * (i + 0.5) / n), ph = Math.PI * (1 + Math.sqrt(5)) * i;
      v.set(Math.sin(t) * Math.cos(ph), Math.sin(t) * Math.sin(ph), Math.cos(t));
      for (let k = 0; k < 24; k++) {
        const r0 = 0.25 * Math.pow(1.17, k), r1 = 0.25 * Math.pow(1.17, k + 1);
        const a0 = Math.min(1, 0.35 / (r0 * r0)), a1 = Math.min(1, 0.35 / (r1 * r1));
        linePos.push(v.x * r0, v.y * r0, v.z * r0, v.x * r1, v.y * r1, v.z * r1);
        lineCol.push(fam.r * a0, fam.g * a0, fam.b * a0, fam.r * a1, fam.g * a1, fam.b * a1);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lineCol, 3));
    const lines = new THREE.LineSegments(lg, fading(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    group.add(lines);
    extras.push(t => { lines.rotation.y = t * 0.05; });
  }
  if (p.q || p.colour) { // the fizzing vacuum: virtual pairs, dense near the particle
    const pairs = buffer();
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    const cols = p.colour ? [0xff4060, 0x40ff8a, 0x4f8bff].map(h => new THREE.Color(h)) : [new THREE.Color(0x7cc4ff), new THREE.Color(0xf2b45a)];
    for (let i = 0; i < 9000; i++) {
      const r = 0.3 + 5 * Math.pow(Math.random(), 2.2);
      randomDir(a).multiplyScalar(r);
      b.copy(a).addScaledVector(randomDir(new THREE.Vector3()), 0.12);
      push(pairs, a, b, cols[i % cols.length], 0.6 + Math.random());
    }
    const pts = pointsFrom(pairs, cloudMaterial({ size: 0.06, rate: 2.2, scatter: 12 }));
    pts.material.uniforms.uOpacity.value = 0.7;
    pts.material.userData.baseOpacity = 0.7;
    group.add(pts);
  }
  if (p.wave) { // a force carrier: shells of ripple spreading out
    const shells = [];
    for (let k = 0; k < 4; k++) {
      const b = buffer();
      const v = new THREE.Vector3();
      for (let i = 0; i < 2200; i++) { randomDir(v); push(b, v, v.clone().multiplyScalar(1.02), coreCol, 0.8); }
      const s = pointsFrom(b, cloudMaterial({ size: 0.05, rate: 0.4 }));
      s.userData.k = k;
      group.add(s);
      shells.push(s);
    }
    extras.push(t => shells.forEach(s => {
      const r = ((t * 0.6 + s.userData.k * 1.5) % 6) + 0.2;
      s.scale.setScalar(r);
      s.material.uniforms.uOpacity.value = Math.max(0, 1 - r / 6) * (s.userData.fade ?? 1);
    }));
    group.userData.shells = shells;
  }
  if (p.ghost) { // a neutrino: barely there; a faint trail as it passes straight through everything
    const b = buffer();
    for (let i = 0; i < 600; i++) {
      const x = -6 + Math.random() * 6;
      push(b, new THREE.Vector3(x, 0, 0), new THREE.Vector3(x + 0.05, 0, 0), coreCol, 0.5 + Math.random() * (x + 6) / 6);
    }
    const trail = pointsFrom(b, cloudMaterial({ size: 0.05, rate: 0.6 }));
    trail.material.uniforms.uOpacity.value = 0.35;
    trail.material.userData.baseOpacity = 0.35;
    group.add(trail);
  }
  return {
    kind: 'particle', particle: p, group, radius: 6.5, metresPerUnit: 1e-18 / 12, sizeMetres: 1e-18,
    update(t) { tick(group, t); extras.forEach(f => f(t)); },
    fade(f) { fadeMaterials(group, f); (group.userData.shells || []).forEach(s => { s.userData.fade = f; }); },
  };
}

// ---------------------------------------------------------------- the particle zoo


// A small drawing on each particle's tile: what it does, or where you meet it
const ICON_FOR = { u: 'proton', d: 'proton', c: 'collider', s: 'collider', b: 'collider', t: 'weight', e: 'bolt', mu: 'rays',
  tau: 'hourglass', ve: 'sun', vmu: 'through', vtau: 'through', g: 'spring', gamma: 'wave', Z: 'sun', W: 'trefoil', H: 'ripple' };
function drawIcon(g, kind, cx, cy, r, col) {
  g.save();
  g.translate(cx, cy);
  g.strokeStyle = 'rgba(230,236,245,0.9)';
  g.fillStyle = col;
  g.lineWidth = r * 0.09;
  g.lineCap = g.lineJoin = 'round';
  const circle = (x, y, rr, fill) => { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); fill ? g.fill() : g.stroke(); };
  if (kind === 'proton') {
    circle(0, 0, r);
    [['#ff4060', -0.38, -0.25], ['#40ff8a', 0.38, -0.25], ['#4f8bff', 0, 0.42]].forEach(([c, x, y]) => { g.fillStyle = c; circle(x * r, y * r, r * 0.24, true); });
  } else if (kind === 'collider') {
    g.beginPath(); g.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = col; circle(-r * 0.15, -r * 0.08, r * 0.14, true); circle(r * 0.15, r * 0.08, r * 0.14, true);
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); g.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); } g.stroke();
  } else if (kind === 'weight') {
    g.beginPath(); g.moveTo(-r * 0.75, r * 0.85); g.lineTo(-r * 0.5, -r * 0.35); g.lineTo(r * 0.5, -r * 0.35); g.lineTo(r * 0.75, r * 0.85); g.closePath(); g.fill(); g.stroke();
    circle(0, -r * 0.62, r * 0.27);
  } else if (kind === 'bolt') {
    g.beginPath(); g.moveTo(r * 0.2, -r); g.lineTo(-r * 0.45, r * 0.1); g.lineTo(0, r * 0.1); g.lineTo(-r * 0.2, r); g.lineTo(r * 0.45, -r * 0.1); g.lineTo(0, -r * 0.1); g.closePath(); g.fill(); g.stroke();
  } else if (kind === 'rays') {
    g.fillStyle = col; circle(-r * 0.6, -r * 0.6, r * 0.22, true);
    g.beginPath(); [[-0.3, -0.3, 0.6, 0.9], [-0.55, 0, 0.2, 0.95], [0, -0.5, 0.95, 0.35]].forEach(([a, b, c, d]) => { g.moveTo(a * r, b * r); g.lineTo(c * r, d * r); }); g.stroke();
  } else if (kind === 'hourglass') {
    g.beginPath(); g.moveTo(-r * 0.55, -r); g.lineTo(r * 0.55, -r); g.lineTo(-r * 0.55, r); g.lineTo(r * 0.55, r); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(-r * 0.25, r * 0.75); g.lineTo(r * 0.25, r * 0.75); g.lineTo(0, r * 0.35); g.closePath(); g.fill();
  } else if (kind === 'sun') {
    g.fillStyle = '#ffcf5a'; circle(0, 0, r * 0.45, true);
    g.strokeStyle = '#ffcf5a';
    g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.moveTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke();
  } else if (kind === 'through') {
    g.strokeStyle = 'rgba(230,236,245,0.45)'; circle(0, 0, r * 0.62);
    g.strokeStyle = col; g.setLineDash([r * 0.12, r * 0.1]);
    g.beginPath(); g.moveTo(-r, r * 0.25); g.lineTo(r, -r * 0.25); g.stroke(); g.setLineDash([]);
  } else if (kind === 'spring') {
    g.beginPath(); for (let k = 0; k <= 60; k++) { const t = k / 60, x = -r + 2 * r * t, y = Math.sin(t * Math.PI * 8) * r * 0.35; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    ['#ff4060', '#4f8bff'].forEach((c, i) => { g.fillStyle = c; circle(i ? r : -r, 0, r * 0.18, true); });
  } else if (kind === 'wave') {
    g.strokeStyle = col;
    g.beginPath(); for (let k = 0; k <= 60; k++) { const t = k / 60, x = -r + 1.7 * r * t, y = Math.sin(t * Math.PI * 5) * r * 0.45 * Math.sin(t * Math.PI); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.beginPath(); g.moveTo(r * 0.7, -r * 0.18); g.lineTo(r, 0); g.lineTo(r * 0.7, r * 0.18); g.stroke();
  } else if (kind === 'trefoil') {
    circle(0, 0, r);
    g.fillStyle = col; circle(0, 0, r * 0.13, true);
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a - 0.5) * r * 0.24, Math.sin(a - 0.5) * r * 0.24); g.arc(0, 0, r * 0.82, a - 0.5, a + 0.5); g.arc(0, 0, r * 0.24, a + 0.5, a - 0.5, true); g.fill(); }
  } else if (kind === 'ripple') {
    g.fillStyle = col; circle(0, 0, r * 0.16, true);
    [0.42, 0.7, 0.98].forEach((k, i) => { g.globalAlpha = 1 - i * 0.28; circle(0, 0, r * k); });
  }
  g.restore();
}

async function particleAtlas() {
  try { await document.fonts.load('800 80px "Big Shoulders Display"'); } catch { /* fall back */ }
  const cell = 220, cols = 5;
  const c = document.createElement('canvas');
  c.width = c.height = cell * cols;
  const g = c.getContext('2d');
  PARTICLES.forEach((p, i) => {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    const col = `#${PARTICLE_FAMILIES[p.family].color.toString(16).padStart(6, '0')}`;
    const grd = g.createLinearGradient(x, y, x, y + cell);
    grd.addColorStop(0, 'rgba(255,255,255,0.12)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.02)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.roundRect(x + 6, y + 6, cell - 12, cell - 12, 22); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x + 7.5, y + 7.5, cell - 15, cell - 15, 21); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.font = '500 19px "IBM Plex Sans", sans-serif';
    g.textAlign = 'left';
    g.fillText(p.mass, x + 22, y + 40);
    g.textAlign = 'right';
    g.fillText(p.charge, x + cell - 22, y + 40);
    g.fillStyle = '#e6ebf3';
    g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 10;
    g.font = '800 92px "Big Shoulders Display", "Times New Roman", serif';
    const w = g.measureText(p.symbol).width, sx = x + cell * 0.33 - (p.sub ? 10 : 0);
    g.fillText(p.symbol, sx, y + 138);
    if (p.sub) { g.font = '600 38px "IBM Plex Sans", sans-serif'; g.fillText(p.sub, sx + w / 2 + 14, y + 150); }
    g.shadowBlur = 0;
    drawIcon(g, ICON_FOR[p.key], x + cell * 0.71, y + 108, 30, '#ffffff');
    g.font = '500 20px "IBM Plex Sans", sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.fillText(p.name, x + cell / 2, y + 192);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, cols };
}

export async function particlesLevel() {
  const atlas = await particleAtlas();
  const group = new THREE.Group();
  const pitch = 1.5;
  const body = new RoundedBoxGeometry(1.36, 1.36, 0.2, 3, 0.12);
  const tiles = [];
  PARTICLES.forEach((p, i) => {
    const fam = new THREE.Color(PARTICLE_FAMILIES[p.family].color);
    const tile = new THREE.Group();
    const box = new THREE.Mesh(body, fading(new THREE.MeshPhysicalMaterial({
      color: fam.clone().multiplyScalar(0.22), roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.45, emissive: fam, emissiveIntensity: 0.28, envMapIntensity: 0.3,
    })));
    const face = new THREE.PlaneGeometry(1.32, 1.32);
    const u0 = (i % atlas.cols) / atlas.cols, v0 = 1 - (Math.floor(i / atlas.cols) + 1) / atlas.cols, du = 1 / atlas.cols;
    const uv = face.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * du, v0 + uv.getY(k) * du);
    const front = new THREE.Mesh(face, fading(new THREE.MeshBasicMaterial({ map: atlas.tex, transparent: true, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8, depthWrite: false })));
    front.position.z = 0.11;
    front.renderOrder = 2;
    tile.add(box, front);
    tile.position.set((p.col - 2.25) * pitch, -(p.row - 1.5) * pitch + 1.2, 0); // raised: the title sits below
    tile.userData = { particle: p, home: tile.position.clone(), lift: 0, delay: i * 0.05 };
    box.userData.tile = front.userData.tile = tile;
    group.add(tile);
    tiles.push(tile);
  });
  // captions for the groups
  for (const [text, x, y] of [['Quarks', -3.4, 2.75], ['Leptons', -3.4, -0.25], ['Forces', 1.5, 4.45], ['Higgs', 3.4, 4.45]]) {
    const div = document.createElement('div');
    div.className = 'zoo-caption';
    div.textContent = text;
    const o = new CSS2DObject(div);
    o.position.set(x * (text === 'Quarks' || text === 'Leptons' ? 1.32 : 1), y, 0);
    group.add(o);
  }
  return {
    kind: 'particles', group, tiles, radius: 6.2, metresPerUnit: null, noScale: true, noSpin: true,
    viewDir: new THREE.Vector3(0, -0.22, 1), hover: null, family: null, born: 0,
    update(t) {
      const age = t - this.born;
      for (const tile of tiles) {
        const d = tile.userData;
        const k = Math.min(1, Math.max(0, (age - d.delay) * 1.8));
        const e = 1 - Math.pow(1 - k, 3);
        const want = (this.hover === tile ? 0.45 : 0) + (this.family && d.particle.family === this.family ? 0.3 : 0);
        d.lift += (want - d.lift) * 0.15;
        tile.position.set(d.home.x, d.home.y, d.home.z + d.lift + (1 - e) * -12 + Math.sin(t * 0.8 + d.home.x * 0.5) * 0.04);
        tile.scale.setScalar(Math.max(0.001, e) * (this.hover === tile ? 1.08 : 1));
        tile.rotation.y = (1 - e) * Math.PI;
        const dim = this.family && d.particle.family !== this.family ? 0.35 : 1;
        tile.children[0].material.emissiveIntensity = (this.hover === tile ? 0.6 : 0.28) * dim;
        tile.children[1].material.opacity = (this.fadeLevel ?? 1) * dim * e;
      }
    },
    fade(f) { this.fadeLevel = f; fadeMaterials(group, f); group.traverse(o => { if (o.isCSS2DObject) o.element.style.opacity = f; }); },
    pickTargets() { return tiles.flatMap(t => t.children); },
  };
}
