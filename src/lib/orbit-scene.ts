import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Material,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from "three";
import { createCrystalCore, MARK_RADIUS } from "./crystal-core";

// 3D version of the Tools & Technologies orbit. The blutech core, orbit lines, glow and dust are drawn
// with WebGL; the tool logos stay real <img> elements (crisp, hoverable, no CORS issues with WebGL
// textures) that this module projects onto the 3D orbits every frame.

export interface OrbitSceneOptions {
  /** Element the canvas fills */
  host: HTMLElement;
  /** Logo elements per orbit, inner → outer */
  rings: HTMLElement[][];
  /** "high" adds core-to-logo beams, more dust and a sharper canvas */
  quality: "high" | "medium";
  /** OS "reduce motion": a still, tilted view with no idle spin */
  reduceMotion: boolean;
  dark: boolean;
  /** 0..1 progress of the section through the viewport; spins the orbits while scrolling */
  getScroll: () => number;
}

export interface OrbitScene {
  /** Runs the render loop only while the section is on screen and the tab is visible */
  setActive(active: boolean): void;
  setDark(dark: boolean): void;
  /** Pointer position over the scene, -1..1 on both axes; (0, 0) when it leaves */
  setPointer(x: number, y: number): void;
  /** Slows the orbit while a logo is hovered so its name can be read */
  setHover(hovering: boolean): void;
  /** Whether a point (px, relative to the host) is over the crystal core */
  isOverCore(x: number, y: number): boolean;
  /** Shockwave from the core and a short burst of speed */
  pulse(): void;
  dispose(): void;
}

const RADII = [3.1, 4.9, 6.7];
/** Each orbit leans a little differently, so the system reads as 3D rather than one flat disc */
const RING_TILT: [number, number][] = [
  [0.1, 0.16],
  [-0.06, -0.1],
  [0.04, 0.05],
];
/** Idle spin per orbit (rad/s at speed 1), alternating direction like the 2D version */
const RING_SPEED = [0.16, -0.11, 0.06];
/** Extra turn per orbit across one pass of the section through the viewport */
const RING_SCROLL = [Math.PI, -Math.PI, Math.PI / 2];
const RING_PHASE = [0, 0.52, 0.2];

const FOV = 32;
const ELEVATION = 0.42; // camera angle above the orbit plane (~24°)
const MIN_DISTANCE = 16.5;
const HALF_WIDTH = RADII[2] + 1.1; // outer orbit plus room for its logos
const CORE_RADIUS = MARK_RADIUS;
const PULSE_SECONDS = 1.6;

const THEMES = {
  dark: { accent: "#22d3ee", line: "#38bdf8", dust: "#7dd3fc", ringOpacity: 0.22 },
  light: { accent: "#0284c7", line: "#0369a1", dust: "#0369a1", ringOpacity: 0.3 },
};

const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/** Soft white dot used for the glow, logo halos and dust */
function glowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

function circleGeometry(radius: number, segments = 192) {
  const positions = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * radius;
    positions[i * 3 + 2] = Math.sin(a) * radius;
  }
  return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
}

