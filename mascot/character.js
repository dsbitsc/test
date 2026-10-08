// GOPINYA mascot – procedural 3D character.
// Single source of truth: used by the viewer (index.html) and the GLB export.
// Axes: +X = looking direction, +Y = up, +Z = character's left side (viewer side in side view).
// Units: 1.0 = approx. 0.67 of total height (total height ~1.6).

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const PALETTE = {
  furBase: '#0c0e2c',
  fur: '#15173f',
  furTip: '#2a2d6b',
  yellow: '#ffc61a',
  yellowInner: '#ffcf33',
  cream: '#fff0c8',
  nose: '#ffe2ae',
  black: '#07070d',
  rim: '#ffae1a',
};

// ---------- geometry helpers ----------

function smooth(g) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  return m;
}

export function ellipsoid(rx, ry, rz, ws = 48, hs = 32, deform) {
  const g = new THREE.SphereGeometry(1, ws, hs);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.set(v.x * rx, v.y * ry, v.z * rz);
    if (deform) deform(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  return smooth(g);
}

/** E/comb glyph: base bar + n prongs pointing +Y, rounded by bevel. Centered. */
export function glyphGeometry(n, W, H, prong, baseH, depth) {
  const gap = (W - n * prong) / (n - 1);
  const pts = [];
  pts.push([0, 0], [W, 0]);
  for (let i = n - 1; i >= 0; i--) {
    const x0 = i * (prong + gap);
    pts.push([x0 + prong, H], [x0, H]);
    if (i > 0) pts.push([x0, baseH], [x0 - gap, baseH]);
  }
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const bevel = Math.min(prong, baseH) * 0.42;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 7,
    curveSegments: 6,
  });
  g.translate(-W / 2, -H / 2, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

function earGeometry() {
  // teardrop with pointed, slightly rounded tip, flat-ish in Z
  const r = { x: 0.19, y: 0.33, z: 0.09 };
  return ellipsoid(r.x, r.y, r.z, 40, 32, (v) => {
    const t = (v.y / r.y + 1) / 2; // 0 bottom .. 1 tip
    const taper = 1 - Math.pow(t, 2.1) * 0.72;
    v.x *= taper;
    v.z *= 1 - Math.pow(t, 2) * 0.5;
    v.y += r.y; // origin at ear base
    v.x -= 0.0;
  });
}

// ---------- materials ----------

function furMat(color = PALETTE.fur) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(PALETTE.furTip),
  });
}
function plastic(color, rough = 0.28) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: rough,
    metalness: 0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
  });
}

// ---------- fur shells (viewer only; stripped for GLB export) ----------

export const furUniforms = {
  uTime: { value: 0 },
  uRimStrength: { value: 0.9 },
  uRimColor: { value: new THREE.Color(PALETTE.rim) },
  uKeyDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() },
};

