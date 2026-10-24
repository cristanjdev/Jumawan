import { useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { iconButton } from "@/lib/section-ui";
import { cn } from "@/lib/utils";

const TITLE_MAX_PX = 16; // text-base
const TITLE_MIN_PX = 9;
const PHONE_QUERY = "(max-width: 639px)";

/**
 * On phones the title stays on one line: its text shrinks (down to a floor, then it truncates) instead of
 * wrapping. From `sm` up the stylesheet's own size and wrapping apply.
 */
function useSingleLineTitle(title: ReactNode) {
  const barRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const heading = titleRef.current;
    if (!bar || !heading) return;
    const phone = window.matchMedia(PHONE_QUERY);
    const fit = () => {
      if (!phone.matches) {
        heading.style.fontSize = "";
        return;
      }
      heading.style.fontSize = `${TITLE_MAX_PX}px`;
      // A hair under the exact fit: client/scroll widths are rounded, and a sub-pixel overflow would still show "…"
      const ratio = (heading.clientWidth / heading.scrollWidth) * 0.98;
      heading.style.fontSize = `${Math.max(TITLE_MIN_PX, Math.min(TITLE_MAX_PX, Math.floor(TITLE_MAX_PX * ratio * 10) / 10))}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(bar);
    phone.addEventListener("change", fit);
    return () => {
      observer.disconnect();
      phone.removeEventListener("change", fit);
    };
  }, [title]);

  return { barRef, titleRef };
}

/**
 * Title row shared by every minimal modal: title + subtitle on the left, close on the right.
 * `inline` sets the subtitle beside the title from `sm` up, divided by a small dot.
 */
export function DialogBar({
  title,
  description,
  trailing,
  inline = false,
  divider = true,
  dot = true,
}: {
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  inline?: boolean;
  /** Rule under the bar */
  divider?: boolean;
  /** Inline mode: the dot between title and subtitle; turn off when only phones get a description */
  dot?: boolean;
}) {
  const { barRef, titleRef } = useSingleLineTitle(title);

  return (
    <div ref={barRef} className={cn("flex shrink-0 items-start justify-between gap-4 px-5 py-4 sm:px-6", divider && "border-b border-border/40")}>
      <div className={cn("min-w-0", inline && "sm:flex sm:items-center sm:gap-x-3")}>
        <DialogTitle
          ref={titleRef}
          className="truncate text-base font-semibold leading-snug tracking-tight text-foreground sm:line-clamp-2 sm:whitespace-normal sm:text-clip sm:text-lg"
        >
          {title}
        </DialogTitle>
        {/* Inline mode: a small dot separates title and subtitle; phones stack them instead */}
        {inline && dot && description && <span aria-hidden className="hidden h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50 sm:block" />}
        {description ? (
          <DialogDescription asChild>
            <div className={cn("mt-1 text-xs text-muted-foreground sm:text-sm", inline && "sm:mt-0 sm:shrink-0")}>{description}</div>
          </DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{title}</DialogDescription>
        )}
      </div>
      <div className="-mr-2 flex shrink-0 items-center gap-1">
        {trailing}
        <DialogClose className={iconButton} aria-label="Close">
          <X className="h-4 w-4" />
        </DialogClose>
      </div>
    </div>
  );
}
