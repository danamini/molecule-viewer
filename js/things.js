// Things you can hold, each the start of a journey down into what it is made of. Every model is drawn
// procedurally; its child is the library entry (a lattice or a molecule) that explains it.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { cloudMaterial, pointsFrom, buffer, push, randomDir } from './cloud.js';
import { fadeMaterials, tick } from './dive.js';
import { element } from './elements.js';

const fading = m => { m.userData.fades = true; return m; };
// a named point on a model where a part can be zoomed into; it moves with the model
function anchor(g, key, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.userData.part = key;
  g.add(o);
  (g.userData.anchors ||= {})[key] = o;
  return o;
}
const glass = (color, extra = {}) => fading(new THREE.MeshPhysicalMaterial({
  color, roughness: 0.05, metalness: 0, transmission: 0.9, thickness: 1.2, ior: 1.5, clearcoat: 1, envMapIntensity: 1.6, ...extra,
}));

// thin bright lines along a solid's edges, the way a gem's facets catch light
function facetEdges(geo, opacity = 0.35) {
  const m = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 12), fading(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })));
  m.material.userData.baseOpacity = opacity;
  return m;
}

function sparkle(geo, count, color = 0xffffff, size = 0.08) {
  const b = buffer();
  const c = new THREE.Color(color), v = new THREE.Vector3(), pos = geo.attributes.position;
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, Math.floor(Math.random() * pos.count));
    push(b, v, v, c, 0.5 + Math.random() * 2.2);
  }
  return pointsFrom(b, cloudMaterial({ size, rate: 0.3 }));
}

// ---------------------------------------------------------------- the models (about 6 units across)

function saltGrains() {
  const g = new THREE.Group();
  const mat = glass(0xf4f8ff, { transmission: 0.75, roughness: 0.22, ior: 1.54 });
  [[0, 0, 0, 3.2, 0.1], [2.6, -1.3, -0.8, 1.6, 0.6], [-2.5, -1.2, 0.6, 1.9, -0.4], [0.6, 2.4, -1.2, 1.2, 0.9]].forEach(([x, y, z, s, r]) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(s, s, s, 2, s * 0.06), mat);
    m.position.set(x, y, z);
    m.rotation.set(r, r * 1.3, r * 0.5);
    g.add(m);
    const sp = sparkle(m.geometry, 400, 0xffffff, 0.07);
    sp.position.copy(m.position); sp.rotation.copy(m.rotation);
    g.add(sp);
  });
  return g;
}

// A round brilliant at real proportions: table 57% of the width, crown 34.5°, pavilion 40.75°, girdle
// in between. Real glass (transmission, diamond's refractive index 2.42 and its dispersion, the 'fire').
function diamondGem() {
  const R = 2.8;
  const crownH = (R - 0.57 * R) * Math.tan(THREE.MathUtils.degToRad(34.5));
  const pavH = R * Math.tan(THREE.MathUtils.degToRad(40.75));
  const pts = [[0.001, -pavH], [R * 0.55, -pavH * 0.45], [R, -0.04], [R, 0.06], [R * 0.8, 0.06 + crownH * 0.45], [0.57 * R, 0.06 + crownH], [0.001, 0.06 + crownH]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.rotateY(Math.PI / 16);
  const gem = new THREE.Mesh(geo, fading(new THREE.MeshPhysicalMaterial({
    color: 0xeef4ff, metalness: 0, roughness: 0, transmission: 0.95, thickness: 3.5, ior: 2.42, dispersion: 5,
    specularIntensity: 1, envMapIntensity: 1.6, flatShading: true, iridescence: 0.4, iridescenceIOR: 2.0,
    side: THREE.DoubleSide, // the lathe's faces wind inward; both sides keep every facet
  })));
  const g = new THREE.Group();
  g.add(gem, facetEdges(geo, 0.32));
  g.add(sparkle(geo, 700, 0xffffff, 0.1));
  g.rotation.set(0.28, 0, 0.1);
  g.position.y = 1.7;
  g.scale.setScalar(0.85);
  return g;
}

// A cluster of quartz points: six-sided prisms with three-and-three rhombohedral tips, clear glass with a
// faint lilac cast, and the milky veils and wisps real crystals carry inside.
function quartzCluster() {
  const g = new THREE.Group();
  const mat = fading(new THREE.MeshPhysicalMaterial({
    color: 0xf4f6ff, metalness: 0, roughness: 0.1, transmission: 0.78, thickness: 2.5, ior: 1.54,
    specularIntensity: 1, envMapIntensity: 1.7, flatShading: true, sheen: 0.4, sheenColor: new THREE.Color(0xe8eeff),
  }));
  const crystal = (h, r) => {
    const c = new THREE.Group();
    const prism = new THREE.CylinderGeometry(r, r * 1.04, h, 6, 1);
    const tip = new THREE.ConeGeometry(r, r * 1.5, 6, 1);
    tip.translate(0, h / 2 + r * 0.75, 0);
    c.add(new THREE.Mesh(prism, mat), new THREE.Mesh(tip, mat), facetEdges(prism, 0.4), facetEdges(tip, 0.4));
    // veils: milky inclusions, densest near the base
    const b = buffer(), v = new THREE.Vector3(), col = new THREE.Color(0xf4f2ff);
    for (let i = 0; i < 260; i++) {
      const y = -h / 2 + Math.pow(Math.random(), 1.8) * h * 0.8;
      const a = Math.random() * Math.PI * 2, rr = Math.random() * r * 0.8;
      v.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
      push(b, v, v.clone().add(new THREE.Vector3(0.05, 0.02, 0)), col, 0.6 + Math.random() * 1.5);
    }
    const veil = pointsFrom(b, cloudMaterial({ size: 0.08, rate: 0.05 }));
    veil.material.uniforms.uOpacity.value = 0.45;
    veil.material.userData.baseOpacity = 0.45;
    c.add(veil, sparkle(tip, 60, 0xffffff, 0.08));
    return c;
  };
  [[0, 0, 0, 4.8, 0.95, 0.05], [1.6, -0.9, 0.4, 3.3, 0.68, -0.5], [-1.5, -1.1, -0.3, 3.5, 0.72, 0.45], [0.4, -1.5, 1.3, 2.3, 0.52, 0.25], [-0.6, -1.6, -1.2, 2.0, 0.45, -0.2]]
    .forEach(([x, y, z, h, r, tilt]) => {
      const c = crystal(h, r);
      c.position.set(x, y, z);
      c.rotation.set(tilt * 0.3, Math.random() * 1.2, tilt);
      g.add(c);
    });
  // the matrix: the host rock the points grew from, its upper face crusted with druse (a carpet of tiny
  // quartz crystals, the first to form before a few points won the race to grow large)
  const rockGeo = new THREE.IcosahedronGeometry(2.4, 4);
  const rp = rockGeo.attributes.position, rv = new THREE.Vector3();
  for (let i = 0; i < rp.count; i++) {
    rv.fromBufferAttribute(rp, i);
    const n = Math.sin(rv.x * 2.1 + rv.z * 1.3) * 0.18 + Math.sin(rv.y * 3.7 + rv.x * 2.9) * 0.12 + Math.sin(rv.z * 5.3 - rv.y * 1.7) * 0.07;
    rv.multiplyScalar(1 + n);
    if (rv.y > 0.6) rv.y = 0.6 + (rv.y - 0.6) * 0.55;      // a gently domed top where the crystals stand
    rp.setXYZ(i, rv.x, rv.y, rv.z);
  }
  rockGeo.computeVertexNormals();
  const rock = new THREE.Mesh(rockGeo, fading(new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.95, flatShading: true })));
  rock.scale.set(1.3, 0.55, 1.05);
  rock.position.y = -3.25;
  g.add(rock);
  const druseGeo = new THREE.ConeGeometry(0.1, 0.32, 6, 1);
  druseGeo.translate(0, 0.16, 0);
  const druse = new THREE.InstancedMesh(druseGeo, mat, 700);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const sparks = buffer(), white = new THREE.Color(0xffffff);
  for (let i = 0; i < 700; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 2.9;
    pos.set(Math.cos(a) * r, -2.75 - (r / 2.9) ** 2 * 0.45 + Math.random() * 0.05, Math.sin(a) * r * 0.82);
    q.setFromUnitVectors(up, new THREE.Vector3((Math.random() - 0.5) * 0.9, 1, (Math.random() - 0.5) * 0.9).normalize());
    const k = 0.6 + Math.random() * 1.1;
    m4.compose(pos, q, sc.set(k, k, k));
    druse.setMatrixAt(i, m4);
    if (i % 3 === 0) push(sparks, pos.clone().add(new THREE.Vector3(0, 0.2 * k, 0)), pos.clone().add(new THREE.Vector3(0, 0.2 * k, 0)), white, 0.6 + Math.random() * 1.6);
  }
  g.add(druse, pointsFrom(sparks, cloudMaterial({ size: 0.07, rate: 0.35 })));
  g.position.y = 1.1;
  g.scale.setScalar(0.88);
  return g;
}

