import { useCallback, useEffect, useRef, useState } from "react";
import { Award, Minus, Plus } from "lucide-react";
import { iconButton } from "@/lib/section-ui";
import { cn } from "@/lib/utils";

const MAX_ZOOM = 4;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Pan / zoom viewer. Wheel, buttons, double-click and pinch zoom; press and drag to pan while zoomed.
 *
 * `inline` only changes the layout: the image sits exactly where a plain `<img>` would (no padding or
 * shadow) and the zoom indicator tucks into the corner. The gestures are the same as the full viewer.
 */
export function ZoomableImage({ src, alt, inline = false }: { src: string; alt: string; inline?: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");
  const areaRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const dragOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const clampPan = useCallback((x: number, y: number, z: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return { x, y };
    const maxX = (rect.width * (z - 1)) / 2;
    const maxY = (rect.height * (z - 1)) / 2;
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }, []);

  // Keep the image inside the frame whenever the zoom changes (and recentre at 100%)
  useEffect(() => {
    setPan((p) => clampPan(p.x, p.y, zoom));
  }, [zoom, clampPan]);

  // React's onWheel is passive, so zooming (which needs preventDefault) is attached natively
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clamp(z * Math.exp(-e.deltaY * 0.0015), 1, MAX_ZOOM));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const isControl = (target: EventTarget | null) => (target as HTMLElement | null)?.closest("[data-viewer-control]");

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isControl(e.target)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    } else {
      dragOrigin.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(clamp((pinch.current.zoom * distance) / pinch.current.distance, 1, MAX_ZOOM));
    } else if (zoom > 1) {
      const o = dragOrigin.current;
      setPan(clampPan(o.panX + e.clientX - o.x, o.panY + e.clientY - o.y, zoom));
    }
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    pinch.current = null;
    const remaining = [...pointers.current.values()][0];
    if (remaining) {
      // One finger left after a pinch: carry on panning from where it is now
      dragOrigin.current = { x: remaining.x, y: remaining.y, panX: pan.x, panY: pan.y };
    } else {
      setDragging(false);
    }
  };

  const step = (factor: number) => setZoom((z) => clamp(z * factor, 1, MAX_ZOOM));

  return (
    <div
      ref={areaRef}
      className={cn(
        "relative h-full w-full touch-none select-none overflow-hidden",
        zoom > 1 && (dragging ? "cursor-grabbing" : "cursor-grab")
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onDoubleClick={(e) => {
        if (!isControl(e.target)) setZoom((z) => (z > 1 ? 1 : 2));
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={cn("absolute inset-0 flex items-center justify-center", !inline && "px-4 pb-14 pt-4 sm:px-6 sm:pt-6")}>
        {state === "error" ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
            <Award className="h-10 w-10" strokeWidth={1.5} />
            <span className="text-sm">Image unavailable</span>
          </div>
        ) : (
          <>
            {state === "loading" && (
              <div className={cn("absolute animate-pulse bg-muted/20", inline ? "inset-0" : "inset-x-6 bottom-14 top-6 rounded-lg")} />
            )}
            <img
              src={src}
              alt={alt}
              draggable={false}
              onLoad={() => setState("loaded")}
              onError={() => setState("error")}
              className={cn(
                "object-contain transition-opacity duration-300",
                inline ? "h-full w-full" : "max-h-full max-w-full rounded-sm shadow-lg",
                state === "loaded" ? "opacity-100" : "opacity-0"
              )}
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transition: dragging ? "none" : "transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 300ms",
                willChange: "transform",
              }}
            />
          </>
        )}
      </div>

      <div
        data-viewer-control
        className={cn(
          "absolute flex items-center rounded-full border border-border/50 shadow-sm",
          // Inline, the image fills its frame, so the indicator shrinks and tucks into the corner instead of covering it
          inline
            ? "bottom-1.5 right-1.5 bg-background/70 p-px backdrop-blur-sm"
            : "bottom-3 left-1/2 -translate-x-1/2 bg-background/90 p-0.5"
        )}
      >
        <button
          type="button"
          aria-label="Zoom out"
          disabled={zoom <= 1}
          onClick={() => step(1 / 1.25)}
          className={cn(iconButton, inline && "h-6 w-6")}
        >
          <Minus className={inline ? "h-3 w-3" : "h-4 w-4"} />
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          disabled={zoom === 1}
          onClick={() => setZoom(1)}
          className={cn(
            "tabular-nums text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none",
            inline ? "min-w-[2.25rem] px-0.5 text-[10px]" : "min-w-[3.25rem] px-1 text-xs"
          )}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => step(1.25)}
          className={cn(iconButton, inline && "h-6 w-6")}
        >
          <Plus className={inline ? "h-3 w-3" : "h-4 w-4"} />
        </button>
      </div>
    </div>
  );
}
