"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// The "All projects" / "All certificates" window. Wide screens get two panes: title, search and a vertical list of
// filters on the left, the results on the right. On a phone the left pane becomes a top bar with one scrolling row
// of filter chips, and the results become compact rows. Keep both lists in this one component so they stay alike.

export interface BrowseFilter {
  key: string;
  label: string;
  count: number;
}

interface BrowseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus?: (event: Event) => void;
  title: string;
  /** The line under the title, e.g. "90 projects across 8 areas" */
  summary: string;
  searchLabel: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  filtersLabel: string;
  filters: BrowseFilter[];
  filter: string;
  onFilterChange: (key: string) => void;
  resultCount: number;
  /** [singular, plural] */
  noun: [string, string];
  emptyText: string;
  onReset: () => void;
  /** The result cards. Rendered inside a responsive grid */
  children: ReactNode;
}

export function BrowseDialog({
  open,
  onOpenChange,
  onCloseAutoFocus,
  title,
  summary,
  searchLabel,
  searchPlaceholder,
  query,
  onQueryChange,
  filtersLabel,
  filters,
  filter,
  onFilterChange,
  resultCount,
  noun,
  emptyText,
  onReset,
  children,
}: BrowseDialogProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0 });
  }, [query, filter]);

  // On a phone the filters sit in one scrolling row: bring the chosen one into view
  useEffect(() => {
    if (!open) return;
    filterRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [filter, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* No autofocus: it would put the cursor in the search box and open the keyboard on a phone */}
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-[95vw] max-w-6xl rounded-2xl border-[var(--border-subtle)] bg-[var(--surface-modal)] shadow-2xl backdrop-blur-2xl !gap-0 !p-0 md:rounded-3xl [&>button]:z-20"
      >
        <div className="flex h-[88svh] flex-col overflow-hidden rounded-2xl md:h-[84vh] md:flex-row md:rounded-3xl" data-lenis-prevent>
          <aside className="relative flex shrink-0 flex-col gap-3 border-b border-border/40 bg-[var(--surface-bg-alt)] pb-3 pt-5 md:w-64 md:gap-5 md:border-b-0 md:border-r md:pb-5 md:pt-7 lg:w-72">
            <div className="absolute left-0 right-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-primary/60 via-accent/40 to-transparent md:rounded-t-3xl" />
            <DialogHeader className="px-5 pr-12 text-left md:pr-5">
              <DialogTitle className="text-lg font-bold text-foreground sm:text-xl">{title}</DialogTitle>
              <p className="text-xs text-muted-foreground/70">{summary}</p>
            </DialogHeader>

            <div className="relative px-5">
              <Search className="pointer-events-none absolute left-8 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchLabel}
                className="h-9 w-full rounded-lg border border-border/50 bg-background/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-cyan-600/70 focus:outline-none dark:focus:border-cyan-400/60"
              />
            </div>

            {/* Do not use class names containing "border-b" or "border-t" here: a light-mode dialog rule recolours them */}
            <div
              ref={filterRef}
              role="tablist"
              aria-label={filtersLabel}
              className="scrollbar-hide flex gap-2 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-28px),transparent)] md:min-h-0 md:flex-1 md:flex-col md:gap-1 md:overflow-y-auto md:overflow-x-hidden md:pb-0 md:[mask-image:none]"
            >
              {filters.map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => onFilterChange(key)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors md:w-full md:justify-between md:rounded-lg md:px-3 md:py-2 md:text-sm ${
                    filter === key
                      ? "border-cyan-600/60 bg-cyan-500/15 text-cyan-700 dark:border-cyan-400/60 dark:bg-cyan-400/15 dark:text-cyan-300"
                      : "border-foreground/15 text-muted-foreground hover:text-foreground md:border-0 max-md:hover:border-cyan-600/50 md:hover:bg-foreground/5 dark:max-md:hover:border-cyan-400/40"
                  }`}
                >
                  <span className="whitespace-nowrap md:truncate">{label}</span>
                  <span className="tabular-nums opacity-60">{count}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 px-4 pb-1 pt-4 sm:px-8 md:pr-16 md:pt-7" aria-live="polite">
              {/* The totals are already in the left list, so this line only says what a click does (a tap on a touch screen) */}
              <p className="text-sm text-muted-foreground/80">
                {query.trim() && (
                  <span className="font-semibold text-foreground">
                    {resultCount} {resultCount === 1 ? noun[0] : noun[1]} matching “{query.trim()}”
                    <span className="mx-2 font-normal text-muted-foreground/50">·</span>
                  </span>
                )}
                <span className="[@media(hover:none)]:hidden">Click</span>
                <span className="hidden [@media(hover:none)]:inline">Tap</span> to view details
              </p>
            </div>

            <div
              ref={gridRef}
              className="scrollbar-hide min-h-0 flex-1 scroll-smooth overflow-y-auto overscroll-contain px-4 pb-8 pt-3 sm:px-8"
              style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
            >
              {resultCount === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <p className="text-sm text-muted-foreground/70">{emptyText}</p>
                  <button
                    type="button"
                    onClick={onReset}
                    className="rounded-full border border-border/50 px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-cyan-600/50 dark:hover:border-cyan-400/40"
                  >
                    Show everything
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5 xl:grid-cols-3">{children}</div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BrowseCardProps {
  onClick: () => void;
  /** The picture, filling a box that already has the right shape */
  media: ReactNode;
  /** Shape of the picture box from tablet width up, written out in full by the caller, e.g. "md:aspect-[16/10]". On a phone the
   *  picture instead fills the row from top to bottom, however tall the text beside it is. */
  mediaShape: string;
  /** A small label over the picture on wide screens */
  tag?: string;
  title: string;
  /** One quiet line under the title; shown on a phone, where there is no room for the description */
  meta?: string;
  /** Shown from tablet width up */
  description?: string;
  footer?: ReactNode;
}

/** One result: a row on a phone (picture on the left), a card on wider screens */
export function BrowseCard({ onClick, media, mediaShape, tag, title, meta, description, footer }: BrowseCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex gap-3 rounded-xl border border-border/40 bg-background/40 p-2.5 text-left transition-all duration-500 hover:border-cyan-600/50 hover:shadow-[0_0_15px_rgba(8,145,178,0.18)] dark:hover:border-cyan-400/50 dark:hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] md:flex-col md:gap-0 md:overflow-hidden md:p-0"
    >
      <div className={`relative min-h-[4.5rem] w-28 shrink-0 self-stretch overflow-hidden rounded-lg bg-muted/10 sm:w-40 md:min-h-0 md:w-full md:self-auto md:rounded-none ${mediaShape}`}>
        {media}
        {tag && (
          <span className="absolute left-2 top-2 hidden rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium !text-white md:inline">
            {tag}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:p-4">
        <p className="line-clamp-2 text-sm font-bold leading-tight text-foreground transition-colors duration-300 group-hover:text-cyan-700 dark:group-hover:text-cyan-400">{title}</p>
        {meta && <p className="line-clamp-2 text-[11px] text-muted-foreground/60 md:hidden">{meta}</p>}
        {description && <p className="hidden text-xs leading-relaxed text-muted-foreground/80 line-clamp-2 md:block">{description}</p>}
        {footer}
      </div>
    </button>
  );
}