function pencil() {
  const g = new THREE.Group();
  // printed body: yellow lacquer with the grade stamped in black
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#f2b51e'; x.fillRect(0, 0, 1024, 128);
  x.fillStyle = '#1a1a1a'; x.font = 'bold 54px "IBM Plex Sans", sans-serif';
  x.fillText('MOLECULE VIEWER', 200, 84); x.fillText('HB', 760, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const paint = fading(new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }));
  const wood = fading(new THREE.MeshStandardMaterial({ color: 0xe6bd8a, roughness: 0.9 }));
  const graphite = fading(new THREE.MeshStandardMaterial({ color: 0x2c2e33, roughness: 0.3, metalness: 0.7 }));
  const metal = fading(new THREE.MeshPhysicalMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.25 }));
  const rubber = fading(new THREE.MeshStandardMaterial({ color: 0xf08a8a, roughness: 0.8 }));
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 8, 6, 1), paint);
  body.position.y = -4;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.62, 1.9, 24), wood);
  cone.position.y = 0.95;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 24), graphite);
  tip.position.y = 2.2;
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.8, 32, 4), metal);
  ferrule.position.y = -8.4;
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.7, 32), rubber);
  eraser.position.y = -9.15;
  g.add(body, cone, tip, ferrule, eraser);
  // the line it has drawn, in graphite flakes
  const b = buffer(), v = new THREE.Vector3(), col = new THREE.Color(0x9aa4b4);
  for (let i = 0; i < 500; i++) { const t = Math.random(); v.set(-0.3 - t * 6, 2.5 + Math.sin(t * 9) * 0.25, 0); push(b, v, v, col, 0.5 + Math.random()); }
  const line = pointsFrom(b, cloudMaterial({ size: 0.07, rate: 0.05 }));
  g.add(line);
  anchor(g, 'graphite', 0, 2.25, 0);
  anchor(g, 'wood', 0.35, 1.0, 0.3);
  anchor(g, 'ferrule', 0, -8.4, 0.62);
  anchor(g, 'eraser', 0, -9.2, 0.55);
  g.rotation.z = -1.0;
  g.scale.setScalar(0.62);
  g.position.set(0.6, 1.4, 0);
  return g;
}