const SHELL_VS = /* glsl */ `
  uniform float uLayer, uLen, uTime;
  varying vec3 vObj, vN, vV;
  void main(){
    vec3 p = position + normal * uLen * uLayer;
    p.y -= uLen * uLayer * uLayer * 0.35;                // gravity droop
    p.x += sin(uTime*1.3 + position.y*6.0) * 0.004 * uLayer; // breeze
    vObj = position;
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const SHELL_FS = /* glsl */ `
  uniform float uLayer, uSeed, uDensity;
  uniform vec3 uBase, uMid, uTip, uRimColor, uKeyDir;
  uniform float uRimStrength;
  varying vec3 vObj, vN, vV;
  float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  void main(){
    vec3 q = vObj * uDensity + uSeed;
    vec3 c = floor(q);
    float h = mix(0.35, 1.0, hash(c));                      // strand height
    vec3 jit = vec3(hash(c+7.1), hash(c+13.7), hash(c+23.3)) - 0.5;
    vec3 f = fract(q) - 0.5 - jit*0.55;
    float d = length(f);                                    // strand radius falloff
    float thick = mix(0.62, 0.18, uLayer);
    if (uLayer > 0.0 && (h < uLayer || d > thick)) discard;
    vec3 col = mix(uBase, uMid, smoothstep(0.0,0.5,uLayer));
    col = mix(col, uTip, smoothstep(0.55,1.0,uLayer));
    vec3 n = normalize(vN);
    float diff = max(dot(n, normalize(uKeyDir)), 0.0);
    float amb = 0.45 + 0.55*n.y*0.5;
    col *= (amb + diff*0.9) * mix(0.45, 1.0, uLayer);       // fake AO toward root
    float fres = pow(1.0 - max(dot(n, normalize(vV)),0.0), 3.0);
    col += uRimColor * fres * uRimStrength * (0.35 + uLayer*0.9);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

function makeShells(geometry, { len = 0.05, layers = 20, density = 70, seed = 0, tint } = {}) {
  const grp = new THREE.Group();
  grp.name = 'FurShells';
  grp.userData.isFur = true;
  const base = new THREE.Color(PALETTE.furBase);
  const mid = new THREE.Color(PALETTE.fur);
  const tip = new THREE.Color(tint || PALETTE.furTip);
  for (let i = 1; i <= layers; i++) {
    const m = new THREE.ShaderMaterial({
      vertexShader: SHELL_VS,
      fragmentShader: SHELL_FS,
      uniforms: {
        ...furUniforms,
        uLayer: { value: i / layers },
        uLen: { value: len },
        uSeed: { value: seed },
        uDensity: { value: density },
        uBase: { value: base },
        uMid: { value: mid },
        uTip: { value: tip },
      },
    });
    const mesh = new THREE.Mesh(geometry, m);
    mesh.frustumCulled = false;
    grp.add(mesh);
  }
  return grp;
}

/** Part with base mesh (exported) + fur shells (viewer-only). */
function furPart(name, geometry, opts = {}) {
  const g = new THREE.Group();
  g.name = name;
  const base = new THREE.Mesh(geometry, furMat(opts.color));
  base.name = name + '_Mesh';
  g.add(base);
  if (opts.fur !== false) g.add(makeShells(geometry, opts));
  return g;
}

const eul = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

// ---------- build ----------

function at(group, x, y, z) {
  group.position.set(x, y, z);
  return group;
}

/** Position/orientation on an ellipsoid surface, glyph-up along tangent plane. */
function onSurface(center, radii, dir, tiltDeg, lift) {
  const d = dir.clone().normalize();
  const k = 1 / Math.sqrt((d.x / radii.x) ** 2 + (d.y / radii.y) ** 2 + (d.z / radii.z) ** 2);
  const rel = d.clone().multiplyScalar(k);
  const n = new THREE.Vector3(rel.x / radii.x ** 2, rel.y / radii.y ** 2, rel.z / radii.z ** 2).normalize();
  const up = Math.abs(n.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const x = new THREE.Vector3().crossVectors(up, n).normalize();
  const y = new THREE.Vector3().crossVectors(n, x);
  const m = new THREE.Matrix4().makeBasis(x, y, n);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(tiltDeg)));
  const pos = center.clone().add(rel).addScaledVector(n, lift);
  return { pos, q };
}

