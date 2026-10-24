import { useEffect, useRef, useState } from "react";
import type { PortraitProps } from "./types";
import { usePointerTilt } from "./use-pointer-tilt";

// A 3D photo: a small WebGL shader shifts each pixel of the photo by its depth as the pointer moves,
// so the face moves against the background. The depth comes from the grayscale depth map uploaded in
// admin (white = near, same size as the photo); without one, a gentle built-in depth (the centre
// nearer) still gives some parallax. Falls back to the plain photo when WebGL isn't available.

const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform float uHasDepth;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform vec2 uPointer;
varying vec2 vUv;

float depthAt(vec2 uv) {
  if (uHasDepth > 0.5) return texture2D(uDepth, uv).r;
  vec2 c = (vUv - vec2(0.5, 0.58)) * vec2(1.0, 1.15);
  return 1.0 - smoothstep(0.05, 0.62, length(c));
}

void main() {
  vec2 uv = vUv * uScale + uOffset;
  float depth = depthAt(uv);
  // near pixels follow the pointer, far ones move against it
  vec2 shift = uPointer * (depth - 0.45) * 0.03;
  gl_FragColor = texture2D(uImage, uv + shift);
}`;

/** Slight zoom so shifted pixels never pull in the photo's edges */
const ZOOM = 1.08;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function texture(gl: WebGLRenderingContext, unit: number, image: HTMLImageElement) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return tex;
}

export function DepthPortrait({ photoUrl, loading, name, role, depthMapUrl, animated, interactive }: PortraitProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glReady, setGlReady] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const { x, y } = usePointerTilt(stageRef, interactive);
  const live = useRef({ animated, interactive });
  live.current = { animated, interactive };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (loading || !photoUrl || !canvas || !onScreen) return;
    let cancelled = false;
    let raf = 0;
    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    const textures: (WebGLTexture | null)[] = [];
    let buffer: WebGLBuffer | null = null;

    (async () => {
      try {
        const [photo, depth] = await Promise.all([
          loadImage(photoUrl),
          depthMapUrl ? loadImage(depthMapUrl).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });
        if (!gl) return;

        program = gl.createProgram()!;
        gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
        gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
        gl.useProgram(program);

        buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program, "aPosition");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        textures.push(texture(gl, 0, photo));
        if (depth) textures.push(texture(gl, 1, depth));
        gl.uniform1i(gl.getUniformLocation(program, "uImage"), 0);
        gl.uniform1i(gl.getUniformLocation(program, "uDepth"), depth ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(program, "uHasDepth"), depth ? 1 : 0);

        // Cover the square canvas, keeping the top of the photo (where the face is)
        const aspect = photo.naturalWidth / photo.naturalHeight;
        let sx = aspect < 1 ? 1 : 1 / aspect;
        let sy = aspect < 1 ? aspect : 1;
        sx /= ZOOM;
        sy /= ZOOM;
        gl.uniform2f(gl.getUniformLocation(program, "uScale"), sx, sy);
        gl.uniform2f(gl.getUniformLocation(program, "uOffset"), (1 - sx) / 2, Math.max(0, 1 - sy - 0.03));
        const pointer = gl.getUniformLocation(program, "uPointer");

        const resize = () => {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const size = Math.round(canvas.clientWidth * dpr);
          if (canvas.width !== size) {
            canvas.width = size;
            canvas.height = size;
            gl!.viewport(0, 0, size, size);
          }
        };

        let elapsed = 0;
        let last = 0;
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame);
          elapsed += last ? Math.min(0.05, (now - last) / 1000) : 0;
          last = now;
          resize();
          const { animated: idle, interactive: follow } = live.current;
          // follow the pointer; without it, drift in a slow circle so the depth still shows
          const px = follow ? x.get() : idle ? Math.sin(elapsed * 0.7) * 0.6 : 0;
          const py = follow ? y.get() : idle ? Math.cos(elapsed * 0.7) * 0.4 : 0;
          gl!.uniform2f(pointer, px, -py);
          gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
        };
        raf = requestAnimationFrame(frame);
        setGlReady(true);
      } catch (error) {
        console.warn("3D photo unavailable, showing the plain photo:", error);
        setGlReady(false);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (gl) {
        textures.forEach((t) => gl!.deleteTexture(t));
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
    };
  }, [loading, photoUrl, depthMapUrl, onScreen, x, y]);

  return (
    <div
      ref={stageRef}
      className="relative h-[250px] w-[250px] sm:h-[288px] sm:w-[288px] md:h-[336px] md:w-[336px] lg:h-[384px] lg:w-[384px]"
    >
      {/* Rings around the photo */}
      <div aria-hidden className="absolute -inset-[5%] rounded-full border border-cyan-400/30" />
      <div aria-hidden className="absolute -inset-[10%] rounded-full border border-dashed border-sky-400/20" />
      <div className="absolute inset-0 overflow-hidden rounded-full shadow-[0_0_40px_hsl(197_100%_60%/0.35)] ring-[3px] ring-cyan-400/70">
        {loading ? (
          <div className="h-full w-full animate-pulse bg-primary/10" />
        ) : (
          <>
            {/* plain photo until the 3D one is ready (and if it can't start) */}
            <img
              src={photoUrl}
              alt={`${name} - ${role}`}
              className={`absolute inset-0 h-full w-full scale-[1.08] object-cover object-top transition-opacity duration-500 ${glReady ? "opacity-0" : "opacity-100"}`}
              loading="eager"
              decoding="async"
              draggable={false}
            />
            <canvas
              ref={canvasRef}
              aria-hidden
              className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${glReady ? "opacity-100" : "opacity-0"}`}
            />
          </>
        )}
      </div>
    </div>
  );
}
