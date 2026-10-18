import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import { useInView, useScroll } from "framer-motion";
import { usePageVisible } from "@/hooks/use-page-visible";
import type { OrbitScene } from "@/lib/orbit-scene";
import { useThemeStore } from "@/stores/useThemeStore";

interface OrbitTool {
  name: string;
  image: string;
}

/**
 * Tools & Technologies as a 3D orbit. three.js is only downloaded once the section is close to the
 * viewport, and the scene only renders while it is on screen and the tab is visible.
 */
export function ToolsOrbit3D({
  rings,
  quality,
  reduceMotion,
  sectionRef,
  onUnavailable,
}: {
  /** Tools per orbit, inner → outer */
  rings: OrbitTool[][];
  quality: "high" | "medium";
  reduceMotion: boolean;
  sectionRef: RefObject<HTMLElement>;
  /** WebGL is missing or failed; the caller shows the 2D orbit instead */
  onUnavailable: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OrbitScene | null>(null);
  const near = useInView(wrapRef, { margin: "800px 0px", once: true });
  const inView = useInView(wrapRef, { margin: "100px 0px" });
  const pageVisible = usePageVisible();
  const dark = useThemeStore((s) => s.theme) === "dark";
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });

  // Values the scene reads after it is created, kept current without rebuilding it
  const live = useRef({ active: false, dark, onUnavailable });
  live.current = { active: inView && pageVisible, dark, onUnavailable };

  useEffect(() => {
    if (!near || rings.every((ring) => ring.length === 0)) return;
    let cancelled = false;

    import("@/lib/orbit-scene")
      .then(({ createOrbitScene }) => {
        const wrap = wrapRef.current;
        const host = hostRef.current;
        if (cancelled || !wrap || !host) return;
        const logos = rings.map((_, ring) => [...wrap.querySelectorAll<HTMLElement>(`[data-ring="${ring}"]`)]);
        const scene = createOrbitScene({
          host,
          rings: logos,
          quality,
          reduceMotion,
          dark: live.current.dark,
          getScroll: () => scrollYProgress.get(),
        });
        sceneRef.current = scene;
        scene.setActive(live.current.active);
      })
      .catch((error: unknown) => {
        console.warn("3D orbit unavailable, using the 2D one:", error);
        if (!cancelled) live.current.onUnavailable();
      });

    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [near, rings, quality, reduceMotion, scrollYProgress]);

  useEffect(() => {
    sceneRef.current?.setActive(inView && pageVisible);
  }, [inView, pageVisible]);

  useEffect(() => {
    sceneRef.current?.setDark(dark);
  }, [dark]);

  const local = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, rect };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const scene = sceneRef.current;
    if (!scene || event.pointerType !== "mouse") return;
    const { x, y, rect } = local(event);
    scene.setPointer((x / rect.width) * 2 - 1, (y / rect.height) * 2 - 1);
    event.currentTarget.style.cursor = scene.isOverCore(x, y) ? "pointer" : "";
  };

  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    sceneRef.current?.setPointer(0, 0);
    sceneRef.current?.setHover(false);
    event.currentTarget.style.cursor = "";
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const scene = sceneRef.current;
    const { x, y } = local(event);
    if (scene?.isOverCore(x, y)) scene.pulse();
  };

  return (
    <div
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      className="relative isolate mx-auto h-[540px] w-full max-w-6xl select-none xl:h-[600px]"
    >
      <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0 z-[2]" />
      <ul aria-label="Tools and technologies">
        {rings.map((ring, r) =>
          ring.map((tool) => (
            <li
              key={tool.name}
              data-ring={r}
              className="group absolute left-0 top-0 h-11 w-11 opacity-0 will-change-transform xl:h-12 xl:w-12"
              onPointerEnter={() => sceneRef.current?.setHover(true)}
              onPointerLeave={() => sceneRef.current?.setHover(false)}
            >
              <img src={tool.image} alt={tool.name} className="h-full w-full object-contain drop-shadow-lg" draggable={false} decoding="async" />
              <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded border border-cyan-500/30 bg-[var(--surface-bg)]/90 px-2 py-1 text-xs text-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {tool.name}
              </span>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