export function buildCharacter({ fur = true } = {}) {
  const mats = {
    yellow: plastic(PALETTE.yellow, 0.3),
    inner: new THREE.MeshPhysicalMaterial({ color: PALETTE.yellowInner, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color('#fff2a0') }),
    cream: plastic(PALETTE.cream, 0.18),
    nose: plastic(PALETTE.nose, 0.35),
    black: plastic(PALETTE.black, 0.08),
  };
  const F = fur;

  const root = new THREE.Group();
  root.name = 'Gopi_Root';

  // ---- body ----
  const bodyC = new THREE.Vector3(-0.05, 0.56, 0);
  const bodyR = new THREE.Vector3(0.56, 0.46, 0.5);
  const body = new THREE.Group();
  body.name = 'Body';
  at(body, bodyC.x, bodyC.y, bodyC.z);
  body.userData.origin = bodyC.clone();
  body.add(furPart('Body_Fur', ellipsoid(bodyR.x, bodyR.y, bodyR.z, 64, 48), { fur: F, len: 0.022, density: 170, seed: 1 }));
  root.add(body);

  // ---- legs (pivot at hip) ----
  const legs = {};
  [
    ['LegFL', 0.3, 0.26],
    ['LegFR', 0.3, -0.26],
    ['LegBL', -0.32, 0.28],
    ['LegBR', -0.32, -0.28],
  ].forEach(([name, x, z], i) => {
    const hip = new THREE.Vector3(x, 0.34, z);
    const leg = new THREE.Group();
    leg.name = name;
    at(leg, hip.x, hip.y, hip.z);
    const lg = ellipsoid(0.15, 0.2, 0.15, 32, 24);
    lg.translate(0, -0.12, 0);
    leg.add(furPart(name + '_Fur', lg, { fur: F, len: 0.016, density: 190, seed: 10 + i }));
    const foot = new THREE.Mesh(ellipsoid(0.19, 0.085, 0.155, 32, 20), mats.yellow);
    foot.name = name + '_Foot';
    foot.position.set(0.045, -0.27, 0);
    leg.add(foot);
    root.add(leg);
    legs[name] = leg;
  });

  // ---- tail (pom-pom) ----
  const tail = new THREE.Group();
  tail.name = 'Tail';
  at(tail, -0.55, 0.62, 0);
  tail.add(
    (() => {
      const p = furPart('Tail_Fur', ellipsoid(0.2, 0.2, 0.2, 40, 28), { fur: F, len: 0.028, density: 150, seed: 20 });
      p.position.set(-0.08, 0.12, 0);
      return p;
    })()
  );
  root.add(tail);

  // ---- head ----
  const neck = new THREE.Vector3(0.14, 0.86, 0);
  const headC = new THREE.Vector3(0.34, 1.02, 0);
  const headR = new THREE.Vector3(0.55, 0.5, 0.5);
  const head = new THREE.Group();
  head.name = 'Head';
  at(head, neck.x, neck.y, neck.z);
  const headMesh = furPart(
    'Head_Fur',
    ellipsoid(headR.x, headR.y, headR.z, 64, 48, (v) => {
      // slight snout taper toward +X, lower jaw rounder
      const t = Math.max(0, v.x / headR.x);
      v.y -= t * t * 0.05;
      v.z *= 1 - t * t * 0.18;
    }),
    { fur: F, len: 0.02, density: 175, seed: 30 }
  );
  headMesh.position.copy(headC).sub(neck);
  head.add(headMesh);
  root.add(head);

  // ears
  const earG = earGeometry();
  ['L', 'R'].forEach((side) => {
    const s = side === 'L' ? 1 : -1;
    const ear = new THREE.Group();
    ear.name = 'Ear' + side;
    ear.position.set(0.04, 1.3, s * 0.2).sub(neck);
    ear.rotation.set(s * 0.32, 0, -0.18); // out + back
    const outer = furPart('Ear' + side + '_Fur', earG, { fur: F, len: 0.014, layers: 14, density: 210, seed: 40 + s });
    ear.add(outer);
    const innerGeo = ellipsoid(0.12, 0.23, 0.03, 32, 24, (v) => {
      const t = (v.y / 0.23 + 1) / 2;
      v.x *= 1 - Math.pow(t, 1.5) * 0.85;
      v.y += 0.23;
    });
    const inner = new THREE.Mesh(innerGeo, mats.inner);
    inner.name = 'Ear' + side + '_Inner';
    inner.position.set(0.03, 0.06, s * 0.062);
    ear.add(inner);
    head.add(ear);
  });

  // mane tufts: flat lobes stepping down the back of the neck
  [
    ['Mane1', [-0.12, 1.3, 0.0], [0.17, 0.09, 0.24], -0.35],
    ['Mane2', [-0.2, 1.14, 0.0], [0.2, 0.1, 0.3], -0.5],
    ['Mane3', [-0.2, 0.97, 0.0], [0.2, 0.1, 0.33], -0.6],
    ['Mane4', [-0.1, 0.82, 0.0], [0.18, 0.09, 0.3], -0.35],
  ].forEach(([name, p, r, rotZ], i) => {
    const t = furPart(name, ellipsoid(r[0], r[1], r[2], 32, 22), { fur: F, len: 0.022, layers: 16, density: 160, seed: 50 + i });
    t.position.set(p[0], p[1], p[2]).sub(neck);
    t.rotation.z = rotZ;
    head.add(t);
  });

  // eyes (one per side, flattened, bulging out of the head)
  const eyeY = 1.02;
  ['L', 'R'].forEach((side) => {
    const s = side === 'L' ? 1 : -1;
    const eye = new THREE.Group();
    eye.name = 'Eye' + side;
    eye.position.set(0.4, eyeY, s * 0.45).sub(neck);
    eye.rotation.y = s > 0 ? 0.5 : Math.PI - 0.5; // face outward + forward
    const rim = new THREE.Mesh(ellipsoid(0.255, 0.3, 0.07, 40, 28), mats.black);
    rim.name = 'Eye' + side + '_Rim';
    eye.add(rim);
    const white = new THREE.Mesh(ellipsoid(0.235, 0.28, 0.075, 40, 28), mats.cream);
    white.name = 'Eye' + side + '_White';
    white.position.z = 0.012;
    eye.add(white);
    const pupil = new THREE.Group();
    pupil.name = 'Pupil' + side;
    pupil.position.set(-0.045, -0.035, 0.06);
    const pm = new THREE.Mesh(ellipsoid(0.1, 0.115, 0.05, 32, 24), mats.black);
    pm.name = 'Pupil' + side + '_Mesh';
    pupil.add(pm);
    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    );
    hl.name = 'Pupil' + side + '_Highlight';
    hl.position.set(0.04, 0.05, 0.04);
    pupil.add(hl);
    eye.add(pupil);
    head.add(eye);
  });

  // nose
  const nose = new THREE.Mesh(
    ellipsoid(0.085, 0.06, 0.075, 28, 20, (v) => {
      const t = (v.x / 0.085 + 1) / 2;
      v.y += t * 0.0;
      v.z *= 1 - t * 0.35;
      v.y *= 1 - t * 0.35;
    }),
    mats.nose
  );
  nose.name = 'Nose';
  nose.position.set(0.86, 0.99, 0).sub(neck);
  nose.rotation.z = 0.25;
  head.add(nose);

  // smile arcs (cream, left+right), lying on the cheek surface
  ['L', 'R'].forEach((side) => {
    const s = side === 'L' ? 1 : -1;
    const { pos, q } = onSurface(headC, headR, new THREE.Vector3(0.82, -0.42, 0.55 * s), 0, 0.02);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 12, 32, Math.PI * 0.95), mats.nose);
    arc.name = 'Smile' + side;
    arc.position.copy(pos).sub(neck);
    arc.quaternion.copy(q).multiply(eul(0, 0, Math.PI * 1.025 + s * 0.35));
    head.add(arc);
  });

  // ---- glyphs ("E" comb marks) ----
  const glyphSpecs = [
    // name, parent, center, radii, dir, tilt, size
    ['Glyph_Forehead', head, headC, headR, [-0.2, 0.52, 0.85], -10, { n: 2, W: 0.2, H: 0.17, prong: 0.062, base: 0.058 }],
    ['Glyph_Back', body, bodyC, bodyR, [0.28, 0.5, 0.82], -20, { n: 3, W: 0.4, H: 0.21, prong: 0.062, base: 0.058 }],
    ['Glyph_Flank', body, bodyC, bodyR, [-0.55, 0.05, 0.85], -28, { n: 3, W: 0.34, H: 0.2, prong: 0.056, base: 0.054 }],
    ['Glyph_Chest', body, bodyC, bodyR, [0.85, -0.08, 0.5], 22, { n: 3, W: 0.26, H: 0.14, prong: 0.046, base: 0.044 }],
  ];
  glyphSpecs.forEach(([name, parent, c, r, dir, tilt, sz]) => {
    ['L', 'R'].forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const d = new THREE.Vector3(dir[0], dir[1], dir[2] * s);
      const { pos, q } = onSurface(c, r, d, s * tilt, 0.012);
      const geo = glyphGeometry(sz.n, sz.W, sz.H, sz.prong, sz.base, 0.07);
      const m = new THREE.Mesh(geo, mats.yellow);
      m.name = name + '_' + side;
      m.position.copy(pos).sub(parent.userData.origin || parent.position);
      m.quaternion.copy(q);
      parent.add(m);
    });
  });

  // soft grounding shadow-catcher is handled by the viewer
  root.userData.rig = { body, head, tail, legs };
  return root;
}

