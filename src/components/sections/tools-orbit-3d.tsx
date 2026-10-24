import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import { useInView, useScroll } from "framer-motion";
import { usePageVisible } from "@/hooks/use-page-visible";
import type { OrbitScene } from "@/lib/orbit-scene";
import { useThemeStore } from "@/stores/useThemeStore";

interface OrbitTool {
  name: string;
  image: string;
}

/** The logo elements of each orbit, inner → outer, as currently rendered */
function collectLogos(wrap: HTMLElement, ringCount: number) {
  return Array.from({ length: ringCount }, (_, ring) => [...wrap.querySelectorAll<HTMLElement>(`[data-ring="${ring}"]`)]);
}

/**
 * Tools & Technologies as a 3D orbit. three.js is only downloaded once the section is close to the
 * viewport, and the scene only renders while it is on screen and the tab is visible. Tools come
 * straight from the live query: when they change in admin the logos are swapped in place.
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
  const hasTools = rings.some((ring) => ring.length > 0);
  const ringCount = rings.length;

  // Values the scene reads after it is created, kept current without rebuilding it
  const live = useRef({ active: false, dark, onUnavailable });
  live.current = { active: inView && pageVisible, dark, onUnavailable };

  useEffect(() => {
    if (!near || !hasTools) return;
    let cancelled = false;

    import("@/lib/orbit-scene")
      .then(({ createOrbitScene }) => {
        const wrap = wrapRef.current;
        const host = hostRef.current;
        if (cancelled || !wrap || !host) return;
        const scene = createOrbitScene({
          host,
          rings: collectLogos(wrap, ringCount),
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
  }, [near, hasTools, ringCount, quality, reduceMotion, scrollYProgress]);

  // Tools added, removed or reordered: put the new logos on the orbits
  useEffect(() => {
    const wrap = wrapRef.current;
    if (wrap) sceneRef.current?.setLogos(collectLogos(wrap, ringCount));
  }, [rings, ringCount]);

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
    sceneRef.current?.setHover(null);
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
      className="relative isolate mx-auto h-[clamp(240px,70vw,460px)] w-full max-w-7xl select-none sm:h-[clamp(500px,76vh,700px)] lg:h-[clamp(560px,78vh,760px)]"
    >
      <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0 z-[1000]" />
      <ul aria-label="Tools and technologies">
        {rings.map((ring, r) =>
          ring.map((tool) => (
            <li
              key={tool.name}
              data-ring={r}
              className="group absolute left-0 top-0 h-6 w-6 opacity-0 will-change-transform min-[400px]:h-7 min-[400px]:w-7 sm:h-11 sm:w-11 lg:h-12 lg:w-12 xl:h-14 xl:w-14"
              onPointerEnter={(event) => sceneRef.current?.setHover(event.currentTarget)}
              onPointerLeave={() => sceneRef.current?.setHover(null)}
            >
              {/* No badge: the logo itself glows. A hairline contour keeps white logos visible on the light page and
                  black ones on the dark one; the soft halo behind it is cyan on dark and sky blue on light. */}
              <img
                src={tool.image}
                alt={tool.name}
                className="h-full w-full object-contain transition-[filter,transform] duration-200 group-hover:scale-110 [filter:drop-shadow(0_0_0.6px_rgba(15,23,42,0.7))_drop-shadow(0_0_4px_rgba(6,182,212,0.85))_drop-shadow(0_0_10px_rgba(6,182,212,0.45))] group-hover:[filter:drop-shadow(0_0_0.6px_rgba(15,23,42,0.7))_drop-shadow(0_0_6px_rgba(6,182,212,1))_drop-shadow(0_0_16px_rgba(6,182,212,0.75))] dark:[filter:drop-shadow(0_0_0.8px_rgba(255,255,255,0.95))_drop-shadow(0_0_0.8px_rgba(255,255,255,0.7))_drop-shadow(0_0_6px_rgba(47,200,255,0.6))] dark:group-hover:[filter:drop-shadow(0_0_0.8px_rgba(255,255,255,0.95))_drop-shadow(0_0_0.8px_rgba(255,255,255,0.7))_drop-shadow(0_0_12px_rgba(47,200,255,0.95))]"
                draggable={false}
                decoding="async"
              />
              <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-full border border-sky-500/30 bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 dark:border-[rgba(90,200,255,0.45)] dark:bg-[rgba(6,20,48,0.92)] dark:text-[#e6f6ff]">
                {tool.name}
              </span>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
