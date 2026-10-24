import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { DEFAULT_PORTRAIT_STYLE, isPortraitStyle, type PortraitStyle } from "@/lib/portrait-styles";

/** `?portrait=coin` previews a style on this page only, before switching it in admin */
const previewStyle = (() => {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("portrait") ?? "";
  return isPortraitStyle(value) ? value : null;
})();

/**
 * The hero portrait style and depth map chosen in admin. A live query, so switching the style in
 * admin changes an open page without a reload. `ready` is false until the first answer arrives.
 */
export function usePortraitSettings(): { style: PortraitStyle; depthMapUrl: string; ready: boolean } {
  const settings = useQuery(api.heroSettings.listActive);
  const styleValue = settings?.find((s) => s.type === "portrait_style")?.value ?? "";
  const depthMapUrl = settings?.find((s) => s.type === "depth_map")?.value ?? "";
  const chosen = isPortraitStyle(styleValue) ? styleValue : DEFAULT_PORTRAIT_STYLE;
  return {
    style: previewStyle ?? chosen,
    depthMapUrl,
    ready: settings !== undefined,
  };
}
