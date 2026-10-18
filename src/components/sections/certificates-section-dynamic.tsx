"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Award, ArrowRight, ArrowUpRight, BadgeCheck, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogBar } from "@/components/ui/dialog-bar";
import { useReturnFocus } from "@/hooks/use-return-focus";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { actionButton, dialogShell, iconButton, reveal } from "@/lib/section-ui";
import { cn } from "@/lib/utils";
import { useCertificateStore, Certificate } from "@/stores/useCertificateStore";
import { convexClient } from "@/lib/convexClient";
import { api } from "../../../convex/_generated/api";

type Filter = "all" | "recognition" | "participation";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "recognition", label: "Recognition" },
  { key: "participation", label: "Participation" },
];

const MAX_ZOOM = 4;

// ─── helpers ────────────────────────────────────────────────────────────────

// Certificates without a type are treated as participation everywhere
const kindOf = (cert: Certificate): "recognition" | "participation" =>
  cert.type === "recognition" ? "recognition" : "participation";

const kindLabel = (cert: Certificate) => (kindOf(cert) === "recognition" ? "Recognition" : "Participation");

// Issue dates are calendar dates, so format them in UTC — otherwise visitors west of
// UTC see the previous month on dates like "2023-01-01".
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

// Only ever link out to http(s) — never javascript: or data: URLs coming from the database
function safeHttpUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// ─── building blocks ────────────────────────────────────────────────────────

// Image with a quiet loading state and an icon fallback. Re-key it when `src` changes.
function CertImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  if (!src || state === "error") {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
        <Award className="h-8 w-8" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <>
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-muted/20" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-300",
          state === "loaded" ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </>
  );
}

// Pan / zoom viewer shared by the detail and verification modals.
// Wheel, buttons, double-click and pinch zoom; drag to pan while zoomed.
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
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
      <div className="absolute inset-0 flex items-center justify-center px-4 pb-14 pt-4 sm:px-6 sm:pt-6">
        {state === "error" ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
            <Award className="h-10 w-10" strokeWidth={1.5} />
            <span className="text-sm">Image unavailable</span>
          </div>
        ) : (
          <>
            {state === "loading" && <div className="absolute inset-x-6 bottom-14 top-6 animate-pulse rounded-lg bg-muted/20" />}
            <img
              src={src}
              alt={alt}
              draggable={false}
              onLoad={() => setState("loaded")}
              onError={() => setState("error")}
              className={cn(
                "max-h-full max-w-full rounded-sm object-contain shadow-lg transition-opacity duration-300",
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
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center rounded-full border border-border/50 bg-background/90 p-0.5 shadow-sm"
      >
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => step(1 / 1.25)} className={iconButton}>
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Reset zoom"
          disabled={zoom === 1}
          onClick={() => setZoom(1)}
          className="min-w-[3.25rem] px-1 text-xs tabular-nums text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => step(1.25)} className={iconButton}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── cards ──────────────────────────────────────────────────────────────────

function CertificateCard({
  cert,
  onOpen,
  onVerifyImage,
}: {
  cert: Certificate;
  onOpen: () => void;
  onVerifyImage: (url: string) => void;
}) {
  const credentialUrl = safeHttpUrl(cert.credential_url);
  const verifyClass =
    "absolute bottom-0 right-0 inline-flex items-center gap-1 text-xs font-medium leading-5 text-primary transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:underline";
  const date = formatDate(cert.issue_date);

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-border/50 bg-muted/10 transition-colors duration-300 group-hover:border-primary/50">
          <CertImage
            key={cert.image_url}
            src={cert.image_url}
            alt={`${cert.title} certificate`}
            className="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        </div>

        <div className="mt-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">
            {kindLabel(cert)}
            {date && <> · {date}</>}
          </p>
          <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors duration-300 group-hover:text-primary">
            {cert.title}
          </h3>
          <p className="mt-1 truncate pr-16 text-[13px] leading-5 text-muted-foreground">{cert.issuer}</p>
        </div>
      </button>

      {cert.verification_image_url ? (
        <button type="button" onClick={() => onVerifyImage(cert.verification_image_url!)} className={verifyClass}>
          <BadgeCheck className="h-3.5 w-3.5" />
          Verify
        </button>
      ) : credentialUrl ? (
        <a href={credentialUrl} target="_blank" rel="noopener noreferrer" className={verifyClass}>
          <BadgeCheck className="h-3.5 w-3.5" />
          Verify
        </a>
      ) : null}
    </article>
  );
}

function CardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[3/2] w-full rounded-xl" />
      <Skeleton className="mt-4 h-3 w-1/3" />
      <Skeleton className="mt-2.5 h-4 w-4/5" />
      <Skeleton className="mt-2 h-4 w-3/5" />
    </div>
  );
}