function goldRing() {
  const g = new THREE.Group();
  const gold = fading(new THREE.MeshPhysicalMaterial({ color: 0xffc94a, metalness: 1, roughness: 0.18, clearcoat: 0.4, envMapIntensity: 2.2 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.55, 48, 128), gold);
  ring.rotation.x = 1.15;
  g.add(ring);
  const glints = sparkle(ring.geometry, 300, 0xfff0c0, 0.08);
  glints.rotation.x = 1.15;
  g.add(glints);
  return g;
}

// The Zilog Z80 (1976): a 40-pin plastic DIP, decapped to show its NMOS die, drawn in the style of a die
// photo: bright aluminium wiring over orange polysilicon and olive diffusion.
// Layout: the datapath runs along the bottom, as Ken Shirriff's reverse engineering of Z80 die photos
// shows: the 16-bit incrementer/decrementer in the lower-left corner, PC and IR beside it, then the
// register file (each register a vertical column, bit 0 at the top to bit 15 at the bottom, two of every
// register), register-select decoding above it, bus drivers at its right, the ALU on the lower bus.
// The control area above is drawn schematically. Blocks in texture pixels (2048 × 2200):
export const Z80_BLOCKS = {
  pla: [150, 170, 760, 560],
  control: [960, 170, 940, 900],
  select: [470, 1200, 1060, 150],
  incdec: [150, 1400, 300, 640],
  registers: [470, 1400, 1060, 640],
  alu: [1580, 1400, 320, 640],
  timing: [150, 780, 760, 370],
};
function z80DieTexture() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 2200;
  const x = c.getContext('2d');
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
  x.fillStyle = '#4a4a2a'; x.fillRect(0, 0, 2048, 2200);                       // field oxide over the substrate
  // diffusion (olive-tan) and polysilicon (orange) underneath everything
  for (let i = 0; i < 9000; i++) {
    const poly = rnd() < 0.45, v = rnd() < 0.5, len = 10 + rnd() * 60;
    x.fillStyle = poly ? `rgba(214,120,62,${0.35 + rnd() * 0.3})` : `rgba(150,150,90,${0.3 + rnd() * 0.3})`;
    x.fillRect(110 + rnd() * 1830, 130 + rnd() * 1940, v ? 4 : len, v ? len : 4);
  }
  const metal = (alpha = 0.85) => `rgba(222,226,232,${alpha})`;
  const B = Z80_BLOCKS;
  // the decode PLA: a regular grid of transistor sites under metal columns
  { const [bx, by, bw, bh] = B.pla;
    x.fillStyle = 'rgba(40,36,24,0.6)'; x.fillRect(bx, by, bw, bh);
    for (let i = bx + 6; i < bx + bw; i += 11) { x.fillStyle = metal(0.75); x.fillRect(i, by, 5, bh); }
    for (let j = by + 5; j < by + bh; j += 9) { x.fillStyle = 'rgba(214,120,62,0.75)'; x.fillRect(bx, j, bw, 3); }
    for (let i = bx + 6; i < bx + bw; i += 11) for (let j = by + 5; j < by + bh; j += 9) if (rnd() < 0.42) { x.fillStyle = 'rgba(30,26,18,0.9)'; x.fillRect(i - 1, j - 1, 7, 5); } }
  // control and timing: random logic, dense and irregular, metal running mostly one way
  for (const key of ['control', 'timing']) {
    const [bx, by, bw, bh] = B[key];
    x.fillStyle = 'rgba(40,36,24,0.45)'; x.fillRect(bx, by, bw, bh);
    for (let k = 0; k < (key === 'control' ? 2600 : 1100); k++) {
      x.fillStyle = metal(0.55 + rnd() * 0.35);
      const h = rnd() < 0.75;
      x.fillRect(bx + rnd() * bw, by + rnd() * bh, h ? 20 + rnd() * 140 : 5, h ? 5 : 20 + rnd() * 110);
    }
    for (let k = 0; k < 700; k++) { x.fillStyle = 'rgba(25,22,15,0.8)'; x.fillRect(bx + rnd() * bw, by + rnd() * bh, 6, 6); }  // contacts
  }
  // register-select decoding above the register file
  { const [bx, by, bw, bh] = B.select;
    for (let i = bx; i < bx + bw; i += 9) { x.fillStyle = metal(0.6 + rnd() * 0.3); x.fillRect(i, by + rnd() * 20, 4, bh - 20); } }
  // the datapath: bit-sliced columns, 16 cells each (bit 0 at the top)
  const columns = (bx, by, bw, bh, n) => {
    const cw = bw / n, ch = bh / 16;
    for (let col = 0; col < n; col++) for (let bit = 0; bit < 16; bit++) {
      const cx = bx + col * cw, cy = by + bit * ch;
      x.fillStyle = 'rgba(214,120,62,0.7)'; x.fillRect(cx + 4, cy + ch * 0.45, cw - 8, 3);
      x.fillStyle = metal(0.8); x.fillRect(cx + cw * 0.2, cy + 3, 5, ch - 6); x.fillRect(cx + cw * 0.65, cy + 3, 5, ch - 6);
      x.fillStyle = 'rgba(28,24,16,0.85)'; x.fillRect(cx + cw * 0.4, cy + ch * 0.3, 6, 6);
    }
    x.fillStyle = metal(0.9);
    for (let bit = 0; bit <= 16; bit++) x.fillRect(bx, by + bit * ch - 1, bw, 2);       // bit lines across
  };
  columns(...B.incdec, 4);
  columns(...B.registers, 14);
  // the ALU: four identical slices, worked twice per 8-bit operation
  { const [bx, by, bw, bh] = B.alu;
    for (let sl = 0; sl < 4; sl++) {
      const sy = by + sl * (bh / 4);
      x.fillStyle = 'rgba(40,36,24,0.5)'; x.fillRect(bx + 6, sy + 6, bw - 12, bh / 4 - 12);
      for (let k = 0; k < 160; k++) { x.fillStyle = metal(0.6 + rnd() * 0.3); x.fillRect(bx + 10 + rnd() * (bw - 40), sy + 10 + rnd() * (bh / 4 - 30), rnd() < 0.5 ? 30 : 5, rnd() < 0.5 ? 5 : 30); }
    } }
  // wide aluminium power and ground rails, and the bus drivers between registers and ALU
  x.fillStyle = metal(0.95);
  x.fillRect(100, 100, 1848, 22); x.fillRect(100, 2078, 1848, 22); x.fillRect(100, 100, 22, 2000); x.fillRect(1926, 100, 22, 2000);
  x.fillRect(100, 1170, 1848, 16); x.fillRect(100, 1375, 1848, 12);
  for (let i = 0; i < 16; i++) x.fillRect(1535, 1400 + i * 40, 40, 6);
  // 40 bond pads, with the pad drivers next to them
  const pad = (px, py) => { x.fillStyle = 'rgba(28,24,16,0.9)'; x.fillRect(px - 6, py - 6, 82, 82); x.fillStyle = '#e4e7ec'; x.fillRect(px, py, 70, 70); };
  for (let i = 0; i < 10; i++) { pad(190 + i * 175, 14); pad(190 + i * 175, 2116); pad(14, 230 + i * 185); pad(1964, 230 + i * 185); }
  x.fillStyle = metal(0.9); x.font = '700 44px "IBM Plex Sans", sans-serif'; x.fillText('Z80', 1760, 2040);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function z80Chip() {
  const g = new THREE.Group();
  // To scale, from the 40-pin plastic DIP standard (JEDEC MO-015): body 52.3 × 14 × 4 mm, pins 2.54 mm
  // apart, the two rows 15.24 mm (0.6") apart centre to centre. The die measures 3.55 × 3.35 mm.
  const MM = 9.4 / 52.3;                                   // scene units per millimetre
  const L = 52.3 * MM, W = 14.0 * MM, H = 4.0 * MM;
  const ROW = 7.62 * MM, PITCH = 2.54 * MM, FIRST = (52.3 - 19 * 2.54) / 2 * MM;
  const epoxy = fading(new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.7 }));
  // the body, with the pin-1 notch cut into its end: a semicircle about 2 mm across, the whole height
  const bev = 0.035, NOTCH = 1.0 * MM;
  const bodyOutline = new THREE.Shape();
  const hx = L / 2 - bev, hy = W / 2 - bev;
  bodyOutline.moveTo(-hx, -hy);
  bodyOutline.lineTo(hx, -hy);
  bodyOutline.lineTo(hx, hy);
  bodyOutline.lineTo(-hx, hy);
  bodyOutline.lineTo(-hx, NOTCH);
  bodyOutline.absarc(-hx, 0, NOTCH, Math.PI / 2, -Math.PI / 2, true);   // bites into the end, not out of it
  bodyOutline.lineTo(-hx, -hy);
  const bodyGeo = new THREE.ExtrudeGeometry(bodyOutline, { depth: H - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 24 });
  bodyGeo.translate(0, 0, -(H - 2 * bev) / 2);
  const body = new THREE.Mesh(bodyGeo, epoxy);
  g.add(body);
  // markings
  const mk = document.createElement('canvas');
  mk.width = 2048; mk.height = 600;
  const m = mk.getContext('2d');
  m.fillStyle = 'rgba(205,208,214,0.85)';
  m.font = '700 92px "IBM Plex Sans", sans-serif'; m.fillText('ZILOG', 150, 190);
  // Zilog's real part number for the original 2.5 MHz Z80 (Z8400; 'A' would mean the later 4 MHz part),
  // P = plastic package, S = standard temperature range. No date code: any one we chose would be invented.
  m.font = '600 78px "IBM Plex Sans", sans-serif'; m.fillText('Z8400 PS', 150, 330);
  m.font = '600 70px "IBM Plex Sans", sans-serif'; m.fillText('Z80 CPU', 1500, 330);
  m.beginPath(); m.arc(80, 520, 26, 0, 6.3); m.fillStyle = 'rgba(0,0,0,0.7)'; m.fill();
  const mt = new THREE.CanvasTexture(mk);
  mt.colorSpace = THREE.SRGBColorSpace;
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.96, W * 0.92), fading(new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false })));
  decal.position.z = H / 2 + 0.004;
  g.add(decal);
  // the decapped window: an etched pit, the die, gold fingers and bond wires, built at a convenient size
  // and scaled so the die comes out at its measured 3.55 × 3.35 mm
  const decap = new THREE.Group();
  decap.scale.set(3.55 * MM / 1.15, 3.55 * MM / 1.15, 1);
  g.add(decap);
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.95), fading(new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95 })));
  pit.position.z = H / 2 + 0.006;
  decap.add(pit);
  const die = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15 * 3.35 / 3.55, 0.05), fading(new THREE.MeshPhysicalMaterial({
    map: z80DieTexture(), metalness: 0.45, roughness: 0.3, iridescence: 0.7, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 700], envMapIntensity: 1.5,
  })));
  die.position.z = H / 2 + 0.04;
  decap.add(die);
  const gold = fading(new THREE.MeshStandardMaterial({ color: 0xe2bd62, metalness: 1, roughness: 0.25 }));
  const wireMat = fading(new THREE.MeshStandardMaterial({ color: 0xf2cf6a, metalness: 1, roughness: 0.2 }));
  for (const side of [-1, 1]) {
    for (let k = 0; k < 10; k++) {
      const px = -0.46 + k * 0.103, fx = -0.95 + k * 0.21;
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.015), gold);
      finger.position.set(fx, side * 0.86, H / 2 + 0.012);
      decap.add(finger);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(px, side * 0.52, H / 2 + 0.07), new THREE.Vector3((px + fx) / 2, side * 0.66, H / 2 + 0.2), new THREE.Vector3(fx, side * 0.76, H / 2 + 0.02)]);
      decap.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.01, 5), wireMat));
    }
  }
  // 40 through-hole leads, each one flat stamped strip (0.25 mm thick): out of the body's side at mid-height,
  // a short step out to the row line, a bend, then down: 1.52 mm wide to the seating plane, tapering to a
  // 0.46 mm pin that goes through the board
  const tin = fading(new THREE.MeshPhysicalMaterial({ color: 0xc4c8ce, metalness: 1, roughness: 0.48, envMapIntensity: 0.7 })); // satin tin plate, not a mirror
  const boardTop = -0.56, T = 0.25 * MM, WIDE = 1.52 * MM, PIN = 0.46 * MM;
  const tab = new THREE.BoxGeometry(WIDE, ROW - W / 2 + 0.06 + T / 2, T);
  const outline = new THREE.Shape();
  const taperTop = boardTop + 0.1, pinEnd = boardTop - 0.5;
  outline.moveTo(-WIDE / 2, 0); outline.lineTo(WIDE / 2, 0); outline.lineTo(WIDE / 2, taperTop);
  outline.lineTo(PIN / 2, boardTop); outline.lineTo(PIN / 2, pinEnd); outline.lineTo(-PIN / 2, pinEnd);
  outline.lineTo(-PIN / 2, boardTop); outline.lineTo(-WIDE / 2, taperTop); outline.closePath();
  const strip = new THREE.ExtrudeGeometry(outline, { depth: T, bevelEnabled: false });
  // the outline is drawn in x and height and extruded along its thickness: swap so height runs along the
  // scene's z (up out of the board) and thickness along y, then centre the thickness on the row line
  strip.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  strip.translate(0, -T / 2, 0);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 20; k++) {
      const x = -L / 2 + FIRST + k * PITCH;
      const t = new THREE.Mesh(tab, tin);
      t.position.set(x, side * ((W / 2 - 0.06 + ROW + T / 2) / 2), 0);   // starts inside the body, so it is joined
      const st = new THREE.Mesh(strip, tin);
      st.position.set(x, side * ROW, 0);
      g.add(t, st);
    }
  }
  // the circuit board it is soldered to: green FR-4, a copper pad round every pin, traces leading away
  const BW = 12.6, BH = 7.8, pads = [];
  for (const side of [-1, 1]) for (let k = 0; k < 20; k++) pads.push([-L / 2 + FIRST + k * PITCH, side * ROW, side, k]);
  const bc = document.createElement('canvas');
  bc.width = 2048; bc.height = Math.round(2048 * BH / BW);
  const bx = bc.getContext('2d');
  const U = (x) => (x / BW + 0.5) * bc.width, V = (y) => (0.5 - y / BH) * bc.height;
  const px = bc.width / BW; // texture pixels per scene unit
  bx.fillStyle = '#0d3a26'; bx.fillRect(0, 0, bc.width, bc.height);
  // traces routed like a real two-row DIP fan-out: straight out from the pad, a 45° bend into a lane of
  // its own, then parallel to the board edge, ending in a via. Pins at the ends of each row take the lanes
  // nearest the chip, inner pins the outer lanes, so no two traces ever cross.
  const lane0 = 0.42, laneGap = 0.165, jog = 0.22;
  bx.strokeStyle = '#3c8a58'; bx.lineWidth = 0.075 * px; bx.lineCap = 'round'; bx.lineJoin = 'round';
  const vias = [];
  for (const [x, y, side, k] of pads) {
    const left = k < 10, idx = left ? k : 19 - k;
    const yl = y + side * (lane0 + idx * laneGap);
    const dirX = left ? -1 : 1;
    const xEnd = dirX * (BW / 2 - 0.45 - (idx % 2) * 0.32);   // vias staggered in two columns
    bx.beginPath();
    bx.moveTo(U(x), V(y));
    bx.lineTo(U(x), V(yl - side * jog));
    bx.lineTo(U(x + dirX * jog), V(yl));
    bx.lineTo(U(xEnd), V(yl));
    bx.stroke();
    vias.push([xEnd, yl]);
  }
  vias.forEach(([x, y]) => {
    bx.fillStyle = '#d8b46a'; bx.beginPath(); bx.arc(U(x), V(y), 0.07 * px, 0, 6.3); bx.fill();
    bx.fillStyle = '#0a1a10'; bx.beginPath(); bx.arc(U(x), V(y), 0.03 * px, 0, 6.3); bx.fill();
  });
  pads.forEach(([x, y]) => {
    bx.fillStyle = '#d8b46a'; bx.beginPath(); bx.arc(U(x), V(y), 0.12 * px, 0, 6.3); bx.fill();   // copper pad, tinned
    bx.fillStyle = '#1a1208'; bx.beginPath(); bx.arc(U(x), V(y), 0.045 * px, 0, 6.3); bx.fill();
  });
  // silkscreen: the chip's outline (notch at pin 1's end) and its reference
  bx.strokeStyle = 'rgba(235,240,240,0.8)'; bx.lineWidth = 0.025 * px;
  bx.strokeRect(U(-L / 2), V(W / 2), U(L / 2) - U(-L / 2), V(-W / 2) - V(W / 2));
  bx.beginPath(); bx.arc(U(-L / 2), V(0), 1.0 * MM * px, -Math.PI / 2, Math.PI / 2); bx.stroke();
  bx.fillStyle = 'rgba(235,240,240,0.85)'; bx.font = `600 ${Math.round(0.26 * px)}px "IBM Plex Sans", sans-serif`;
  bx.fillText('U1  Z80 CPU', U(-L / 2 + 0.2), V(W / 2 + lane0 + 10 * laneGap + 0.25));
  const btex = new THREE.CanvasTexture(bc);
  btex.colorSpace = THREE.SRGBColorSpace;
  btex.anisotropy = 8;
  // the board itself plain; its printed top face a separate sheet, so the underside stays plain
  const board = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, 0.28, 2, 0.04),
    fading(new THREE.MeshPhysicalMaterial({ color: 0x0b2f1f, roughness: 0.6, clearcoat: 0.4 })));
  board.position.z = boardTop - 0.14;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.08, BH - 0.08),
    fading(new THREE.MeshPhysicalMaterial({ map: btex, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })));
  face.position.z = boardTop + 0.002;
  g.add(board, face);
  // solder joints where each pin meets its pad
  const solder = fading(new THREE.MeshPhysicalMaterial({ color: 0xc9ccd1, metalness: 1, roughness: 0.22 }));
  const fillet = new THREE.ConeGeometry(0.13, 0.12, 16);
  fillet.rotateX(Math.PI / 2);
  // underneath, where through-hole parts are actually soldered: a copper ring and a cone of solder round
  // each pin
  const under = new THREE.ConeGeometry(0.15, 0.16, 16);
  under.rotateX(-Math.PI / 2);
  const ring = new THREE.CircleGeometry(0.15, 20);
  ring.rotateX(Math.PI);
  const copper = fading(new THREE.MeshStandardMaterial({ color: 0xd8b46a, metalness: 1, roughness: 0.3, side: THREE.DoubleSide }));
  pads.forEach(([x, y]) => {
    const f = new THREE.Mesh(fillet, solder); f.position.set(x, y, boardTop + 0.05); g.add(f);
    const r = new THREE.Mesh(ring, copper); r.position.set(x, y, boardTop - 0.283); g.add(r);
    const u = new THREE.Mesh(under, solder); u.position.set(x, y, boardTop - 0.36); g.add(u);
  });
  anchor(g, 'trace', 4.6, -(ROW + 0.42 + 3 * 0.165), boardTop + 0.01);
  anchor(g, 'board', 5.7, W / 2 + 2.9, boardTop + 0.01);
  anchor(g, 'die', -0.15, 0.16, H / 2 + 0.07);
  anchor(g, 'wire', 0.32, -0.4, H / 2 + 0.08);
  anchor(g, 'legs', -3.3, -ROW, -0.3);
  anchor(g, 'package', 3.2, 0.6, H / 2);
  g.rotation.set(-0.95, 0, 0.32);
  g.scale.setScalar(0.74);
  g.position.y = 0.6;
  return g;
}

