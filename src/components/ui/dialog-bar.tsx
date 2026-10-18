import type { ReactNode } from "react";
import { X } from "lucide-react";
import { DialogClose, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { iconButton } from "@/lib/section-ui";
import { cn } from "@/lib/utils";

/**
 * Title row shared by every minimal modal: title + subtitle on the left, close on the right.
 * `inline` sets the subtitle beside the title from `sm` up, divided by a small dot.
 */
export function DialogBar({
  title,
  description,
  trailing,
  inline = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  inline?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/40 px-5 py-4 sm:px-6">
      <div className={cn("min-w-0", inline && "sm:flex sm:items-center sm:gap-x-3")}>
        <DialogTitle className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
          {title}
        </DialogTitle>
        {/* Inline mode: a small dot separates title and subtitle; phones stack them instead */}
        {inline && <span aria-hidden className="hidden h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50 sm:block" />}
        <DialogDescription asChild>
          <div className={cn("mt-1 text-xs text-muted-foreground sm:text-sm", inline && "sm:mt-0 sm:shrink-0")}>{description}</div>
        </DialogDescription>
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
