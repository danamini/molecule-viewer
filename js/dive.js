// The levels below the molecule: one atom's orbitals, its nucleus, and a nucleon's quarks.
// Each builder returns { group, radius, metresPerUnit, update(t), fade(f) }: radius in scene units for
// framing, metresPerUnit for the scale bar.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { element } from './elements.js';
import { atomOrbitals, orbitalPoints, cloudMaterial, pointsFrom, buffer, push, gauss, randomDir } from './cloud.js';

const fadeMaterials = (group, f) => group.traverse(o => {
  const m = o.material;
  if (!m) return;
  if (m.uniforms?.uOpacity) m.uniforms.uOpacity.value = f * (m.userData.baseOpacity ?? 1);
  else if (m.userData.fades) { m.transparent = true; m.opacity = f * (m.userData.baseOpacity ?? 1); m.depthWrite = f > 0.98; }
});
const tick = (group, t) => group.traverse(o => { if (o.material?.uniforms?.uTime) o.material.uniforms.uTime.value = t; });

// ---------------------------------------------------------------- atom

export function atomLevel(symbol) {
  const data = atomOrbitals(symbol);
  const group = new THREE.Group();
  const target = 6; // outermost mean radius maps to this many scene units
  const scale = target / Math.max(0.05, data.outer);
  for (const sub of data.subshells) {
    sub.points = orbitalPoints(sub, scale);
    group.add(sub.points);
  }
  // the nucleus, drawn far too big to be honest: at true scale it would be a hundred-thousandth of this
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff1d6 }));
  core.material.userData.fades = true;
  group.add(core);
  const glow = pointsFrom((() => {
    const b = buffer();
    const c = new THREE.Color(0xffd9a0);
    for (let i = 0; i < 40; i++) push(b, new THREE.Vector3(), new THREE.Vector3(), c, 6);
    return b;
  })(), cloudMaterial({ size: 0.12, rate: 0.5 }));
  group.add(glow);
  // at true scale the nucleus shrinks to its real radius (1.2 fm × A^1/3), far below a pixel; a marker
  // shows where it is
  const metresPerUnit = 1e-10 / scale; // one Å is `scale` units
  const trueRadius = 1.2e-15 * Math.cbrt(Math.max(1, data.el.A)) / metresPerUnit;
  const marker = document.createElement('div');
  marker.className = 'nucleus-marker';
  marker.innerHTML = '<i></i><span>The nucleus is here, drawn to scale</span>';
  const markerObj = new CSS2DObject(marker);
  markerObj.visible = false;
  group.add(markerObj);
  return {
    kind: 'atom', data, group, radius: target * 1.6, metresPerUnit, trueScale: false,
    nucleusFraction: trueRadius / (data.outer * scale), // nucleus radius over the valence shell's mean radius
    setTrueScale(on) {
      this.trueScale = on;
      core.scale.setScalar(on ? trueRadius / 0.09 : 1);
      glow.visible = !on;
      markerObj.visible = on;
    },
    update: t => tick(group, t),
    fade(f) { fadeMaterials(group, f); marker.style.opacity = f; },
  };
}

// ---------------------------------------------------------------- nucleus

const NUCLEON = new THREE.SphereGeometry(1, 40, 28);
function nucleonMaterial(color, emissive) {
  const m = new THREE.MeshPhysicalMaterial({ color, emissive, emissiveIntensity: 0.5, roughness: 0.4, envMapIntensity: 0.35,
    clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5) });
  m.userData.fades = true;
  return m;
}

