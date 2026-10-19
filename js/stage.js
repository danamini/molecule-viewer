// The 3D stage: renderer and post-processing, the camera, picking, and the dive between levels as one
// continuous powers-of-ten zoom. A root level (a molecule, the periodic table, or a snowflake) sits at
// levels[0]; each level's next() builds what is inside it, down to the Planck scale.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { element } from './elements.js';
import { moleculeCloud, dustField, PROJ } from './cloud.js';
import { solidModel, pickProxies, buildModel } from './structure.js';
import { atomLevel, nucleusLevel, nucleonLevel, tick } from './dive.js';
import { snowflakeLevel, tableLevel, planckLevel, particleLevel, particlesLevel } from './worlds.js';
import { PARTICLE } from './particles.js';
import { thingLevel, THING, partElements, elementBadges } from './things.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

const LOOK = {
  cloud: { bloom: 0.75, radius: 0.5, threshold: 0.0, ao: false, exposure: 1.0 },
  ball: { bloom: 0.22, radius: 0.4, threshold: 0.82, ao: true, exposure: 1.05 },
  space: { bloom: 0.18, radius: 0.4, threshold: 0.85, ao: true, exposure: 1.05 },
  stick: { bloom: 0.22, radius: 0.4, threshold: 0.82, ao: true, exposure: 1.05 },
  atom: { bloom: 0.55, radius: 0.5, threshold: 0.0, ao: false, exposure: 0.9 },
  nucleus: { bloom: 0.35, radius: 0.5, threshold: 0.7, ao: true, exposure: 0.85 },
  nucleon: { bloom: 0.7, radius: 0.55, threshold: 0.0, ao: false, exposure: 0.95 },
  planck: { bloom: 0.9, radius: 0.6, threshold: 0.0, ao: false, exposure: 0.95 },
  particle: { bloom: 0.9, radius: 0.6, threshold: 0.0, ao: false, exposure: 1.0 },
  particles: { bloom: 0.32, radius: 0.45, threshold: 0.72, ao: false, exposure: 0.95 },
  mixture: { bloom: 0.25, radius: 0.4, threshold: 0.82, ao: true, exposure: 1.05 },
  thing: { bloom: 0.3, radius: 0.4, threshold: 0.78, ao: true, exposure: 1.0, studio: true },
  snowflake: { bloom: 0.38, radius: 0.45, threshold: 0.6, ao: false, exposure: 0.92 },
  table: { bloom: 0.14, radius: 0.4, threshold: 0.9, ao: false, exposure: 0.9 },
};

