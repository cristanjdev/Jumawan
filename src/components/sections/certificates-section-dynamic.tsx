"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Award, ArrowUpRight, BadgeCheck, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DialogBar } from "@/components/ui/dialog-bar";
import { DetailBlock, DetailDialog, FactsList } from "@/components/ui/detail-card";
import { ViewDetailsHint } from "@/components/ui/view-details-hint";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { useDragCarousel } from "@/hooks/use-drag-carousel";
import { CarouselProgress } from "@/components/ui/carousel-progress";
import { useLatest } from "@/hooks/use-latest";
import { useReturnFocus } from "@/hooks/use-return-focus";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { dialogShell, mediaLabel, mediaScrim } from "@/lib/section-ui";
import { cn } from "@/lib/utils";
import { useCertificateStore, Certificate } from "@/stores/useCertificateStore";
import { convexClient } from "@/lib/convexClient";
import { api } from "../../../convex/_generated/api";

// Laid out like the All Projects section: a "See all" button, a draggable carousel with page dots
// (1 card on phones, 2 on tablets, 3 on desktop), a details modal, and an "All" modal with filters
// and search.

type Filter = "all" | "recognition" | "participation";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "recognition", label: "Recognition" },
  { key: "participation", label: "Participation" },
];

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

/** The same outlined pill the project details use for its links */
const linkPill =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-primary ring-1 ring-inset ring-primary/30 transition-colors hover:bg-primary/10";

// ─── building blocks ────────────────────────────────────────────────────────