// The Z80's die laid flat, its functional blocks labelled (positions follow z80DieTexture's layout)
let dieTex = null;
function z80DieModel() {
  const g = new THREE.Group();
  dieTex ||= z80DieTexture();
  const W = 8, H = 8.6;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), fading(new THREE.MeshPhysicalMaterial({
    map: dieTex, metalness: 0.45, roughness: 0.32, iridescence: 0.6, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 700], envMapIntensity: 1.3,
  })));
  g.add(slab);
  // each label at the centre of its block in the texture
  for (const [key, [bx, by, bw, bh]] of Object.entries(Z80_BLOCKS)) {
    if (key === 'select') continue;
    anchor(g, key, ((bx + bw / 2) / 2048 - 0.5) * W, (0.5 - (by + bh / 2) / 2200) * H, 0.08);
  }
  // bond wires leaving the pads at the edge
  const wireMat = fading(new THREE.MeshStandardMaterial({ color: 0xf2cf6a, metalness: 1, roughness: 0.2 }));
  for (let i = 0; i < 10; i++) for (const side of [-1, 1]) {
    const x = (190 + i * 175 + 35) / 2048 * W - W / 2, y = side * (H / 2 - 0.12);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, y, 0.07), new THREE.Vector3(x, y + side * 0.5, 0.6), new THREE.Vector3(x, y + side * 1.2, -0.1)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.025, 5), wireMat));
  }
  g.rotation.set(-0.35, 0, 0.08);
  g.scale.setScalar(0.72);
  g.position.y = 1.7;
  return g;
}

