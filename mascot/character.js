// GOPINYA mascot – procedural 3D character.
// Single source of truth: used by the viewer (index.html) and the GLB export.
// Axes: +X = looking direction, +Y = up, +Z = character's left side (viewer side in side view).
// Units: 1.0 = approx. 0.67 of total height (total height ~1.6).

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const PALETTE = {
  furBase: '#06071a',
  fur: '#0e1033',
  furTip: '#191c4a',
  yellow: '#d9ac38',
  yellowInner: '#d99a2e',
  cream: '#f3e1bb',
  nose: '#f1dab4',
  lid: '#dcbc88',
  foot: '#cfa850',
  black: '#07070d',
  rim: '#ffb52e',
};

// ---------- geometry helpers ----------

function smooth(g) {
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  return m;
}

/** Blend a scaled-sphere vertex toward a superellipsoid (boxier plush-toy block). */
export function boxy(v, r, p = 4, k = 0.5) {
  const nx = Math.abs(v.x / r.x), ny = Math.abs(v.y / r.y), nz = Math.abs(v.z / r.z);
  const f = 1 / Math.pow(Math.pow(nx, p) + Math.pow(ny, p) + Math.pow(nz, p), 1 / p);
  const m = 1 + (f - 1) * k;
  v.x *= m; v.y *= m; v.z *= m;
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
  const bevel = Math.min(prong, baseH) * 0.36;
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

/** Flat crescent (smile): lower part of circle A (r=R) minus circle B shifted up by h. Smooth subdivided strip, local XY, bent along Z to hug a curved surface. */
export function crescentGeometry(R, h, depth, bend = 0, bendY = 0) {
  const al = Math.asin(h / (2 * R));
  const N = 64, M = 8;
  const pos = [];
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const aA = Math.PI - al + t * (Math.PI + 2 * al);
    const aB = Math.PI + al + t * (Math.PI - 2 * al);
    const A = [R * Math.cos(aA), R * Math.sin(aA)];
    const B = [R * Math.cos(aB), h + R * Math.sin(aB)];
    for (let j = 0; j <= M; j++) {
      const u = j / M;
      pos.push(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, 0);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j, b = a + 1, c = a + M + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeBoundingBox();
  const cy = (g.boundingBox.max.y + g.boundingBox.min.y) / 2;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) - cy;
    p.setXYZ(i, x, y, depth * 0.5 - bend * x * x - bendY * y * y);
  }
  g.computeVertexNormals();
  return g;
}

function earGeometry() {
  // flat, rounded triangle: thickness along X, width along Z, height along Y (origin at base)
  const r = { x: 0.1, y: 0.23, z: 0.28 };
  return ellipsoid(r.x, r.y, r.z, 36, 28, (v) => {
    const t = (v.y / r.y + 1) / 2;
    v.z *= 1 - Math.pow(t, 1.8) * 0.72;
    v.x *= 1 - t * 0.5;
    v.y += r.y;
  });
}

// ---------- materials ----------

function furMat(color = PALETTE.fur) {
  color = new THREE.Color(color).multiplyScalar(0.85);
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.92,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(PALETTE.furTip),
  });
}
function plastic(color, rough = 0.28, glow = 0.3) {
  return new THREE.MeshStandardMaterial({ color, roughness: Math.max(rough, 0.55), metalness: 0, emissive: new THREE.Color(color), emissiveIntensity: glow });
}
function plasticOld(color, rough = 0.28) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: rough,
    metalness: 0,
    clearcoat: 0.25,
    clearcoatRoughness: 0.4,
  });
}

// ---------- fur shells (viewer only; stripped for GLB export) ----------

export const FUR = { layerScale: 1.5 };

export const furUniforms = {
  uTime: { value: 0 },
  uRimStrength: { value: 0.9 },
  uRimColor: { value: new THREE.Color(PALETTE.rim) },
  uKeyDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() },
};

