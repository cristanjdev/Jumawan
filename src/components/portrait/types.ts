/** What every hero portrait style receives */
export interface PortraitProps {
  /** The profile photo (from hero settings) */
  photoUrl: string;
  /** Hero settings are still loading: show a placeholder instead of the photo */
  loading: boolean;
  name: string;
  /** e.g. "Full Stack Developer" */
  role: string;
  /** The BluTech logo (hero setting "hover_logo"); may be empty */
  logoUrl: string;
  /** Grayscale depth map of the photo, for the depth style; may be empty */
  depthMapUrl: string;
  /** Idle animation allowed (not the low tier, no reduce motion, page settled) */
  animated: boolean;
  /** Pointer-driven 3D tilt allowed (not the low tier, no reduce motion) */
  interactive: boolean;
}