// One NMOS transistor cut open, about 10 µm across: p-type silicon with two n-type wells (source and drain),
// a thin glassy gate oxide, a polysilicon gate, aluminium wiring. It switches on and off; when on, electrons
// stream through the channel under the gate.
function transistorModel() {
  const g = new THREE.Group();
  const mat = (color, extra = {}) => fading(new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, ...extra }));
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  box(9, 2.6, 4, mat(0x5d6b85, { metalness: 0.2 }), 0, -1.3, 0);                       // p-type substrate
  box(2.4, 0.7, 3.4, mat(0x4f8fd8, { metalness: 0.2, emissive: 0x0a2550 }), -2.5, -0.33, 0);   // source (n-type)
  box(2.4, 0.7, 3.4, mat(0x4f8fd8, { metalness: 0.2, emissive: 0x0a2550 }), 2.5, -0.33, 0);    // drain (n-type)
  box(1.0, 0.9, 4, mat(0xdfe8f4, { transmission: 0.6, roughness: 0.15, thickness: 1 }), -4.0, 0.45, 0);  // field oxide
  box(1.0, 0.9, 4, mat(0xdfe8f4, { transmission: 0.6, roughness: 0.15, thickness: 1 }), 4.0, 0.45, 0);
  box(3.0, 0.12, 3.4, mat(0xe8f0ff, { transmission: 0.7, roughness: 0.05, thickness: 0.4 }), 0, 0.06, 0);      // gate oxide
  box(2.8, 0.75, 3.2, mat(0xb4613a, { roughness: 0.6 }), 0, 0.5, 0);                    // polysilicon gate
  const al = mat(0xc8ced6, { metalness: 0.55, roughness: 0.35, envMapIntensity: 1.4 }); // matte enough to read as metal, not a black mirror
  box(0.5, 1.5, 0.6, al, -2.5, 0.75, 0); box(0.5, 1.5, 0.6, al, 2.5, 0.75, 0); box(0.5, 0.7, 0.6, al, 0, 1.2, 0);  // contacts
  box(3.0, 0.3, 0.9, al, -3.4, 1.65, 0); box(3.0, 0.3, 0.9, al, 3.4, 1.65, 0); box(0.9, 0.3, 4.2, al, 0, 1.65, 0); // wires
  // the channel: glows when the gate is on, with electrons flowing source to drain
  const channel = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 3.3), fading(new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0 })));
  channel.position.y = -0.03;
  g.add(channel);
  const N = 160, eb = buffer(), col = new THREE.Color(0x9fd4ff);
  for (let i = 0; i < N; i++) push(eb, new THREE.Vector3(), new THREE.Vector3(), col, 1.4);
  const electrons = pointsFrom(eb, cloudMaterial({ size: 0.16, rate: 0.6 }));
  const seeds = Array.from({ length: N }, () => [Math.random(), (Math.random() - 0.5) * 3, Math.random() * 0.12]);
  g.add(electrons);
  g.userData.animate = t => {
    const on = Math.sin(t * 1.3) > 0;                 // switching, a little over once a second
    const k = THREE.MathUtils.clamp(Math.sin(t * 1.3) * 3, 0, 1);
    channel.material.opacity = 0.55 * k * (channel.material.userData.fadeLevel ?? 1);
    const pos = electrons.geometry.attributes.position, alt = electrons.geometry.attributes.aAlt;
    seeds.forEach(([s0, z, dy], i) => {
      const u = ((s0 + t * 0.35) % 1);
      const x = on ? -3.4 + u * 6.8 : -3.4 + s0 * 1.6 + (s0 > 0.5 ? 5.2 : 0); // flowing, or waiting in the wells
      const y = on && Math.abs(x) < 1.4 ? -0.05 - dy : -0.35 - dy * 2;
      pos.setXYZ(i, x, y, z); alt.setXYZ(i, x, y, z);
    });
    pos.needsUpdate = alt.needsUpdate = true;
    electrons.material.uniforms.uOpacity.value = 0.95 * (channel.material.userData.fadeLevel ?? 1);
  };
  anchor(g, 'wire', 3.6, 1.85, 0.3);
  anchor(g, 'gate', -0.6, 0.9, 1.6);
  anchor(g, 'oxide', 1.4, 0.06, 1.7);
  anchor(g, 'source', -2.8, -0.3, 1.75);
  anchor(g, 'substrate', 2.6, -2.0, 2.05);
  g.rotation.set(0.42, -0.55, 0);
  g.scale.setScalar(0.78);
  return g;
}