export function createStage(container, events = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'labels';
  container.appendChild(labelRenderer.domElement);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 2000);
  camera.position.set(0, 0, 30);

  const scene = new THREE.Scene();
  const backdrop = new THREE.Scene();
  backdrop.background = gradientTexture();
  const dust = dustField();
  backdrop.add(dust);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const studioEnv = pmrem.fromScene(studioScene(), 0.02).texture;
  scene.environment = roomEnv;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 8);
  const rim = new THREE.DirectionalLight(0xf2b45a, 1.4);
  rim.position.set(-6, -2, -8);
  const fill = new THREE.HemisphereLight(0x9fb6d8, 0x05070d, 0.35);
  scene.add(key, rim, fill);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  // spin is on by default; with reduced motion asked for, it turns slowly instead of not at all
  controls.autoRotate = true;
  controls.autoRotateSpeed = reduceMotion ? 0.18 : 0.55;

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  const bgPass = new RenderPass(backdrop, camera);
  const mainPass = new RenderPass(scene, camera);
  mainPass.clear = false;
  mainPass.clearDepth = true;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const aoPass = small ? null : new GTAOPass(scene, camera, 1, 1);
  if (aoPass) { aoPass.blendIntensity = 0.9; aoPass.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1.2, scale: 1 }); }
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.55, 0);
  composer.addPass(bgPass);
  composer.addPass(mainPass);
  if (aoPass) composer.addPass(aoPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const look = { ...LOOK.cloud };
  const lookTarget = { ...LOOK.cloud };
  function setLook(name) {
    Object.assign(lookTarget, LOOK[name]);
    if (aoPass) aoPass.enabled = LOOK[name].ao;
    scene.environment = LOOK[name].studio ? studioEnv : roomEnv;
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    PROJ.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ------------------------------------------------------------ levels
  let levels = [];
  let mode = 'cloud';
  let labelsOn = false;
  let spinWanted = controls.autoRotate;
  let transition = null;
  let camFly = null;
  const clock = new THREE.Clock();
  const current = () => levels[levels.length - 1];
  const lookName = l => (l.kind === 'molecule' ? l.style : l.kind === 'mixture' ? mode : l.kind);

  function fitDistance(radius) {
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const aspect = Math.min(1, camera.aspect);
    // the side panels cover part of a wide view, so frame a little wider there
    const panels = innerWidth > 900 ? 1.18 : 1;
    return radius / Math.sin(fov / 2) / Math.max(0.36, aspect) * 0.92 * panels;
  }

  function limits(level) {
    const dist = fitDistance(level.radius);
    // depth precision: a near plane scaled to the level keeps close surfaces (a tile's label 1.5 cm in
    // front of its face, at 45 units away) from fighting in the depth buffer and flickering
    camera.near = Math.max(0.01, dist * 0.02);
    camera.far = Math.max(2000, dist * 80);
    camera.updateProjectionMatrix();
    level.frozen = false;
    controls.minDistance = dist * (level.kind === 'molecule' || level.kind === 'table' ? 0.28 : 0.35);
    controls.maxDistance = dist * 3.2;
    controls.autoRotate = spinWanted && !level.noSpin;
  }

  function frameLevel(level, instant) {
    limits(level);
    const dist = fitDistance(level.radius);
    const dir = level.viewDir ? level.viewDir.clone().normalize() : camera.position.clone().sub(controls.target).normalize();
    if (dir.lengthSq() < 0.5) dir.set(0.3, 0.25, 1).normalize();
    const goal = dir.multiplyScalar(dist);
    if (instant || reduceMotion) { controls.target.set(0, 0, 0); camera.position.copy(goal); camFly = null; return; }
    camFly = { from: camera.position.clone(), to: goal, fromT: controls.target.clone(), t: 0, dur: 1.1 };
  }

  // ------------------------------------------------------------ molecule levels
  function buildMoleculeLevel(m, styleName) {
    const group = new THREE.Group();
    const hbondMat = new THREE.LineDashedMaterial({ color: 0x7cc4ff, dashSize: 0.12, gapSize: 0.09, transparent: true, opacity: 0.75 });
    const ringMat = new THREE.LineBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0.85, depthTest: false });
    let visual;
    if (styleName === 'cloud') {
      visual = moleculeCloud(m);
    } else {
      visual = solidModel(m, styleName);
      visual.traverse(o => { if (o.isMesh) o.userData.home = { scale: o.scale.clone(), dist: o.position.length() }; });
    }
    group.add(visual);
    const proxies = pickProxies(m);
    group.add(proxies);
    // hydrogen bonds (ice): dashed, not solid, because they are attractions rather than shared electrons
    let hbonds = null;
    if (m.hbonds.length) {
      const pts = [];
      m.hbonds.forEach(b => pts.push(m.atoms[b.a].pos, m.atoms[b.b].pos));
      hbonds = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), hbondMat);
      hbonds.computeLineDistances();
      group.add(hbonds);
    }
    // the six-membered rings, the hexagons a snowflake's symmetry comes from
    let rings = null;
    if (m.rings?.length) {
      rings = new THREE.Group();
      for (const ring of m.rings) {
        const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ring.map(i => m.atoms[i].pos)), ringMat);
        line.renderOrder = 6;
        rings.add(line);
      }
      rings.visible = false;
      group.add(rings);
    }
    const labels = new THREE.Group();
    for (const atom of m.atoms) {
      const div = document.createElement('div');
      div.className = `atom-label el-${atom.symbol === 'H' ? 'h' : 'x'}`;
      div.textContent = atom.symbol;
      const o = new CSS2DObject(div);
      o.position.copy(atom.pos);
      labels.add(o);
    }
    labels.visible = labelsOn;
    group.add(labels);
    const measure = new THREE.Group();
    group.add(measure);
    return {
      kind: 'molecule', mol: m, group, visual, proxies, labels, measure, rings, style: styleName,
      radius: styleName === 'space' ? m.radius + 1.1 : m.radius, metresPerUnit: 1e-10, sizeMetres: m.extent * 1e-10,
      born: clock.elapsedTime, child: m.child,
      update(t) {
        tick(group, t);
        const age = t - this.born;
        if (styleName === 'cloud') {
          visual.material.uniforms.uAssemble.value = reduceMotion ? 1 : Math.min(1, age / 1.8);
        } else if (!this.settled) {
          const R = Math.max(1, m.radius);
          let done = true;
          visual.traverse(o => {
            if (!o.isMesh || !o.userData.home) return;
            const k = reduceMotion ? 1 : ease(Math.min(1, Math.max(0, age * 1.6 - (o.userData.home.dist / R) * 0.6)));
            if (k < 1) done = false;
            const h = o.userData.home.scale;
            if (o.userData.atom !== undefined) o.scale.copy(h).multiplyScalar(Math.max(1e-4, k));
            else o.scale.set(h.x, Math.max(1e-4, h.y * k), h.z);
          });
          if (done) this.settled = true;
        }
      },
      fade(f) {
        if (styleName === 'cloud') visual.material.uniforms.uOpacity.value = f;
        else visual.traverse(o => {
          if (!o.material || o.material.visible === false) return;
          const base = o.material.isMeshBasicMaterial ? 0.35 : 1;
          o.material.transparent = f < 0.999 || o.material.isMeshBasicMaterial;
          o.material.opacity = f * base;
          o.material.depthWrite = f > 0.98;
        });
        hbondMat.opacity = 0.75 * f;
        ringMat.opacity = 0.85 * f;
        labels.visible = labelsOn && f > 0.98;
      },
      pickTargets() { return styleName === 'space' ? visual.userData.atomMeshes : proxies.children; },
      // inside a molecule: one of its atoms; inside ice: one of its water molecules
      next(choice) {
        if (this.child) {
          const i = choice ?? centreChoice(this, a => a.symbol === 'O');
          const water = buildModel(this.child);
          const lvl = buildMoleculeLevel(water, mode);
          return { level: lvl, focus: m.atoms[i].pos.clone() };
        }
        const i = choice ?? centreChoice(this, a => a.symbol !== 'H');
        const lvl = atomLevel(m.atoms[i].symbol);
        lvl.parentSymbol = m.atoms[i].symbol;
        lvl.atomIndex = i;
        return { level: lvl, focus: m.atoms[i].pos.clone() };
      },
    };
  }

  // ------------------------------------------------------------ the chain below each kind of level
  function attachNext(level) {
    if (level.next) return level;
    if (level.kind === 'atom') {
      // the nucleus by default; 'electron' to fly into a point on the outer cloud instead
      level.next = choice => {
        if (choice === 'electron' || choice === 1) {
          const outer = level.data.subshells[level.data.subshells.length - 1].points.geometry.attributes.position;
          const lvl = particleLevel(PARTICLE.e);
          lvl.parentSymbol = level.data.el.symbol;
          return { level: lvl, focus: new THREE.Vector3().fromBufferAttribute(outer, 0) };
        }
        const lvl = nucleusLevel(level.data.el.symbol);
        lvl.parentSymbol = level.data.el.symbol;
        return { level: lvl, focus: new THREE.Vector3() };
      };
    } else if (level.kind === 'particle') {
      level.next = () => {
        const lvl = planckLevel();
        lvl.parentSymbol = level.parentSymbol;
        return { level: lvl, focus: new THREE.Vector3(), slow: true };
      };
    } else if (level.kind === 'nucleus') {
      level.next = choice => {
        const only = choice === 'proton' || choice === 'neutron' ? choice : null;
        const i = typeof choice === 'number' ? choice : centreChoice(level, null, only);
        const mesh = level.meshes[i];
        const lvl = nucleonLevel(mesh.userData.nucleon);
        lvl.parentSymbol = level.parentSymbol;
        return { level: lvl, focus: mesh.userData.home.clone() };
      };
    } else if (level.kind === 'nucleon') {
      level.next = () => {
        const lvl = planckLevel();
        lvl.parentSymbol = level.parentSymbol;
        return { level: lvl, focus: new THREE.Vector3(), slow: true };
      };
    } else if (level.kind === 'thing') {
      level.next = choice => {
        const i = typeof choice === 'number' ? choice : 0;
        const part = level.parts[i];
        const focus = level.thing.parts ? level.partPosition(i) : new THREE.Vector3();
        if (part.made?.length > 1) { // made of several materials: show them side by side first
          const mix = mixtureLevel(part, level.lookup);
          mix.partOf = { thing: level.thing, part };
          return { level: mix, focus };
        }
        if (part.thing) { // a level inside the thing: the die, a transistor
          const inner = thingLevel(THING[part.thing], k => { if (current() === inner) dive(k); }, level.lookup);
          inner.lookup = level.lookup;
          inner.partOf = { thing: level.thing, part };
          return { level: inner, focus: level.partPosition(i) };
        }
        const entry = level.lookup(part.made ? part.made[0][0] : part.child);
        const lvl = buildMoleculeLevel(buildModel(entry), mode);
        lvl.partOf = { thing: level.thing, part: level.parts[i] };
        return { level: lvl, focus };
      };
    } else if (level.kind === 'mixture') {
      level.next = choice => {
        const i = typeof choice === 'number' ? choice : 0;
        const lvl = buildMoleculeLevel(buildModel(level.members[i].entry), mode);
        lvl.partOf = { thing: level.partOf.thing, part: { ...level.part, label: level.part.label, note: `${level.members[i].share}% of it by weight.` } };
        return { level: lvl, focus: level.members[i].group.position.clone() };
      };
    } else if (level.kind === 'snowflake') {
      level.next = () => ({ level: buildMoleculeLevel(buildModel(level.ice), mode), focus: new THREE.Vector3() });
    } else if (level.kind === 'particles') {
      level.next = choice => {
        const tile = typeof choice === 'number' ? level.tiles[choice] : level.tiles[centreChoice(level, null)];
        const p = tile.userData.particle;
        return { level: particleLevel(p), focus: tile.userData.home.clone() };
      };
    } else if (level.kind === 'table') {
      level.next = choice => {
        const tile = typeof choice === 'number' ? level.tiles[choice] : level.tiles[centreChoice(level, null)];
        const el = tile.userData.element;
        level.frozen = true;
        const lvl = atomLevel(el.symbol);
        lvl.parentSymbol = el.symbol;
        return { level: lvl, focus: tile.userData.home.clone() };
      };
    }
    return level;
  }

  // the thing nearest the middle of the view: atoms (optionally filtered), nucleons (protons preferred), tiles
  // `penalty` pushes unwanted candidates back: hydrogens (or non-oxygens in ice), and neutrons unless asked for
  function centreChoice(level, keep, only) {
    let pts, penalty;
    if (level.kind === 'molecule') { pts = level.mol.atoms.map(a => a.pos); penalty = i => (keep && !keep(level.mol.atoms[i]) ? 0.5 : 0); }
    else if (level.kind === 'nucleus') {
      pts = level.meshes.map(m => m.userData.home);
      penalty = i => (level.meshes[i].userData.nucleon === (only || 'proton') ? 0 : only ? 99 : 0.5);
    }
    else if (level.kind === 'table' || level.kind === 'particles') { pts = level.tiles.map(t => t.userData.home); penalty = () => 0; }
    else return 0;
    let best = 0, bestD = Infinity;
    const v = new THREE.Vector3();
    pts.forEach((p, i) => {
      v.copy(p).applyMatrix4(level.group.matrixWorld).project(camera);
      const d = v.x * v.x + v.y * v.y + (v.z > 1 ? 9 : 0) + penalty(i);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  function disposeLevel(level) {
    scene.remove(level.group);
    level.group.traverse(o => {
      if (o.isCSS2DObject) o.element.remove();
      if (o.isPoints) { o.geometry.dispose(); o.material.dispose(); }
    });
  }

  function setRoot(level) {
    while (levels.length) disposeLevel(levels.pop());
    transition = null;
    attachNext(level);
    level.born = clock.elapsedTime;
    levels.push(level);
    scene.add(level.group);
    setLook(lookName(level));
    frameLevel(level, !camera.userData.framed);
    camera.userData.framed = true;
    selection = [];
    emitLevels();
  }

  function showMolecule(m, styleName = mode) {
    mode = styleName;
    setRoot(buildMoleculeLevel(m, styleName));
    drawMeasure();
  }

  async function showTable(counts, view) {
    const level = await tableLevel(counts);
    if (view) level.setView(view);
    setRoot(level);
  }

  async function showParticles() {
    const level = await particlesLevel();
    setRoot(level);
  }

  // A material made of several others (stainless steel, the chip's package): each one side by side at
  // true relative size, labelled with its share, and each can be dived into
  function mixtureLevel(part, lookup) {
    const group = new THREE.Group();
    const members = part.made.map(([key, share]) => {
      const entry = lookup(key);
      const lvl = buildMoleculeLevel(buildModel(entry), mode);
      lvl.born = clock.elapsedTime;
      return { key, share, entry, lvl, group: lvl.group };
    });
    const biggest = Math.max(...members.map(m => m.lvl.radius));
    const s = 2.6 / biggest, gap = 0.9;
    let x = 0;
    const widths = members.map(m => m.lvl.radius * s);
    const total = widths.reduce((a, w) => a + 2 * w, 0) + gap * (members.length - 1);
    x = -total / 2;
    const labels = [];
    members.forEach((m, i) => {
      x += widths[i];
      m.group.scale.setScalar(s);
      m.group.position.set(x, 1.1, 0);
      group.add(m.group);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'hotspot mix';
      el.innerHTML = `<span><b>${m.entry.name}</b> ${m.share}%</span><span class="badges">${elementBadges(partElements({ child: m.key }, lookup))}</span>`;
      el.title = `Zoom into the ${m.entry.name.toLowerCase()}`;
      el.addEventListener('click', e => { e.stopPropagation(); if (current() === level) dive(i); });
      const o = new CSS2DObject(el);
      o.position.set(x, 1.1 + widths[i] + 0.35, 0); // above each material, clear of the title below
      group.add(o);
      labels.push(el);
      x += widths[i] + gap;
    });
    const level = {
      kind: 'mixture', part, members, group, radius: Math.max(total / 2, 3) * 1.08, metresPerUnit: 1e-10 / s,
      update(t) { members.forEach(m => m.lvl.update(t)); },
      fade(f) { members.forEach(m => m.lvl.fade(f)); labels.forEach(l => { l.style.opacity = f; l.style.visibility = f > 0.05 ? '' : 'hidden'; }); },
    };
    return level;
  }

  function showThing(thing, lookup) {
    const level = thingLevel(thing, i => { if (current() === level) dive(i); }, lookup);
    level.lookup = lookup;
    level.childEntry = lookup(thing.child);
    setRoot(level);
  }

  function showSnowflake(iceEntry, waterEntry) {
    const level = snowflakeLevel();
    level.ice = { ...iceEntry, child: waterEntry };
    setRoot(level);
  }

  function setMode(styleName) {
    mode = styleName;
    const cur = current();
    if (!cur || cur.kind !== 'molecule' || transition) return;
    const fresh = buildMoleculeLevel(cur.mol, styleName);
    fresh.born = clock.elapsedTime - (styleName === 'cloud' ? 0.9 : 0.25);
    fresh.focusInParent = cur.focusInParent;
    if (cur.rings && fresh.rings) fresh.rings.visible = cur.rings.visible;
    levels[levels.length - 1] = fresh;
    disposeLevel(cur);
    scene.add(fresh.group);
    setLook(styleName);
    frameLevel(fresh);
    selection = [];
    drawMeasure();
    emitLevels();
  }

  // ------------------------------------------------------------ the dive
  function metresPerPx(level, dist, scale = 1) {
    if (!level.metresPerUnit) return null;
    const unitsPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / renderer.domElement.clientHeight;
    return (unitsPerPx * level.metresPerUnit) / scale;
  }

  function dive(choice) {
    if (transition) return false;
    const from = current();
    if (!from?.next) return false;
    const out = from.next(choice);
    if (!out) return false;
    const next = attachNext(out.level);
    next.focusInParent = out.focus;
    next.born = clock.elapsedTime;
    levels.push(next);
    scene.add(next.group);
    next.fade(0);
    next.group.scale.setScalar(0.04);
    const dist = fitDistance(next.radius);
    transition = {
      dir: 1, from, to: next, focus: out.focus, t: 0, dur: reduceMotion ? 0.01 : out.slow ? 3.2 : 1.9,
      camFrom: camera.position.clone(), targetFrom: controls.target.clone(),
      mppFrom: metresPerPx(from, camera.position.distanceTo(controls.target), from.group.scale.x),
      mppTo: metresPerPx(next, dist),
    };
    clearHover();
    selection = [];
    drawMeasure();
    setLook(lookName(next));
    events.onDiveStart?.(next);
    return true;
  }

  function surface() {
    if (transition || levels.length < 2) return false;
    const from = current();
    const to = levels[levels.length - 2];
    to.group.visible = true;
    scene.add(to.group);
    transition = {
      dir: -1, from, to, focus: (from.focusInParent || new THREE.Vector3()).clone(), t: 0,
      dur: reduceMotion ? 0.01 : from.kind === 'planck' ? 2.6 : 1.5,
      camFrom: camera.position.clone(), targetFrom: controls.target.clone(),
      mppFrom: metresPerPx(from, camera.position.distanceTo(controls.target)),
      mppTo: metresPerPx(to, fitDistance(to.radius)),
    };
    clearHover();
    setLook(lookName(to));
    events.onDiveStart?.(to);
    return true;
  }

  function surfaceTo(depth) {
    // jump straight up to levels[depth] (the breadcrumb): drop the in-between levels, then animate one step
    if (transition || depth >= levels.length - 1) return;
    while (levels.length - 2 > depth) {
      const gone = levels.splice(levels.length - 2, 1)[0];
      levels[levels.length - 1].focusInParent = gone.focusInParent; // roughly where the deeper level sat
      disposeLevel(gone);
    }
    surface();
  }

  function runTransition(dt) {
    const tr = transition;
    tr.t = Math.min(1, tr.t + dt / tr.dur);
    const e = ease(tr.t);
    const zoom = 26; // how much bigger the outer level gets as we pass through it
    const dist = fitDistance(tr.to.radius);
    const camDir = tr.to.viewDir && tr.dir < 0 && levels.length === 2
      ? tr.to.viewDir.clone().normalize() : tr.camFrom.clone().sub(tr.targetFrom).normalize();
    controls.target.lerpVectors(tr.targetFrom, new THREE.Vector3(), e);
    const outer = tr.dir > 0 ? tr.from : tr.to, inner = tr.dir > 0 ? tr.to : tr.from;
    const p = tr.dir > 0 ? tr.t : 1 - tr.t; // 0 = outside, 1 = inside
    const pe = tr.dir > 0 ? e : 1 - e;
    const s = 1 + (zoom - 1) * Math.pow(pe, 2.2);
    outer.group.scale.setScalar(s);
    outer.group.position.copy(tr.focus).multiplyScalar(-s * smooth(0, 0.6, p));
    outer.fade(1 - smooth(0.25, 0.7, p));
    inner.group.scale.setScalar(Math.max(0.04, 0.04 + 0.96 * smooth(0.35, 1, p)));
    inner.fade(smooth(0.4, 0.95, p));
    camera.position.copy(controls.target).addScaledVector(camDir, THREE.MathUtils.lerp(tr.camFrom.distanceTo(tr.targetFrom), dist, e));
    if (tr.t >= 1) {
      if (tr.dir > 0) {
        tr.from.group.visible = false;
        scene.remove(tr.from.group);
        tr.from.group.scale.setScalar(1);
        tr.from.group.position.set(0, 0, 0);
        tr.from.fade(1);
        tr.from.group.traverse(o => { if (o.isCSS2DObject) o.element.style.display = 'none'; });
        tr.to.group.scale.setScalar(1);
        tr.to.fade(1);
      } else {
        levels.pop();
        disposeLevel(tr.from);
        tr.to.group.scale.setScalar(1);
        tr.to.group.position.set(0, 0, 0);
        tr.to.fade(1);
      }
      transition = null;
      limits(current());
      push.armed = 0;
      emitLevels();
    }
  }

  function emitLevels() {
    events.onPush?.(0, 0); // a finished dive clears the scroll-to-dive hint, which otherwise kept its old text
    events.onLevels?.(levels, current());
  }

  // Scrolling in past the closest zoom dives a level; scrolling out past the farthest surfaces.
  const push = { armed: 0, last: 0 };
  renderer.domElement.addEventListener('wheel', e => {
    if (transition) return;
    const d = controls.target.distanceTo(camera.position);
    const now = performance.now();
    if (now - push.last > 600) push.armed = 0;
    push.last = now;
    if (e.deltaY < 0 && d <= controls.minDistance * 1.05 && current()?.next) {
      push.armed += -e.deltaY;
      events.onPush?.(Math.min(1, push.armed / 500), 1);
      if (push.armed > 500) { push.armed = 0; dive(hover?.index); }
    } else if (e.deltaY > 0 && d >= controls.maxDistance * 0.95 && levels.length > 1) {
      push.armed += e.deltaY;
      events.onPush?.(Math.min(1, push.armed / 500), -1);
      if (push.armed > 500) { push.armed = 0; surface(); }
    } else {
      push.armed = 0;
      events.onPush?.(0, 0);
    }
  }, { passive: true });

  // ------------------------------------------------------------ picking, hover, measurement
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hover = null;
  let selection = [];

  function pickAt(clientX, clientY) {
    const lvl = current();
    if (!lvl || transition) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (lvl.kind === 'molecule') {
      const hit = raycaster.intersectObjects(lvl.pickTargets(), false)[0];
      if (!hit) return null;
      const i = hit.object.userData.atom;
      const atom = lvl.mol.atoms[i];
      return { kind: 'atom', index: i, atom, element: element(atom.symbol), journey: !!lvl.child };
    }
    if (lvl.kind === 'nucleus') {
      const hit = raycaster.intersectObjects(lvl.meshes, false)[0];
      if (!hit) return null;
      return { kind: 'nucleon', index: lvl.meshes.indexOf(hit.object), nucleon: hit.object.userData.nucleon };
    }
    if (lvl.kind === 'atom') {
      const centre = new THREE.Vector3().applyMatrix4(lvl.group.matrixWorld).project(camera);
      const cx = rect.left + (centre.x + 1) / 2 * rect.width, cy = rect.top + (1 - centre.y) / 2 * rect.height;
      const d = Math.hypot(clientX - cx, clientY - cy);
      const cloudPx = rect.height / 2 * (lvl.radius / 1.6) / (camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      if (d < 28) return { kind: 'part', index: 0, part: 'nucleus' };
      if (d < cloudPx * 1.1) return { kind: 'part', index: 1, part: 'electron' };
      return null;
    }
    if (lvl.kind === 'table' || lvl.kind === 'particles') {
      const hit = raycaster.intersectObjects(lvl.pickTargets(), false)[0];
      if (!hit) return null;
      const tile = hit.object.userData.tile;
      return { kind: 'tile', index: lvl.tiles.indexOf(tile), element: tile.userData.element, particle: tile.userData.particle };
    }
    return null;
  }

  renderer.domElement.addEventListener('pointermove', e => {
    const lvl = current();
    if (!lvl?.tiles) return;
    const rect = renderer.domElement.getBoundingClientRect();
    lvl.pointer = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  });
  renderer.domElement.addEventListener('pointerleave', () => { if (current()) current().pointer = null; });

  function clearHover() {
    hover = null;
    if (current()?.tiles) current().hover = null;
    events.onHover?.(null);
  }

  function hoverAt(clientX, clientY) {
    const h = pickAt(clientX, clientY);
    if ((h?.index ?? -1) === (hover?.index ?? -1) && h?.kind === hover?.kind) return hover;
    hover = h;
    const lvl = current();
    if (lvl?.setHover) lvl.setHover(h ? lvl.tiles[h.index] : null);
    else if (lvl?.tiles) lvl.hover = h ? lvl.tiles[h.index] : null;
    events.onHover?.(h);
    return h;
  }

  function toggleSelect(index) {
    const at = selection.indexOf(index);
    if (at >= 0) selection.splice(at, 1);
    else {
      selection.push(index);
      if (selection.length > 3) selection.shift();
    }
    drawMeasure();
    return selection.slice();
  }
  function clearSelection() { selection = []; drawMeasure(); }

  const dashed = new THREE.LineDashedMaterial({ color: 0xf2b45a, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.95, depthTest: false });
  const selMat = new THREE.MeshBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide });
  // Selected atoms: a ring sized to the atom as drawn, and a number tag (1, 2, 3); dashed lines between them
  // with the distance, and the angle at the middle atom. The full readout goes to the page (onMeasure).
  function atomDrawnRadius(lvl, sym) {
    const el = element(sym);
    return lvl.style === 'space' ? el.vdw : lvl.style === 'ball' ? 0.28 * el.vdw : lvl.style === 'stick' ? 0.16 : el.covalent * 0.7;
  }
  function drawMeasure() {
    const lvl = current();
    if (!lvl || lvl.kind !== 'molecule') { events.onMeasure?.(null); return; }
    const g = lvl.measure;
    g.children.slice().forEach(o => { g.remove(o); if (o.isCSS2DObject) o.element.remove(); o.geometry?.dispose(); });
    const atoms = selection.map(i => lvl.mol.atoms[i]);
    atoms.forEach((a, n) => {
      const r = Math.max(0.3, atomDrawnRadius(lvl, a.symbol)) * 1.22;
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r * 1.07, 64), selMat);
      ring.position.copy(a.pos);
      ring.renderOrder = 10;
      ring.userData.billboard = true;
      g.add(ring);
      const tag = document.createElement('div');
      tag.className = 'measure-tag';
      tag.textContent = String(n + 1);
      const o = new CSS2DObject(tag);
      o.position.copy(a.pos).add(new THREE.Vector3(0, r * 0.95, 0));
      g.add(o);
    });
    const report = { atoms: atoms.map((a, n) => ({ n: n + 1, symbol: a.symbol, name: element(a.symbol).name })), distances: [], angle: null };
    for (let k = 1; k < atoms.length; k++) {
      const geo = new THREE.BufferGeometry().setFromPoints([atoms[k - 1].pos, atoms[k].pos]);
      const line = new THREE.Line(geo, dashed);
      line.computeLineDistances();
      line.renderOrder = 10;
      g.add(line);
      const d = atoms[k - 1].pos.distanceTo(atoms[k].pos);
      const bonded = atoms[k - 1].bonds.some(bd => (bd.a === atoms[k].i || bd.b === atoms[k].i) && bd.order > 0);
      report.distances.push({ from: k, to: k + 1, d, bonded });
      const div = document.createElement('div');
      div.className = 'measure-label';
      div.innerHTML = `<small>${k}–${k + 1}</small> ${d.toFixed(2)} Å`;
      const lbl = new CSS2DObject(div);
      lbl.position.lerpVectors(atoms[k - 1].pos, atoms[k].pos, 0.5);
      g.add(lbl);
    }
    if (atoms.length === 3) {
      report.angle = angleAt(atoms[0].pos, atoms[1].pos, atoms[2].pos);
      const div = document.createElement('div');
      div.className = 'measure-label angle';
      div.innerHTML = `<small>at 2</small> ${report.angle.toFixed(1)}°`;
      const lbl = new CSS2DObject(div);
      // just outside the angle, away from the two bonds, so it never sits on the atom
      const out = atoms[1].pos.clone().sub(atoms[0].pos).normalize().add(atoms[1].pos.clone().sub(atoms[2].pos).normalize()).normalize();
      lbl.position.copy(atoms[1].pos).addScaledVector(out, atomDrawnRadius(lvl, atoms[1].symbol) * 1.25);
      g.add(lbl);
    }
    events.onMeasure?.(atoms.length ? report : null);
  }
  const angleAt = (a, b, c) => THREE.MathUtils.radToDeg(a.clone().sub(b).angleTo(c.clone().sub(b)));

  // ------------------------------------------------------------ scale bar
  // metres per CSS pixel now; through a dive it slides on a log scale between the two levels' framings,
  // so the readout passes every power of ten on the way down rather than jumping
  function currentMetresPerPx() {
    if (transition && transition.mppFrom && transition.mppTo) {
      const e = ease(transition.t);
      return Math.exp(THREE.MathUtils.lerp(Math.log(transition.mppFrom), Math.log(transition.mppTo), e));
    }
    const lvl = current();
    if (!lvl || lvl.noScale) return null;
    return metresPerPx(lvl, camera.position.distanceTo(controls.target), lvl.group.scale.x || 1);
  }
  const NICE = [1, 2, 5];
  function scaleBar(targetPx = 110) {
    const mpp = currentMetresPerPx();
    if (!mpp) return null;
    const want = targetPx * mpp;
    const p = Math.floor(Math.log10(want));
    let best = Math.pow(10, p);
    for (const n of NICE) if (n * Math.pow(10, p) <= want) best = n * Math.pow(10, p);
    return { px: best / mpp, label: formatLength(best), metresPerPx: mpp };
  }

  // ------------------------------------------------------------ loop
  let frames = 0;
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    if (transition) runTransition(dt);
    if (camFly && !transition) {
      camFly.t = Math.min(1, camFly.t + dt / camFly.dur);
      const e = ease(camFly.t);
      controls.target.lerpVectors(camFly.fromT, new THREE.Vector3(), e);
      camera.position.lerpVectors(camFly.from, camFly.to, e);
      if (camFly.t >= 1) camFly = null;
    }
    for (const l of levels) if (l.group.parent) l.update(t);
    tick(backdrop, t);
    dust.rotation.y = t * 0.004;
    for (const k of ['bloom', 'radius', 'threshold', 'exposure']) look[k] += (lookTarget[k] - look[k]) * Math.min(1, dt * 3);
    bloom.strength = look.bloom;
    bloom.radius = look.radius;
    bloom.threshold = look.threshold;
    renderer.toneMappingExposure = look.exposure;
    current()?.measure?.children.forEach(o => { if (o.userData.billboard) o.quaternion.copy(camera.quaternion); });
    controls.update();
    composer.render();
    labelRenderer.render(scene, camera);
    if (++frames % 3 === 0) events.onFrame?.();
  }
  frame();

  function screenshot() {
    composer.render();
    return renderer.domElement.toDataURL('image/png');
  }

  return {
    renderer, camera, controls,
    showMolecule, showTable, showParticles, showSnowflake, showThing, setMode, dive, surface, surfaceTo, pickAt, hoverAt, toggleSelect, clearSelection,
    scaleBar, screenshot,
    get levels() { return levels; },
    get current() { return current(); },
    get transitioning() { return !!transition; },
    get selection() { return selection.slice(); },
    setLabels(on) { labelsOn = on; const c = current(); if (c?.kind === 'molecule') c.labels.visible = on; },
    setAutoRotate(on) { spinWanted = on; controls.autoRotate = on && !current()?.noSpin; },
    get autoRotate() { return spinWanted; },
    setSubshellVisible(label, on) {
      const lvl = current();
      if (lvl?.kind !== 'atom') return;
      const sub = lvl.data.subshells.find(s => s.label === label);
      if (sub) sub.points.visible = on;
    },
    setRings(on) { const c = current(); if (c?.rings) c.rings.visible = on; },
    setSymmetry(on) { const c = current(); if (c?.kind === 'snowflake') { c.showSymmetry = on; c.symmetry.visible = on; } },
    setTrueScale(on) { const c = current(); if (c?.kind === 'atom') c.setTrueScale(on); },
    highlightFamily(f) { const c = current(); if (c?.tiles) c.family = f; },
    setTableView(name) { const c = current(); if (c?.kind === 'table') c.setView(name); },
    get tableView() { return current()?.kind === 'table' ? current().view : null; },
    // keyboard on the table: move the highlight one tile in a direction; returns the tile's index
    tableMove(dx, dy) {
      const c = current();
      if (c?.kind !== 'table' || transition) return null;
      const from = c.hover?.userData.home || c.tiles[0].userData.home;
      let best = null, bestD = Infinity;
      for (const t of c.tiles) {
        const h = t.userData.home, ox = h.x - from.x, oy = h.y - from.y;
        if (c.hover && (dx ? Math.sign(ox) !== dx || Math.abs(oy) > 0.6 : Math.sign(oy) !== dy || Math.abs(ox) > 0.6)) continue;
        const d = Math.hypot(ox, oy);
        if (d > 0.01 && d < bestD) { bestD = d; best = t; }
      }
      if (!c.hover) best = c.tiles[0];
      if (!best) return c.tiles.indexOf(c.hover);
      c.setHover(best);
      hover = { kind: 'tile', index: c.tiles.indexOf(best), element: best.userData.element };
      return hover.index;
    },
    tileScreen(i) {
      const c = current();
      if (!c?.tiles?.[i]) return null;
      const v = c.tiles[i].getWorldPosition(new THREE.Vector3()).project(camera);
      const rect = renderer.domElement.getBoundingClientRect();
      return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height };
    },
    reframe() { if (current()) frameLevel(current()); },
  };
}

