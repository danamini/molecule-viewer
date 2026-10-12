// The molecule model and its solid renderings: ball and stick, space filling, and skeleton.
import * as THREE from 'three';
import { element } from './elements.js';

// entry: { atoms: [[symbol, x, y, z]], bonds: [[a, b, order]] } -> centred model with bond geometry
export function buildModel(entry) {
  const atoms = entry.atoms.map(([symbol, x, y, z], i) => ({ i, symbol, pos: new THREE.Vector3(x, y, z), bonds: [] }));
  const centre = new THREE.Vector3();
  atoms.forEach(a => centre.add(a.pos));
  centre.divideScalar(Math.max(1, atoms.length));
  atoms.forEach(a => a.pos.sub(centre));
  // order -1 marks a hydrogen bond (an attraction, drawn dashed); everything else is a bond proper
  const all = entry.bonds.map(([a, b, order]) => ({ a, b, order }));
  const bonds = all.filter(b => b.order >= 0);
  const hbonds = all.filter(b => b.order < 0);
  for (const bond of bonds) {
    atoms[bond.a].bonds.push(bond);
    atoms[bond.b].bonds.push(bond);
  }
  // a perpendicular in the plane of each bond's neighbours, so double bonds lie flat in a ring
  for (const bond of bonds) {
    const A = atoms[bond.a].pos, B = atoms[bond.b].pos;
    const axis = new THREE.Vector3().subVectors(B, A).normalize();
    let ref = null;
    for (const [end, other] of [[bond.a, bond.b], [bond.b, bond.a]]) {
      const nb = atoms[end].bonds.find(x => x !== bond && (x.a === end ? x.b : x.a) !== other);
      if (nb) { ref = atoms[nb.a === end ? nb.b : nb.a].pos.clone().sub(atoms[end].pos); break; }
    }
    if (!ref || Math.abs(ref.clone().normalize().dot(axis)) > 0.98) ref = Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const normal = new THREE.Vector3().crossVectors(axis, ref).normalize();
    bond.perp = new THREE.Vector3().crossVectors(normal, axis).normalize();
  }
  let radius = 0;
  atoms.forEach(a => { radius = Math.max(radius, a.pos.length() + element(a.symbol).vdw * 0.6); });
  const box = new THREE.Box3();
  atoms.forEach(a => box.expandByPoint(a.pos));
  const size = box.getSize(new THREE.Vector3());
  return { ...entry, atoms, bonds, hbonds, radius: Math.max(radius, 2), extent: Math.max(size.x, size.y, size.z) + 2 * 1.2 };
}

// Hill order formula from the atoms themselves (used for searched molecules lacking one)
export function hillFormula(atoms) {
  const count = {};
  atoms.forEach(a => { count[a.symbol] = (count[a.symbol] || 0) + 1; });
  const keys = Object.keys(count).sort();
  const order = count.C ? ['C', 'H', ...keys.filter(k => k !== 'C' && k !== 'H')] : keys;
  return order.filter(k => count[k]).map(k => k + (count[k] > 1 ? count[k] : '')).join('');
}

const sphere = new THREE.SphereGeometry(1, 48, 32);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
cylinder.translate(0, 0.5, 0); // base at the origin, along +y
const materials = new Map();
function atomMaterial(hex) {
  if (!materials.has(hex)) {
    materials.set(hex, new THREE.MeshPhysicalMaterial({
      color: hex, roughness: 0.32, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.18,
      sheen: 0.25, sheenColor: new THREE.Color(0x9fb6d8), envMapIntensity: 1.0,
    }));
  }
  return materials.get(hex);
}
// carbon's CPK grey and hydrogen's white tuned for a lit, dark stage
const SOLID = { C: 0x5d636d, H: 0xf2f4f8 };
const solidColor = s => SOLID[s] ?? element(s).color;
const ionicMaterial = new THREE.MeshBasicMaterial({ color: 0x8c97ab, transparent: true, opacity: 0.35 });

const STYLES = {
  ball: { atom: s => 0.28 * element(s).vdw, bond: 0.1, multi: 0.065, gap: 0.12 },
  space: { atom: s => element(s).vdw, bond: 0, multi: 0, gap: 0 },
  stick: { atom: () => 0.16, bond: 0.16, multi: 0.16, gap: 0, single: true },
};

export function solidModel(mol, styleName) {
  const style = STYLES[styleName];
  const group = new THREE.Group();
  const atomMeshes = [];
  for (const atom of mol.atoms) {
    const r = style.atom(atom.symbol);
    const mesh = new THREE.Mesh(sphere, atomMaterial(solidColor(atom.symbol)));
    mesh.position.copy(atom.pos);
    mesh.scale.setScalar(r);
    mesh.userData = { atom: atom.i, radius: r };
    group.add(mesh);
    atomMeshes.push(mesh);
  }
  if (style.bond > 0) {
    const up = new THREE.Vector3(0, 1, 0);
    for (const bond of mol.bonds) {
      const A = mol.atoms[bond.a], B = mol.atoms[bond.b];
      const axis = new THREE.Vector3().subVectors(B.pos, A.pos);
      const len = axis.length();
      const q = new THREE.Quaternion().setFromUnitVectors(up, axis.clone().normalize());
      if (bond.order === 0) {
        const m = new THREE.Mesh(cylinder, ionicMaterial);
        m.position.copy(A.pos);
        m.quaternion.copy(q);
        m.scale.set(0.035, len, 0.035);
        group.add(m);
        continue;
      }
      const n = style.single ? 1 : Math.min(bond.order, 3);
      const radius = n === 1 ? style.bond : style.multi;
      const offsets = n === 1 ? [0] : n === 2 ? [-0.5, 0.5] : [-1, 0, 1];
      for (const o of offsets) {
        const shift = bond.perp.clone().multiplyScalar(o * style.gap * (n === 2 ? 1.6 : 1.4));
        // two halves, each in its own atom's colour
        for (const [from, sym, t0] of [[A, A.symbol, 0], [A, B.symbol, 0.5]]) {
          const m = new THREE.Mesh(cylinder, atomMaterial(solidColor(sym)));
          m.position.copy(from.pos).addScaledVector(axis, t0).add(shift);
          m.quaternion.copy(q);
          m.scale.set(radius, len / 2, radius);
          group.add(m);
        }
      }
    }
  }
  group.userData.atomMeshes = atomMeshes;
  return group;
}

// Invisible spheres for picking atoms in any mode (the cloud has no surfaces to hit)
export function pickProxies(mol) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ visible: false });
  for (const atom of mol.atoms) {
    const m = new THREE.Mesh(sphere, mat);
    m.position.copy(atom.pos);
    m.scale.setScalar(Math.max(0.45, element(atom.symbol).covalent * 0.85));
    m.userData.atom = atom.i;
    group.add(m);
  }
  return group;
}
