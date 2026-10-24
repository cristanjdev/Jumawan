import { useRef } from "react";
import { motion, useMotionTemplate, useTransform } from "framer-motion";
import type { PortraitProps } from "./types";
import { usePointerTilt } from "./use-pointer-tilt";

// Parallax glass card: the photo on frosted glass, with layers at different depths that slide
// against each other as the card leans toward the pointer (back to front: accent card, shadow, glass
// card, photo, corner brackets, nameplate, glare).

export function GlassCardPortrait({ photoUrl, loading, name, role, animated, interactive }: PortraitProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { x, y } = usePointerTilt(ref, interactive);
  const rotateY = useTransform(x, [-1, 1], [-14, 14]);
  const rotateX = useTransform(y, [-1, 1], [11, -11]);
  // Glare on the side facing the pointer, stronger the further it leans
  const glareX = useTransform(x, [-1, 1], ["15%", "85%"]);
  const glareY = useTransform(y, [-1, 1], ["10%", "70%"]);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)`;
  const glareOpacity = useTransform([x, y], ([gx, gy]: number[]) => 0.25 + Math.min(1, Math.hypot(gx, gy)) * 0.6);
  const depth = (z: number, extra = "") => ({ transform: `${interactive ? `translateZ(${z}px) ` : ""}${extra}`.trim() || undefined });

  return (
    <div
      className="relative h-[300px] w-[240px] sm:h-[340px] sm:w-[272px] md:h-[390px] md:w-[312px] lg:h-[430px] lg:w-[344px]"
      style={interactive ? { perspective: 1100 } : undefined}
    >
      <motion.div
        ref={ref}
        className="absolute inset-0"
        style={interactive ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
      >
        {/* Accent card: a brand-coloured card standing behind, turned a few degrees */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-cyan-400/70 via-sky-500/50 to-indigo-600/70 dark:from-cyan-400/45 dark:via-sky-500/30 dark:to-indigo-600/50"
          style={depth(-40, "rotate(-6deg)")}
        />

        {/* Contact shadow below the card */}
        <div
          aria-hidden
          className="absolute -bottom-[6%] left-[8%] right-[8%] h-[10%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(2,20,50,0.35),transparent)] blur-md dark:bg-[radial-gradient(closest-side,rgba(0,0,0,0.6),transparent)]"
          style={depth(-60)}
        />

        {/* Glass card */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[28px] border border-white/70 bg-white/55 shadow-[0_24px_50px_-14px_rgba(2,32,71,0.35)] backdrop-blur-xl dark:border-white/15 dark:bg-white/[0.06] dark:shadow-[0_24px_60px_-14px_rgba(0,0,0,0.65)]"
        >
          <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-white/50 via-transparent to-transparent dark:from-white/10" />
        </div>

        {/* Photo, lifted off the card */}
        <div
          className="absolute bottom-[4%] left-[5%] right-[5%] top-[4%] overflow-hidden rounded-[22px] shadow-[0_14px_30px_-10px_rgba(2,20,50,0.45)] ring-1 ring-black/5 dark:ring-white/10"
          style={depth(28)}
        >
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
          {/* soft fade at the bottom so the nameplate reads */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgba(2,12,32,0.45)] to-transparent" />
        </div>

        {/* Corner brackets, like a camera viewfinder */}
        <div aria-hidden className="pointer-events-none absolute bottom-[2%] left-[2.5%] right-[2.5%] top-[2%]" style={depth(42)}>
          {[
            "left-0 top-0 border-l-2 border-t-2 rounded-tl-[14px]",
            "right-0 top-0 border-r-2 border-t-2 rounded-tr-[14px]",
            "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-[14px]",
            "right-0 bottom-0 border-r-2 border-b-2 rounded-br-[14px]",
          ].map((corner) => (
            <span
              key={corner}
              className={`absolute h-7 w-7 border-cyan-400 drop-shadow-[0_0_6px_hsl(190_100%_60%/0.7)] dark:border-cyan-300 ${corner}`}
            />
          ))}
        </div>

        {/* Nameplate, floating in front */}
        <div
          className="absolute bottom-[8%] left-1/2 flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-white/80 bg-white/80 px-4 py-2.5 shadow-[0_12px_30px_-8px_rgba(2,32,71,0.4)] backdrop-blur-md dark:border-cyan-300/25 dark:bg-[rgba(6,20,48,0.72)]"
          style={depth(60, "translateX(-50%)")}
        >
          <span className="relative flex h-2.5 w-2.5">
            {animated && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-slate-900 dark:text-white sm:text-sm">{name}</span>
            <span className="text-[11px] font-medium text-sky-700 dark:text-cyan-300 sm:text-xs">{role}</span>
          </span>
        </div>

        {/* Glare across the whole card */}
        {interactive && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[28px]"
            style={{ background: glare, opacity: glareOpacity, mixBlendMode: "soft-light", z: 64 }}
          />
        )}
      </motion.div>
    </div>
  );
}