// Z protons and A - Z neutrons packed into a ball by a few hundred rounds of relaxation
export function nucleusLevel(symbol) {
  const el = element(symbol);
  const Z = el.Z, A = Math.max(el.A, Z), N = A - Z;
  const r0 = 1; // nucleon radius in scene units
  const R = 1.08 * r0 * Math.cbrt(A);
  const pos = [];
  for (let i = 0; i < A; i++) pos.push(randomDir(new THREE.Vector3()).multiplyScalar(R * Math.cbrt(Math.random())));
  const d = new THREE.Vector3();
  for (let iter = 0; iter < 240; iter++) {
    for (let i = 0; i < A; i++) {
      for (let j = i + 1; j < A; j++) {
        d.subVectors(pos[i], pos[j]);
        const dist = d.length() || 1e-3;
        const overlap = 2 * r0 * 0.96 - dist;
        if (overlap > 0) {
          d.multiplyScalar((overlap / dist) * 0.5);
          pos[i].add(d);
          pos[j].sub(d);
        }
      }
      pos[i].multiplyScalar(0.985); // the strong force: everything pulled inward
    }
  }
  // spread the protons evenly through the ball rather than leaving them where they fell
  const order = pos.map((p, i) => i).sort(() => Math.random() - 0.5);
  const isProton = new Array(A).fill(false);
  order.slice(0, Z).forEach(i => { isProton[i] = true; });
  const group = new THREE.Group();
  const pm = nucleonMaterial(0xe8432a, 0x4a0c04), nm = nucleonMaterial(0x6f8fc4, 0x0a1430);
  const meshes = [];
  pos.forEach((p, i) => {
    const m = new THREE.Mesh(NUCLEON, isProton[i] ? pm : nm);
    m.position.copy(p);
    m.scale.setScalar(r0 * 0.98);
    m.userData = { nucleon: isProton[i] ? 'proton' : 'neutron', home: p.clone(), phase: Math.random() * 6.28 };
    group.add(m);
    meshes.push(m);
  });
  const fm = 0.84e-15; // proton charge radius, metres; one nucleon radius in scene units
  let radius = 0;
  pos.forEach(p => { radius = Math.max(radius, p.length() + r0); });
  return {
    kind: 'nucleus', group, radius: radius * 1.55, protons: Z, neutrons: N, A, meshes,
    diameterFm: 2 * 1.2 * Math.cbrt(A),
    metresPerUnit: fm / r0,
    update: t => meshes.forEach(m => {
      const w = 0.04;
      m.position.set(m.userData.home.x + Math.sin(t * 2.1 + m.userData.phase) * w,
        m.userData.home.y + Math.sin(t * 1.7 + m.userData.phase * 1.3) * w,
        m.userData.home.z + Math.sin(t * 2.5 + m.userData.phase * 0.7) * w);
    }),
    fade: f => fadeMaterials(group, f),
  };
}

// ---------------------------------------------------------------- nucleon

