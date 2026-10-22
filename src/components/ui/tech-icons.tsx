import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

// "Next.js", "NextJS" and "next js" are the same technology
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/js$/, "");

/**
 * A project's technologies as a compact row of plain icons. The icons come from the Tools &
 * Technologies list (the same query as that section), so adding or changing a tool there updates
 * every card; a technology that is not in the list simply has no icon here. Every icon is shown;
 * the row only wraps when a stack is longer than the card is wide.
 */
export function TechIcons({ technologies, className }: { technologies: string[]; className?: string }) {
  const tools = useQuery(api.tools.listActive);

  const icons = useMemo(() => {
    const byName = new Map<string, { name: string; icon: string }>();
    tools?.forEach((tool) => {
      if (!byName.has(key(tool.name))) byName.set(key(tool.name), { name: tool.name, icon: tool.icon_url });
    });
    const seen = new Set<string>();
    return technologies.flatMap((tech) => {
      const tool = byName.get(key(tech));
      if (!tool || seen.has(tool.icon)) return [];
      seen.add(tool.icon);
      return [{ name: tech, icon: tool.icon }];
    });
  }, [tools, technologies]);

  if (icons.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1.5 xl:gap-x-2.5", className)}>
      {icons.map(({ name, icon }) => (
        <img
          key={name}
          src={icon}
          alt={name}
          title={name}
          loading="lazy"
          decoding="async"
          draggable={false}
          // Scales with the viewport; a thin light edge keeps black logos (Express, Next.js) visible on the dark theme
          className="h-3.5 w-3.5 shrink-0 object-contain drop-shadow-md sm:h-4 sm:w-4 xl:h-[18px] xl:w-[18px] dark:drop-shadow-[0_0_1.5px_rgba(255,255,255,0.85)]"
        />
      ))}
    </div>
  );
}