function crema() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  const grd = x.createRadialGradient(256, 256, 20, 256, 256, 256);
  grd.addColorStop(0, '#7a4a26'); grd.addColorStop(0.55, '#a8703f'); grd.addColorStop(0.85, '#c79a62'); grd.addColorStop(1, '#5a3218');
  x.fillStyle = grd; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { // bubbles and swirls in the foam
    const a = Math.random() * 6.3, r = Math.sqrt(Math.random()) * 250;
    x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,235,200' : '60,30,12'},${Math.random() * 0.18})`;
    x.beginPath(); x.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, Math.random() * 3.5, 0, 6.3); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function coffeeCup() {
  const g = new THREE.Group();
  const ceramic = fading(new THREE.MeshPhysicalMaterial({ color: 0xf5f3ee, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3 }));
  const profile = [[0, -2], [1.7, -2], [1.85, -1.85], [2.3, -1.2], [2.6, 1.6], [2.62, 1.72], [2.52, 1.76], [2.42, 1.62], [2.12, -1.2], [1.5, -1.55], [0, -1.6]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), ceramic);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.2, 20, 64, Math.PI * 1.25), ceramic);
  handle.position.set(2.6, 0.15, 0);
  handle.rotation.z = -Math.PI * 0.62;
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(2.38, 64), fading(new THREE.MeshPhysicalMaterial({ map: crema(), roughness: 0.4, clearcoat: 0.4, envMapIntensity: 0.5 })));
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 1.3;
  const saucerProfile = [[0, -2.25], [3.6, -2.25], [4.3, -1.95], [4.4, -1.85], [3.5, -2.0], [2.1, -2.08], [0, -2.08]].map(([x, y]) => new THREE.Vector2(x, y));
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerProfile, 96), ceramic);
  const spoonMat = fading(new THREE.MeshPhysicalMaterial({ color: 0xd8dce2, metalness: 1, roughness: 0.15 }));
  const spoon = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), spoonMat);
  bowl.scale.set(1, 0.25, 1.5);
  bowl.rotation.x = Math.PI;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 2.6), spoonMat);
  shaft.position.z = 1.8;
  spoon.add(bowl, shaft);
  spoon.position.set(3.2, -1.95, 0.6);
  spoon.rotation.y = 0.7;
  g.add(saucer, cup, handle, coffee, spoon);
  // steam
  const b = buffer();
  const v = new THREE.Vector3(), w = new THREE.Vector3(), c = new THREE.Color(0xdfe9ff);
  for (let i = 0; i < 1600; i++) {
    const y = 1.5 + Math.random() * 3.5, s = Math.sin(y * 1.6 + Math.random()) * 0.5;
    v.set(s + (Math.random() - 0.5) * 1.2, y, (Math.random() - 0.5) * 1.2);
    w.copy(v).add(randomDir(new THREE.Vector3()).multiplyScalar(0.3));
    push(b, v, w, c, 1 + Math.random() * 2);
  }
  const steam = pointsFrom(b, cloudMaterial({ size: 0.1, rate: 0.15 }));
  steam.material.uniforms.uOpacity.value = 0.3;
  steam.material.userData.baseOpacity = 0.3;
  g.add(steam);
  anchor(g, 'caffeine', 0.7, 1.32, 0.5);
  anchor(g, 'water', -0.9, 1.32, -0.4);
  anchor(g, 'cup', -2.45, 0.2, 0.9);
  anchor(g, 'spoon', 3.6, -1.95, 1.4);
  g.rotation.x = 0.45;
  g.scale.setScalar(0.85);
  g.position.y = -0.2;
  return g;
}

// A dark photo studio behind every object: opaque, so glass and gems have real light bands to bend
function studioBackdrop() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  const grd = x.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#05070d'); grd.addColorStop(0.55, '#0b1222'); grd.addColorStop(1, '#03050a');
  x.fillStyle = grd; x.fillRect(0, 0, 1024, 512);
  const glow = (cx, cy, rx, ry, col) => {
    const r = x.createRadialGradient(cx, cy, 0, cx, cy, rx);
    r.addColorStop(0, col); r.addColorStop(1, 'rgba(0,0,0,0)');
    x.save(); x.translate(cx, cy); x.scale(1, ry / rx); x.translate(-cx, -cy);
    x.fillStyle = r; x.fillRect(cx - rx, cy - rx, rx * 2, rx * 2); x.restore();
  };
  glow(512, 150, 380, 120, 'rgba(160,190,240,0.35)');
  glow(180, 260, 90, 220, 'rgba(255,255,255,0.5)');
  glow(860, 250, 90, 220, 'rgba(255,255,255,0.45)');
  glow(700, 380, 160, 60, 'rgba(255,190,120,0.3)');
  glow(330, 400, 160, 60, 'rgba(120,170,255,0.3)');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  const m = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), fading(new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false })));
  m.rotation.y = Math.PI;
  return m;
}

// ---------------------------------------------------------------- the journeys

