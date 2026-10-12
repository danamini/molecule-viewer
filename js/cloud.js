// Electron clouds drawn as probability, not balls: each point is a place an electron might be found.
// Every point carries two sampled positions and blinks between them, so the cloud shimmers the way a
// probability does when you keep looking, rather than spinning like a solid.
import * as THREE from 'three';
import { element, cloudColor, configuration, slaterZeff, L_LETTER } from './elements.js';

const VERT = /* glsl */`
  attribute vec3 aAlt;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aSize;
  uniform float uTime, uProj, uSize, uAssemble, uScatter, uRate;
  varying vec3 vColor;
  varying float vAlpha;
  vec3 hashDir(float s) {
    float u = fract(sin(s * 91.345) * 47453.21) * 2.0 - 1.0;
    float t = fract(sin(s * 12.989) * 23421.63) * 6.2831853;
    float r = sqrt(1.0 - u * u);
    return vec3(r * cos(t), r * sin(t), u);
  }
  void main() {
    float phase = fract(uTime * uRate + aSeed * 7.13);
    vec3 p = phase < 0.5 ? position : aAlt;
    float blink = sin(fract(phase * 2.0) * 3.14159265);
    // assembly: every point flies in from a scattered shell, the far ones a little later
    float k = clamp(uAssemble * 1.7 - aSeed * 0.7, 0.0, 1.0);
    k = 1.0 - pow(1.0 - k, 3.0);
    vec3 scattered = hashDir(aSeed * 13.7 + 1.0) * uScatter * (0.6 + fract(aSeed * 31.0));
    p = mix(scattered, p, k);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * uSize * uProj / max(-mv.z, 0.01), 1.0, 96.0);
    vColor = aColor;
    vAlpha = mix(1.0, blink, 0.85) * (0.35 + 0.65 * k);
  }`;

const FRAG = /* glsl */`
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float a = exp(-d * 18.0) * vAlpha * uOpacity;
    gl_FragColor = vec4(vColor * a, a);
  }`;

// Pixels per scene unit at distance 1 (drawing-buffer height over the view's height), shared by every
// cloud so a point's size is in scene units and the clouds hold their look at any zoom; the stage sets it.
export const PROJ = { value: 800 };

