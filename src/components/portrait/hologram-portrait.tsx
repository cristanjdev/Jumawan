import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import type { PortraitProps } from "./types";
import { usePointerTilt } from "./use-pointer-tilt";

// A hologram: the photo, tinted cyan, projected above a glowing pad inside a dark projection chamber
// (dark in both themes, so the projection reads on a light page too). Scanlines, a scan band sweeping
// down, a faint flicker and an occasional glitch; particles rise in the light beam. It turns a little
// toward the pointer.

const PARTICLES = [
  { left: "38%", delay: 0, dur: 3.6, size: 3 },
  { left: "47%", delay: 1.1, dur: 4.2, size: 2 },
  { left: "55%", delay: 2.3, dur: 3.2, size: 3 },
  { left: "62%", delay: 0.6, dur: 4.6, size: 2 },
  { left: "43%", delay: 2.9, dur: 3.9, size: 2 },
  { left: "58%", delay: 1.7, dur: 3.4, size: 2 },
];

export function HologramPortrait({ photoUrl, loading, name, role, animated, interactive }: PortraitProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { x, y } = usePointerTilt(ref, interactive);
  const rotateY = useTransform(x, [-1, 1], [-18, 18]);
  const rotateX = useTransform(y, [-1, 1], [6, -6]);
  const run = (animation: string) => (animated ? animation : "none");

  return (
    <div
      className="relative h-[300px] w-[260px] sm:h-[340px] sm:w-[296px] md:h-[390px] md:w-[340px] lg:h-[430px] lg:w-[376px]"
      style={{ perspective: 1000 }}
    >
      <style>{`
        @keyframes holo-flicker { 0%, 100% { opacity: 1; } 47% { opacity: 1; } 48% { opacity: .78; } 49% { opacity: 1; } 82% { opacity: .9; } 83% { opacity: 1; } }
        @keyframes holo-glitch { 0%, 91%, 100% { transform: translateX(0); clip-path: none; } 92% { transform: translateX(-4px); } 93% { transform: translateX(3px); clip-path: inset(30% 0 40% 0); } 94% { transform: translateX(0); clip-path: none; } }
        @keyframes holo-scan { from { transform: translateY(-20%); } to { transform: translateY(520%); } }
        @keyframes holo-rise { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-220px); opacity: 0; } }
        @keyframes holo-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>

      {/* Projection chamber: a dark glass field behind everything */}
      <div
        aria-hidden
        className="absolute inset-[3%] rounded-[32px] border border-cyan-400/25 bg-[radial-gradient(ellipse_at_50%_80%,hsl(195_90%_18%),hsl(222_70%_7%)_70%)] shadow-[0_24px_60px_-18px_rgba(2,20,50,0.6),inset_0_0_40px_hsl(190_100%_50%/0.12)]"
      />

      <motion.div
        ref={ref}
        className="absolute inset-0"
        style={{ rotateX: interactive ? rotateX : 0, rotateY: interactive ? rotateY : 0, transformStyle: "preserve-3d" }}
      >
        {/* Light beam from the pad up to the figure */}
        <div
          aria-hidden
          className="absolute bottom-[13%] left-[14%] right-[14%] top-[10%]"
          style={{
            clipPath: "polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)",
            background: "linear-gradient(to top, hsl(190 100% 60% / 0.45), hsl(190 100% 60% / 0.05) 85%)",
            filter: "blur(2px)",
            mixBlendMode: "screen",
          }}
        />

        {/* Rising particles */}
        {animated &&
          PARTICLES.map((p, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute bottom-[16%] rounded-full bg-cyan-200 shadow-[0_0_6px_2px_hsl(190_100%_60%/0.8)]"
              style={{ left: p.left, width: p.size, height: p.size, animation: `holo-rise ${p.dur}s linear ${p.delay}s infinite` }}
            />
          ))}

        {/* The hologram itself */}
        <div
          className="absolute left-[18%] right-[18%] top-[8%] bottom-[24%]"
          style={{ transform: interactive ? "translateZ(30px)" : undefined, animation: run("holo-float 6s ease-in-out infinite") }}
        >
          <div className="relative h-full w-full" style={{ animation: run("holo-glitch 7s steps(1) infinite") }}>
            <div
              className="relative h-full w-full overflow-hidden"
              style={{
                mixBlendMode: "screen",
                animation: run("holo-flicker 5s linear infinite"),
                WebkitMaskImage: "radial-gradient(ellipse 72% 78% at 50% 42%, #000 52%, transparent 100%)",
                maskImage: "radial-gradient(ellipse 72% 78% at 50% 42%, #000 52%, transparent 100%)",
              }}
            >
              {loading ? (
                <div className="h-full w-full animate-pulse bg-cyan-400/10" />
              ) : (
                <img
                  src={photoUrl}
                  alt={`${name} - ${role}`}
                  className="h-full w-full object-cover object-top"
                  style={{ filter: "grayscale(1) contrast(1.25) brightness(1.15)" }}
                  loading="eager"
                  decoding="async"
                  draggable={false}
                />
              )}
              {/* tint the projection cyan */}
              <div aria-hidden className="absolute inset-0 bg-[hsl(190_100%_50%)]" style={{ mixBlendMode: "color" }} />
              {/* scanlines and a band sweeping down */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{ background: "repeating-linear-gradient(to bottom, rgba(0,0,0,0.35) 0 1px, transparent 1px 3px)" }}
              />
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-[18%]"
                style={{
                  background: "linear-gradient(to bottom, transparent, hsl(190 100% 75% / 0.35), transparent)",
                  animation: run("holo-scan 3.5s linear infinite"),
                }}
              />
            </div>
          </div>
        </div>

        {/* Name tag in the beam */}
        <div
          className="absolute bottom-[17%] left-1/2 whitespace-nowrap text-center font-mono leading-tight text-cyan-200 drop-shadow-[0_0_8px_hsl(190_100%_60%/0.9)]"
          style={{ transform: `translateX(-50%)${interactive ? " translateZ(40px)" : ""}` }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em] sm:text-xs">{name}</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/80 sm:text-[11px]">{role}</div>
        </div>

        {/* Projector pad */}
        <div aria-hidden className="absolute bottom-[7%] left-[22%] right-[22%] h-[9%]" style={{ transform: interactive ? "translateZ(10px)" : undefined }}>
          <div className="absolute inset-0 rounded-[50%] bg-[radial-gradient(closest-side,hsl(190_100%_75%),hsl(190_100%_50%/0.55)_45%,transparent)] blur-[2px]" />
          <div className="absolute inset-[18%] rounded-[50%] border border-cyan-200/80 shadow-[0_0_14px_hsl(190_100%_60%)]" />
          <div className="absolute -bottom-[45%] left-[6%] right-[6%] h-[70%] rounded-b-[40%] bg-gradient-to-b from-[hsl(214_40%_28%)] to-[hsl(222_45%_12%)] shadow-[0_6px_14px_rgba(0,0,0,0.5)]" />
        </div>
      </motion.div>
    </div>
  );
}
