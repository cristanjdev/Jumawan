import {
  AddEquation,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  CylinderGeometry,
  EdgesGeometry,
  FrontSide,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  OneFactor,
  Points,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  ZeroFactor,
  type IUniform,
  type Side,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// The blutech mark as a 3D crystal: a dark glass cube seen corner-on (the hexagon with the "Y"), black
// outlines, and inside it a faceted cyan gem ring with deep-blue electric plasma around a black centre.
// Facets light up as they turn edge-on to the viewer, so the bright ring and dark centre hold from any
// angle. That is what lets the cube rest on the logo pose and then make full 360° turns.

/** Cube edge length; corner-on, its outline is a hexagon of radius EDGE * √(2/3) ≈ 2.45 */
const EDGE = 3;
export const MARK_RADIUS = EDGE * Math.sqrt(2 / 3);
/** Half the cube's edge, in the frame of the `cube` object createCrystalCore returns */
export const CUBE_HALF = EDGE / 2;

/** The crystal is modelled around a 3-unit cube; this scales it to EDGE */
const MODEL_SIZE = 3;
/** Drawn after the orbit's own glow and lines, so those sit behind the crystal */
const ORDER = 10;
/** Turntable: rest on the logo pose, then one eased full turn */
const HOLD_SECONDS = 1.8;
const TURN_SECONDS = 6.5;

const PALETTE = {
  line: "#01050d", // black outlines
  lineLight: "#0a2f5c", // navy outlines on a light page
  navy: "#06183a", // dark glass
  deep: "#0d3fe0", // electric blue plasma
  cyan: "#2fc8ff", // main glow
  light: "#b8f6ff", // bright facets
};

// ── GLSL ─────────────────────────────────────────────────────────────────────
const COMMON = /* glsl */ `
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

const BASE_VERT = /* glsl */ `
varying vec3 vPos; varying vec3 vObjN; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main(){
  vPos = position; vUv = uv; vObjN = normal;
  vN = normalMatrix * normal;
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

/** Shaders compute linear colour; this converts it for the screen like three's built-in materials */
const OUTPUT = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`;

/** Mosaic of triangular shards on each cube face, like the stained-glass corners of the logo */
const FACE_PATTERN = /* glsl */ `
  uniform vec3 cNavy, cDeep, cCyan, cLight; uniform float uTime, uLight;
  varying vec3 vPos; varying vec3 vObjN; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
  void facePattern(out float h, out float r, out float edge){
    vec2 c = vUv - .5;
    r = max(abs(c.x), abs(c.y)) * 2.;
    float sec = floor((atan(c.y, c.x) + 3.14159265) / .7853982);
    float band = floor(r * 3.);
    h = hash(sec * 7.13 + band * 13.71 + hash3(vObjN * 7.) * 91.);
    edge = exp(-(1. - r) * 28.);
  }
  // light from the core: face centres glow, the cube's corners stay dark navy
  float innerLight(){ return pow(smoothstep(2.4, 1.5, length(vPos)), 1.6); }`;

/**
 * Glow that adds light without adding coverage: colour adds, alpha is left alone, so on the
 * transparent canvas it brightens whatever is behind it instead of painting dark squares.
 */
function additive(material: ShaderMaterial) {
  material.blending = CustomBlending;
  material.blendEquation = AddEquation;
  material.blendSrc = OneFactor;
  material.blendDst = OneFactor;
  material.blendSrcAlpha = ZeroFactor;
  material.blendDstAlpha = OneFactor;
  return material;
}

// ── geometry helpers ─────────────────────────────────────────────────────────

/** Real 3D tubes along a geometry's edges (WebGL lines are always 1px), merged into one draw call */
function edgeTubes(geometry: BufferGeometry, radius: number, material: MeshBasicMaterial) {
  const edges = new EdgesGeometry(geometry, 1);
  const pos = edges.attributes.position;
  const parts: BufferGeometry[] = [];
  const seen = new Set<string>();
  const a = new Vector3();
  const b = new Vector3();
  const up = new Vector3(0, 1, 0);
  const q = new Quaternion();
  const m = new Matrix4();
  const addJoint = (v: Vector3) => {
    const key = v.toArray().map((n) => n.toFixed(3)).join();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(new SphereGeometry(radius, 10, 6).translate(v.x, v.y, v.z));
  };
  for (let i = 0; i < pos.count; i += 2) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    q.setFromUnitVectors(up, b.clone().sub(a).normalize());
    m.compose(a.clone().add(b).multiplyScalar(0.5), q, new Vector3(1, a.distanceTo(b), 1));
    parts.push(new CylinderGeometry(radius, radius, 1, 8, 1, true).applyMatrix4(m));
    addJoint(a);
    addJoint(b);
  }
  const flat = parts.map((g) => g.toNonIndexed());
  const merged = mergeGeometries(flat);
  [edges, ...parts, ...flat].forEach((g) => g.dispose());
  return new Mesh(merged, material);
}

/** Flat-shaded facets (one normal per triangle) for the gem look */
function faceted(geometry: BufferGeometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  flat.computeVertexNormals();
  return flat;
}

// Cube frame: the corner (1,1,1) faces the viewer, (-1,1,-1) is the hexagon's top point
const DIAGONAL = new Vector3(1, 1, 1).normalize();
const CUBE_UP = new Vector3(-1, 2, -1).normalize();
const CUBE_SIDE = DIAGONAL.clone().cross(CUBE_UP);
const FROM_CUBE = new Matrix4().makeBasis(DIAGONAL, CUBE_UP, CUBE_SIDE).transpose();

export function createCrystalCore({ pixelRatio = 1 }: { pixelRatio?: number } = {}) {
  const group = new Group();
  const mark = new Group();
  group.add(mark);
  const model = new Group();
  model.scale.setScalar(EDGE / MODEL_SIZE);
  mark.add(model);

  const color = (hex: string) => new Color(hex);
  const uniforms: Record<string, IUniform> = {
    uTime: { value: 0 },
    cNavy: { value: color(PALETTE.navy) },
    cDeep: { value: color(PALETTE.deep) },
    cCyan: { value: color(PALETTE.cyan) },
    cLight: { value: color(PALETTE.light) },
    /** 0 on a dark page, 1 on a light one */
    uLight: { value: 0 },
  };

  const shader = (fragmentShader: string, side: Side = FrontSide, extra: Record<string, IUniform> = {}) =>
    new ShaderMaterial({
      uniforms: { ...uniforms, ...extra },
      vertexShader: BASE_VERT,
      fragmentShader: COMMON + fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      side,
    });

  const lineMaterial = new MeshBasicMaterial({ color: PALETTE.line });

  // ── glass cube ───────────────────────────────────────────────────────────
  const cube = new BoxGeometry(MODEL_SIZE, MODEL_SIZE, MODEL_SIZE);

  const back = new Mesh(
    cube,
    shader(
      FACE_PATTERN +
        /* glsl */ `
      void main(){
        float h, r, edge; facePattern(h, r, edge);
        vec3 col = mix(cNavy * .35, cDeep * .3, h * .6);
        col = mix(col, cCyan * .8, step(.8, h) * smoothstep(.35, 1., r) * .6);
        col = mix(col, cCyan * (.5 + h * .6), innerLight() * .6);
        col += cCyan * edge * .5;
        // light page: sky-blue glass instead of dark navy (tinted enough to stand off a white page),
        // same shards and inner light
        vec3 pale = mix(vec3(.42, .70, .95), vec3(.22, .52, .88), h * .7);
        pale = mix(pale, cCyan * .9 + .1, innerLight() * .4);
        pale = mix(pale, vec3(.12, .45, .85), edge * .6);
        col = mix(col, pale, uLight);
        gl_FragColor = vec4(col, .94);
        ${OUTPUT}
      }`,
      BackSide,
    ),
  );
  back.renderOrder = ORDER;

  const front = new Mesh(
    cube,
    additive(
      shader(
        FACE_PATTERN +
          /* glsl */ `
        void main(){
          float h, r, edge; facePattern(h, r, edge);
          float rim = 1. - abs(dot(normalize(vN), normalize(vV)));
          float sweep = 1. - smoothstep(0., .05, abs(fract((vUv.x + vUv.y) * .5 - uTime * .06) - .5));
          vec3 col = cCyan * edge * .5
                   + cLight * innerLight() * (.04 + step(.6, h) * .12)
                   + cLight * step(.88, h) * smoothstep(.45, 1., r) * .14
                   + cCyan * (rim * .05 + sweep * .05);
          gl_FragColor = vec4(col * (1. - .7 * uLight), 1.);
          ${OUTPUT}
        }`,
      ),
    ),
  );
  front.renderOrder = ORDER + 10;
  model.add(back, front, edgeTubes(cube, 0.05, lineMaterial));

  // ── gem shells ───────────────────────────────────────────────────────────
  // Facets facing the viewer stay dark, facets turning edge-on light up cyan: that draws the bright
  // ring with the black void in the middle.
  const gemShell = (geometry: BufferGeometry, alphaMin: number, alphaMax: number, seed: number, line: number, order: number) => {
    const material = shader(
      /* glsl */ `
      uniform vec3 cNavy, cCyan, cLight; uniform float uTime, uAMin, uAMax, uSeed, uLight;
      varying vec3 vObjN; varying vec3 vN; varying vec3 vV;
      void main(){
        float rim = 1. - abs(dot(normalize(vN), normalize(vV)));
        float h = hash3(floor(normalize(vObjN) * 40.) + uSeed);
        float lit = smoothstep(.12, .7, rim + (h - .5) * .3);
        // light page: pale unlit facets and a deeper cyan, so the ring still stands out from the glass
        vec3 unlit = mix(cNavy * .5, vec3(.62, .83, .97), uLight);
        vec3 litColor = mix(cCyan, vec3(.10, .55, .95), uLight * .6);
        vec3 col = mix(unlit, litColor, lit);
        col = mix(col, cLight, smoothstep(.45, 1., lit) * (.45 + step(.4, h) * .5));
        col += cLight * pow(max(0., sin(uTime * 0.6 + h * 25.)), 30.) * lit * .3;
        gl_FragColor = vec4(col, mix(uAMin, uAMax, lit));
        ${OUTPUT}
      }`,
      FrontSide,
      { uAMin: { value: alphaMin }, uAMax: { value: alphaMax }, uSeed: { value: seed } },
    );
    const shell = new Group();
    const mesh = new Mesh(faceted(geometry), material);
    mesh.renderOrder = ORDER + order;
    shell.add(mesh, edgeTubes(geometry, line, lineMaterial));
    geometry.dispose();
    return shell;
  };

  const outerGem = gemShell(new IcosahedronGeometry(1.5, 1), 0.04, 0.82, 1, 0.02, 6);
  const innerGem = gemShell(new IcosahedronGeometry(1.08, 0), 0.05, 0.45, 7, 0.022, 4);
  innerGem.rotation.set(0.3, 0.5, 0);
  model.add(outerGem, innerGem);

  // Nucleus: dark at its rim like the logo's centre, with a steady deep-blue glow in the middle. A flat
  // black core flickered: the inner gem's big facets kept uncovering it, so the orb looked to go dark.
  const nucleusMaterial = shader(/* glsl */ `
    uniform vec3 cDeep, cCyan; uniform float uLight;
    varying vec3 vN; varying vec3 vV;
    void main(){
      float facing = abs(dot(normalize(vN), normalize(vV)));
      vec3 rim = mix(cDeep * .12, cDeep * .5, uLight);
      vec3 centre = mix(cDeep * .55 + cCyan * .18, cCyan * .7 + cDeep * .3, uLight);
      vec3 col = mix(rim, centre, pow(facing, 2.5));
      gl_FragColor = vec4(col, 1.);
      ${OUTPUT}
    }`);
  nucleusMaterial.transparent = false;
  nucleusMaterial.depthWrite = true;
  model.add(new Mesh(new SphereGeometry(0.9, 32, 20), nucleusMaterial));

  // ── electric plasma band ─────────────────────────────────────────────────
  const plasma = new Mesh(
    new SphereGeometry(1.44, 48, 32),
    additive(
      shader(/* glsl */ `
      uniform vec3 cDeep, cCyan; uniform float uTime, uLight;
      varying vec3 vPos; varying vec3 vN; varying vec3 vV;
      void main(){
        float rim = 1. - abs(dot(normalize(vN), normalize(vV)));
        float band = smoothstep(.12, .5, rim) * (1. - smoothstep(.88, 1., rim));
        vec3 p = vPos * 1.8;
        float t = uTime * .25;
        // Simplex noise can overshoot ±1; keep the base in 0..1 so pow() stays defined
        float n1 = clamp(1. - abs(snoise(p + vec3(0., t, 0.))), 0., 1.);
        float n2 = clamp(1. - abs(snoise(p * 2.6 - vec3(t * 1.4, 0., t))), 0., 1.);
        float veins = pow(n1, 18.) + pow(n2, 22.) * .9;
        float cloud = n1; // broad light under the veins, from the same noise (one sample cheaper)
        vec3 col = cDeep * (.3 + cloud * .7) * band * .9 + cCyan * veins * band * 1.8;
        gl_FragColor = vec4(col * (1. - .45 * uLight), 1.);
        ${OUTPUT}
      }`),
    ),
  );
  plasma.renderOrder = ORDER + 5;
  model.add(plasma);

  // Thin black arcs like the curved strokes in the logo
  const arcs = new Group();
  const arc = new TorusGeometry(1.32, 0.012, 6, 160);
  for (const [x, y, z] of [
    [Math.PI / 2, 0, 0],
    [0.5, 1.1, 0],
    [-0.6, -1.0, 0.4],
  ]) {
    const ring = new Mesh(arc, lineMaterial);
    ring.rotation.set(x, y, z);
    arcs.add(ring);
  }
  model.add(arcs);

  // ── sparks inside the ring ───────────────────────────────────────────────
  const sparkCount = 220;
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkSeeds = new Float32Array(sparkCount);
  const v = new Vector3();
  for (let i = 0; i < sparkCount; i++) {
    v.randomDirection().multiplyScalar(1.05 + Math.random() * 0.4);
    v.toArray(sparkPositions, i * 3);
    sparkSeeds[i] = Math.random();
  }
  const sparks = new Points(
    new BufferGeometry()
      .setAttribute("position", new BufferAttribute(sparkPositions, 3))
      .setAttribute("aSeed", new BufferAttribute(sparkSeeds, 1)),
    additive(
      new ShaderMaterial({
        uniforms: { uTime: uniforms.uTime, uPR: { value: pixelRatio }, uSize: { value: 55 * (EDGE / MODEL_SIZE) } },
        vertexShader: /* glsl */ `
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
        fragmentShader: /* glsl */ `
          varying float vA;
          void main(){
            float a = pow(1. - smoothstep(0., .5, length(gl_PointCoord - .5)), 2.);
            gl_FragColor = vec4(vec3(.55, .95, 1.) * a * vA * 1.2, 1.);
            ${OUTPUT}
          }`,
        transparent: true,
        depthWrite: false,
      }),
    ),
  );
  sparks.renderOrder = ORDER + 8;
  model.add(sparks);

  // ── animation ────────────────────────────────────────────────────────────
  let spin = 0; // extra turn from spin(), eased out
  let spinTarget = 0;
  const toView = new Matrix4();
  const facing = new Quaternion();
  const sway = new Quaternion();
  const viewUp = new Vector3();
  const viewSide = new Vector3();
  const worldUp = new Vector3(0, 1, 0);
  const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

  return {
    group,
    /** The turning cube's frame: a box of ±CUBE_HALF in this object's local space */
    cube: mark,
    /**
     * `view` is the direction from the mark to the camera: the cube rests corner-on to it, so the
     * hexagon is symmetric wherever the mark sits on screen, then turns a full 360° about the
     * screen's vertical. `yaw` adds a small sway; with `elapsed` at 0 it holds the logo pose.
     */
    update(dt: number, elapsed: number, yaw: number, view: Vector3) {
      uniforms.uTime.value = elapsed;
      spin += (spinTarget - spin) * (1 - Math.exp(-4 * dt));
      const cycle = elapsed % (HOLD_SECONDS + TURN_SECONDS);
      const turn = Math.PI * 2 * ease(Math.max(0, cycle - HOLD_SECONDS) / TURN_SECONDS);

      viewUp.copy(worldUp).addScaledVector(view, -view.dot(worldUp)).normalize();
      viewSide.copy(view).cross(viewUp);
      toView.makeBasis(view, viewUp, viewSide).multiply(FROM_CUBE);
      facing.setFromRotationMatrix(toView);
      sway.setFromAxisAngle(viewUp, yaw + turn + spin);
      mark.quaternion.multiplyQuaternions(sway, facing);

      outerGem.rotation.y -= dt * 0.12;
      innerGem.rotation.y += dt * 0.12;
      innerGem.rotation.x += dt * 0.04;
      arcs.rotation.y += dt * 0.2;
      arcs.rotation.z -= dt * 0.08;
      plasma.rotation.y -= dt * 0.08;
    },
    /** One extra full turn, for the click pulse */
    spin() {
      spinTarget += Math.PI * 2;
    },
    /** Dark navy glass on a dark page; pale frosted glass with navy outlines on a light one */
    setDark(dark: boolean) {
      uniforms.uLight.value = dark ? 0 : 1;
      lineMaterial.color.set(dark ? PALETTE.line : PALETTE.lineLight);
    },
    /** Geometry and materials are disposed by the scene traversal; nothing else is held */
    dispose() {},
  };
}