// size: the real object's width in metres; count: what it holds, to one significant figure
export const THINGS = [
  { key: 'snowflake', name: 'Snowflake', title: 'A snowflake', child: 'ice', icon: 'snowflake',
    note: 'Why six arms? Zoom down to find out' },
  { key: 'salt', name: 'Grain of salt', title: 'A grain of salt', child: 'salt', size: 5e-4, model: saltGrains, formula: 'NaCl', icon: 'salt',
    note: 'Why is every grain a little cube?',
    blurb: 'Look closely at table salt and every grain is a tiny cube. Zoom in to see why: sodium and chloride ions stacked in a cubic grid, each held by the pull of its six neighbours.',
    stats: [['Across', '0.5', 'mm'], ['Shape', 'Cube', ''], ['Ions in it', '6 × 10¹⁸', ''], ['Between ions', '0.28', 'nm']] },
  { key: 'diamond', name: 'Diamond', title: 'A diamond', child: 'diamond', size: 6.5e-3, model: diamondGem, formula: 'C', icon: 'diamond',
    note: 'Why is it the hardest thing in nature?',
    blurb: 'The hardest natural material, and nothing but carbon. Inside, every atom grips four others in a rigid web of tetrahedra running in every direction, with bonds of equal strength in every direction.',
    stats: [['Across', '6.5', 'mm'], ['Weight', '1', 'carat'], ['Carbon atoms', '10²²', ''], ['Bonds each', '4', '']] },
  { key: 'quartz', name: 'Quartz crystal', title: 'A quartz crystal', child: 'quartz', size: 3e-2, model: quartzCluster, formula: 'SiO₂', icon: 'quartz',
    note: 'Six-sided columns, grown by atoms',
    blurb: 'Quartz grows as six-sided columns with pointed tips, and it is the main grain in most beach sand. The outside follows the inside: silicon and oxygen tetrahedra spiralling round a three-fold axis. The points grow from the host rock below, out of a crust of tiny crystals called druse.',
    stats: [['Across', '3', 'cm'], ['Sides', '6', ''], ['Silicon–oxygen', '0.16', 'nm'], ['In watches', '32,768', 'Hz']] },
  { key: 'pencil', name: 'Pencil lead', title: 'Pencil lead', child: 'graphene', size: 2e-2, model: pencil, formula: 'C', icon: 'pencil',
    parts: [
      { key: 'graphite', label: 'Graphite tip', child: 'graphene', note: 'Sheets of carbon hexagons; one alone is graphene.' },
      { key: 'wood', label: 'Cedar wood', child: 'glucose', note: 'Wood is about half cellulose: long chains of glucose.' },
      { key: 'ferrule', label: 'Metal band', child: 'aluminium', note: 'Usually aluminium.' },
      { key: 'eraser', label: 'Eraser', child: 'isoprene', note: 'Rubber: natural rubber is chains of isoprene.' },
    ],
    note: 'There is no lead in it',
    blurb: 'Pencil "lead" is graphite mixed with clay: carbon in flat sheets of hexagons, stacked loosely. Writing peels sheets off onto the paper. A single sheet on its own is graphene, one atom thick.',
    stats: [['Across', '2', 'cm'], ['Lead in it', '0', ''], ['Sheet spacing', '0.34', 'nm'], ['Carbon–carbon', '0.14', 'nm']] },
  { key: 'gold', name: 'Gold ring', title: 'A gold ring', child: 'gold', size: 2e-2, model: goldRing, formula: 'Au, Ag, Cu', icon: 'ring',
    made: [['gold', 75], ['silver', 13], ['copper', 12]], madeNote: '18-carat gold: 18 parts in 24 are gold, the rest silver and copper for hardness and colour.',
    note: 'Why gold is yellow: Einstein',
    blurb: 'Gold atoms pack together the densest way spheres can, each touching twelve neighbours. Its colour comes from relativity: the inner electrons move so fast that gold absorbs blue light and reflects the rest.',
    stats: [['Across', '2', 'cm'], ['Neighbours each', '12', ''], ['Gold atoms', '10²²', ''], ['Tarnish', 'Hardly ever', '']] },
  { key: 'chip', name: 'Computer chip', title: 'A computer chip', child: 'silicon', size: 5.2e-2, model: z80Chip, formula: 'Si', icon: 'dip',
    note: 'The Z80 of 1976: a computer brain you could almost count',
    blurb: 'Zilog’s Z80, designed by Federico Faggin and Masatoshi Shima and launched in 1976, ran the ZX Spectrum, the TRS-80 and MSX computers; the Game Boy’s processor is a close relative. Its whole brain is about 8,500 transistors, drawn on the die in the window.',
    stats: [['Year', '1976', ''], ['Transistors', '8,500', ''], ['Clock', '2.5', 'MHz'], ['Pins', '40', '']],
    compare: 'A modern processor has over a million times as many transistors, and runs more than a thousand times faster.',
    parts: [
      { key: 'die', label: 'Silicon die', thing: 'z80-die', note: 'Every transistor of the Z80, on one sliver of silicon. Zoom in to see its parts.' },
      { key: 'wire', label: 'Gold bond wire', child: 'gold', note: 'Forty of them, each finer than a hair.' },
      { key: 'legs', label: 'Legs', child: 'copper', note: 'Usually a tin-plated copper alloy (some packages used an iron–nickel alloy), 2.54 mm apart.' },
      { key: 'package', label: 'Black package', made: [['quartz', 80], ['epoxy', 20]], note: 'Epoxy resin filled with silica, about four fifths silica by weight.' },
      { key: 'trace', label: 'Copper trace', child: 'copper', note: 'The board’s wiring, carrying signals to and from each pin.' },
      { key: 'board', label: 'Circuit board', made: [['quartz', 60], ['epoxy', 40]], note: 'FR-4: woven glass fibre (mostly silica, like quartz but disordered) set in epoxy resin.' },
    ] },
  { key: 'coffee', name: 'Cup of coffee', title: 'A cup of coffee', child: 'caffeine', size: 8e-2, model: coffeeCup, formula: 'C₈H₁₀N₄O₂', icon: 'cup',
    parts: [
      { key: 'caffeine', label: 'Caffeine', child: 'caffeine', note: 'About 95 mg in the cup.' },
      { key: 'water', label: 'Water', child: 'water', note: 'Ninety-eight per cent of it.' },
      { key: 'cup', label: 'Porcelain cup', child: 'quartz', note: 'Fired clay: mostly silicon and oxygen, like quartz.' },
      { key: 'spoon', label: 'Steel spoon', made: [['iron', 72], ['chromium', 18], ['nickel', 8]], note: '18/8 stainless steel: 18% chromium, 8% nickel, the rest iron.' },
    ],
    note: 'Where the wake-up comes from',
    blurb: 'A cup holds about 95 milligrams of caffeine: three hundred billion billion molecules, each the right shape to slip into the brain’s adenosine receptors and block the signal to feel tired.',
    stats: [['Across', '8', 'cm'], ['Caffeine', '95', 'mg'], ['Molecules', '3 × 10²⁰', ''], ['Peak in blood', '45', 'min']] },
];
// levels inside things, reached only by zooming in
const BLOCK = note => ({ thing: 'nmos', note });
export const INNER = [
  { key: 'z80-die', name: 'Z80 die', title: 'The Z80 die', size: 3.55e-3, model: z80DieModel, formula: 'Si', inner: true,
    note: 'Every part of the processor, on one sliver of silicon',
    blurb: 'The whole processor on a sliver of silicon about the size of a lentil. Control sits above; the datapath (incrementer, registers, ALU) runs along the bottom, every block one bit-slice wide per bit. Together they fetch an instruction, decode it and carry it out, a few hundred thousand times a second.',
    source: 'Datapath layout after Ken Shirriff’s reverse engineering of Z80 die photos (righto.com); the control area is drawn schematically.',
    stats: [['Transistors', '8,500', ''], ['Die', '3.55 × 3.35', 'mm'], ['Instructions', '~158', 'types'], ['Bond pads', '40', '']],
    parts: [
      { key: 'pla', label: 'Decode PLA', ...BLOCK('A regular grid of transistor sites that turns each instruction byte into the control signals it needs.') },
      { key: 'control', label: 'Control logic', ...BLOCK('Random logic that steps each instruction through its machine cycles: fetch, read memory, write back.') },
      { key: 'timing', label: 'Timing and interrupts', ...BLOCK('Keeps everything in step with the clock and answers interrupts and bus requests.') },
      { key: 'incdec', label: 'Incrementer', ...BLOCK('In the lower-left corner: a 16-bit circuit that steps the program counter and stack pointer up or down, next to PC and IR.') },
      { key: 'registers', label: 'Register file', ...BLOCK('Each register a vertical column of 16 cells, bit 0 at the top. AF, BC, DE and HL each have two copies, and either copy can be the main or the alternate.') },
      { key: 'alu', label: 'ALU', ...BLOCK('Adds, subtracts and compares through four identical slices, so an 8-bit sum takes two passes.') },
    ] },
  { key: 'nmos', name: 'Transistor', title: 'One transistor', size: 1.2e-5, model: transistorModel, formula: 'Si, SiO₂, Al', inner: true,
    note: 'One of the Z80’s 8,500 switches, cut open',
    blurb: 'A transistor is a switch with no moving parts. A voltage on the gate pulls electrons up into a thin channel under the oxide, and current flows from source to drain; take the voltage away and it stops. Watch it switch.',
    stats: [['Across', '~10', 'µm'], ['In a Z80', '8,500', ''], ['Switching', 'Up to 2.5', 'million /s'], ['Gate oxide', '~0.1', 'µm']],
    compare: 'A modern transistor is over a hundred times narrower, a few hundred atoms across.',
    parts: [
      { key: 'wire', label: 'Aluminium wiring', child: 'aluminium', note: 'Connects the transistors to each other.' },
      { key: 'gate', label: 'Polysilicon gate', child: 'silicon', note: 'Silicon in many tiny crystals, doped to conduct. Voltage here works the switch.' },
      { key: 'oxide', label: 'Gate oxide', child: 'quartz', note: 'Silicon dioxide, the same atoms as quartz, as a glass about a ten-thousandth of a millimetre thick.' },
      { key: 'source', label: 'Source and drain', child: 'silicon', note: 'Silicon doped with phosphorus, so it has spare electrons (n-type).' },
      { key: 'substrate', label: 'Substrate', child: 'silicon', note: 'Silicon doped with boron, short of electrons (p-type).' },
    ] },
];
export const THING = Object.fromEntries([...THINGS, ...INNER].map(t => [t.key, t]));

