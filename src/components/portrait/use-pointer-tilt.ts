import { useEffect, type RefObject } from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";

/**
 * Where the pointer is relative to an element, as springs from -1 to 1 on each axis (so whatever
 * follows them eases in and settles). Follows the mouse anywhere on the page, strongest near the
 * element; touch screens get a slow sway instead, so 3D depth still shows. Stays at 0 when disabled.
 */
export function usePointerTilt(
  ref: RefObject<HTMLElement>,
  enabled: boolean,
): { x: MotionValue<number>; y: MotionValue<number> } {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 110, damping: 16, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 110, damping: 16, mass: 0.6 });

  useEffect(() => {
    rawX.set(0);
    rawY.set(0);
    if (!enabled) return;

    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      const onMove = (e: PointerEvent) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return; // scrolled away: leave it be
        const reach = Math.max(r.width, 320) * 1.6;
        rawX.set(clamp((e.clientX - (r.left + r.width / 2)) / reach));
        rawY.set(clamp((e.clientY - (r.top + r.height / 2)) / reach));
      };
      const onLeave = () => {
        rawX.set(0);
        rawY.set(0);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      };
    }

    let raf = 0;
    const sway = (t: number) => {
      rawX.set(Math.sin(t / 2400) * 0.45);
      rawY.set(Math.sin(t / 3100 + 1) * 0.3);
      raf = requestAnimationFrame(sway);
    };
    raf = requestAnimationFrame(sway);
    return () => cancelAnimationFrame(raf);
  }, [enabled, ref, rawX, rawY]);

  return { x, y };
}
