import type { ComponentType } from "react";
import { usePortraitSettings } from "@/hooks/use-portrait-settings";
import type { PortraitStyle } from "@/lib/portrait-styles";
import type { PortraitProps } from "./types";
import { CoinPortrait } from "./coin-portrait";
import { DepthPortrait } from "./depth-portrait";
import { GlassCardPortrait } from "./glass-card-portrait";
import { HologramPortrait } from "./hologram-portrait";
import { LanyardPortrait } from "./lanyard-portrait";
import { LaptopPortrait } from "./laptop-portrait";

const PORTRAITS: Record<PortraitStyle, ComponentType<PortraitProps>> = {
  glass_card: GlassCardPortrait,
  lanyard: LanyardPortrait,
  coin: CoinPortrait,
  hologram: HologramPortrait,
  laptop: LaptopPortrait,
  depth: DepthPortrait,
};

/**
 * The hero's 3D portrait, in the style picked in admin (hero setting "portrait_style"). Live: a new
 * pick there swaps the style on open pages. Until the setting arrives, a placeholder the size of the
 * default style holds the space, so no other style flashes in first.
 */
export function HeroPortrait(props: Omit<PortraitProps, "depthMapUrl">) {
  const { style, depthMapUrl, ready } = usePortraitSettings();
  if (!ready) {
    return (
      <div
        aria-hidden
        className="h-[300px] w-[240px] animate-pulse rounded-[28px] bg-primary/5 sm:h-[340px] sm:w-[272px] md:h-[390px] md:w-[312px] lg:h-[430px] lg:w-[344px]"
      />
    );
  }
  const Portrait = PORTRAITS[style];
  return <Portrait key={style} {...props} depthMapUrl={depthMapUrl} />;
}
