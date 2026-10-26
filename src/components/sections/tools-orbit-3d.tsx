import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { useInView, useScroll } from "framer-motion";
import { usePageVisible } from "@/hooks/use-page-visible";
import type { OrbitScene } from "@/lib/orbit-scene";
import { useThemeStore } from "@/stores/useThemeStore";

interface OrbitTool {
  name: string;
  image: string;
}

// A logo lights up while the mouse is over it, or after a tap on a touch screen (which has no hover). The hover
// styles only apply where there is a real hover, so a tap doesn't leave a logo stuck lit once the orbit moves on.
// Every class is written out in full: Tailwind only generates classes it can find as whole words in the source.
const LOGO_CLASS = [
  "h-full w-full object-contain transition-[filter,transform] duration-200",
  "[filter:drop-shadow(0_0_0.6px_rgba(15,23,42,0.7))_drop-shadow(0_0_4px_rgba(6,182,212,0.85))_drop-shadow(0_0_10px_rgba(6,182,212,0.45))]",
  "dark:[filter:drop-shadow(0_0_0.8px_rgba(255,255,255,0.95))_drop-shadow(0_0_0.8px_rgba(255,255,255,0.7))_drop-shadow(0_0_6px_rgba(47,200,255,0.6))]",
  "[@media(hover:hover)]:group-hover:scale-110",
  "[@media(hover:hover)]:group-hover:[filter:drop-shadow(0_0_0.6px_rgba(15,23,42,0.7))_drop-shadow(0_0_6px_rgba(6,182,212,1))_drop-shadow(0_0_16px_rgba(6,182,212,0.75))]",
  "dark:[@media(hover:hover)]:group-hover:[filter:drop-shadow(0_0_0.8px_rgba(255,255,255,0.95))_drop-shadow(0_0_0.8px_rgba(255,255,255,0.7))_drop-shadow(0_0_12px_rgba(47,200,255,0.95))]",
  "group-data-[active=true]:scale-110",
  "group-data-[active=true]:[filter:drop-shadow(0_0_0.6px_rgba(15,23,42,0.7))_drop-shadow(0_0_6px_rgba(6,182,212,1))_drop-shadow(0_0_16px_rgba(6,182,212,0.75))]",
  "dark:group-data-[active=true]:[filter:drop-shadow(0_0_0.8px_rgba(255,255,255,0.95))_drop-shadow(0_0_0.8px_rgba(255,255,255,0.7))_drop-shadow(0_0_12px_rgba(47,200,255,0.95))]",
].join(" ");
const NAME_CLASS = [
  "pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-full border border-sky-500/30 bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-800 opacity-0 transition duration-200",
  "dark:border-[rgba(90,200,255,0.45)] dark:bg-[rgba(6,20,48,0.92)] dark:text-[#e6f6ff]",
  "[@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100",
  "group-data-[active=true]:translate-y-0 group-data-[active=true]:opacity-100",
].join(" ");
/** On a touch screen the small logos get a larger area to press */
const TOUCH_TARGET = "[@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-2.5 [@media(pointer:coarse)]:before:content-['']";
/** How long a tapped logo stays lit */
const TAP_HOLD_MS = 3200;

/** Keeps a logo's name inside the orbit's box: near the screen edge it would otherwise run off it */
function fitName(logo: HTMLElement, box: HTMLElement) {
  const name = logo.querySelector<HTMLElement>("[data-name]");
  if (!name) return;
  name.style.marginLeft = "0px";
  const edge = box.getBoundingClientRect();
  const rect = name.getBoundingClientRect();
  const margin = 8;
  const shift = rect.left < edge.left + margin ? edge.left + margin - rect.left : rect.right > edge.right - margin ? edge.right - margin - rect.right : 0;
  name.style.marginLeft = `${Math.round(shift)}px`;
}

/** How long after the page loads to wait before building the scene, so the hero's opening animation isn't disturbed */
const IDLE_BUILD_DELAY_MS = 2500;

