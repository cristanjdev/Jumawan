import { useEffect, useRef, useState } from "react";
import type { PortraitProps } from "./types";
import { usePointerTilt } from "./use-pointer-tilt";

// A developer ID badge hanging from a lanyard. A small spring simulation swings it from the strap's
// anchor: it sways gently on its own and leans toward the pointer; grab the badge to swing and twist
// it, and on release it swings back and settles. No physics library: one rAF loop, transforms only.

/** Swing spring: stiffness and damping (per second); low damping so it swings a few times */
const SWING_K = 16;
const SWING_C = 1.6;
/** Twist spring back to facing the viewer */
const TWIST_K = 10;
const TWIST_C = 3.2;
const DEG = 180 / Math.PI;

export function LanyardPortrait({ photoUrl, loading, name, role, logoUrl, animated, interactive }: PortraitProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const swingRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const { x: lean } = usePointerTilt(stageRef, interactive);
  const live = useRef({ animated, interactive });
  live.current = { animated, interactive };
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const swing = swingRef.current;
    const badge = badgeRef.current;
    if (!stage || !swing || !badge || !onScreen) return;

    let angle = 0; // swing, degrees from hanging straight down
    let angleVel = 0;
    let twist = 0; // turn of the badge about the strap, degrees
    let twistVel = 0;
    let dragging = false;
    let lastPointerX = 0;
    let lastTime = 0;
    let elapsed = 0;

    const anchor = () => {
      const r = stage.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top };
    };
    const draw = () => {
      swing.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      badge.style.transform = `rotateY(${twist.toFixed(2)}deg) rotateX(${(-angleVel * 0.04).toFixed(2)}deg)`;
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastPointerX = e.clientX;
      lastTime = performance.now();
      badge.setPointerCapture(e.pointerId);
      badge.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const a = anchor();
      const next = Math.max(-60, Math.min(60, Math.atan2(e.clientX - a.x, Math.max(40, e.clientY - a.y)) * DEG));
      const dt = Math.max(0.008, (now - lastTime) / 1000);
      angleVel = (next - angle) / dt;
      angle = next;
      twist += (e.clientX - lastPointerX) * 0.6;
      lastPointerX = e.clientX;
      lastTime = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      angleVel = Math.max(-400, Math.min(400, angleVel));
      if (badge.hasPointerCapture(e.pointerId)) badge.releasePointerCapture(e.pointerId);
      badge.style.cursor = "";
    };

    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.033, (now - last) / 1000) : 1 / 60;
      last = now;
      elapsed += dt;
      if (!dragging) {
        const { animated: idle, interactive: leanOn } = live.current;
        // where it would rest: a gentle sway, nudged toward the pointer
        const rest = (idle ? Math.sin(elapsed * 0.9) * 2.5 : 0) + (leanOn ? lean.get() * 7 : 0);
        angleVel += (-SWING_K * (angle - rest) - SWING_C * angleVel) * dt;
        angle += angleVel * dt;
        // twist back to the nearest full turn (front facing), with a slight idle turn
        const home = Math.round(twist / 360) * 360 + (idle ? Math.sin(elapsed * 0.6) * 8 : 0);
        twistVel += (-TWIST_K * (twist - home) - TWIST_C * twistVel) * dt;
        twist += twistVel * dt;
      }
      draw();
    };

    badge.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      badge.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [onScreen, lean]);

  return (
    <div
      ref={stageRef}
      className="relative h-[400px] w-[260px] sm:h-[430px] sm:w-[280px] md:h-[470px] md:w-[310px] lg:h-[500px] lg:w-[330px]"
      style={{ perspective: 1100 }}
    >
      {/* Everything that swings hangs from the top centre */}
      <div ref={swingRef} className="absolute inset-0" style={{ transformOrigin: "50% 0%", transformStyle: "preserve-3d" }}>
        {/* Strap */}
        <div
          aria-hidden
          className="absolute left-1/2 top-0 h-[27%] w-[18px] -ml-[9px] overflow-hidden bg-gradient-to-b from-cyan-500 via-sky-600 to-indigo-600 shadow-[0_2px_8px_rgba(2,20,50,0.35)]"
          // fades in at the top, as if it hangs from above
          style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 30%)", maskImage: "linear-gradient(to bottom, transparent, #000 30%)" }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-around py-1 text-[7px] font-black tracking-[0.2em] text-white/80 [writing-mode:vertical-rl]">
            <span>BLUTECH</span>
            <span>BLUTECH</span>
          </div>
        </div>
        {/* Clip */}
        <div aria-hidden className="absolute left-1/2 top-[26%] -ml-[14px] h-[22px] w-[28px]">
          <div className="absolute inset-x-[3px] top-0 h-[12px] rounded-[3px] bg-gradient-to-b from-slate-200 to-slate-400 shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
          <div className="absolute left-1/2 top-[9px] -ml-[6px] h-[13px] w-[12px] rounded-full border-[3px] border-slate-300" />
        </div>

        {/* The badge: drag it to swing and twist */}
        <div
          ref={badgeRef}
          className="absolute left-[16%] right-[16%] top-[30%] aspect-[0.68] cursor-grab select-none"
          style={{ transformStyle: "preserve-3d", touchAction: "pan-y" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_22px_45px_-15px_rgba(2,32,71,0.55)] dark:border-white/10 dark:bg-[hsl(222_45%_11%)]"
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* header band with the slot for the clip */}
            <div className="relative flex h-[17%] items-center justify-between bg-gradient-to-r from-cyan-500 via-sky-600 to-indigo-600 px-[7%]">
              <span aria-hidden className="absolute left-1/2 top-[14%] h-[16%] w-[22%] -translate-x-1/2 rounded-full bg-black/25" />
              {logoUrl ? (
                <img src={logoUrl} alt="" className="mt-[6%] h-[48%] w-auto object-contain" draggable={false} />
              ) : (
                <span className="mt-[6%] text-xs font-black text-white">{initials}</span>
              )}
              <span className="mt-[6%] text-[9px] font-bold uppercase tracking-[0.2em] text-white/90 sm:text-[10px]">Dev Pass</span>
            </div>
            {/* photo */}
            <div className="mx-[9%] mt-[7%] aspect-square overflow-hidden rounded-[12px] ring-2 ring-cyan-400/60">
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
            </div>
            {/* name and role */}
            <div className="mt-[6%] px-[8%] text-center leading-tight">
              <div className="truncate text-[13px] font-bold text-slate-900 dark:text-white sm:text-sm">{name}</div>
              <div className="mt-0.5 truncate text-[11px] font-semibold text-sky-600 dark:text-cyan-300 sm:text-xs">{role}</div>
            </div>
            {/* barcode */}
            <div className="mt-auto flex items-end justify-between px-[8%] pb-[6%]">
              <div
                aria-hidden
                className="h-[20px] w-[58%] opacity-80 dark:invert"
                style={{ background: "repeating-linear-gradient(90deg, #0f172a 0 2px, transparent 2px 3px, #0f172a 3px 4px, transparent 4px 7px)" }}
              />
              <span className="font-mono text-[8px] text-slate-500 dark:text-slate-400">ID-{initials}-01</span>
            </div>
          </div>

          {/* Back */}
          <div
            aria-hidden
            className="absolute inset-0 grid place-items-center overflow-hidden rounded-[18px] bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-700 shadow-[0_22px_45px_-15px_rgba(2,32,71,0.55)]"
            style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
          >
            <div className="absolute inset-0 opacity-20" style={{ background: "repeating-linear-gradient(135deg, white 0 1px, transparent 1px 12px)" }} />
            {logoUrl ? (
              <img src={logoUrl} alt="" className="relative h-[34%] w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]" draggable={false} />
            ) : (
              <span className="relative text-5xl font-black text-white">{initials}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
