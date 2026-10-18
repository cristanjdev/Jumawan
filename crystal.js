// Crystal Core: the 3D version of the logo, as a reusable Three.js object.
//   const crystal = createCrystal({ pixelRatio: renderer.getPixelRatio() });
//   scene.add(crystal.object);
//   each frame: crystal.update(dt);
// Needs bloom (UnrealBloomPass) in the page for the glow.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- palette (from the logo) ----------
export const C = {
  line:  new THREE.Color('#01050d'),   // black outlines
  navy:  new THREE.Color('#06183a'),   // dark glass
  deep:  new THREE.Color('#0d3fe0'),   // electric blue plasma
  cyan:  new THREE.Color('#2fc8ff'),   // main glow
  light: new THREE.Color('#b8f6ff'),   // bright facets
  void:  new THREE.Color('#010309'),   // centre
};

// ---------- shared GLSL ----------
const COMMON = /* glsl */`
float hash(float n){ return fract(sin(n) * 43758.5453); }
float hash3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const BASE_VERT = /* glsl */`
varying vec3 vPos; varying vec3 vObjN; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main(){
  vPos = position; vUv = uv; vObjN = normal;
  vN = normalMatrix * normal;
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const uniforms = {
  uTime: { value: 0 },
  cLine: { value: C.line }, cNavy: { value: C.navy }, cDeep: { value: C.deep },
  cCyan: { value: C.cyan }, cLight: { value: C.light },
};

function shader(fragmentShader, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...uniforms, ...(opts.uniforms || {}) },
    vertexShader: BASE_VERT,
    fragmentShader: COMMON + fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: opts.side ?? THREE.FrontSide,
  });
}

// Real 3D tubes along a geometry's edges (WebGL lines are always 1px),
// merged into a single mesh so each outline is one draw call.
const lineMat = new THREE.MeshBasicMaterial({ color: C.line });
function edgeTubes(geo, radius) {
  const pos = new THREE.EdgesGeometry(geo, 1).attributes.position;
  const parts = [];
  const seen = new Set();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion(), m = new THREE.Matrix4();
  const addJoint = (v) => {
    const k = v.toArray().map((n) => n.toFixed(3)).join();
    if (seen.has(k)) return;
    seen.add(k);
    parts.push(new THREE.SphereGeometry(radius, 10, 6).translate(v.x, v.y, v.z));
  };
  for (let i = 0; i < pos.count; i += 2) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    q.setFromUnitVectors(up, b.clone().sub(a).normalize());
    m.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, a.distanceTo(b), 1));
    parts.push(new THREE.CylinderGeometry(radius, radius, 1, 8, 1, true).applyMatrix4(m));
    addJoint(a); addJoint(b);
  }
  return new THREE.Mesh(mergeGeometries(parts.map((g) => g.toNonIndexed())), lineMat);
}

// Flat-shaded facets (one normal per triangle) for the gem look.
function faceted(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  return g;
}

// ---------- sparks ----------
export function sparkField(count, rMin, rMax, size, bright, pixelRatio = 1) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.randomDirection().multiplyScalar(rMin + Math.random() * (rMax - rMin));
    v.toArray(pos, i * 3);
    seed[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uPR: { value: pixelRatio }, uSize: { value: size }, uBright: { value: bright } },
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uPR, uSize; varying float vA;
      void main(){
        vec3 p = position;
        float a = uTime * .15 * (.4 + aSeed);
        p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        vA = .5 + .5 * sin(uTime * 2.5 * (.5 + aSeed) + aSeed * 40.);
        gl_PointSize = uSize * (.4 + aSeed) * uPR / -mv.z;
      }`,
    fragmentShader: /* glsl */`
      uniform float uBright; varying float vA;
      void main(){
        float a = pow(1. - smoothstep(0., .5, length(gl_PointCoord - .5)), 2.);
        gl_FragColor = vec4(vec3(.55, .95, 1.) * a * vA * uBright, 1.);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  pts.renderOrder = 8;
  return pts;
}

