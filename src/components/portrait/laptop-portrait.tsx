import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import type { PortraitProps } from "./types";
import { usePointerTilt } from "./use-pointer-tilt";

// An open laptop at a 3/4 angle, its screen showing a code editor: the photo beside an
// "about-me.tsx" with the name and role in code. Code chips float around it at different depths,
// and the whole scene leans toward the pointer.

/**
 * Chips sit beside and above the screen, never over it or near the deck: the deck lies flat toward
 * the viewer below the screen, so a chip down there would cut through it in 3D.
 */
const CHIPS = [
  { text: "</>", className: "-left-[13%] top-[8%]", z: 40, delay: 0 },
  { text: "git push", className: "-left-[17%] top-[34%]", z: 30, delay: 1.8 },
  { text: "{ }", className: "-right-[11%] -top-[11%]", z: 50, delay: 1.2 },
  { text: "=>", className: "-right-[17%] top-[26%]", z: 35, delay: 0.6 },
];

export function LaptopPortrait({ photoUrl, loading, name, role, animated, interactive }: PortraitProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { x, y } = usePointerTilt(ref, interactive);
  const rotateY = useTransform(x, [-1, 1], [-30, -2]);
  const rotateX = useTransform(y, [-1, 1], [-8, -24]);
  const shortName = name.split(/\s+/).slice(0, 2).join(" ");

  return (
    <div
      className="relative h-[250px] w-[300px] sm:h-[280px] sm:w-[340px] md:h-[320px] md:w-[390px] lg:h-[360px] lg:w-[440px]"
      style={{ perspective: 1300 }}
    >
      <style>{`
        @keyframes laptop-chip { 0%, 100% { translate: 0 0; } 50% { translate: 0 -10px; } }
        @keyframes laptop-caret { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
      `}</style>

      {/* Shadow under the laptop */}
      <div
        aria-hidden
        className="absolute bottom-[2%] left-[12%] right-[12%] h-[12%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(2,20,50,0.4),transparent)] blur-md dark:bg-[radial-gradient(closest-side,rgba(0,0,0,0.7),transparent)]"
      />

      <motion.div
        ref={ref}
        className="absolute left-[12%] right-[12%] top-[4%]"
        style={{
          rotateX: interactive ? rotateX : -16,
          rotateY: interactive ? rotateY : -16,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Lid: bezel and screen, standing up from the back of the deck */}
        <div
          className="relative aspect-[16/10.4] rounded-t-[14px] border border-white/10 bg-gradient-to-b from-[hsl(222_30%_16%)] to-[hsl(222_35%_10%)] p-[3.5%] shadow-[0_0_40px_hsl(190_100%_55%/0.3)]"
          style={{ transformOrigin: "bottom", transform: "rotateX(8deg)" /* leans back a little */ }}
        >
          <div className="relative flex h-full flex-col overflow-hidden rounded-[6px] bg-[hsl(222_45%_8%)] ring-1 ring-cyan-400/30">
            {/* editor title bar */}
            <div className="flex items-center gap-[3%] border-b border-white/5 bg-[hsl(222_40%_12%)] px-[3%] py-[1.6%]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#ff5f57]" />
              <span className="h-[6px] w-[6px] rounded-full bg-[#febc2e]" />
              <span className="h-[6px] w-[6px] rounded-full bg-[#28c840]" />
              <span className="ml-[3%] font-mono text-[7px] text-slate-400 sm:text-[8px] md:text-[9px]">about-me.tsx</span>
            </div>
            <div className="flex min-h-0 flex-1 gap-[4%] p-[4%]">
              {/* the photo */}
              <div className="relative w-[36%] shrink-0 overflow-hidden rounded-[5px] shadow-[0_0_14px_hsl(190_100%_55%/0.45)] ring-1 ring-cyan-300/50">
                {loading ? (
                  <div className="h-full w-full animate-pulse bg-cyan-400/10" />
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
              </div>
              {/* the code */}
              <pre className="min-w-0 flex-1 overflow-hidden whitespace-pre font-mono text-[6px] leading-[1.75] text-slate-300 sm:text-[7px] md:text-[8px] lg:text-[9px]">
                <span className="text-violet-400">const</span> <span className="text-sky-300">developer</span> = {"{"}
                {"\n  "}
                <span className="text-cyan-200">name</span>: <span className="text-emerald-300">"{shortName}"</span>,
                {"\n  "}
                <span className="text-cyan-200">role</span>: <span className="text-emerald-300">"{role}"</span>,
                {"\n  "}
                <span className="text-cyan-200">stack</span>: [<span className="text-emerald-300">"React"</span>, <span className="text-emerald-300">"TS"</span>],
                {"\n  "}
                <span className="text-cyan-200">available</span>: <span className="text-orange-300">true</span>,
                {"\n"}
                {"};"}
                <span className="ml-0.5 inline-block h-[1.1em] w-[0.5em] translate-y-[0.15em] bg-cyan-300" style={{ animation: animated ? "laptop-caret 1s infinite" : "none" }} />
              </pre>
            </div>
          </div>
        </div>

        {/* Deck: lies flat toward the viewer from the bottom of the lid */}
        <div
          aria-hidden
          className="relative aspect-[16/10] rounded-b-[16px] border border-white/10 bg-gradient-to-b from-[hsl(220_20%_70%)] to-[hsl(220_18%_52%)] p-[5%] dark:from-[hsl(222_25%_26%)] dark:to-[hsl(222_28%_16%)]"
          style={{ transformOrigin: "top", transform: "rotateX(90deg)" }}
        >
          <div className="grid h-[58%] grid-cols-12 grid-rows-4 gap-[2.5%] rounded-[6px] bg-black/20 p-[2.5%]">
            {Array.from({ length: 48 }, (_, i) => (
              <span key={i} className="rounded-[2px] bg-[hsl(222_30%_14%)] shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]" />
            ))}
          </div>
          <div className="mx-auto mt-[5%] h-[28%] w-[36%] rounded-[6px] bg-black/15 ring-1 ring-white/10" />
        </div>

        {/* Floating code chips */}
        {CHIPS.map((chip) => (
          <span
            key={chip.text}
            aria-hidden
            className={`absolute ${chip.className} whitespace-nowrap rounded-lg border border-cyan-300/40 bg-white/80 px-2 py-1 font-mono text-[10px] font-semibold text-sky-700 shadow-[0_6px_18px_-6px_rgba(2,32,71,0.4)] backdrop-blur-md dark:bg-[rgba(6,20,48,0.75)] dark:text-cyan-200 sm:text-[11px]`}
            style={{
              transform: interactive ? `translateZ(${chip.z}px)` : undefined,
              animation: animated ? `laptop-chip 4s ease-in-out ${chip.delay}s infinite` : "none",
            }}
          >
            {chip.text}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