export function formatLength(m) {
  const units = [[1e-15, 'fm'], [1e-12, 'pm'], [1e-9, 'nm'], [1e-6, 'µm'], [1e-3, 'mm'], [1e-2, 'cm']];
  let pick = units[0];
  for (const u of units) if (m >= u[0] * 0.999) pick = u;
  const v = m / pick[0];
  return `${v >= 10 ? Math.round(v) : +v.toPrecision(2)} ${pick[1]}`;
}

// A photographer's studio to reflect: a big softbox overhead, strip lights either side, a warm and a cool
// card, all on black. Objects that reflect it read as real products rather than plastic.
function studioScene() {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x020306);
  const light = (w, h, color, intensity, pos, look = new THREE.Vector3()) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.copy(pos);
    m.lookAt(look);
    s.add(m);
  };
  light(6, 6, 0xffffff, 3, new THREE.Vector3(0, 7, 1));          // overhead softbox
  light(1, 8, 0xffffff, 4.5, new THREE.Vector3(-6, 1, 2));       // strips
  light(1, 8, 0xffffff, 4.5, new THREE.Vector3(6, 1, 2));
  light(3, 2, 0xffc890, 4, new THREE.Vector3(3, -2, 6));         // warm card
  light(3, 2, 0x8fc0ff, 4, new THREE.Vector3(-4, -1, -6));       // cool card behind
  light(10, 0.3, 0xffffff, 5, new THREE.Vector3(0, -3, -7));     // a rim line
  return s;
}

function gradientTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 230, 10, 256, 256, 380);
  grd.addColorStop(0, '#111b33');
  grd.addColorStop(0.45, '#0a1022');
  grd.addColorStop(1, '#020309');
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