// Image with a quiet loading state and an icon fallback. Re-key it when `src` changes.
function CertImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  if (!src || state === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/10 text-muted-foreground/30">
        <Award className="h-12 w-12" strokeWidth={1.5} />
        <span className="text-[10px] font-medium uppercase tracking-widest">No Preview</span>
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

// ─── card ───────────────────────────────────────────────────────────────────

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
  const date = formatDate(cert.issue_date);
  const verifyClass =
    "inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:underline";

  return (
    <div
      // The whole card opens the details; Enter and Space do too
      role="button"
      tabIndex={0}
      aria-label={`View details for ${cert.title}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative flex h-full cursor-pointer select-none flex-col overflow-hidden rounded-xl border border-border/50 transition-all duration-500 ease-in-out hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="absolute inset-x-0 top-0 z-20 h-[2px] bg-gradient-to-r from-primary/60 via-accent/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted/5">
        <CertImage
          key={cert.image_url}
          src={cert.image_url}
          alt={`${cert.title} certificate`}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <ViewDetailsHint />
        <span aria-hidden className={mediaScrim} />
        <span className={mediaLabel}>{kindLabel(cert)}</span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-xl font-semibold leading-tight tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary">
          {cert.title}
        </h3>
        <p className="mt-2 truncate text-sm leading-relaxed text-muted-foreground">{cert.issuer}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-xs font-medium text-muted-foreground/80">{date}</span>
          {cert.verification_image_url ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onVerifyImage(cert.verification_image_url!);
              }}
              className={verifyClass}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              Verify
            </button>
          ) : credentialUrl ? (
            <a
              href={credentialUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={verifyClass}
            >
              <BadgeCheck className="h-3.5 w-3.5" />
              Verify
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/30">
      <Skeleton className="aspect-[3/2] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

// ─── modals ─────────────────────────────────────────────────────────────────

/** The certificate's details, laid out like a project's: image on the left, the details on the right */
function CertificateDialog({
  certificates,
  selectedIndex,
  onClose,
  onVerifyImage,
  onCloseAutoFocus,
}: {
  certificates: Certificate[];
  selectedIndex: number | null;
  onClose: () => void;
  onVerifyImage: (url: string) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  // Hold on to the last certificate while closing so the exit animation still has content
  const cert = useLatest(selectedIndex !== null ? certificates[selectedIndex] ?? null : null);
  if (!cert) return null;

  const credentialUrl = safeHttpUrl(cert.credential_url);
  const paragraphs = cert.description?.split(/\n{2,}/).filter(Boolean) ?? [];

  return (
    <DetailDialog
      open={selectedIndex !== null}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      title={cert.title}
      badge={
        (cert.verification_image_url || credentialUrl) && (
          <span className="inline-flex items-center gap-2">
            {cert.verification_image_url && (
              <button type="button" onClick={() => onVerifyImage(cert.verification_image_url!)} className={linkPill}>
                <BadgeCheck className="h-3.5 w-3.5" />
                Verification
              </button>
            )}
            {credentialUrl && (
              <a href={credentialUrl} target="_blank" rel="noopener noreferrer" className={linkPill}>
                <ArrowUpRight className="h-3.5 w-3.5" />
                Credential
              </a>
            )}
          </span>
        )
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8">
        <div className="flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-xl bg-muted/10 ring-1 ring-border/40">
          {cert.image_url ? (
            <ZoomableImage key={cert.image_url} src={cert.image_url} alt={`${cert.title} certificate`} inline />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
              <Award className="h-12 w-12" strokeWidth={1.5} />
              <span className="text-[10px] font-medium uppercase tracking-widest">No Preview</span>
            </div>
          )}
        </div>

        {/* The facts stay at the foot of the column, level with the bottom of the image */}
        <div className="flex min-w-0 flex-col gap-5 sm:gap-6 [&>:last-child]:mt-auto">
          <DetailBlock title="About this certificate">
            {paragraphs.length > 0 ? (
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {paragraphs.map((paragraph, idx) => (
                  <p key={idx} className={cn(idx === 0 && "font-medium text-foreground")}>
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {kindOf(cert) === "recognition" ? "Awarded" : "Participation certificate"} by {cert.issuer}.
              </p>
            )}
          </DetailBlock>

          <FactsList
            facts={[
              ["Issued by", cert.issuer],
              ["Type", kindLabel(cert)],
              ["Issued", formatDate(cert.issue_date)],
              ["Credential ID", cert.credential_id],
            ]}
          />
        </div>
      </div>
    </DetailDialog>
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
        <div className="flex h-[min(88dvh,780px)] min-w-0 flex-col" data-lenis-prevent>
          <DialogBar title="Verification" description="Proof of authenticity for this certificate" />
          <div className="relative min-h-0 flex-1 bg-muted/10">
            <ZoomableImage key={src} src={src} alt="Verification proof" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Every certificate in a grid, with type filters and search — the same modal the projects have */
function SeeAllCertificatesModal({
  isOpen,
  onOpenChange,
  certificates,
  onSelect,
  onCloseAutoFocus,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  certificates: Certificate[];
  onSelect: (index: number) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const gridRef = useRef<HTMLDivElement>(null);

  // Start from the full list every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setFilter("all");
    }
  }, [isOpen]);

  const counts = useMemo(
    () => ({
      all: certificates.length,
      recognition: certificates.filter((c) => kindOf(c) === "recognition").length,
      participation: certificates.filter((c) => kindOf(c) === "participation").length,
    }),
    [certificates],
  );

  // Keep each certificate's index in the full list: that is what the details open
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return certificates
      .map((cert, index) => ({ cert, index }))
      .filter(({ cert }) => filter === "all" || kindOf(cert) === filter)
      .filter(
        ({ cert }) =>
          !q || [cert.title, cert.issuer, cert.description, cert.credential_id, kindLabel(cert)].some((t) => t?.toLowerCase().includes(q)),
      );
  }, [certificates, query, filter]);

  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0 });
  }, [query, filter]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-[95vw] max-w-5xl rounded-2xl border-[var(--border-subtle)] bg-[var(--surface-modal)] shadow-2xl backdrop-blur-2xl !gap-0 !p-0 md:rounded-3xl [&>button]:z-20"
      >
        <div className="flex h-[85svh] flex-col overflow-hidden rounded-2xl md:h-[82vh] md:rounded-3xl" data-lenis-prevent>
          <div className="relative shrink-0 space-y-4 border-b border-[var(--border-subtle)] bg-[var(--surface-bg-alt)] px-5 pb-4 pt-6 sm:px-8 sm:pt-8">
            <div className="absolute left-0 right-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-primary/60 via-accent/40 to-transparent md:rounded-t-3xl" />
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground sm:text-xl">
                All Certificates <span className="font-medium text-muted-foreground/60">({certificates.length})</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:pb-0" role="tablist" aria-label="Filter certificates by type">
                {FILTERS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    onClick={() => setFilter(key)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      filter === key
                        ? "border-cyan-600/60 bg-cyan-500/15 text-cyan-700 dark:border-cyan-400/60 dark:bg-cyan-400/15 dark:text-cyan-300"
                        : "border-border/50 text-muted-foreground hover:border-cyan-600/50 hover:text-foreground dark:hover:border-cyan-400/40"
                    }`}
                  >
                    {label} <span className="opacity-60">{counts[key]}</span>
                  </button>
                ))}
              </div>

              <div className="relative sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search certificates or issuer"
                  aria-label="Search certificates"
                  className="h-9 w-full rounded-lg border border-border/50 bg-background/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-cyan-600/70 focus:outline-none dark:focus:border-cyan-400/60"
                />
              </div>
            </div>
          </div>

          <div
            ref={gridRef}
            className="scrollbar-hide min-h-0 flex-1 scroll-smooth overflow-y-auto overscroll-contain bg-[var(--surface-bg-alt)] px-4 py-6 sm:px-8"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            {visible.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground/70">No certificates match your search.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 pb-12 sm:gap-6 lg:grid-cols-3">
                {visible.map(({ cert, index }) => (
                  <button
                    key={cert.id}
                    type="button"
                    onClick={() => onSelect(index)}
                    className="group flex flex-col overflow-hidden rounded-xl border border-border/40 bg-background/40 text-left backdrop-blur-sm transition-all duration-500 hover:border-cyan-600/50 hover:shadow-[0_0_15px_rgba(8,145,178,0.18)] dark:hover:border-cyan-400/50 dark:hover:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                  >
                    <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted/10">
                      <CertImage
                        key={cert.image_url}
                        src={cert.image_url}
                        alt={`${cert.title} certificate`}
                        className="transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
                      <p className="line-clamp-2 text-xs font-bold leading-tight text-foreground transition-colors duration-300 group-hover:text-cyan-700 dark:group-hover:text-cyan-400 sm:text-sm">
                        {cert.title}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground/60 sm:text-[11px]">
                        {[cert.issuer, formatDate(cert.issue_date)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── section ────────────────────────────────────────────────────────────────

export function CertificatesSection() {
  const shouldReduceMotion = useReducedMotion();
  const { certificates, loading, fetchCertificates, subscribeToChanges } = useCertificateStore();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  useScrollLock(selectedIndex !== null || showAll || verificationUrl !== null);
  const { remember: rememberDetails, onCloseAutoFocus: restoreDetailsFocus } = useReturnFocus();
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
  const sorted = useMemo(() => {
    const byOrder = (a: Certificate, b: Certificate) => a.order_index - b.order_index;
    return [
      ...certificates.filter((c) => kindOf(c) === "recognition").sort(byOrder),
      ...certificates.filter((c) => kindOf(c) === "participation").sort(byOrder),
    ];
  }, [certificates]);

  const { scrollRef, handlers, layout, isMobile, totalPages, currentPage, scrollToPage, consumeDrag } = useDragCarousel(sorted.length);

  const openDetails = useCallback(
    (index: number) => {
      rememberDetails();
      setSelectedIndex(index);
    },
    [rememberDetails],
  );
  const closeDetails = useCallback(() => setSelectedIndex(null), []);

  const openVerification = useCallback(
    (url: string) => {
      rememberVerify();
      setVerificationUrl(url);
    },
    [rememberVerify],
  );
  const closeVerification = useCallback(() => setVerificationUrl(null), []);

  // Arrow keys step through the certificates while the details are open
  useEffect(() => {
    if (selectedIndex === null || verificationUrl !== null || sorted.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const step = e.key === "ArrowLeft" ? -1 : 1;
      setSelectedIndex((prev) => (prev === null ? prev : (prev + step + sorted.length) % sorted.length));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, verificationUrl, sorted.length]);

  const containerVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.6, staggerChildren: shouldReduceMotion ? 0 : 0.18 } },
    }),
    [shouldReduceMotion],
  );
  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24, scale: shouldReduceMotion ? 1 : 0.98 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: shouldReduceMotion ? 0.45 : 0.75, ease: [0.4, 0, 0.2, 1] as const },
      },
    }),
    [shouldReduceMotion],
  );

  const heading = (
    <div className="mx-auto mb-16 flex w-fit flex-col items-center">
      <h2 className="mb-4 text-center text-[clamp(1.5rem,7.2vw,2.25rem)] font-bold md:text-5xl">
        <span className="text-cyan-400">Certificates & Achievements</span>
      </h2>
      <p className="mx-auto max-w-2xl text-center text-base sm:text-lg font-medium text-muted-foreground">
        Professional certifications that validate my technical expertise
      </p>
    </div>
  );

  if (loading) {
    return (
      <section id="certificates" className="relative overflow-hidden bg-transparent py-12 sm:py-20">
        <div className="container mx-auto px-6">
          {heading}
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="certificates" className="relative overflow-hidden border-none bg-transparent py-12 sm:py-20 outline-none">
      <div className="container relative z-10 mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
          className="mx-auto max-w-6xl"
        >
          <motion.div variants={itemVariants}>{heading}</motion.div>

          {sorted.length === 0 ? (
            <div className="py-12 text-center">
              <Award className="mx-auto mb-4 h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
              <h3 className="mb-2 text-xl font-medium text-foreground">No certificates yet</h3>
              <p className="text-muted-foreground">Certificates will be displayed here once added</p>
            </div>
          ) : (
            <>
              {/* See All button */}
              <motion.div variants={itemVariants} className="mb-6 flex justify-center sm:mb-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    rememberAll();
                    setShowAll(true);
                  }}
                  className="border-border/40 text-xs text-muted-foreground transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/5 hover:text-cyan-400 sm:text-sm"
                >
                  <Award className="mr-2 h-3.5 w-3.5" />
                  View {sorted.length} Certificates
                </Button>
              </motion.div>

              {/* Draggable carousel — 1 card on phones, 2 on tablets, 3 on desktop, 4 on very wide screens */}
              <motion.div variants={itemVariants} className="relative -mx-6 overflow-hidden" style={layout.wrapStyle}>
                <div
                  ref={scrollRef}
                  {...handlers}
                  className={`flex gap-4 overflow-x-auto scroll-smooth pb-4 md:gap-6 ${!isMobile ? "cursor-grab" : ""}`}
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                    touchAction: "pan-y",
                    overscrollBehaviorX: "contain",
                    overscrollBehaviorY: "auto",
                    ...layout.rowStyle,
                  }}
                >
                  {sorted.map((cert, index) => (
                    <div key={cert.id} className="shrink-0" style={{ width: layout.cardWidth }}>
                      <CertificateCard
                        cert={cert}
                        onOpen={() => {
                          if (consumeDrag()) return;
                          openDetails(index);
                        }}
                        onVerifyImage={openVerification}
                      />
                    </div>
                  ))}
                  {Array.from({ length: layout.emptySlots }, (_, i) => (
                    <div key={`slot-${i}`} aria-hidden className="shrink-0" style={{ width: layout.cardWidth }} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <CarouselProgress
                    page={currentPage}
                    pages={totalPages}
                    hint={`${isMobile ? "Swipe" : "Drag"} to explore`}
                    onSeek={scrollToPage}
                  />
                )}
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      <SeeAllCertificatesModal
        isOpen={showAll}
        onOpenChange={setShowAll}
        certificates={sorted}
        onSelect={openDetails}
        onCloseAutoFocus={restoreAllFocus}
      />
      <CertificateDialog
        certificates={sorted}
        selectedIndex={selectedIndex}
        onClose={closeDetails}
        onVerifyImage={openVerification}
        onCloseAutoFocus={restoreDetailsFocus}
      />
      <VerificationViewer url={verificationUrl} onClose={closeVerification} onCloseAutoFocus={restoreVerifyFocus} />
    </section>
  );
}
