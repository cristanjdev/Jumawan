// Shared building blocks for the minimal section + modal design

/** Round ghost icon button (carousel arrows, modal close, zoom controls) */
export const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30";

/** Outlined action button used in modal footers */
export const actionButton =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** DialogContent frame: hides the built-in close button (DialogBar renders its own) */
export const dialogShell =
  "w-[calc(100vw-1.5rem)] !gap-0 overflow-hidden rounded-2xl border border-border/60 bg-[var(--surface-modal)] !p-0 shadow-[var(--shadow-modal)] [&>button]:hidden";

/** Plain white text over the bottom-right corner of a card image, no container; the shadow keeps it readable on any photo (pair with `mediaScrim`) */
export const mediaLabel =
  "pointer-events-none absolute bottom-3 right-3 text-xs font-semibold text-[#fff] [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]";

/** Soft dark fade along the bottom edge of a card image, behind a `mediaLabel` */
export const mediaScrim = "pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent";

/** Fade-up on scroll, once */
export const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
};