/** True once the page has loaded, a short delay has passed and the browser has a quiet moment */
function useIdleAfterLoad(delay: number) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = 0;
    let handle = 0;
    // Safari has no idle callbacks
    const idleApi = window as Window & Partial<Pick<Window, "requestIdleCallback" | "cancelIdleCallback">>;
    const whenQuiet = (done: () => void) =>
      idleApi.requestIdleCallback ? idleApi.requestIdleCallback(done, { timeout: 3000 }) : window.setTimeout(done, 0);
    const start = () => {
      timer = window.setTimeout(() => {
        handle = whenQuiet(() => setIdle(true));
      }, delay);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      window.clearTimeout(timer);
      if (idleApi.cancelIdleCallback) idleApi.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [delay]);
  return idle;
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
  // The logo lit by a tap (touch screens have no hover)
  const [tapped, setTapped] = useState<string | null>(null);
  const near = useInView(wrapRef, { margin: "800px 0px", once: true });
  const idle = useIdleAfterLoad(IDLE_BUILD_DELAY_MS);
  // One flag that only ever turns on: if it were both values, the section coming close after the idle build
  // would change the effect's inputs and throw the finished scene away to build it again
  const ready = near || idle;
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
    // Built in idle time after the page loads, or when the section comes close if that happens first. Setting up
    // the scene blocks the page for a moment, which used to show as a hitch in the middle of a scroll.
    if (!ready || !hasTools) return;
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
  }, [ready, hasTools, ringCount, quality, reduceMotion, scrollYProgress]);

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

  // A tapped logo holds the orbit still and stays lit for a moment, until another tap or the time is up
  useEffect(() => {
    if (!tapped) return;
    const timer = window.setTimeout(() => setTapped(null), TAP_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [tapped]);
  useEffect(() => {
    const wrap = wrapRef.current;
    const logo = tapped ? [...(wrap?.querySelectorAll<HTMLElement>("li[data-tool]") ?? [])].find((el) => el.dataset.tool === tapped) : null;
    sceneRef.current?.setHover(logo ?? null);
  }, [tapped]);
  useEffect(() => {
    if (!inView || !pageVisible) setTapped(null);
  }, [inView, pageVisible]);

  const local = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, rect };
  };

  // The orbit leans toward the mouse; on a touch screen it leans toward a finger while it is down
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const scene = sceneRef.current;
    const mouse = event.pointerType === "mouse";
    if (!scene || (!mouse && event.buttons !== 1)) return;
    const { x, y, rect } = local(event);
    scene.setPointer((x / rect.width) * 2 - 1, (y / rect.height) * 2 - 1);
    if (mouse) event.currentTarget.style.cursor = scene.isOverCore(x, y) ? "pointer" : "";
  };

  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    sceneRef.current?.setPointer(0, 0);
    if (event.pointerType === "mouse") {
      sceneRef.current?.setHover(null);
      event.currentTarget.style.cursor = "";
    }
  };

  /** A finger lifted (or taken over by a scroll): the orbit settles back */
  const onTouchEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") sceneRef.current?.setPointer(0, 0);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const scene = sceneRef.current;
    const { x, y } = local(event);
    if (scene?.isOverCore(x, y)) scene.pulse();
    // A tap anywhere but on a logo puts the lit one out
    if (event.pointerType !== "mouse" && !(event.target as HTMLElement).closest("li[data-tool]")) setTapped(null);
  };

  return (
    <div
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onTouchEnd}
      onPointerCancel={onTouchEnd}
      style={{ touchAction: "pan-y" }}
      className="relative isolate mx-auto h-[clamp(240px,70vw,460px)] w-full max-w-7xl select-none sm:h-[clamp(500px,76vh,700px)] lg:h-[clamp(560px,78vh,760px)]"
    >
      <div ref={hostRef} aria-hidden className="pointer-events-none absolute inset-0 z-[1000]" />
      <ul aria-label="Tools and technologies">
        {rings.map((ring, r) =>
          ring.map((tool) => (
            <li
              key={tool.name}
              data-ring={r}
              data-tool={tool.name}
              data-active={tapped === tool.name}
              className={`group absolute left-0 top-0 h-6 w-6 opacity-0 will-change-transform min-[400px]:h-7 min-[400px]:w-7 sm:h-11 sm:w-11 lg:h-12 lg:w-12 xl:h-14 xl:w-14 ${TOUCH_TARGET}`}
              onPointerEnter={(event) => {
                if (event.pointerType !== "mouse") return;
                sceneRef.current?.setHover(event.currentTarget);
                if (wrapRef.current) fitName(event.currentTarget, wrapRef.current);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") sceneRef.current?.setHover(null);
              }}
              onPointerDown={(event) => {
                if (event.pointerType === "mouse") return;
                if (wrapRef.current) fitName(event.currentTarget, wrapRef.current);
                setTapped(tool.name);
              }}
            >
              {/* No badge: the logo itself glows. A hairline contour keeps white logos visible on the light page and
                  black ones on the dark one; the soft halo behind it is cyan on dark and sky blue on light. */}
              <img src={tool.image} alt={tool.name} className={LOGO_CLASS} draggable={false} decoding="async" />
              <span data-name className={NAME_CLASS}>
                {tool.name}
              </span>
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