// ---------- the crystal ----------
export function createCrystal({ pixelRatio = 1, turntable = true } = {}) {
  // ---------- hierarchy ----------
  // spin: turntable around world Y. pivot: aims the cube's corner at the camera
  // so the resting pose is the hexagon silhouette of the logo.
  const spin = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().lookAt(new THREE.Vector3(1, 1, 1), new THREE.Vector3(), new THREE.Vector3(0, 1, 0))
  ).invert();
  spin.add(pivot);

  // ---------- outer cube ----------
  const CUBE = 3;
  const cubeGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);

  // mosaic of triangular shards on each face, like the stained-glass corners of the logo
  const FACE_PATTERN = /* glsl */`
    uniform vec3 cLine, cNavy, cDeep, cCyan, cLight; uniform float uTime;
    varying vec3 vObjN; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
    void facePattern(out float h, out float r, out float edge){
      vec2 c = vUv - .5;
      r = max(abs(c.x), abs(c.y)) * 2.;
      float sec = floor((atan(c.y, c.x) + 3.14159265) / .7853982);
      float band = floor(r * 3.);
      h = hash(sec * 7.13 + band * 13.71 + hash3(vObjN * 7.) * 91.);
      edge = exp(-(1. - r) * 28.);
    }
    varying vec3 vPos;
    float innerLight(){ return pow(smoothstep(2.4, 1.5, length(vPos)), 1.6); }`;

  const cubeBack = shader(FACE_PATTERN + /* glsl */`
    void main(){
      float h, r, edge; facePattern(h, r, edge);
      vec3 col = mix(cNavy * .35, cDeep * .3, h * .6);
      col = mix(col, cCyan * .8, step(.8, h) * smoothstep(.35, 1., r) * .6);
      col = mix(col, cCyan * (.5 + h * .6), innerLight() * .6);
      col += cCyan * edge * .5;
      gl_FragColor = vec4(col, .94);
    }`, { side: THREE.BackSide });

  const cubeFront = shader(FACE_PATTERN + /* glsl */`
    void main(){
      float h, r, edge; facePattern(h, r, edge);
      float rim = 1. - abs(dot(normalize(vN), normalize(vV)));
      float sweep = 1. - smoothstep(0., .05, abs(fract((vUv.x + vUv.y) * .5 - uTime * .06) - .5));
      vec3 col = cCyan * edge * .5
               + cLight * innerLight() * (.04 + step(.6, h) * .12)
               + cLight * step(.88, h) * smoothstep(.45, 1., r) * .14
               + cCyan * (rim * .05 + sweep * .05);
      gl_FragColor = vec4(col, 1.);
    }`, { additive: true });

  const back = new THREE.Mesh(cubeGeo, cubeBack);
  back.renderOrder = 0;
  const front = new THREE.Mesh(cubeGeo, cubeFront);
  front.renderOrder = 10;
  pivot.add(back, front, edgeTubes(cubeGeo, 0.05));

  // ---------- gem shells ----------
  // Facets facing the viewer stay dark, facets turning edge-on light up cyan:
  // that is what draws the bright ring with the black void in the middle.
  function gemShell(geo, { alphaMin, alphaMax, seed, line, order }) {
    const mat = shader(/* glsl */`
      uniform vec3 cNavy, cCyan, cLight; uniform float uTime, uAMin, uAMax, uSeed;
      varying vec3 vObjN; varying vec3 vN; varying vec3 vV;
      void main(){
        float rim = 1. - abs(dot(normalize(vN), normalize(vV)));
        float h = hash3(floor(normalize(vObjN) * 40.) + uSeed);
        float lit = smoothstep(.12, .7, rim + (h - .5) * .3);
        vec3 col = mix(cNavy * .5, cCyan, lit);
        col = mix(col, cLight, smoothstep(.45, 1., lit) * (.45 + step(.4, h) * .5));
        col += cLight * pow(max(0., sin(uTime * 1.1 + h * 25.)), 30.) * lit * .8;
        gl_FragColor = vec4(col, mix(uAMin, uAMax, lit));
      }`, { uniforms: { uAMin: { value: alphaMin }, uAMax: { value: alphaMax }, uSeed: { value: seed } } });
    const g = new THREE.Group();
    const m = new THREE.Mesh(faceted(geo), mat);
    m.renderOrder = order;
    g.add(m, edgeTubes(geo, line));
    return g;
  }

  const outerGem = gemShell(new THREE.IcosahedronGeometry(1.5, 1), { alphaMin: 0.04, alphaMax: 0.82, seed: 1, line: 0.02, order: 6 });
  const innerGem = gemShell(new THREE.IcosahedronGeometry(1.08, 0), { alphaMin: 0.1, alphaMax: 0.9, seed: 7, line: 0.022, order: 4 });
  innerGem.rotation.set(0.3, 0.5, 0);
  pivot.add(outerGem, innerGem);

  // black void in the centre
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 32), new THREE.MeshBasicMaterial({ color: C.void }));
  pivot.add(core);

  // ---------- electric plasma band ----------
  const plasma = new THREE.Mesh(new THREE.SphereGeometry(1.44, 64, 40), shader(/* glsl */`
    uniform vec3 cDeep, cCyan; uniform float uTime;
    varying vec3 vPos; varying vec3 vN; varying vec3 vV;
    void main(){
      float rim = 1. - abs(dot(normalize(vN), normalize(vV)));
      float band = smoothstep(.12, .5, rim) * (1. - smoothstep(.88, 1., rim));
      vec3 p = vPos * 1.8;
      float t = uTime * .25;
      float n1 = 1. - abs(snoise(p + vec3(0., t, 0.)));
      float n2 = 1. - abs(snoise(p * 2.6 - vec3(t * 1.4, 0., t)));
      float veins = pow(n1, 18.) + pow(n2, 22.) * .9;
      float cloud = snoise(p * .6 + t * .4) * .5 + .5;
      vec3 col = cDeep * (.3 + cloud * .7) * band * .9 + cCyan * veins * band * 1.8;
      gl_FragColor = vec4(col, 1.);
    }`, { additive: true }));
  plasma.renderOrder = 5;
  pivot.add(plasma);

  // thin black arcs like the curved strokes in the logo
  const arcs = new THREE.Group();
  [[Math.PI / 2, 0, 0], [0.5, 1.1, 0], [-0.6, -1.0, 0.4]].forEach(([x, y, z]) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.012, 6, 160), lineMat);
    r.rotation.set(x, y, z);
    arcs.add(r);
  });
  pivot.add(arcs);

  pivot.add(sparkField(220, 1.05, 1.45, 55, 1.2, pixelRatio));

  // Each cycle: hold on the logo pose, then one eased 360° turn.
  const HOLD = 1.8, TURN = 6.5;
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

  return {
    object: spin,
    update(dt) {
      const t = (uniforms.uTime.value += dt);
      if (turntable) {
        const cyc = t % (HOLD + TURN);
        spin.rotation.y = Math.PI * 2 * ease(Math.max(0, cyc - HOLD) / TURN);
        spin.position.y = Math.sin(t * 0.8) * 0.05;
      }
      outerGem.rotation.y -= dt * 0.12;
      innerGem.rotation.y += dt * 0.3;
      innerGem.rotation.x += dt * 0.1;
      arcs.rotation.y += dt * 0.2;
      arcs.rotation.z -= dt * 0.08;
      plasma.rotation.y -= dt * 0.08;
      return t;
    },
  };
}
