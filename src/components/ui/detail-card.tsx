import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DialogBar } from "@/components/ui/dialog-bar";
import { dialogShell } from "@/lib/section-ui";
import { cn } from "@/lib/utils";

// Shared pieces for the "summary card + details modal" sections (Work Experience, Education)

/** Small outlined tag (tech stack, coursework) */
export const tagClass =
  "rounded-md bg-background/60 px-2 py-1 text-xs font-medium text-foreground/80 ring-1 ring-inset ring-border/40";

/** Soft primary pill with a dot ("Current", "Graduated with Honors") */
export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </span>
  );
}

// ─── card ───────────────────────────────────────────────────────────────────

// At most two tags on a card; fewer when long names ("Database Management Systems") don't fit
const MAX_TAGS = 2;
const TAG_GAP = 6; // gap-1.5
const MORE_WIDTH = 32; // room kept for the "+N" count

/**
 * How many of the first tags fit the row next to a "+N" count. Widths come from an invisible
 * copy of the tags, so the visible row never renders a tag that would be clipped.
 */
function useFittingTags(tags: string[]) {
  const rowRef = useRef<HTMLUListElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(Math.min(tags.length, MAX_TAGS));

  useLayoutEffect(() => {
    const row = rowRef.current;
    const measure = measureRef.current;
    if (!row || !measure) return;
    const update = () => {
      const widths = [...measure.children].map((el) => (el as HTMLElement).offsetWidth);
      let used = 0;
      let fit = 0;
      for (let i = 0; i < widths.length; i++) {
        const next = used + (i > 0 ? TAG_GAP : 0) + widths[i];
        const reserve = i < tags.length - 1 ? TAG_GAP + MORE_WIDTH : 0;
        if (next + reserve > row.clientWidth) break;
        used = next;
        fit++;
      }
      // Always show one tag; if even that is too long it truncates
      setCount(Math.max(Math.min(fit, MAX_TAGS), Math.min(tags.length, 1)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => observer.disconnect();
  }, [tags]);

  return { rowRef, measureRef, count };
}

export function DetailCard({
  period,
  badge,
  title,
  subtitle,
  details,
  tags,
  tagsLabel,
  onOpen,
}: {
  period: ReactNode;
  badge?: ReactNode;
  title: string;
  subtitle: string;
  details?: string;
  tags: string[];
  tagsLabel: string;
  onOpen: () => void;
}) {
  const { rowRef, measureRef, count } = useFittingTags(tags);
  const more = tags.length - count;

  return (
    // The whole card opens the details; the button is stretched over it so it stays one tab stop
    <article className="group relative flex h-full flex-col rounded-2xl border border-border/50 bg-card/30 transition-colors duration-300 hover:border-primary/40 hover:bg-card/50 [&:has(:focus-visible)]:ring-2 [&:has(:focus-visible)]:ring-ring">
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium tabular-nums text-muted-foreground">{period}</span>
          {badge}
        </div>

        <h3 className="mt-5 font-heading text-xl font-semibold leading-snug tracking-tight text-foreground">
          <button type="button" onClick={onOpen} className="text-left focus:outline-none after:absolute after:inset-0 after:rounded-2xl">
            {title}
          </button>
        </h3>
        <p className="mt-1.5 text-[15px] font-medium text-foreground/80">{subtitle}</p>
        {details && (
          <p className="mt-1 truncate text-sm text-muted-foreground" title={details}>
            {details}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 px-6 pb-6 sm:px-7 sm:pb-7">
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <ul ref={rowRef} className="flex min-w-0 flex-nowrap items-center gap-1.5" aria-label={tagsLabel}>
            {tags.slice(0, count).map((tag) => (
              <li key={tag} className={cn(tagClass, "min-w-0 truncate")} title={tag}>
                {tag}
              </li>
            ))}
            {more > 0 && <li className="shrink-0 px-1 text-xs font-medium text-muted-foreground">+{more}</li>}
          </ul>
          {/* Invisible copy used only to measure tag widths */}
          <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex w-max gap-1.5 whitespace-nowrap">
            {tags.slice(0, MAX_TAGS).map((tag) => (
              <span key={tag} className={cn(tagClass, "shrink-0")}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <span aria-hidden className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
          Details
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}

// ─── modal ──────────────────────────────────────────────────────────────────

export function DetailDialog({
  open,
  onClose,
  onCloseAutoFocus,
  title,
  subtitle,
  badge,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
  title: string;
  /** Organisation, shown beside the title after a dot */
  subtitle: string;
  /** Status pill: right side of the header next to close; under the title on phones, where that corner is too tight */
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={cn(dialogShell, "max-w-5xl")} onCloseAutoFocus={onCloseAutoFocus}>
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <DialogBar
            inline
            title={title}
            description={
              <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {subtitle}
                {badge && <span className="sm:hidden">{badge}</span>}
              </span>
            }
            trailing={badge && <span className="mr-2 hidden sm:inline-flex">{badge}</span>}
          />

          {/* Laid out to fit a laptop screen whole; on phones it still scrolls, just without a visible bar */}
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-width:none] sm:py-5 sm:px-6 [&::-webkit-scrollbar]:hidden"
            data-lenis-prevent
          >
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Label/value facts spread across the row and centred; a long value (an address) keeps its room */
export function FactsRow({ facts }: { facts: [string, string | null | undefined][] }) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-3 sm:gap-x-8">
      {facts
        .filter((fact): fact is [string, string] => Boolean(fact[1]))
        .map(([label, value]) => (
          <div key={label} className="min-w-0 flex-auto text-center">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Section heading; children are the content below it */
export function DetailBlock({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="mt-2 sm:mt-2.5">{children}</div>
    </section>
  );
}

export function BulletList({ items, tone }: { items: string[]; tone: "primary" | "muted" }) {
  return (
    <ul className="space-y-1.5 sm:space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className={cn(
            "flex gap-2.5 text-[13px] leading-normal sm:gap-3 sm:text-sm sm:leading-relaxed",
            tone === "primary" ? "text-foreground/85" : "text-muted-foreground",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full sm:mt-[0.55rem]",
              tone === "primary" ? "bg-primary" : "bg-muted-foreground/40",
            )}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function TagList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className={tagClass}>
          {item}
        </li>
      ))}
    </ul>
  );
}