// size: a point's diameter in scene units
export function cloudMaterial({ size = 0.08, rate = 0.12, scatter = 30 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 }, uProj: PROJ, uSize: { value: size },
      uAssemble: { value: 1 }, uScatter: { value: scatter }, uRate: { value: rate }, uOpacity: { value: 1 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

function pointsFrom(buf, material) {
  const n = buf.pos.length / 3;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
  g.setAttribute('aAlt', new THREE.Float32BufferAttribute(buf.alt, 3));
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(buf.col, 3));
  g.setAttribute('aSeed', new THREE.Float32BufferAttribute(buf.seed, 1));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(buf.size, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
  const p = new THREE.Points(g, material);
  p.userData.count = n;
  return p;
}

const buffer = () => ({ pos: [], alt: [], col: [], seed: [], size: [] });
function push(buf, a, b, color, size) {
  buf.pos.push(a.x, a.y, a.z);
  buf.alt.push(b.x, b.y, b.z);
  buf.col.push(color.r, color.g, color.b);
  buf.seed.push(Math.random());
  buf.size.push(size);
}

const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const randomDir = (v = new THREE.Vector3()) => {
  const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
  return v.set(r * Math.cos(t), r * Math.sin(t), u);
};

// ---------------------------------------------------------------- molecule clouds

// A valence cloud around each atom (a 1s-like density, r^2 e^(-2r/a)), a bright point at each nucleus,
// and the shared density of each bond: a sigma tube along the axis, plus pi lobes either side for
// double and triple bonds. Ionic contacts get nothing: their electrons are not shared.
export function moleculeCloud(mol, budget = 140000) {
  const heavy = mol.atoms.filter(a => a.symbol !== 'H').length;
  const light = mol.atoms.length - heavy;
  const bonds = mol.bonds.filter(b => b.order > 0).length;
  const want = heavy * 1400 + light * 520 + bonds * 420;
  const scale = Math.min(1, budget / Math.max(1, want));
  const buf = buffer();
  const col = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();

  for (const atom of mol.atoms) {
    const el = element(atom.symbol);
    col.setHex(cloudColor(atom.symbol));
    const n = Math.round((atom.symbol === 'H' ? 380 : 1400) * scale);
    const r0 = el.covalent * 0.62;
    for (let i = 0; i < n; i++) {
      const rA = -0.5 * r0 * Math.log(Math.random() * Math.random() * Math.random());
      const rB = -0.5 * r0 * Math.log(Math.random() * Math.random() * Math.random());
      a.copy(randomDir(dir)).multiplyScalar(rA).add(atom.pos);
      b.copy(randomDir(dir)).multiplyScalar(rB).add(atom.pos);
      push(buf, a, b, col, 1);
    }
    // the nucleus: a few tight, bright points
    for (let i = 0; i < 6; i++) push(buf, atom.pos, atom.pos, col.clone().lerp(new THREE.Color(1, 1, 1), 0.6), 3.2);
  }

  const ca = new THREE.Color(), cb = new THREE.Color(), cMix = new THREE.Color();
  for (const bond of mol.bonds) {
    if (bond.order <= 0) continue;
    const A = mol.atoms[bond.a], B = mol.atoms[bond.b];
    ca.setHex(cloudColor(A.symbol));
    cb.setHex(cloudColor(B.symbol));
    const axis = new THREE.Vector3().subVectors(B.pos, A.pos);
    const len = axis.length();
    axis.normalize();
    const perp = bond.perp, perp2 = new THREE.Vector3().crossVectors(axis, perp).normalize();
    const n = Math.round(420 * scale);
    const along = () => 0.5 + gauss() * 0.2;
    const sample = (out, lobe) => {
      const t = Math.min(0.95, Math.max(0.05, along()));
      out.copy(A.pos).addScaledVector(axis, t * len);
      if (lobe === 0) {
        out.addScaledVector(perp, gauss() * 0.16).addScaledVector(perp2, gauss() * 0.16);
      } else {
        const side = Math.random() < 0.5 ? -1 : 1;
        const p = lobe === 1 ? perp : perp2;
        const q = lobe === 1 ? perp2 : perp;
        out.addScaledVector(p, side * (0.42 + gauss() * 0.1)).addScaledVector(q, gauss() * 0.14);
      }
      return t;
    };
    const lobes = bond.order >= 3 ? [0, 1, 2] : bond.order === 2 ? [0, 1] : [0];
    for (const lobe of lobes) {
      const count = lobe === 0 ? n : Math.round(n * 0.7);
      for (let i = 0; i < count; i++) {
        const t = sample(a, lobe);
        sample(b, lobe);
        cMix.copy(ca).lerp(cb, t);
        push(buf, a, b, cMix, lobe === 0 ? 0.9 : 0.8);
      }
    }
  }
  const pts = pointsFrom(buf, cloudMaterial({ size: 0.075, scatter: mol.radius * 3 + 10 }));
  return pts;
}

// ---------------------------------------------------------------- atomic orbitals

const A0 = 0.529177; // Bohr radius, Å

function laguerre(k, alpha, x) {
  if (k === 0) return 1;
  let l0 = 1, l1 = 1 + alpha - x;
  for (let i = 1; i < k; i++) {
    const l2 = ((2 * i + 1 + alpha - x) * l1 - (i + alpha) * l0) / (i + 1);
    l0 = l1;
    l1 = l2;
  }
  return l1;
}

// Inverse-CDF sampler for the hydrogen-like radial probability r^2 R_nl(r)^2 with charge Z (r in Å)
function radialSampler(n, l, Z) {
  const rMax = (n * n / Z) * A0 * 5 + 1.5 * A0;
  const N = 800;
  const cdf = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) {
    const r = (i / N) * rMax;
    const rho = (2 * Z * r) / (n * A0);
    const R = Math.pow(rho, l) * Math.exp(-rho / 2) * laguerre(n - l - 1, 2 * l + 1, rho);
    cdf[i] = cdf[i - 1] + r * r * R * R;
  }
  const total = cdf[N];
  return () => {
    const u = Math.random() * total;
    let lo = 0, hi = N;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < u) lo = mid; else hi = mid;
    }
    const f = (u - cdf[lo]) / Math.max(1e-30, cdf[hi] - cdf[lo]);
    return ((lo + f) / N) * rMax;
  };
}

// Real spherical harmonics, unnormalised, as functions of a unit vector; names in chemists' notation.
const HARMONICS = [
  [['s', () => 1]],
  [['pz', (x, y, z) => z], ['px', (x) => x], ['py', (x, y) => y]],
  [['dz²', (x, y, z) => 3 * z * z - 1], ['dxz', (x, y, z) => x * z], ['dyz', (x, y, z) => y * z],
    ['dxy', (x, y) => x * y], ['dx²−y²', (x, y) => x * x - y * y]],
  [['fz³', (x, y, z) => z * (5 * z * z - 3)], ['fxz²', (x, y, z) => x * (5 * z * z - 1)],
    ['fyz²', (x, y, z) => y * (5 * z * z - 1)], ['fxyz', (x, y, z) => x * y * z],
    ['fz(x²−y²)', (x, y, z) => z * (x * x - y * y)], ['fx(x²−3y²)', (x, y) => x * (x * x - 3 * y * y)],
    ['fy(3x²−y²)', (x, y) => y * (3 * x * x - y * y)]],
];

