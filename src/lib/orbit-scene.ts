import {
  AddEquation,
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  DoubleSide,
  Group,
  HalfFloatType,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Matrix4,
  Material,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  NormalBlending,
  OneFactor,
  Object3D,
  PerspectiveCamera,
  Ray,
  RingGeometry,
  Scene,
  SrcAlphaFactor,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  ZeroFactor,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { createCrystalCore, CUBE_HALF, MARK_RADIUS } from "./crystal-core";

// 3D version of the Tools & Technologies orbit. The blutech crystal, orbit lines, beams and glow are
// drawn with WebGL; the tool logos stay real <img> elements (crisp, hoverable, no CORS issues with
// WebGL textures) that this module projects onto the 3D orbits every frame.

export interface OrbitSceneOptions {
  /** Element the canvas fills */
  host: HTMLElement;
  /** Logo elements per orbit, inner → outer */
  rings: HTMLElement[][];
  /** "high" renders a sharper canvas */
  quality: "high" | "medium";
  /** OS "reduce motion": a still view with no idle spin */
  reduceMotion: boolean;
  dark: boolean;
  /** 0..1 progress of the section through the viewport; turns the orbits while scrolling */
  getScroll: () => number;
}

export interface OrbitScene {
  /** Runs the render loop only while the section is on screen and the tab is visible */
  setActive(active: boolean): void;
  setDark(dark: boolean): void;
  /** Swaps in a new set of logo elements (tools added or removed) without rebuilding the scene */
  setLogos(rings: HTMLElement[][]): void;
  /** Pointer position over the scene, -1..1 on both axes; (0, 0) when it leaves */
  setPointer(x: number, y: number): void;
  /** The logo under the pointer, or null: the orbit slows and its beam lights up so its name can be read */
  setHover(logo: HTMLElement | null): void;
  /** Whether a point (px, relative to the host) is over the crystal core */
  isOverCore(x: number, y: number): boolean;
  /** Shockwave from the core and a short burst of speed */
  pulse(): void;
  dispose(): void;
}

/** One flat system of concentric orbits around the crystal (the cube is 3 units wide); squeezed inward on narrow screens */
const RADII = [4.8, 8.0, 11.2];
/** Where the squeeze pivots: clear of the crystal, so the inner orbit keeps its room even on phones */
const SQUEEZE_FROM = 4.4;
/** Idle spin per orbit (rad/s at speed 1); inner orbits move faster */
const RING_SPEED = [0.16, 0.11, 0.075];
/** Extra turn per orbit across one pass of the section through the viewport */
const RING_SCROLL = [Math.PI / 2, Math.PI / 3, Math.PI / 4];
const RING_PHASE = [0, 0.7, 1.4];

const FOV = 32;
const MIN_DISTANCE = 18.5;
const CORE_RADIUS = MARK_RADIUS;
const PULSE_SECONDS = 1.6;

const THEMES = {
  dark: { accent: "#2fc8ff", line: "#2fc8ff", ringOpacity: 0.42, bloom: 0.6, bloomThreshold: 0.5 },
  // on a light page the glass itself is bright, so only real highlights should bloom
  light: { accent: "#0284c7", line: "#0284c7", ringOpacity: 0.5, bloom: 0.3, bloomThreshold: 0.82 },
};

/**
 * Final pass, straight to the transparent canvas: tone mapping and sRGB output (what OutputPass would
 * do, without its extra full-screen pass), then coverage. The scene's own alpha survives bloom (see
 * the bloom blend below); glow adds just enough alpha to show over the page. The faint haze bloom
 * spreads over the whole canvas is dropped: kept, it tints a visible rectangle over the page that
 * brightens and dims as the crystal turns.
 */
const FinalShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float coverage = clamp(c.a, 0.0, 1.0);
      gl_FragColor = vec4(c.rgb, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float glow = max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b));
      float keep = max(coverage, smoothstep(0.04, 0.16, glow));
      gl_FragColor = vec4(gl_FragColor.rgb * keep, clamp(max(coverage, glow * keep), 0.0, 1.0));
    }`,
};

/** Hold to 60 fps on high-refresh screens; the motion is slow enough that more frames add nothing */
const MIN_FRAME_SECONDS = 1 / 62;

const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

function circleGeometry(radius: number, segments = 256) {
  const positions = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * radius;
    positions[i * 3 + 2] = Math.sin(a) * radius;
  }
  return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
}

interface Planet {
  el: HTMLElement;
  ring: number;
  angle: number;
  half: number;
  world: Vector3;
  /** Last written styles, so unchanged ones aren't written again every frame */
  opacity: string;
  z: string;
}

export function createOrbitScene({ host, rings, quality, reduceMotion, dark, getScroll }: OrbitSceneOptions): OrbitScene {
  // Throws when WebGL is unavailable; the caller falls back to the 2D orbit
  // No MSAA on the canvas itself: the scene is drawn into the composer's targets, so it would be wasted
  const renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.5 : 1));
  renderer.toneMapping = NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);

  // ── post-processing: bloom on a transparent canvas ─────────────────────────
  // Multisampled target: the canvas itself has no MSAA, and without this the outlines are jagged
  const composer = new EffectComposer(
    renderer,
    new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: quality === "high" ? 4 : 2 }),
  );
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(1, 1), THEMES.dark.bloom, 0.25, 0.5);
  // Bloom normally overwrites alpha, which would turn the transparent canvas into a black box. Add
  // its light the usual way (src alpha, one) but leave the scene's alpha alone.
  const bloomBlend = bloom.blendMaterial;
  bloomBlend.blending = CustomBlending;
  bloomBlend.blendEquation = AddEquation;
  bloomBlend.blendSrc = SrcAlphaFactor;
  bloomBlend.blendDst = OneFactor;
  bloomBlend.blendSrcAlpha = ZeroFactor;
  bloomBlend.blendDstAlpha = OneFactor;
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(FinalShader));

  // ── orbit system ─────────────────────────────────────────────────────────
  const system = new Group();
  scene.add(system);

  // Orbit lines and beams write depth and are drawn before the crystal (lower renderOrder): where an
  // orbit passes in front of the cube the glass is then drawn behind the line, and where it passes
  // behind, the glass covers it. Without depth the glass painted over the near side too.
  const ringLineMaterials: LineBasicMaterial[] = [];
  const unitCircle = circleGeometry(1);
  const ringLines: LineLoop[] = [];
  const spinners = RADII.map(() => {
    const material = new LineBasicMaterial({ transparent: true, depthWrite: true });
    ringLineMaterials.push(material);
    const line = new LineLoop(unitCircle, material);
    ringLines.push(line);
    system.add(line);
    const spinner = new Group();
    system.add(spinner);
    return spinner;
  });

  // Beams from each logo into the crystal: bright at the logo, fading toward the core
  const beamGeometry = new BufferGeometry();
  const beamMaterial = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: true,
    blending: AdditiveBlending,
  });
  scene.add(new LineSegments(beamGeometry, beamMaterial));

  let planets: Planet[] = [];
  let hovered: HTMLElement | null = null;
  const placeLogos = (logos: HTMLElement[][]) => {
    planets = logos.flatMap((ring, r) =>
      ring.map((el, i) => ({
        el,
        ring: r,
        angle: (i / Math.max(1, ring.length)) * Math.PI * 2,
        half: el.offsetWidth / 2,
        world: new Vector3(),
        opacity: "",
        z: "",
      })),
    );
    beamGeometry.setAttribute("position", new BufferAttribute(new Float32Array(planets.length * 6), 3));
    beamGeometry.setAttribute("color", new BufferAttribute(new Float32Array(planets.length * 6), 3));
    if (hovered && !planets.some((p) => p.el === hovered)) hovered = null;
  };
  placeLogos(rings);

  // ── core: the blutech crystal, turned toward the camera ────────────────────
  const core = new Group();
  scene.add(core);
  const mark = createCrystalCore({ pixelRatio: renderer.getPixelRatio() });
  const toCamera = new Vector3();
  core.add(mark.group);

  // Shockwaves for pulse(): a small pool of flat rings in the orbit plane
  const pulseGeometry = new RingGeometry(0.96, 1, 128);
  const pulses = Array.from({ length: 4 }, () => {
    const material = new MeshBasicMaterial({ transparent: true, opacity: 0, side: DoubleSide, depthWrite: false });
    const mesh = new Mesh(pulseGeometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;
    system.add(mesh);
    return { mesh, material, age: Infinity };
  });

  // ── theme ────────────────────────────────────────────────────────────────
  let isDark = dark;
  const accent = new Color();
  const applyTheme = () => {
    const t = isDark ? THEMES.dark : THEMES.light;
    // Additive glow vanishes on a light page, so light mode uses normal blending and drops the beams
    const blending = isDark ? AdditiveBlending : NormalBlending;
    for (const m of ringLineMaterials) {
      m.color.set(t.line);
      m.opacity = t.ringOpacity;
    }
    accent.set(t.accent);
    mark.setDark(isDark);
    bloom.strength = t.bloom;
    bloom.threshold = t.bloomThreshold;
    for (const { material } of pulses) material.color.set(t.accent);
    for (const m of [...ringLineMaterials, ...pulses.map((p) => p.material)] as Material[]) {
      m.blending = blending;
      m.needsUpdate = true;
    }
    beamMaterial.visible = isDark;
  };
  applyTheme();

  // ── layout ───────────────────────────────────────────────────────────────
  const projected = new Vector3();
  let width = 1;
  let height = 1;
  let distance = MIN_DISTANCE;
  let radii = RADII.slice();
  let elevation = 0;
  const tanHalfFov = Math.tan(((FOV / 2) * Math.PI) / 180);
  const fitPoint = new Vector3();
  /** Whether a point projects inside the canvas, the given number of px clear of its edges */
  const onScreen = (x: number, y: number, z: number, marginX: number, marginTop: number, marginBottom: number) => {
    projected.copy(fitPoint.set(x, y, z)).project(camera);
    return (
      Math.abs(projected.x) < 1 - (2 * marginX) / width &&
      projected.y < 1 - (2 * marginTop) / height &&
      projected.y > -1 + (2 * marginBottom) / height
    );
  };

  const measure = () => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    const aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    for (const p of planets) p.half = p.el.offsetWidth / 2;
    const iconHalf = planets[0]?.half ?? 28;

    // Narrow screens: bring the orbits in toward the crystal and look from higher up, so the system
    // uses the height instead of shrinking to fit the width
    const squeeze = Math.min(1, Math.max(0.45, (aspect - 0.5) / 1.1));
    radii = RADII.map((r) => SQUEEZE_FROM + (r - SQUEEZE_FROM) * squeeze);
    ringLines.forEach((line, i) => line.scale.setScalar(radii[i]));
    elevation = ((aspect < 0.8 ? 55 : aspect < 1 ? 42 : aspect < 1.4 ? 33 : 27) * Math.PI) / 180;

    // Pull the camera back until everything fits: the logos at the outer orbit's sides, near and far
    // edges (with room for the hover label below), and the top of the crystal
    const outer = radii[2];
    const margin = iconHalf * 1.1 + 6;
    distance = MIN_DISTANCE;
    for (let i = 0; i < 120; i++) {
      camera.position.set(0, Math.sin(elevation) * distance, Math.cos(elevation) * distance);
      camera.lookAt(0, -1.2, 0); // aim below the core: the near side of the orbits needs more room
      camera.updateMatrixWorld();
      const fits =
        onScreen(outer, 0, 0, margin, 0, 0) &&
        onScreen(-outer, 0, 0, margin, 0, 0) &&
        onScreen(0, 0, outer, 0, 0, margin + 22) &&
        onScreen(0, 0, -outer, 0, margin, 0) &&
        onScreen(0, MARK_RADIUS + 0.4, 0, 0, 8, 0);
      if (fits) break;
      distance += 0.3;
    }
  };

  // ── animation state ──────────────────────────────────────────────────────
  let elapsed = 0;
  let base = 0; // accumulated idle spin
  let speed = 1; // burst from pulse(), decays back to 1
  let hoverSpeed = 1;
  let scroll = getScroll();
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let intro = reduceMotion ? 1 : 0; // logos fade in once the scene is up

  const local = new Vector3();
  const beamEnd = new Vector3();

  // Occlusion by the crystal: a ray from the camera to each logo, tested against the turning cube in
  // the cube's own frame. The box grows by about a logo's half-size, so a logo partly behind the
  // cube's edge counts too; the glass then covers just the part it overlaps.
  const cubeBox = new Box3(new Vector3(-CUBE_HALF, -CUBE_HALF, -CUBE_HALF), new Vector3(CUBE_HALF, CUBE_HALF, CUBE_HALF));
  const grownBox = new Box3();
  const toCube = new Matrix4();
  const ray = new Ray();
  const hit = new Vector3();
  const behindCrystal = (logo: Vector3, halfWorld: number) => {
    grownBox.copy(cubeBox).expandByScalar(halfWorld * 0.8);
    ray.origin.copy(camera.position).applyMatrix4(toCube);
    ray.direction.copy(logo).applyMatrix4(toCube).sub(ray.origin);
    const toLogo = ray.direction.length();
    ray.direction.divideScalar(toLogo);
    return ray.intersectBox(grownBox, hit) !== null && hit.distanceTo(ray.origin) < toLogo;
  };

  const update = (dt: number) => {
    elapsed += dt;
    if (!reduceMotion) {
      speed = 1 + (speed - 1) * Math.exp(-3 * dt);
      hoverSpeed = damp(hoverSpeed, hovered ? 0 : 1, 4, dt);
      base += dt * speed * hoverSpeed;
      scroll = damp(scroll, getScroll(), 6, dt);
      pointerX = damp(pointerX, targetX, 3, dt);
      pointerY = damp(pointerY, targetY, 3, dt);
      intro = Math.min(1, intro + dt * 1.4);
    }

    // Whole system leans toward the pointer and sways a little
    const sway = reduceMotion ? 0 : Math.sin(elapsed * 0.3) * 0.02;
    system.rotation.set(pointerY * 0.1, 0, -pointerX * 0.06 + sway);

    spinners.forEach((spinner, i) => {
      spinner.rotation.y = RING_PHASE[i] - base * RING_SPEED[i] - scroll * RING_SCROLL[i];
    });

    // Core: rests on the logo pose, then turns a full 360°; a small sway follows the scroll
    const yaw = reduceMotion ? 0 : (scroll - 0.5) * 0.12;
    toCamera.copy(camera.position).sub(core.position).normalize();
    mark.update(reduceMotion ? 0 : dt, reduceMotion ? 0 : elapsed, yaw, toCamera);
    core.position.y = reduceMotion ? 0 : Math.sin(elapsed * 0.8) * 0.08;

    for (const p of pulses) {
      if (p.age === Infinity) continue;
      p.age += dt;
      const t = p.age / PULSE_SECONDS;
      if (t >= 1) {
        p.age = Infinity;
        p.mesh.visible = false;
        continue;
      }
      // The wave stops at the outer orbit's logos: the camera frames no more than that
      p.mesh.scale.setScalar(CORE_RADIUS + (1 - (1 - t) * (1 - t)) * (radii[2] + 0.5 - CORE_RADIUS));
      p.material.opacity = Math.pow(1 - t, 1.5) * 0.8;
    }

    scene.updateMatrixWorld();
    camera.updateMatrixWorld();

    // Project each logo onto its orbit
    const beamPositions = beamGeometry.attributes.position as BufferAttribute;
    const beamColors = beamGeometry.attributes.color as BufferAttribute;
    const centerDistance = camera.position.distanceTo(core.position);
    toCube.copy(mark.cube.matrixWorld).invert();
    const pxPerUnit = height / 2 / (centerDistance * tanHalfFov);
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const radius = radii[p.ring];
      local.set(Math.cos(p.angle) * radius, 0, Math.sin(p.angle) * radius);
      p.world.copy(local).applyMatrix4(spinners[p.ring].matrixWorld);

      projected.copy(p.world).project(camera);
      const x = (projected.x + 1) * 0.5 * width;
      const y = (1 - projected.y) * 0.5 * height;

      // depth: +1 nearest the viewer, -1 furthest behind the crystal
      const depth = Math.max(-1, Math.min(1, (centerDistance - camera.position.distanceTo(p.world)) / radii[2]));
      const near = (depth + 1) / 2;
      const isHovered = p.el === hovered;
      const scale = (0.8 + 0.28 * near) * (isHovered ? 1.18 : 1);
      const opacity = isHovered ? 1 : (0.62 + 0.38 * near) * intro;
      p.el.style.transform = `translate3d(${x - p.half}px, ${y - p.half}px, 0) scale(${scale.toFixed(3)})`;
      const nextOpacity = opacity.toFixed(2);
      if (nextOpacity !== p.opacity) p.el.style.opacity = p.opacity = nextOpacity;
      // Stack by true depth, as in 3D: a nearer logo always covers a farther one. The canvas is one
      // layer (z 1000), so logos farther than the crystal, or with the crystal in front of them, go
      // under it in depth order, and its glass covers them; nearer ones stack above it.
      const rank = Math.round(near * 899);
      const under = depth < 0 || behindCrystal(p.world, p.half / pxPerUnit);
      const nextZ = isHovered ? "2000" : String(under ? 1 + rank : 1001 + rank);
      if (nextZ !== p.z) p.el.style.zIndex = p.z = nextZ;

      // Beam from the logo to the crystal's surface
      beamEnd.copy(p.world).sub(core.position).setLength(CORE_RADIUS * 0.9).add(core.position);
      beamPositions.setXYZ(i * 2, p.world.x, p.world.y, p.world.z);
      beamPositions.setXYZ(i * 2 + 1, beamEnd.x, beamEnd.y, beamEnd.z);
      const tip = (isHovered ? 0.9 : 0.22) * opacity;
      const root = isHovered ? 0.35 : 0.03;
      beamColors.setXYZ(i * 2, accent.r * tip, accent.g * tip, accent.b * tip);
      beamColors.setXYZ(i * 2 + 1, accent.r * root, accent.g * root, accent.b * root);
    }
    beamPositions.needsUpdate = true;
    beamColors.needsUpdate = true;
  };

  const render = () => composer.render();
  const renderOnce = () => {
    update(0);
    render();
  };

  // ── loop ─────────────────────────────────────────────────────────────────
  let raf = 0;
  let last = 0;
  let active = false;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const since = last ? (now - last) / 1000 : 1 / 60;
    if (last && since < MIN_FRAME_SECONDS) return;
    const dt = Math.min(since, 0.05);
    last = now;
    update(dt);
    render();
  };

  const start = () => {
    if (raf || reduceMotion) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const observer = new ResizeObserver(() => {
    measure();
    if (!raf) renderOnce();
  });
  observer.observe(host);
  measure();
  renderOnce();

  const onContextLost = (event: Event) => {
    event.preventDefault();
    stop();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  return {
    setActive(next) {
      active = next;
      if (active) start();
      else stop();
    },
    setDark(next) {
      if (next === isDark) return;
      isDark = next;
      applyTheme();
      if (!raf) renderOnce();
    },
    setLogos(next) {
      placeLogos(next);
      if (!raf) renderOnce();
    },
    setPointer(x, y) {
      targetX = x;
      targetY = y;
    },
    setHover(logo) {
      hovered = logo;
    },
    isOverCore(x, y) {
      projected.set(0, core.position.y, 0).project(camera);
      const cx = (projected.x + 1) * 0.5 * width;
      const cy = (1 - projected.y) * 0.5 * height;
      const radiusPx = (CORE_RADIUS / distance / tanHalfFov) * (height / 2);
      return Math.hypot(x - cx, y - cy) <= radiusPx;
    },
    pulse() {
      if (reduceMotion) return;
      const free = pulses.find((p) => p.age === Infinity) ?? pulses[0];
      free.age = 0;
      free.mesh.visible = true;
      speed = Math.min(20, speed + 4);
      mark.spin();
      if (!active) renderOnce();
    },
    dispose() {
      stop();
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene.traverse((object: Object3D) => {
        const { geometry, material } = object as Mesh;
        geometry?.dispose();
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else (material as Material | undefined)?.dispose();
      });
      mark.dispose();
      composer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