/** Remove viewer-only fur shells for clean GLB export. */
export function stripFur(root) {
  const rm = [];
  root.traverse((o) => o.userData.isFur && rm.push(o));
  rm.forEach((o) => o.parent.remove(o));
}

// ---------- animations (AnimationClips, exported to GLB as well) ----------

const qTrack = (node, times, eulers) =>
  new THREE.QuaternionKeyframeTrack(
    node + '.quaternion',
    times,
    eulers.flatMap((e) => eul(...e).toArray())
  );
const vTrack = (node, prop, times, vals) =>
  new THREE.VectorKeyframeTrack(node + '.' + prop, times, vals.flat());

export function buildClips(root) {
  const pos = (n) => root.getObjectByName(n).position.toArray();
  const rot = (n) => {
    const o = root.getObjectByName(n);
    return [o.rotation.x, o.rotation.y, o.rotation.z];
  };
  const headP = pos('Head'), bodyP = pos('Body'), rootP = [0, 0, 0];
  const ears = { L: rot('EarL'), R: rot('EarR') };

  // IDLE – 4 s loop: breathing, head sway, ear twitch, tail wag, blink
  const T = [0, 1, 2, 3, 4];
  const idle = new THREE.AnimationClip('Idle', 4, [
    vTrack('Body', 'scale', T, [[1, 1, 1], [1.012, 1.025, 1.012], [1, 1, 1], [1.012, 1.025, 1.012], [1, 1, 1]]),
    qTrack('Head', T, [[0, 0, 0], [0, 0.12, 0.03], [0, 0, 0.05], [0, -0.12, 0.02], [0, 0, 0]]),
    qTrack('EarL', [0, 1.6, 1.7, 1.8, 4], [ears.L, ears.L, [ears.L[0], ears.L[1], ears.L[2] - 0.28], ears.L, ears.L]),
    qTrack('EarR', [0, 2.6, 2.7, 2.8, 4], [ears.R, ears.R, [ears.R[0], ears.R[1], ears.R[2] - 0.28], ears.R, ears.R]),
    qTrack('Tail', [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4], [
      [0, 0, 0], [0.2, 0, 0], [0, 0, 0], [-0.2, 0, 0], [0, 0, 0], [0.2, 0, 0], [0, 0, 0], [-0.2, 0, 0], [0, 0, 0],
    ]),
    vTrack('EyeL', 'scale', [0, 3.0, 3.07, 3.14, 4], [[1, 1, 1], [1, 1, 1], [1, 0.08, 1], [1, 1, 1], [1, 1, 1]]),
    vTrack('EyeR', 'scale', [0, 3.0, 3.07, 3.14, 4], [[1, 1, 1], [1, 1, 1], [1, 0.08, 1], [1, 1, 1], [1, 1, 1]]),
  ]);

  // WALK – 1 s loop (diagonal gait) + body bob
  const W = [0, 0.25, 0.5, 0.75, 1];
  const sw = 0.55;
  const walk = new THREE.AnimationClip('Walk', 1, [
    qTrack('LegFL', W, [[0, 0, -sw], [0, 0, 0], [0, 0, sw], [0, 0, 0], [0, 0, -sw]]),
    qTrack('LegBR', W, [[0, 0, -sw], [0, 0, 0], [0, 0, sw], [0, 0, 0], [0, 0, -sw]]),
    qTrack('LegFR', W, [[0, 0, sw], [0, 0, 0], [0, 0, -sw], [0, 0, 0], [0, 0, sw]]),
    qTrack('LegBL', W, [[0, 0, sw], [0, 0, 0], [0, 0, -sw], [0, 0, 0], [0, 0, sw]]),
    vTrack('Gopi_Root', 'position', W, [[0, 0, 0], [0, 0.03, 0], [0, 0, 0], [0, 0.03, 0], [0, 0, 0]]),
    qTrack('Body', W, [[0.03, 0, 0.02], [0, 0, 0], [-0.03, 0, -0.02], [0, 0, 0], [0.03, 0, 0.02]]),
    qTrack('Head', W, [[0, 0, 0.04], [0, 0, 0], [0, 0, -0.04], [0, 0, 0], [0, 0, 0.04]]),
    qTrack('Tail', W, [[0.25, 0, 0], [0, 0, 0], [-0.25, 0, 0], [0, 0, 0], [0.25, 0, 0]]),
  ]);

  // HOP – 1.2 s, squash & stretch, ears trail
  const H = [0, 0.2, 0.45, 0.7, 0.9, 1.2];
  const hop = new THREE.AnimationClip('Hop', 1.2, [
    vTrack('Gopi_Root', 'position', H, [[0, 0, 0], [0, -0.04, 0], [0, 0.42, 0], [0, 0.42, 0], [0, 0, 0], [0, 0, 0]]),
    vTrack('Gopi_Root', 'scale', H, [[1, 1, 1], [1.1, 0.88, 1.1], [0.92, 1.12, 0.92], [0.95, 1.06, 0.95], [1.12, 0.84, 1.12], [1, 1, 1]]),
    qTrack('LegFL', H, [[0, 0, 0], [0, 0, 0], [0, 0, 0.5], [0, 0, 0.5], [0, 0, 0], [0, 0, 0]]),
    qTrack('LegFR', H, [[0, 0, 0], [0, 0, 0], [0, 0, 0.5], [0, 0, 0.5], [0, 0, 0], [0, 0, 0]]),
    qTrack('LegBL', H, [[0, 0, 0], [0, 0, 0], [0, 0, -0.5], [0, 0, -0.5], [0, 0, 0], [0, 0, 0]]),
    qTrack('LegBR', H, [[0, 0, 0], [0, 0, 0], [0, 0, -0.5], [0, 0, -0.5], [0, 0, 0], [0, 0, 0]]),
    qTrack('Head', H, [[0, 0, 0], [0, 0, -0.12], [0, 0, 0.18], [0, 0, 0.1], [0, 0, -0.12], [0, 0, 0]]),
    qTrack('EarL', H, [ears.L, ears.L, [ears.L[0], 0, ears.L[2] - 0.35], [ears.L[0], 0, ears.L[2] - 0.2], ears.L, ears.L]),
    qTrack('EarR', H, [ears.R, ears.R, [ears.R[0], 0, ears.R[2] - 0.35], [ears.R[0], 0, ears.R[2] - 0.2], ears.R, ears.R]),
    qTrack('Tail', H, [[0, 0, 0], [0.2, 0, 0], [-0.4, 0, 0], [-0.3, 0, 0], [0.3, 0, 0], [0, 0, 0]]),
  ]);

  return [idle, walk, hop];
}