// Three valence quarks (two up and a down for a proton, the reverse for a neutron) whose colour charges
// keep swapping as they trade gluons, inside a seething cloud of short-lived quark-antiquark pairs.
const QUARK_COLOURS = [0xff4060, 0x40ff8a, 0x4f8bff];
export function nucleonLevel(kind = 'proton') {
  const flavours = kind === 'proton' ? ['up', 'up', 'down'] : ['up', 'down', 'down'];
  const group = new THREE.Group();
  const quarks = flavours.map((flavour, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: QUARK_COLOURS[i] });
    mat.userData.fades = true;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 20), mat);
    m.userData = { flavour, phase: i * 2.094 };
    group.add(m);
    const halo = pointsFrom((() => {
      const b = buffer();
      const c = new THREE.Color(1, 1, 1);
      for (let k = 0; k < 30; k++) push(b, new THREE.Vector3(), new THREE.Vector3(), c, 9);
      return b;
    })(), cloudMaterial({ size: 0.12, rate: 0.6 }));
    halo.material.uniforms.uOpacity.value = 0.25;
    halo.material.userData.baseOpacity = 0.25;
    m.add(halo);
    return m;
  });
  // the sea: a dense, fast-flickering cloud filling the nucleon
  const sea = buffer();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < 12000; i++) {
    const r = 3.4 * Math.cbrt(Math.random()) * (0.75 + 0.25 * Math.random());
    randomDir(a).multiplyScalar(r);
    randomDir(b).multiplyScalar(3.4 * Math.cbrt(Math.random()));
    c.setHex(QUARK_COLOURS[i % 3]).lerp(new THREE.Color(0x8fa6d8), 0.45);
    push(sea, a, b, c, 0.8 + Math.random() * 0.6);
  }
  const seaPts = pointsFrom(sea, cloudMaterial({ size: 0.07, rate: 0.9, scatter: 20 }));
  seaPts.material.uniforms.uOpacity.value = 0.32;
  seaPts.material.userData.baseOpacity = 0.32;
  group.add(seaPts);
  // gluon flux tubes between the quarks: wavy lines of points, rebuilt each frame
  const tubeCount = 3 * 120; // three tubes of 120 points
  const tubeGeo = new THREE.BufferGeometry();
  tubeGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(tubeCount * 3), 3));
  tubeGeo.setAttribute('aAlt', new THREE.Float32BufferAttribute(new Float32Array(tubeCount * 3), 3));
  tubeGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(new Float32Array(tubeCount * 3).fill(1), 3));
  tubeGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(Float32Array.from({ length: tubeCount }, Math.random), 1));
  tubeGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(new Float32Array(tubeCount).fill(2.6), 1));
  tubeGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
  const tubes = new THREE.Points(tubeGeo, cloudMaterial({ size: 0.06, rate: 2.5 }));
  tubes.material.uniforms.uOpacity.value = 0.9;
  tubes.material.userData.baseOpacity = 0.9;
  group.add(tubes);
  const colour = new THREE.Color();
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pt = new THREE.Vector3();
  return {
    kind: 'nucleon', nucleon: kind, flavours, group, radius: 5.2, quarks,
    metresPerUnit: 0.84e-15 / 3.4,
    update: t => {
      tick(group, t);
      quarks.forEach((q, i) => {
        const ph = t * 0.55 + q.userData.phase;
        q.position.set(Math.cos(ph) * 1.5 + Math.sin(t * 1.3 + i) * 0.35, Math.sin(ph * 1.2) * 1.1, Math.sin(ph) * 1.5);
        // colour charge passes round the three: it is the swap, not any one colour, that is real
        const k = Math.floor(t * 0.7 + i) % 3;
        q.material.color.setHex(QUARK_COLOURS[k]);
      });
      const pos = tubeGeo.attributes.position, alt = tubeGeo.attributes.aAlt, col = tubeGeo.attributes.aColor;
      for (let e = 0; e < 3; e++) {
        const A = quarks[e].position, B = quarks[(e + 1) % 3].position;
        for (let s = 0; s < 120; s++) {
          const u = s / 119, idx = e * 120 + s;
          pt.lerpVectors(A, B, u);
          const wob = Math.sin(u * Math.PI) * 0.35;
          pa.set(Math.sin(u * 19 + t * 9 + e) * wob, Math.cos(u * 23 - t * 7 + e) * wob, Math.sin(u * 17 + t * 11) * wob).add(pt);
          pb.set(Math.cos(u * 21 - t * 8) * wob, Math.sin(u * 15 + t * 10) * wob, Math.cos(u * 25 + t * 6) * wob).add(pt);
          pos.setXYZ(idx, pa.x, pa.y, pa.z);
          alt.setXYZ(idx, pb.x, pb.y, pb.z);
          colour.copy(quarks[e].material.color).lerp(quarks[(e + 1) % 3].material.color, u).lerp(new THREE.Color(1, 1, 1), 0.3);
          col.setXYZ(idx, colour.r, colour.g, colour.b);
        }
      }
      pos.needsUpdate = alt.needsUpdate = col.needsUpdate = true;
    },
    fade: f => fadeMaterials(group, f),
  };
}

export { fadeMaterials, tick, gauss };