export function createOrbitScene({ host, rings, quality, reduceMotion, dark, getScroll }: OrbitSceneOptions): OrbitScene {
  // Throws when WebGL is unavailable; the caller falls back to the 2D orbit
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === "high" ? 1.75 : 1.25));
  const canvas = renderer.domElement;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  host.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const glow = glowTexture();

  scene.add(new AmbientLight(0xffffff, 0.9));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 7, 6);
  scene.add(sun);

  // ── orbit system ─────────────────────────────────────────────────────────
  const system = new Group();
  scene.add(system);

  const ringLineMaterials: LineBasicMaterial[] = [];
  const spinners = RADII.map((radius, i) => {
    const tilt = new Group();
    tilt.rotation.set(RING_TILT[i][0], 0, RING_TILT[i][1]);
    const material = new LineBasicMaterial({ transparent: true, depthWrite: false });
    ringLineMaterials.push(material);
    tilt.add(new LineLoop(circleGeometry(radius), material));
    const spinner = new Group();
    tilt.add(spinner);
    system.add(tilt);
    return spinner;
  });

  const planets = rings.flatMap((logos, ring) =>
    logos.map((el, i) => ({
      el,
      ring,
      angle: (i / Math.max(1, logos.length)) * Math.PI * 2,
      half: 0,
      behind: null as boolean | null,
      world: new Vector3(),
    })),
  );

  // Halo under each logo (dark mode) so the logos sit in the scene instead of on top of it
  const haloPositions = new Float32Array(planets.length * 3);
  const haloGeometry = new BufferGeometry().setAttribute("position", new BufferAttribute(haloPositions, 3));
  const haloMaterial = new PointsMaterial({
    map: glow,
    size: 1.5,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  scene.add(new Points(haloGeometry, haloMaterial));

  // Beams from the core to each logo (high quality, dark mode)
  const beamPositions = new Float32Array(planets.length * 6);
  const beamColors = new Float32Array(planets.length * 6);
  const beamGeometry = new BufferGeometry()
    .setAttribute("position", new BufferAttribute(beamPositions, 3))
    .setAttribute("color", new BufferAttribute(beamColors, 3));
  const beamMaterial = new LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const beams = new LineSegments(beamGeometry, beamMaterial);
  beams.visible = quality === "high";
  scene.add(beams);

  // Dust drifting in the orbit plane
  const dustCount = quality === "high" ? 320 : 160;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const r = 2 + Math.random() * 6.4;
    const a = Math.random() * Math.PI * 2;
    dustPositions[i * 3] = Math.cos(a) * r;
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 1.4;
    dustPositions[i * 3 + 2] = Math.sin(a) * r;
  }
  const dustMaterial = new PointsMaterial({ map: glow, size: 0.12, transparent: true, depthWrite: false });
  const dust = new Points(new BufferGeometry().setAttribute("position", new BufferAttribute(dustPositions, 3)), dustMaterial);
  system.add(dust);

  // ── core: the blutech crystal, turned toward the camera ────────────────────
  const core = new Group();
  scene.add(core);
  const mark = createCrystalCore({ pixelRatio: renderer.getPixelRatio() });
  const toCamera = new Vector3();
  core.add(mark.group);

  const coreGlowMaterial = new SpriteMaterial({ map: glow, transparent: true, depthWrite: false });
  const coreGlow = new Sprite(coreGlowMaterial);
  coreGlow.scale.setScalar(5.5);
  core.add(coreGlow);

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
  const applyTheme = () => {
    const t = isDark ? THEMES.dark : THEMES.light;
    const blending = isDark ? AdditiveBlending : NormalBlending;
    for (const m of ringLineMaterials) {
      m.color.set(t.line);
      m.opacity = t.ringOpacity;
    }
    mark.setDark(isDark);
    coreGlowMaterial.color.set(t.accent);
    coreGlowMaterial.opacity = isDark ? 0.55 : 0.22;
    dustMaterial.color.set(t.dust);
    dustMaterial.opacity = isDark ? 0.75 : 0.35;
    for (const { material } of pulses) material.color.set(t.accent);
    // Additive glow vanishes on a light page, so light mode uses normal blending and drops the halos/beams
    for (const m of [coreGlowMaterial, dustMaterial, ...pulses.map((p) => p.material)] as Material[]) {
      m.blending = blending;
      m.needsUpdate = true;
    }
    haloMaterial.color.set(t.accent);
    haloMaterial.visible = isDark;
    beamMaterial.visible = isDark;
    const tip = new Color(t.accent);
    for (let i = 0; i < planets.length; i++) {
      // Core end is black, which additive blending renders as transparent: the beam fades in toward the logo
      beamColors.set([0, 0, 0, tip.r, tip.g, tip.b], i * 6);
    }
    beamGeometry.attributes.color.needsUpdate = true;
  };
  applyTheme();

  // ── layout ───────────────────────────────────────────────────────────────
  let width = 1;
  let height = 1;
  let distance = MIN_DISTANCE;
  const tanHalfFov = Math.tan(((FOV / 2) * Math.PI) / 180);

  const measure = () => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Pull the camera back until the outer orbit fits the width
    distance = Math.max(MIN_DISTANCE, HALF_WIDTH / (tanHalfFov * camera.aspect));
    camera.position.set(0, Math.sin(ELEVATION) * distance, Math.cos(ELEVATION) * distance);
    camera.lookAt(0, -1, 0); // aim below the core: the near side of the orbits needs more room than the far side
    camera.updateProjectionMatrix();
    for (const p of planets) p.half = p.el.offsetWidth / 2;
  };

  // ── animation state ──────────────────────────────────────────────────────
  let elapsed = 0;
  let base = 0; // accumulated idle spin
  let speed = 1; // burst from pulse(), decays back to 1
  let hoverSpeed = 1;
  let hovering = false;
  let scroll = getScroll();
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let intro = reduceMotion ? 1 : 0; // logos fade in once the scene is up

  const projected = new Vector3();
  const local = new Vector3();

  const update = (dt: number) => {
    elapsed += dt;
    if (!reduceMotion) {
      speed = 1 + (speed - 1) * Math.exp(-3 * dt);
      hoverSpeed = damp(hoverSpeed, hovering ? 0.12 : 1, 4, dt);
      base += dt * speed * hoverSpeed;
      scroll = damp(scroll, getScroll(), 6, dt);
      pointerX = damp(pointerX, targetX, 3, dt);
      pointerY = damp(pointerY, targetY, 3, dt);
      intro = Math.min(1, intro + dt * 1.4);
    }

    // Whole system leans toward the pointer and sways a little
    const sway = reduceMotion ? 0 : Math.sin(elapsed * 0.3) * 0.03;
    system.rotation.set(0.06 + pointerY * 0.12, 0, -pointerX * 0.08 + sway);

    spinners.forEach((spinner, i) => {
      spinner.rotation.y = RING_PHASE[i] + base * RING_SPEED[i] + scroll * RING_SCROLL[i];
    });
    dust.rotation.y = base * 0.02;

    // Core: a small sway (and a little with the scroll) — enough to read as 3D, small enough to stay the logo
    const yaw = reduceMotion ? 0 : Math.sin(elapsed * 0.45) * 0.1 + (scroll - 0.5) * 0.12;
    toCamera.copy(camera.position).sub(core.position).normalize();
    mark.update(reduceMotion ? 0 : dt, reduceMotion ? 0 : elapsed, yaw, toCamera);
    core.position.y = reduceMotion ? 0 : Math.sin(elapsed * 0.8) * 0.12;

    for (const p of pulses) {
      if (p.age === Infinity) continue;
      p.age += dt;
      const t = p.age / PULSE_SECONDS;
      if (t >= 1) {
        p.age = Infinity;
        p.mesh.visible = false;
        continue;
      }
      p.mesh.scale.setScalar(CORE_RADIUS + t * 7.5);
      p.material.opacity = Math.pow(1 - t, 1.5) * 0.8;
    }

    scene.updateMatrixWorld();
    camera.updateMatrixWorld();

    // Project each logo onto its orbit
    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const radius = RADII[p.ring];
      local.set(Math.cos(p.angle) * radius, 0, Math.sin(p.angle) * radius);
      p.world.copy(local).applyMatrix4(spinners[p.ring].matrixWorld);
      haloPositions.set([p.world.x, p.world.y, p.world.z], i * 3);
      beamPositions.set([0, core.position.y, 0, p.world.x, p.world.y, p.world.z], i * 6);

      projected.copy(p.world).project(camera);
      const x = (projected.x + 1) * 0.5 * width;
      const y = (1 - projected.y) * 0.5 * height;
      const scale = Math.min(1.25, Math.max(0.7, distance / camera.position.distanceTo(p.world)));
      const depth = (p.world.z + radius) / (2 * radius); // 0 = far side, 1 = near side
      p.el.style.transform = `translate3d(${x - p.half}px, ${y - p.half}px, 0) scale(${scale.toFixed(3)})`;
      p.el.style.opacity = ((0.5 + depth * 0.5) * intro).toFixed(3);

      // Logos on the far side go under the canvas, so the crystal covers them as they pass behind it
      const behind = p.world.z < 0;
      if (behind !== p.behind) {
        p.behind = behind;
        p.el.style.zIndex = behind ? "1" : "3";
      }
    }
    haloGeometry.attributes.position.needsUpdate = true;
    beamGeometry.attributes.position.needsUpdate = true;
  };

  const render = () => renderer.render(scene, camera);
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
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
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
    setPointer(x, y) {
      targetX = x;
      targetY = y;
    },
    setHover(next) {
      hovering = next;
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
      glow.dispose();
      mark.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
