import { cn } from "@/lib/utils";

// Both marks are rendered and the `dark` class on <html> picks one, so the right logo shows on the
// very first paint and swaps instantly with the theme toggle (no store subscription, no flash).
// The hidden one is display:none, so with lazy loading it isn't fetched until the theme needs it.
export function BrandLogo({ className, alt = "CJ logo" }: { className?: string; alt?: string }) {
  const shared = { draggable: false, loading: "lazy" as const, decoding: "async" as const, width: 616, height: 606 };
  // Display classes go last so a caller's `block` can't override the theme switch
  return (
    <>
      <img {...shared} src="/cj-logo-skyblue.svg" alt={alt} className={cn("w-auto select-none", className, "dark:hidden")} />
      <img {...shared} src="/cj-logo-white.svg" alt={alt} className={cn("w-auto select-none", className, "hidden dark:block")} />
    </>
  );
}
