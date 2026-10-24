import { useId, useRef } from "react";
import { motion, useTransform } from "framer-motion";
import type { PortraitProps } from "./types";
import { usePointerTilt } from "./use-pointer-tilt";

// A thick coin medallion: the photo on the front, the BluTech logo on the back (initials when there is
// no logo). It flips every few seconds (paused while hovered) and leans toward the pointer. The rim is
// a stack of thin metallic slices, so the coin shows real thickness as it turns.

/** Half the coin's thickness in px; the rim fills the space between the faces */
const HALF_THICKNESS = 9;
const RIM_SLICES = 10;
const METAL = "linear-gradient(135deg, #cffafe 0%, #22d3ee 25%, #0e7490 50%, #67e8f9 75%, #155e75 100%)";

function Bezel({ text, idSuffix }: { text: string; idSuffix: string }) {
  const pathId = `coin-arc-${idSuffix}`;
  return (
    <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 h-full w-full">
      <defs>
        <path id={pathId} d="M100,100 m-84,0 a84,84 0 1,1 168,0 a84,84 0 1,1 -168,0" />
      </defs>
      <text className="fill-[#04263a] text-[9.5px] font-bold uppercase tracking-[0.32em]">
        <textPath href={`#${pathId}`} startOffset="0">
          {text}
        </textPath>
      </text>
    </svg>
  );
}

export function CoinPortrait({ photoUrl, loading, name, role, logoUrl, animated, interactive }: PortraitProps) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const { x, y } = usePointerTilt(ref, interactive);
  const rotateY = useTransform(x, [-1, 1], [-16, 16]);
  const rotateX = useTransform(y, [-1, 1], [12, -12]);
  const bezelText = `${name} • ${role} • `.toUpperCase();
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <div
      className="coin-stage relative h-[260px] w-[260px] sm:h-[300px] sm:w-[300px] md:h-[340px] md:w-[340px] lg:h-[380px] lg:w-[380px]"
      style={{ perspective: 1000 }}
    >
      <style>{`
        @keyframes coin-flip {
          0%, 38% { transform: rotateY(0deg); animation-timing-function: cubic-bezier(.6, 0, .3, 1); }
          50%, 88% { transform: rotateY(180deg); animation-timing-function: cubic-bezier(.6, 0, .3, 1); }
          100% { transform: rotateY(360deg); }
        }
        .coin-stage:hover .coin-flipper { animation-play-state: paused; }
      `}</style>

      {/* Shadow on the "floor" */}
      <div
        aria-hidden
        className="absolute -bottom-[2%] left-[18%] right-[18%] h-[8%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(2,20,50,0.4),transparent)] blur-md dark:bg-[radial-gradient(closest-side,rgba(0,0,0,0.65),transparent)]"
      />

      <motion.div
        ref={ref}
        className="absolute inset-[8%]"
        style={{ rotateX: interactive ? rotateX : 0, rotateY: interactive ? rotateY : 0, transformStyle: "preserve-3d" }}
      >
        <div
          className="coin-flipper absolute inset-0"
          style={{ transformStyle: "preserve-3d", animation: animated ? "coin-flip 9s infinite" : "none" }}
        >
          {/* Rim: thin metal slices between the two faces */}
          {Array.from({ length: RIM_SLICES }, (_, i) => {
            const z = -HALF_THICKNESS + ((i + 0.5) / RIM_SLICES) * HALF_THICKNESS * 2;
            return (
              <div
                key={i}
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{ transform: `translateZ(${z.toFixed(2)}px)`, background: METAL, filter: `brightness(${0.75 + (i % 3) * 0.08})` }}
              />
            );
          })}

          {/* Front: the photo inside an engraved metal bezel */}
          <div
            className="absolute inset-0 rounded-full shadow-[0_0_30px_hsl(190_100%_55%/0.45)]"
            style={{ transform: `translateZ(${HALF_THICKNESS}px)`, backfaceVisibility: "hidden", background: METAL }}
          >
            <Bezel text={bezelText} idSuffix={`${uid}-front`} />
            <div className="absolute inset-[13%] overflow-hidden rounded-full ring-2 ring-cyan-200/80 shadow-[inset_0_0_12px_rgba(0,0,0,0.5)]">
              {loading ? (
                <div className="h-full w-full animate-pulse bg-primary/10" />
              ) : (
                <img
                  src={photoUrl}
                  alt={`${name} - ${role}`}
                  className="h-full w-full object-cover object-top"
                  loading="eager"
                  decoding="async"
                  draggable={false}
                />
              )}
              <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
            </div>
          </div>

          {/* Back: the logo (or initials) on deep blue, same bezel */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{ transform: `rotateY(180deg) translateZ(${HALF_THICKNESS}px)`, backfaceVisibility: "hidden", background: METAL }}
          >
            <Bezel text={bezelText} idSuffix={`${uid}-back`} />
            <div className="absolute inset-[13%] grid place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_30%,hsl(205_80%_30%),hsl(227_75%_9%))] ring-2 ring-cyan-200/80">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-[62%] w-[62%] object-contain drop-shadow-[0_0_16px_hsl(190_100%_60%/0.6)]" draggable={false} />
              ) : (
                <span className="text-5xl font-black tracking-tight text-cyan-200 drop-shadow-[0_0_12px_hsl(190_100%_60%/0.7)]">
                  {initials}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
