import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  EdgesGeometry,
  FrontSide,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  NormalBlending,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from "three";

// The blutech mark in 3D. As in the logo: a glass cube seen exactly corner-on (the hexagon with the
// "Y"), outlined in dark lines with a cyan glow, holding a big faceted crystal ring with electric veins
// around a dark centre. The facet edges of the ring are the logo's nested octagon lines.

/** Cube edge length; corner-on, its outline is a hexagon of radius EDGE * √(2/3) ≈ 1.55 */
const EDGE = 1.9;
export const MARK_RADIUS = EDGE * Math.sqrt(2 / 3);

const LINE = "#0a1230";
const GLOW = "#22d3ee";

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Bright cyan glass with patches of deep-blue electric cracks; drawn twice across the seam so it wraps */
function crystalTexture() {
  const width = 512;
  const height = 256;
  const texture = canvasTexture(width, height, (ctx) => {
    const base = ctx.createLinearGradient(0, 0, 0, height);
    base.addColorStop(0, "#0ea5e9");
    base.addColorStop(0.5, "#7ee8fa");
    base.addColorStop(1, "#0ea5e9");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const twice = (draw: (shift: number) => void) => [0, -width].forEach(draw);

    // Deep-blue electric patches
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 30 + Math.random() * 55;
      twice((shift) => {
        const patch = ctx.createRadialGradient(x + shift, y, 0, x + shift, y, r);
        patch.addColorStop(0, "rgba(29,78,216,0.95)");
        patch.addColorStop(0.6, "rgba(37,99,235,0.6)");
        patch.addColorStop(1, "rgba(29,78,216,0)");
        ctx.fillStyle = patch;
        ctx.fillRect(x + shift - r, y - r, r * 2, r * 2);
      });
    }

    // Cracks: dark-blue hairlines with bright cyan cores
    ctx.lineCap = "round";
    for (let bolt = 0; bolt < 60; bolt++) {
      const points: [number, number][] = [];
      let x = Math.random() * width;
      let y = Math.random() * height;
      for (let step = 0; step < 5 + Math.random() * 6; step++) {
        points.push([x, y]);
        x += (Math.random() - 0.3) * 30;
        y += (Math.random() - 0.5) * 30;
      }
      for (const [style, lineWidth] of [
        ["rgba(30,58,138,0.7)", 2.4],
        [`rgba(${bolt % 3 ? "103,232,249" : "240,253,255"},0.9)`, 0.9],
      ] as const) {
        ctx.strokeStyle = style;
        ctx.lineWidth = lineWidth;
        twice((shift) => {
          ctx.beginPath();
          points.forEach(([px, py], i) => (i ? ctx.lineTo(px + shift, py) : ctx.moveTo(px + shift, py)));
          ctx.stroke();
        });
      }
    }
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.5})`;
      ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
  });
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

/** Glass face: clear in the middle, glowing toward its rim */
function glassTexture() {
  const size = 256;
  return canvasTexture(size, size, (ctx) => {
    ctx.fillStyle = "rgba(125,211,252,0.07)";
    ctx.fillRect(0, 0, size, size);
    const rim = size * 0.22;
    for (const [x0, y0, x1, y1] of [
      [0, 0, rim, 0],
      [size, 0, size - rim, 0],
      [0, 0, 0, rim],
      [0, size, 0, size - rim],
    ]) {
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, "rgba(165,243,252,0.6)");
      gradient.addColorStop(1, "rgba(165,243,252,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
  });
}

/** Thick lines as one instanced draw: a thin cylinder stretched along each segment */
function tubes(segments: [Vector3, Vector3][], radius: number, material: Material) {
  const mesh = new InstancedMesh(new CylinderGeometry(1, 1, 1, 6, 1, true), material, segments.length);
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const up = new Vector3(0, 1, 0);
  segments.forEach(([a, b], i) => {
    const direction = b.clone().sub(a);
    rotation.setFromUnitVectors(up, direction.clone().normalize());
    matrix.compose(a.clone().add(b).multiplyScalar(0.5), rotation, new Vector3(radius, direction.length(), radius));
    mesh.setMatrixAt(i, matrix);
  });
  return mesh;
}

/** Segments of an EdgesGeometry as vector pairs */
function edgeSegments(geometry: EdgesGeometry) {
  const p = geometry.attributes.position.array;
  const segments: [Vector3, Vector3][] = [];
  for (let i = 0; i < p.length; i += 6) {
    segments.push([new Vector3(p[i], p[i + 1], p[i + 2]), new Vector3(p[i + 3], p[i + 4], p[i + 5])]);
  }
  geometry.dispose();
  return segments;
}

// Cube frame: the corner (1,1,1) faces the viewer, (-1,1,-1) is the hexagon's top point
const DIAGONAL = new Vector3(1, 1, 1).normalize();
const CUBE_UP = new Vector3(-1, 2, -1).normalize();
const CUBE_SIDE = DIAGONAL.clone().cross(CUBE_UP);
const FROM_CUBE = new Matrix4().makeBasis(DIAGONAL, CUBE_UP, CUBE_SIDE).transpose();

export function createBlutechMark() {
  const group = new Group();
  const mark = new Group();
  group.add(mark);
  const disposables: { dispose(): void }[] = [];

  // ── cube ──────────────────────────────────────────────────────────────────
  const h = EDGE / 2;
  const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new Vector3(x, y, z))));
  const cubeEdges: [Vector3, Vector3][] = [];
  for (let i = 0; i < corners.length; i++) {
    for (let j = i + 1; j < corners.length; j++) {
      const [a, b] = [corners[i], corners[j]];
      // Edges of the far corner sit behind the ring, as in the logo; leave them out
      if (a.distanceTo(b) !== 2 || a.x + a.y + a.z === -3 || b.x + b.y + b.z === -3) continue;
      cubeEdges.push([a.clone().multiplyScalar(h), b.clone().multiplyScalar(h)]);
    }
  }

  const glowMaterial = new MeshBasicMaterial({ color: GLOW, transparent: true, depthWrite: false });
  const lineMaterial = new MeshBasicMaterial({ color: LINE, transparent: true });
  const cubeGlow = tubes(cubeEdges, 0.075, glowMaterial);
  const cubeLines = tubes(cubeEdges, 0.03, lineMaterial);
  // Glow first, dark line drawn over it: a dark outline with cyan on both sides, like the logo
  cubeGlow.renderOrder = 1;
  cubeLines.renderOrder = 2;
  mark.add(cubeGlow, cubeLines);

  const glass = glassTexture();
  disposables.push(glass);
  const glassMaterial = new MeshBasicMaterial({ map: glass, transparent: true, depthWrite: false, side: FrontSide });
  const faces = new Mesh(new BoxGeometry(EDGE, EDGE, EDGE), glassMaterial);
  faces.renderOrder = 3;
  mark.add(faces);

  // ── crystal ring ─────────────────────────────────────────────────────────
  // Faces the viewer along the cube's diagonal; 8 facets around, rotated half a facet so the
  // octagons have flat tops like the logo
  const ringFrame = new Group();
  ringFrame.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(CUBE_SIDE.clone().negate(), CUBE_UP, DIAGONAL));
  mark.add(ringFrame);

  const ringGeometry = new TorusGeometry(0.86, 0.33, 5, 8);
  ringGeometry.rotateZ(Math.PI / 8);
  const crystal = crystalTexture();
  disposables.push(crystal);
  const ring = new Mesh(
    ringGeometry,
    new MeshPhongMaterial({
      map: crystal,
      emissive: "#ffffff",
      emissiveMap: crystal,
      emissiveIntensity: 0.55,
      flatShading: true,
      shininess: 60,
      specular: "#38bdf8",
    }),
  );
  ringFrame.add(ring);
  ringFrame.add(tubes(edgeSegments(new EdgesGeometry(ringGeometry)), 0.014, lineMaterial));

  // Dark centre, as in the logo
  const center = new Mesh(new CircleGeometry(0.62, 8), new MeshBasicMaterial({ color: "#060b22" }));
  center.rotation.z = Math.PI / 8;
  center.position.z = -0.12;
  ringFrame.add(center);

  // ── animation ────────────────────────────────────────────────────────────
  let spin = 0; // extra turn from spin(), eased out
  let spinTarget = 0;
  const toView = new Matrix4();
  const facing = new Quaternion();
  const sway = new Quaternion();
  const viewUp = new Vector3();
  const viewSide = new Vector3();
  const worldUp = new Vector3(0, 1, 0);

  return {
    group,
    /**
     * `view` is the direction from the mark to the camera: the cube is kept corner-on to it, so the
     * hexagon stays symmetric wherever the mark sits on screen. `yaw` sways it a little to show depth.
     */
    update(dt: number, elapsed: number, yaw: number, view: Vector3) {
      spin += (spinTarget - spin) * (1 - Math.exp(-4 * dt));
      viewUp.copy(worldUp).addScaledVector(view, -view.dot(worldUp)).normalize();
      viewSide.copy(view).cross(viewUp);
      toView.makeBasis(view, viewUp, viewSide).multiply(FROM_CUBE);
      facing.setFromRotationMatrix(toView);
      sway.setFromAxisAngle(viewUp, yaw + spin);
      mark.quaternion.multiplyQuaternions(sway, facing);
      crystal.offset.x = elapsed * 0.02;
    },
    /** One full turn, for the click pulse */
    spin() {
      spinTarget += Math.PI * 2;
    },
    setDark(dark: boolean) {
      // Additive glow disappears on a light page
      glowMaterial.blending = dark ? AdditiveBlending : NormalBlending;
      glowMaterial.opacity = dark ? 0.55 : 0.45;
      glowMaterial.needsUpdate = true;
      glassMaterial.blending = dark ? AdditiveBlending : NormalBlending;
      glassMaterial.needsUpdate = true;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
