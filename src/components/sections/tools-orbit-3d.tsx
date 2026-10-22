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
      className="relative isolate mx-auto h-[clamp(380px,62vh,540px)] w-full max-w-7xl select-none sm:h-[clamp(500px,76vh,700px)] lg:h-[clamp(560px,78vh,760px)]"
    >
      <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0 z-[1000]" />
      <ul aria-label="Tools and technologies">
        {rings.map((ring, r) =>
          ring.map((tool) => (
            <li
              key={tool.name}
              data-ring={r}
              className="group absolute left-0 top-0 h-9 w-9 opacity-0 will-change-transform sm:h-11 sm:w-11 lg:h-12 lg:w-12 xl:h-14 xl:w-14"
              onPointerEnter={(event) => sceneRef.current?.setHover(event.currentTarget)}
              onPointerLeave={() => sceneRef.current?.setHover(null)}
            >
              {/* glass badge: light frost on the light theme, cyan-rimmed navy glass on the dark one */}
              <div className="grid h-full w-full place-items-center rounded-[30%] border border-sky-500/30 bg-[radial-gradient(circle_at_30%_22%,#ffffff,rgba(224,242,254,0.92)_70%)] shadow-[0_4px_14px_rgba(2,132,199,0.15)] backdrop-blur-sm transition-[border-color,box-shadow] duration-200 group-hover:border-sky-500/70 group-hover:shadow-[0_0_22px_rgba(2,132,199,0.35)] dark:border-[rgba(90,200,255,0.35)] dark:bg-[radial-gradient(circle_at_30%_22%,rgba(130,225,255,0.2),rgba(6,18,44,0.88)_70%)] dark:shadow-[0_0_18px_rgba(47,200,255,0.16),inset_0_0_12px_rgba(47,200,255,0.12)] dark:group-hover:border-[#8fe9ff] dark:group-hover:shadow-[0_0_30px_rgba(47,200,255,0.55),inset_0_0_16px_rgba(47,200,255,0.3)]">
                {/* hairline contour: keeps white logos visible on the light badge and black ones on the dark badge */}
                <img
                  src={tool.image}
                  alt={tool.name}
                  className="h-[58%] w-[58%] object-contain [filter:drop-shadow(0_0_0.6px_rgba(15,23,42,0.6))_drop-shadow(0_1px_1px_rgba(15,23,42,0.2))] dark:[filter:drop-shadow(0_0_0.7px_rgba(255,255,255,0.65))]"
                  draggable={false}
                  decoding="async"
                />
              </div>
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
