/** The 3D portrait styles the hero can show; the admin picks one (hero setting "portrait_style") */
export const PORTRAIT_STYLES = ["glass_card", "lanyard", "coin", "hologram", "laptop", "depth"] as const;
export type PortraitStyle = (typeof PORTRAIT_STYLES)[number];
export const DEFAULT_PORTRAIT_STYLE: PortraitStyle = "glass_card";

export const isPortraitStyle = (value: string): value is PortraitStyle =>
  (PORTRAIT_STYLES as readonly string[]).includes(value);
