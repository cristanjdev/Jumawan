import { useMemo } from "react";
import { useTechIcon } from "@/hooks/use-tech-icon";
import { cn } from "@/lib/utils";

/**
 * A project's technologies as a compact row of plain icons. The icons come from the Tools &
 * Technologies list (the same query as that section), so adding or changing a tool there updates
 * every card; a technology that is not in the list simply has no icon here. Every icon is shown;
 * the row only wraps when a stack is longer than the card is wide, unless `fit` is set: then it stays on
 * one line and the icons shrink to share the width.
 */
export function TechIcons({
  technologies,
  className,
  limit,
  fit = false,
}: {
  technologies: string[];
  className?: string;
  limit?: number;
  fit?: boolean;
}) {
  const iconFor = useTechIcon();

  const icons = useMemo(() => {
    const seen = new Set<string>();
    return technologies.flatMap((tech) => {
      const icon = iconFor(tech);
      if (!icon || seen.has(icon)) return [];
      seen.add(icon);
      return [{ name: tech, icon }];
    });
  }, [iconFor, technologies]);

  if (icons.length === 0) return null;

  const shown = limit ? icons.slice(0, limit) : icons;
  const hidden = icons.length - shown.length;

  return (
    <div className={cn("flex items-center", fit ? "flex-nowrap gap-x-1.5 sm:gap-x-2" : "flex-wrap gap-x-2 gap-y-1.5 xl:gap-x-2.5", className)}>
      {shown.map(({ name, icon }) => (
        <img
          key={name}
          src={icon}
          alt={name}
          title={name}
          loading="lazy"
          decoding="async"
          draggable={false}
          // Scales with the viewport; a thin light edge keeps black logos (Express, Next.js) visible on the dark theme
          className={cn(
            "object-contain drop-shadow-md dark:drop-shadow-[0_0_1.5px_rgba(255,255,255,0.85)]",
            fit
              ? "aspect-square h-auto min-w-0 shrink grow-0 basis-4 sm:basis-[18px]"
              : "h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 xl:h-[18px] xl:w-[18px]",
          )}
        />
      ))}
      {hidden > 0 && <span className="text-[10px] font-medium text-muted-foreground/60">+{hidden}</span>}
    </div>
  );
}