// ─── modals ─────────────────────────────────────────────────────────────────

interface ViewerState {
  list: Certificate[];
  index: number;
}

function CertificateViewer({
  viewer,
  onClose,
  onNavigate,
  onVerifyImage,
  keysEnabled,
  onCloseAutoFocus,
}: {
  viewer: ViewerState | null;
  onClose: () => void;
  onNavigate: (delta: number) => void;
  onVerifyImage: (url: string) => void;
  keysEnabled: boolean;
  onCloseAutoFocus: (event: Event) => void;
}) {
  // Remember the last certificate so the content survives the close animation
  const latest = useRef(viewer);
  if (viewer) latest.current = viewer;
  const data = latest.current;
  const open = viewer !== null;

  useEffect(() => {
    if (!open || !keysEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onNavigate(-1);
      else if (e.key === "ArrowRight") onNavigate(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, keysEnabled, onNavigate]);

  const cert = data?.list[data.index];
  if (!data || !cert) return null;

  const { list, index } = data;
  const credentialUrl = safeHttpUrl(cert.credential_url);
  const date = formatDate(cert.issue_date);
  const navButton =
    "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-background/90 text-foreground/80 shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-0";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn(dialogShell, "max-w-5xl")} onCloseAutoFocus={onCloseAutoFocus}>
        <div className="flex h-[min(90dvh,820px)] flex-col" data-lenis-prevent>
          <DialogBar
            title={cert.title}
            description={[cert.issuer, date].filter(Boolean).join(" · ")}
          />

          <div className="relative min-h-0 flex-1 bg-muted/10">
            <ZoomableImage key={cert.image_url} src={cert.image_url ?? ""} alt={`${cert.title} certificate`} />
            {list.length > 1 && (
              <>
                <button type="button" aria-label="Previous certificate" disabled={index === 0} onClick={() => onNavigate(-1)} className={cn(navButton, "left-3")}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Next certificate" disabled={index === list.length - 1} onClick={() => onNavigate(1)} className={cn(navButton, "right-3")}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-border/40 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {kindLabel(cert)}
                </span>
                {cert.credential_id && <span className="font-mono">ID {cert.credential_id}</span>}
                <span className="tabular-nums">
                  {index + 1} / {list.length}
                </span>
              </div>
              {cert.description && (
                <p className="max-h-24 max-w-prose overflow-y-auto text-sm leading-relaxed text-muted-foreground">{cert.description}</p>
              )}
            </div>

            {(cert.verification_image_url || credentialUrl) && (
              <div className="flex shrink-0 gap-2">
                {cert.verification_image_url && (
                  <button type="button" onClick={() => onVerifyImage(cert.verification_image_url!)} className={actionButton}>
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    Verification
                  </button>
                )}
                {credentialUrl && (
                  <a href={credentialUrl} target="_blank" rel="noopener noreferrer" className={actionButton}>
                    Credential
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VerificationViewer({
  url,
  onClose,
  onCloseAutoFocus,
}: {
  url: string | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const latest = useRef(url);
  if (url) latest.current = url;
  const src = latest.current;
  if (!src) return null;

  return (
    <Dialog open={url !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn(dialogShell, "max-w-4xl")} onCloseAutoFocus={onCloseAutoFocus}>
        <div className="flex h-[min(88dvh,780px)] flex-col" data-lenis-prevent>
          <DialogBar title="Verification" description="Proof of authenticity for this certificate" />
          <div className="relative min-h-0 flex-1 bg-muted/10">
            <ZoomableImage key={src} src={src} alt="Verification proof" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AllCertificatesDialog({
  open,
  onOpenChange,
  certificates,
  onSelect,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificates: Certificate[];
  onSelect: (index: number) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(dialogShell, "max-w-5xl")} onCloseAutoFocus={onCloseAutoFocus}>
        <div className="flex h-[min(88dvh,820px)] flex-col">
          <DialogBar title="All certificates" description={`${certificates.length} in total`} />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6" data-lenis-prevent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:grid-cols-4">
              {certificates.map((cert, index) => (
                <button
                  key={cert.id}
                  type="button"
                  onClick={() => onSelect(index)}
                  className="group rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--surface-modal)]"
                >
                  <div className="relative aspect-[3/2] overflow-hidden rounded-lg border border-border/50 bg-muted/10 transition-colors duration-300 group-hover:border-primary/50">
                    <CertImage
                      key={cert.image_url}
                      src={cert.image_url}
                      alt={`${cert.title} certificate`}
                      className="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
                    {cert.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[cert.issuer, formatDate(cert.issue_date)].filter(Boolean).join(" · ")}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── section ────────────────────────────────────────────────────────────────

export function CertificatesSection() {
  const { certificates, loading, fetchCertificates, subscribeToChanges } = useCertificateStore();
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const scrollerRef = useRef<HTMLDivElement>(null);

  useScrollLock(viewer !== null || showAll || verificationUrl !== null);
  const { remember: rememberViewer, onCloseAutoFocus: restoreViewerFocus } = useReturnFocus();
  const { remember: rememberAll, onCloseAutoFocus: restoreAllFocus } = useReturnFocus();
  const { remember: rememberVerify, onCloseAutoFocus: restoreVerifyFocus } = useReturnFocus();

  useEffect(() => {
    fetchCertificates();
    const unsubscribe = subscribeToChanges();

    convexClient
      .mutation(api.analytics.track, {
        event_type: "page_view",
        page_url: "/certificates",
        event_data: { section: "certificates" },
      })
      .catch((error: unknown) => console.warn("Analytics tracking error:", error));

    return () => unsubscribe();
  }, [fetchCertificates, subscribeToChanges]);

  // Recognition first, then participation, each by admin-defined order
  const { sortedAll, counts } = useMemo(() => {
    const byOrder = (a: Certificate, b: Certificate) => a.order_index - b.order_index;
    const recognition = certificates.filter((c) => kindOf(c) === "recognition").sort(byOrder);
    const participation = certificates.filter((c) => kindOf(c) === "participation").sort(byOrder);
    return {
      sortedAll: [...recognition, ...participation],
      counts: { all: certificates.length, recognition: recognition.length, participation: participation.length },
    };
  }, [certificates]);

  const filtered = useMemo(
    () => (activeFilter === "all" ? sortedAll : sortedAll.filter((c) => kindOf(c) === activeFilter)),
    [sortedAll, activeFilter]
  );

  const syncEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncEdges();
    const observer = new ResizeObserver(syncEdges);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncEdges, activeFilter, loading, certificates.length]);

  // Fade the cards out where more are waiting, so the peeking card reads as "scroll for more"
  const edgeFade = `linear-gradient(to right, ${edges.start ? "black 0" : "transparent 0, black 1rem"}, ${
    edges.end ? "black 100%" : "black calc(100% - 3rem), transparent 100%"
  })`;

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const openViewer = useCallback(
    (list: Certificate[], index: number) => {
      rememberViewer();
      setViewer({ list, index });
    },
    [rememberViewer]
  );

  const openVerification = useCallback(
    (url: string) => {
      rememberVerify();
      setVerificationUrl(url);
    },
    [rememberVerify]
  );

  const navigateViewer = useCallback(
    (delta: number) =>
      setViewer((v) => (v ? { ...v, index: clamp(v.index + delta, 0, v.list.length - 1) } : v)),
    []
  );

  const closeViewer = useCallback(() => setViewer(null), []);
  const closeVerification = useCallback(() => setVerificationUrl(null), []);

  const heading = (
    <div className="mx-auto mb-12 flex w-fit flex-col items-center sm:mb-14">
      <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">
        <span className="text-cyan-400">Certificates & Achievements</span>
      </h2>
      <p className="mx-auto max-w-2xl text-center text-lg font-medium text-muted-foreground">
        Professional certifications that validate my technical expertise
      </p>
    </div>
  );

  if (loading) {
    return (
      <section id="certificates" className="relative overflow-hidden py-24">
        <div className="container relative z-10 px-4 md:px-6">
          <div className="mx-auto max-w-6xl">
            {heading}
            <Skeleton className="mb-8 h-9 w-72" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="certificates" className="relative overflow-hidden py-24">
      <div className="container relative z-10 px-4 md:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div {...reveal}>{heading}</motion.div>

          {certificates.length === 0 ? (
            <div className="py-16 text-center">
              <Award className="mx-auto h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-muted-foreground">Certificates will appear here once they're added.</p>
            </div>
          ) : (
            <motion.div {...reveal}>
              {/* Filters + carousel controls */}
              <div className="flex items-center justify-between gap-4">
                <div role="tablist" aria-label="Filter certificates" className="scrollbar-hide -mx-3 flex items-center overflow-x-auto px-1">
                  {FILTERS.map(({ key, label }) => {
                    const active = activeFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveFilter(key)}
                        className={cn(
                          "relative whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:text-foreground",
                          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                        <span className="ml-1.5 text-xs tabular-nums text-muted-foreground/70">{counts[key]}</span>
                        {active && (
                          <motion.span layoutId="certificate-filter" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="hidden items-center gap-1 sm:flex">
                  <button type="button" aria-label="Scroll left" disabled={edges.start} onClick={() => scrollByPage(-1)} className={iconButton}>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Scroll right" disabled={edges.end} onClick={() => scrollByPage(1)} className={iconButton}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Native scroll-snap carousel: swipe on touch, trackpad, or arrows */}
              <motion.div
                key={activeFilter}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="mt-6"
              >
                <div
                  ref={scrollerRef}
                  onScroll={syncEdges}
                  className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-pl-[3.75rem] px-4 pb-1 sm:scroll-pl-16 md:-mx-6 md:px-6 lg:scroll-pl-[4.5rem]"
                  style={{ maskImage: edgeFade, WebkitMaskImage: edgeFade }}
                >
                  {filtered.map((cert, index) => (
                    <div
                      key={cert.id}
                      className="w-[72%] shrink-0 snap-start sm:w-[calc((100%-2.5rem)/2.3)] lg:w-[calc((100%-3.75rem)/3.25)]"
                    >
                      <CertificateCard
                        cert={cert}
                        onOpen={() => openViewer(filtered, index)}
                        onVerifyImage={openVerification}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>

              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    rememberAll();
                    setShowAll(true);
                  }}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
                >
                  View all {counts.all} certificates
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <AllCertificatesDialog
        open={showAll}
        onOpenChange={setShowAll}
        certificates={sortedAll}
        onSelect={(index) => openViewer(sortedAll, index)}
        onCloseAutoFocus={restoreAllFocus}
      />
      <CertificateViewer
        viewer={viewer}
        onClose={closeViewer}
        onNavigate={navigateViewer}
        onVerifyImage={openVerification}
        keysEnabled={verificationUrl === null}
        onCloseAutoFocus={restoreViewerFocus}
      />
      <VerificationViewer url={verificationUrl} onClose={closeVerification} onCloseAutoFocus={restoreVerifyFocus} />
    </section>
  );
}