function angularSampler(fn) {
  let max = 0;
  const v = new THREE.Vector3();
  for (let i = 0; i < 4000; i++) {
    randomDir(v);
    max = Math.max(max, fn(v.x, v.y, v.z) ** 2);
  }
  return (out) => {
    for (let tries = 0; tries < 500; tries++) {
      randomDir(out);
      if (Math.random() * max <= fn(out.x, out.y, out.z) ** 2) return out;
    }
    return out;
  };
}

export const ORBITAL_COLORS = { s: 0x7cc4ff, p: 0xf2b45a, d: 0xe58cff, f: 0x8ef0b0 };

// One THREE.Points per subshell (so each can be shown alone), sampled from its occupied real orbitals;
// orbitals in a part-filled subshell are filled one electron each first (Hund's rule).
export function atomOrbitals(symbol, { perElectron = 7000, budget = 70000 } = {}) {
  const el = element(symbol);
  const shells = configuration(symbol);
  const electrons = shells.reduce((s, x) => s + x[2], 0);
  // inner shells are thinned so they do not burn out the middle; the valence shell carries the shape
  const valenceN = Math.max(...shells.map(x => x[0]));
  // and where the valence shell has p (or d, f) orbitals, its s orbital steps back so their lobes show
  const shaped = shells.some(([n, l]) => l > 0 && n >= valenceN - 1);
  const weight = (n, l) => (n < valenceN - (l > 1 ? 1 : 0) ? 0.25 : l === 0 && shaped ? 0.4 : 1);
  const weighted = shells.reduce((s, [n, l, e]) => s + e * weight(n, l), 0);
  const perBase = Math.min(perElectron, budget / Math.max(1, weighted));
  const subshells = [];
  let outer = 0;
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  for (const [n, l, e] of shells) {
    const Z = slaterZeff(el.Z, shells, n, l);
    const radial = radialSampler(n, l, Z);
    const orbitals = HARMONICS[l];
    const occupancy = orbitals.map((_, i) => (e > i ? 1 : 0) + (e > i + orbitals.length ? 1 : 0));
    const buf = buffer();
    const col = new THREE.Color(ORBITAL_COLORS[L_LETTER[l]]);
    // inner shells a little dimmer so the valence shell reads
    const hot = col.clone().lerp(new THREE.Color(1, 1, 1), 0.25);
    const lit = [];
    let rSum = 0, rCount = 0;
    orbitals.forEach(([name, fn], i) => {
      if (!occupancy[i]) return;
      lit.push(name);
      const ang = angularSampler(fn);
      const count = Math.round(perBase * weight(n, l) * occupancy[i]);
      for (let k = 0; k < count; k++) {
        const ra = radial(), rb = radial();
        ang(v).multiplyScalar(ra);
        ang(w).multiplyScalar(rb);
        push(buf, v, w, Math.random() < 0.15 ? hot : col, 1);
        rSum += ra;
        rCount++;
      }
    });
    const mean = rSum / Math.max(1, rCount);
    outer = Math.max(outer, mean);
    subshells.push({ n, l, electrons: e, label: `${n}${L_LETTER[l]}`, orbitals: lit, zeff: Z, meanRadius: mean, buf, opacity: 0.3 + 0.45 * weight(n, l) });
  }
  return { el, shells, subshells, outer };
}

export function orbitalPoints(sub, scale) {
  for (const arr of [sub.buf.pos, sub.buf.alt]) for (let i = 0; i < arr.length; i++) arr[i] *= scale;
  const pts = pointsFrom(sub.buf, cloudMaterial({ size: 0.11, rate: 0.18, scatter: 40 }));
  pts.material.uniforms.uOpacity.value = sub.opacity;
  pts.material.userData.baseOpacity = sub.opacity;
  sub.buf = null;
  return pts;
}

// Faint dust far behind everything, for depth
export function dustField(count = 1800, radius = 140) {
  const buf = buffer();
  const col = new THREE.Color(0x6f86b8), v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    randomDir(v).multiplyScalar(radius * (0.45 + Math.random() * 0.55));
    push(buf, v, v.clone().addScaledVector(randomDir(new THREE.Vector3()), 0.6), col, 0.6 + Math.random() * 1.6);
  }
  const m = cloudMaterial({ size: 0.5, rate: 0.03, scatter: radius });
  m.uniforms.uOpacity.value = 0.35;
  return pointsFrom(buf, m);
}

export { gauss, randomDir, pointsFrom, buffer, push };