const SHELL_VS = /* glsl */ `
  uniform float uLayer, uLen, uTime;
  varying vec3 vObj, vN, vV, vNo, vM0, vM1, vM2;
  void main(){
    vec3 t = normalize(cross(normal, vec3(0.0,1.0,0.001)));
    vec3 b = cross(normal, t);
    vec3 p = position + normal * uLen * uLayer;
    p.y -= uLen * uLayer * uLayer * 0.35;                // gravity droop
    p += (t * sin(position.y*38.0 + position.x*31.0) + b * cos(position.z*35.0 + position.y*29.0)) * uLen * 0.5 * uLayer; // curl
    p.x += sin(uTime*1.3 + position.y*6.0) * 0.003 * uLayer; // breeze
    vObj = position; vNo = normal;
    vM0 = normalMatrix[0]; vM1 = normalMatrix[1]; vM2 = normalMatrix[2];
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;
const SHELL_FS = /* glsl */ `
  uniform float uLayer, uSeed, uDensity, uClump;
  uniform vec3 uBase, uMid, uTip, uRimColor, uKeyDir;
  uniform float uRimStrength;
  varying vec3 vObj, vN, vV, vNo, vM0, vM1, vM2;
  float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  void main(){
    // fine strands
    vec3 q = vObj * uDensity + uSeed;
    vec3 c = floor(q);
    float hs = mix(0.35, 1.0, hash(c));
    vec3 jit = vec3(hash(c+7.1), hash(c+13.7), hash(c+23.3)) - 0.5;
    vec3 f = fract(q) - 0.5 - jit*0.55;
    float d = length(f);
    // boucle loops: rounded clumps that raise the pile
    vec3 q2 = vObj * uClump + uSeed*1.7;
    vec3 c2 = floor(q2);
    vec3 j2 = vec3(hash(c2+3.1), hash(c2+9.7), hash(c2+17.3)) - 0.5;
    vec3 f2 = fract(q2) - 0.5 - j2*0.7;
    float bump = 1.0 - smoothstep(0.05, 0.85, length(f2));
    float h = hs * mix(0.45, 1.0, bump);
    float thick = mix(0.66, 0.3, uLayer);
    if (uLayer > 0.0 && (h < uLayer || d > thick)) discard;

    // shading: perturbed normal from the loop shape, soft wrap light, root occlusion, sheen
    vec3 grad = vM0*f2.x + vM1*f2.y + vM2*f2.z;
    vec3 n = normalize(normalize(vN) + grad * 0.9 * (0.4 + uLayer));
    vec3 L = normalize(uKeyDir);
    float ndl = dot(n, L);
    float diff = max(ndl, 0.0);
    float wrap = max(ndl*0.5 + 0.5, 0.0);
    float amb = 0.42 + 0.3*n.y*0.5;
    float ao = mix(0.35, 1.0, smoothstep(0.0, 0.85, uLayer)) * mix(0.62, 1.0, bump);
    float under = mix(0.55, 1.0, smoothstep(-0.8, 0.3, normalize(vNo).y));
    vec3 col = mix(uBase, uMid, smoothstep(0.0, 0.5, uLayer));
    col *= 0.8 + 0.4 * hash(floor(vObj*34.0));
    col = mix(col, uTip, smoothstep(0.5, 1.0, uLayer) * (0.4 + 0.6*bump));
    col *= (amb + diff*0.55 + wrap*0.2) * ao * under;
    vec3 H = normalize(L + normalize(vV));
    col += uTip * pow(max(dot(n, H), 0.0), 18.0) * 0.35 * uLayer;
    float fres = pow(1.0 - max(dot(n, normalize(vV)),0.0), 4.5);
    col += uRimColor * fres * uRimStrength * (0.2 + uLayer*1.1);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

function makeShells(geometry, { len = 0.05, layers = 24, density = 70, seed = 0, tint, clump = 26, colors } = {}) {
  layers = Math.round(layers * FUR.layerScale);
  const grp = new THREE.Group();
  grp.name = 'FurShells';
  grp.userData.isFur = true;
  const base = colors ? new THREE.Color(colors[0]) : new THREE.Color(PALETTE.fur).multiplyScalar(0.8);
  const mid = colors ? new THREE.Color(colors[1]) : new THREE.Color(PALETTE.fur).lerp(new THREE.Color(PALETTE.furTip), 0.25);
  const tip = colors ? new THREE.Color(colors[2]) : new THREE.Color(tint || PALETTE.furTip);
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
        uClump: { value: clump },
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
function onSurface(center, radii, dir, tiltDeg, lift, boxyK = 0) {
  const d = dir.clone().normalize();
  const k = 1 / Math.sqrt((d.x / radii.x) ** 2 + (d.y / radii.y) ** 2 + (d.z / radii.z) ** 2);
  const rel = d.clone().multiplyScalar(k);
  if (boxyK) boxy(rel, radii, 4, boxyK);
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
    yellow: new THREE.MeshPhysicalMaterial({ color: PALETTE.yellow, metalness: 0.7, roughness: 0.3, emissive: new THREE.Color(PALETTE.yellow), emissiveIntensity: 0.12, envMapIntensity: 3 }),
    inner: new THREE.MeshPhysicalMaterial({ color: PALETTE.yellowInner, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color('#f7d98a'), emissive: new THREE.Color(PALETTE.yellowInner), emissiveIntensity: 0.35 }),
    cream: new THREE.MeshPhysicalMaterial({ color: PALETTE.cream, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.2, emissive: new THREE.Color(PALETTE.cream), emissiveIntensity: 0.22 }),
    nose: Object.assign(plastic(PALETTE.nose, 0.6, 0.25), { side: THREE.DoubleSide }),
    lid: plastic(PALETTE.lid, 0.6, 0.4),
    black: plastic(PALETTE.black, 0.6, 0),
    foot: plastic(PALETTE.foot, 0.6, 0.18),
  };
  const F = fur;
  const root = new THREE.Group();
  root.name = 'Gopi_Root';

  // ---- body: barrel, narrower toward the neck ----
  const bodyC = new THREE.Vector3(-0.06, 0.78, 0);
  const bodyR = new THREE.Vector3(0.72, 0.38, 0.35);
  const body = new THREE.Group();
  body.name = 'Body';
  at(body, bodyC.x, bodyC.y, bodyC.z);
  body.userData.origin = bodyC.clone();
  body.add(
    furPart(
      'Body_Fur',
      ellipsoid(bodyR.x, bodyR.y, bodyR.z, 112, 80, (v) => {
        boxy(v, bodyR, 4, 0.55);
        const t = Math.max(0, v.y / bodyR.y);
        v.z *= 1 - t * 0.1;
      }),
      { fur: F, len: 0.028, density: 95, seed: 1 }
    )
  );
  root.add(body);

  // ---- legs: straight pillars with round tan foot caps (pivot at hip) ----
  const legs = {};
  [
    ['LegFL', 0.38, 0.19],
    ['LegFR', 0.38, -0.19],
    ['LegBL', -0.55, 0.2],
    ['LegBR', -0.55, -0.2],
  ].forEach(([name, x, z], i) => {
    const hip = new THREE.Vector3(x, 0.5, z);
    const leg = new THREE.Group();
    leg.name = name;
    at(leg, hip.x, hip.y, hip.z);
    const lg = ellipsoid(0.14, 0.27, 0.14, 32, 24, (v) => {
      const ny = v.y / 0.27;
      const k = 1 + (1 - Math.min(1, ny * ny)) * 0.0; // pillar silhouette
      v.x *= k; v.z *= k;
    });
    lg.translate(0, -0.17, 0);
    leg.add(furPart(name + '_Fur', lg, { fur: F, len: 0.026, density: 105, seed: 10 + i }));
    const foot = new THREE.Mesh(ellipsoid(0.136, 0.074, 0.136, 32, 20), mats.foot);
    foot.name = name + '_Foot';
    foot.position.set(0.012, -0.425, 0);
    leg.add(foot);
    root.add(leg);
    legs[name] = leg;
  });

  // ---- tail (pom-pom, high on the rump) ----
  const tail = new THREE.Group();
  tail.name = 'Tail';
  at(tail, -0.78, 1.12, 0);
  const pom = furPart('Tail_Fur', ellipsoid(0.16, 0.16, 0.16, 40, 28), { fur: F, len: 0.034, density: 95, seed: 20 });
  pom.position.set(-0.03, 0.06, 0);
  tail.add(pom);
  root.add(tail);

  // ---- head: big, wide, sits on the body like a cap ----
  const neck = new THREE.Vector3(0.16, 1.07, 0);
  const headC = new THREE.Vector3(0.38, 1.43, 0);
  const headR = new THREE.Vector3(0.52, 0.37, 0.48);
  const head = new THREE.Group();
  head.name = 'Head';
  at(head, neck.x, neck.y, neck.z);
  const headMesh = furPart(
    'Head_Fur',
    ellipsoid(headR.x, headR.y, headR.z, 112, 80, (v) => {
      // squarer, flatter-topped "plush block" head
      boxy(v, headR, 4, 0.5);
    }),
    { fur: F, len: 0.028, density: 95, seed: 30 }
  );
  headMesh.position.copy(headC).sub(neck);
  head.add(headMesh);
  root.add(head);

  // ears: upright rounded triangles, set on the top corners, gold inside facing forward
  const earG = earGeometry();
  ['L', 'R'].forEach((side) => {
    const s = side === 'L' ? 1 : -1;
    const ear = new THREE.Group();
    ear.name = 'Ear' + side;
    ear.position.set(0.21, 1.65, s * 0.3).sub(neck);
    ear.rotation.set(s * 0.14, 0, 0.1); // lean outward and slightly back
    ear.add(furPart('Ear' + side + '_Fur', earG, { fur: F, len: 0.018, layers: 16, density: 150, seed: 40 + s }));
    const innerGeo = ellipsoid(0.042, 0.17, 0.155, 28, 22, (v) => {
      const t = (v.y / 0.17 + 1) / 2;
      v.z *= 1 - Math.pow(t, 1.6) * 0.75;
      v.y += 0.17;
    });
    const inner = furPart('Ear' + side + '_Inner', innerGeo, { fur: F, color: PALETTE.yellowInner, len: 0.012, layers: 10, density: 220, clump: 45, seed: 60 + s, colors: ['#8f5f20', '#c98f30', '#efc060'] });
    inner.position.set(0.062, 0.03, 0);
    ear.add(inner);
    head.add(ear);
  });

  // mane: three small stepped fur lobes down the back of the head
  [
    ['Mane1', [-0.01, 1.67, 0.0], [0.13, 0.09, 0.24], -0.3],
    ['Mane2', [-0.09, 1.51, 0.0], [0.14, 0.095, 0.27], -0.45],
    ['Mane3', [-0.05, 1.35, 0.0], [0.13, 0.09, 0.25], -0.3],
  ].forEach(([name, p, r, rotZ], i) => {
    const t = furPart(name, ellipsoid(r[0], r[1], r[2], 28, 20), { fur: F, len: 0.024, layers: 18, density: 120, seed: 50 + i });
    t.position.set(p[0], p[1], p[2]).sub(neck);
    t.rotation.z = rotZ;
    head.add(t);
  });

  // ---- eyes: inset oval patches on the front-sides, heavy lid, pupils toward the nose ----
  ['L', 'R'].forEach((side) => {
    const s = side === 'L' ? 1 : -1;
    const bendEye = (v) => { v.z -= 1.2 * v.x * v.x + 1.35 * v.y * v.y; };
    const eye = new THREE.Group();
    eye.name = 'Eye' + side;
    const az = THREE.MathUtils.degToRad(38);
    const ep = onSurface(headC, headR, new THREE.Vector3(Math.cos(az), -0.1, Math.sin(az) * s), 0, 0.03, 0.35);
    eye.position.copy(ep.pos).sub(neck);
    eye.quaternion.copy(ep.q);
    const rim = new THREE.Mesh(ellipsoid(0.143, 0.178, 0.02, 48, 32, bendEye), mats.black);
    rim.name = 'Eye' + side + '_Rim';
    eye.add(rim);
    const white = new THREE.Mesh(ellipsoid(0.138, 0.173, 0.024, 48, 32, bendEye), mats.cream);
    white.name = 'Eye' + side + '_White';
    white.position.z = 0.006;
    eye.add(white);
    const pupil = new THREE.Group();
    pupil.name = 'Pupil' + side;
    pupil.position.set(0.046 * s, -0.034, 0.018);
    const pm = new THREE.Mesh(ellipsoid(0.064, 0.068, 0.02, 32, 24, bendEye), mats.black);
    pm.name = 'Pupil' + side + '_Mesh';
    pupil.add(pm);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    hl.name = 'Pupil' + side + '_Highlight';
    hl.position.set(-0.014, 0.02, 0.02);
    pupil.add(hl);
    eye.add(pupil);
    // heavy upper lid, slopes down toward the nose
    const lidGeo = ellipsoid(0.141, 0.175, 0.028, 48, 32, (v) => { if (v.y < 0.05) v.y = 0.05; bendEye(v); });
    const lid = new THREE.Group();
    lid.name = 'Lid' + side;
    lid.rotation.z = -0.13 * s;
    const lidMesh = new THREE.Mesh(lidGeo, mats.lid);
    lidMesh.name = 'Lid' + side + '_Mesh';
    lidMesh.position.z = 0.008;
    lid.add(lidMesh);
    const lidLine = new THREE.Mesh(ellipsoid(0.128, 0.004, 0.006, 40, 8, bendEye), mats.black);
    lidLine.name = 'Lid' + side + '_Line';
    lidLine.position.set(0, 0.05, 0.02);
    lid.add(lidLine);
    eye.add(lid);
    head.add(eye);
  });

  // ---- muzzle, nose, mouth: centered on the face front ----
  const muzC = new THREE.Vector3(0.78, 1.36, 0);
  const muzR = new THREE.Vector3(0.15, 0.13, 0.17);
  const muzzle = furPart('Muzzle', ellipsoid(muzR.x, muzR.y, muzR.z, 40, 28), { fur: F, len: 0.014, density: 160, seed: 35 });
  muzzle.position.copy(muzC).sub(neck);
  head.add(muzzle);

  // nose: cream shield pad (wide top, narrower bottom) on top-front of the muzzle
  const nose = new THREE.Mesh(
    ellipsoid(0.04, 0.056, 0.085, 32, 22, (v) => { v.z *= 1 + 0.42 * (v.y / 0.056); }),
    mats.nose
  );
  nose.name = 'Nose';
  nose.position.set(0.926, 1.428, 0).sub(neck);
  nose.rotation.z = 0.35;
  head.add(nose);

  // mouth: one wide flat crescent (smile), bent around the muzzle
  {
    const { pos, q } = onSurface(muzC, muzR, new THREE.Vector3(1, -0.2, 0), 0, 0.03);
    const mouth = new THREE.Mesh(crescentGeometry(0.125, 0.07, 0.014, 2.9, 3.8), mats.nose);
    mouth.name = 'Mouth';
    mouth.position.copy(pos).sub(neck);
    mouth.quaternion.copy(q);
    head.add(mouth);
  }

  // ---- glyphs: thin raised gold comb letters ----
  // glyph layout in normalized side-surface coordinates (Xn along the body, + = toward the chest; Yn = height), as in the reference frames
  const sideDir = (Xn, Yn) => [Xn, Yn, Math.sqrt(Math.max(0.04, 1 - Xn * Xn - Yn * Yn))];
  const glyphSpecs = [
    // name, parent, center, radii, dir, tilt(deg), size, sides
    ['Glyph_Forehead', head, headC, headR, [-0.3, 0.3, 0.9], -20, { n: 2, W: 0.16, H: 0.13, prong: 0.03, base: 0.03 }],
    ['Glyph_Mid', body, bodyC, bodyR, sideDir(0.26, 0.1), -3, { n: 3, W: 0.48, H: 0.16, prong: 0.034, base: 0.034 }],
    ['Glyph_Shoulder', body, bodyC, bodyR, sideDir(0.72, 0.45), -5, { n: 3, W: 0.3, H: 0.11, prong: 0.03, base: 0.03 }],
    ['Glyph_Back', body, bodyC, bodyR, sideDir(-0.3, 0.6), 22, { n: 3, W: 0.3, H: 0.11, prong: 0.03, base: 0.03 }],
    ['Glyph_Low', body, bodyC, bodyR, sideDir(-0.36, -0.02), 12, { n: 3, W: 0.24, H: 0.1, prong: 0.028, base: 0.028 }],
    ['Glyph_Rump', body, bodyC, bodyR, sideDir(-0.85, 0.25), 80, { n: 3, W: 0.28, H: 0.11, prong: 0.028, base: 0.028 }],
    ['Glyph_ChestHigh', body, bodyC, bodyR, [1, 0.25, 0.3], -3, { n: 3, W: 0.32, H: 0.11, prong: 0.03, base: 0.03 }, ['R']],
    ['Glyph_ChestLow', body, bodyC, bodyR, [1, -0.2, 0.3], 4, { n: 3, W: 0.42, H: 0.14, prong: 0.034, base: 0.034 }, ['L']],
  ];

  glyphSpecs.forEach(([name, parent, c, r, dir, tilt, sz, sides]) => {
    (sides || ['L', 'R']).forEach((side) => {
      const s = side === 'L' ? 1 : -1;
      const d = new THREE.Vector3(dir[0], dir[1], dir[2] * s);
      const { pos, q } = onSurface(c, r, d, s * tilt, 0.034, parent === body ? 0.55 : 0.5);
      const geo = glyphGeometry(sz.n, sz.W, sz.H, sz.prong, sz.base, 0.022);
      const m = new THREE.Mesh(geo, mats.yellow);
      m.name = name + '_' + side;
      m.position.copy(pos).sub(parent.userData.origin || parent.position);
      m.quaternion.copy(q);
      parent.add(m);
    });
  });

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
