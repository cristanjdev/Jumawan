import { useEffect, type RefObject } from "react";
import { useMotionValue, useSpring, type MotionValue } from "framer-motion";

/**
 * Where the pointer is relative to an element, as springs from -1 to 1 on each axis (so whatever
 * follows them eases in and settles). Follows the mouse anywhere on the page, strongest near the
 * element; touch screens get a slow sway instead, so 3D depth still shows, and while a finger rests on (or drags
 * across) the element it leans toward the finger the way it follows a mouse, then eases back to the sway. Stays at 0
 * when disabled.
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
    let finger: number | null = null; // the pointer id of the finger holding the element
    const sway = (t: number) => {
      if (finger === null) {
        rawX.set(Math.sin(t / 2400) * 0.45);
        rawY.set(Math.sin(t / 3100 + 1) * 0.3);
      }
      raf = requestAnimationFrame(sway);
    };
    raf = requestAnimationFrame(sway);

    // A little beyond the element counts as on it, since a fingertip is not a point
    const MARGIN = 24;
    const lean = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const reach = Math.max(r.width, 240) * 0.55;
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      rawX.set(clamp((e.clientX - (r.left + r.width / 2)) / reach));
      rawY.set(clamp((e.clientY - (r.top + r.height / 2)) / reach));
    };
    const onDown = (e: PointerEvent) => {
      const el = ref.current;
      if (!el || e.pointerType === "mouse") return;
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left - MARGIN || e.clientX > r.right + MARGIN || e.clientY < r.top - MARGIN || e.clientY > r.bottom + MARGIN) return;
      finger = e.pointerId;
      lean(e);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerId === finger) lean(e);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === finger) finger = null; // the sway takes over again and the springs ease back
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });

    // Sideways drags on the element belong to it; up and down still scroll the page, and pinch-zoom still works
    const el = ref.current;
    const areas = [el, el?.parentElement].filter((node): node is HTMLElement => !!node && node !== document.body);
    const before = areas.map((node) => node.style.touchAction);
    areas.forEach((node) => (node.style.touchAction = "pan-y pinch-zoom"));

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      areas.forEach((node, i) => (node.style.touchAction = before[i]));
    };
  }, [enabled, ref, rawX, rawY]);

  return { x, y };
}