// which elements a part is made of, following mixtures and deeper levels down to the library entries
export function partElements(part, lookup) {
  const keys = part.made ? part.made.map(m => m[0]) : part.child ? [part.child] : [];
  const out = new Set();
  keys.forEach(k => lookup(k)?.atoms.forEach(a => out.add(a[0])));
  if (part.thing) (THING[part.thing].parts || []).forEach(sub => partElements(sub, lookup).forEach(e => out.add(e)));
  const order = ['C', 'H'];
  return [...out].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99) || a.localeCompare(b));
}
const badgeColor = sym => { const c = sym === 'C' ? 0x9aa3b0 : element(sym).color; return `#${c.toString(16).padStart(6, '0')}`; };
export const elementBadges = syms => syms.map(sym => `<b class="el-badge" style="--c:${badgeColor(sym)}">${sym}</b>`).join('');

export function thingLevel(thing, onPart, lookup = () => null) {
  const group = new THREE.Group();
  const model = thing.model();
  group.add(studioBackdrop(), model);
  // composite things: a labelled hotspot on each part, which dives into that part's material
  const parts = thing.parts || [{ key: 'whole', label: thing.name, child: thing.child, made: thing.made, note: thing.madeNote || '' }];
  const hotspots = [];
  (thing.parts || []).forEach((part, i) => {
    const at = model.userData.anchors?.[part.key];
    if (!at) return;
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'hotspot';
    // the dot takes the main element's colour; badges say what the part is made of
    const els = partElements(part, lookup);
    const main = part.made ? lookup(part.made[0][0])?.atoms[0][0] : els.find(e => e !== 'H') || els[0];
    el.style.setProperty('--c', main ? badgeColor(main) : '#f2b45a');
    el.innerHTML = `<i></i><span>${part.label}</span><span class="badges">${elementBadges(els.slice(0, 5))}${els.length > 5 ? '<b class="el-badge more">+</b>' : ''}</span>`;
    el.title = part.note;
    el.addEventListener('click', e => { e.stopPropagation(); onPart?.(i); });
    const o = new CSS2DObject(el);
    at.add(o);
    hotspots.push(el);
  });
  return {
    kind: 'thing', thing, parts, group, radius: 5.2, metresPerUnit: thing.size / 10, sizeMetres: thing.size,
    viewDir: new THREE.Vector3(0.15, 0.12, 1),
    // a slow sway; barely any for things with parts, so their hotspots stay easy to click
    update(t) { tick(group, t); model.userData.animate?.(t); if (!thing.inner) model.rotation.y = Math.sin(t * 0.25) * (thing.parts ? 0.08 : 0.5); },
    fade(f) { fadeMaterials(group, f); group.traverse(o => { if (o.material) o.material.userData.fadeLevel = f; }); hotspots.forEach(h => { h.style.opacity = f; h.style.visibility = f > 0.05 ? '' : 'hidden'; }); },
    // where part i sits, in the level's own coordinates (the focus for a dive into it)
    partPosition(i) {
      const at = model.userData.anchors?.[parts[i]?.key];
      if (!at) return new THREE.Vector3();
      group.updateMatrixWorld(true);
      return group.worldToLocal(at.getWorldPosition(new THREE.Vector3()));
    },
  };
}

// Small icons for the library and the landing page
export const THING_ICONS = {
  snowflake: '<g stroke="#cfe8ff" stroke-width="1.6" stroke-linecap="round" fill="none">' + [0, 60, 120, 180, 240, 300].map(d => `<g transform="rotate(${d} 22 22)"><line x1="22" y1="22" x2="22" y2="5"/><line x1="22" y1="11" x2="17.5" y2="7.5"/><line x1="22" y1="11" x2="26.5" y2="7.5"/></g>`).join('') + '</g>',
  salt: '<g fill="#eef4ff" stroke="#9fb6d8" stroke-width="1"><path d="M10 18l8-4 8 4v9l-8 4-8-4z"/><path d="M10 18l8 4 8-4M18 22v9"/><path d="M26 28l5-2.5 5 2.5v5.5l-5 2.5-5-2.5z" opacity=".8"/></g>',
  diamond: '<g fill="none" stroke="#dff1ff" stroke-width="1.5" stroke-linejoin="round"><path d="M8 17l6-7h16l6 7-14 18z"/><path d="M8 17h28M14 10l4 7 4-7 4 7 4-7M18 17l4 18 4-18"/></g>',
  quartz: '<g fill="rgba(240,236,255,.25)" stroke="#e8e2ff" stroke-width="1.4" stroke-linejoin="round"><path d="M18 38V16l4-8 4 8v22z"/><path d="M11 38V22l3-6 3 6v16z"/><path d="M27 38V24l3-5 3 5v14z"/></g>',
  pencil: '<g stroke-linejoin="round"><path d="M10 34l3-9 15-15 6 6-15 15z" fill="#f2b020"/><path d="M10 34l3-9 6 6z" fill="#e0b483"/><path d="M10 34l1.2-3.6 2.4 2.4z" fill="#3a3d42"/></g>',
  ring: '<ellipse cx="22" cy="24" rx="12" ry="9" fill="none" stroke="#ffc94a" stroke-width="3.5"/><path d="M18 14l4-5 4 5-4 3z" fill="#dff1ff"/>',
  chip: '<rect x="12" y="12" width="20" height="20" rx="2" fill="#232a38" stroke="#7cc4ff"/><path d="M16 17h8v5h4M16 26h6" stroke="#7cc4ff" fill="none"/><g stroke="#e8c070" stroke-width="1.6">' + [15, 20, 25, 30].map(v => `<line x1="${v - 1}" y1="8" x2="${v - 1}" y2="12"/><line x1="${v - 1}" y1="32" x2="${v - 1}" y2="36"/><line x1="8" y1="${v - 1}" x2="12" y2="${v - 1}"/><line x1="32" y1="${v - 1}" x2="36" y2="${v - 1}"/>`).join('') + '</g>',
  dip: '<rect x="8" y="15" width="28" height="14" rx="1.5" fill="#1d1f24" stroke="#5b6578"/><path d="M8 20.5a1.6 1.6 0 0 1 0 3" fill="none" stroke="#5b6578"/><g stroke="#d4d8de" stroke-width="1.6">' + [11, 15, 19, 23, 27, 31].map(v => `<line x1="${v}" y1="11" x2="${v}" y2="15"/><line x1="${v}" y1="29" x2="${v}" y2="33"/>`).join('') + '</g><rect x="19" y="19" width="6" height="6" fill="#6b7a4e"/>',
  cup: '<path d="M11 18h18l-2 15a3 3 0 0 1-3 2h-8a3 3 0 0 1-3-2z" fill="#f3f1ec"/><path d="M29 21h2a3.5 3.5 0 0 1 0 7h-2.5" fill="none" stroke="#f3f1ec" stroke-width="2"/><ellipse cx="20" cy="18.5" rx="9" ry="1.6" fill="#2a160b"/><path d="M16 14c-1.5-2 1.5-3 0-5M21 14c-1.5-2 1.5-3 0-5M26 14c-1.5-2 1.5-3 0-5" stroke="#9fb6d8" fill="none" stroke-linecap="round"/>',
};
