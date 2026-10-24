import type { MouseEvent } from "react";

/**
 * Where a paged carousel is: a thin bar filled up to the current page, with "2 / 19" beneath. Pressing the
 * bar jumps to the page at that point.
 */
export function CarouselProgress({
  page,
  pages,
  hint,
  onSeek,
}: {
  /** Current page, from 0 */
  page: number;
  pages: number;
  /** Lead-in for the counter ("Swipe to explore") */
  hint: string;
  onSeek: (page: number) => void;
}) {
  const seek = (event: MouseEvent<HTMLDivElement>) => {
    const { left, width } = event.currentTarget.getBoundingClientRect();
    onSeek(Math.min(pages - 1, Math.max(0, Math.floor(((event.clientX - left) / width) * pages))));
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      {/* The padding makes the bar easy to press without making it look thicker */}
      <div className="w-44 cursor-pointer py-2 sm:w-64" onClick={seek}>
        <div
          role="progressbar"
          aria-label="Carousel progress"
          aria-valuemin={1}
          aria-valuemax={pages}
          aria-valuenow={page + 1}
          aria-valuetext={`Page ${page + 1} of ${pages}`}
          className="h-1 overflow-hidden rounded-full bg-border/30"
        >
          <div
            className="h-full rounded-full bg-cyan-400 transition-[width] duration-300 ease-out"
            style={{ width: `${((page + 1) / pages) * 100}%` }}
          />
        </div>
      </div>
      <span className="text-[11px] italic text-muted-foreground/40">
        {hint} · {page + 1} / {pages}
      </span>
    </div>
  );
}
