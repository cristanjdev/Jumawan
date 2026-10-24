import { create } from 'zustand';

/**
 * Adaptive performance tiers.
 *
 * - high:   full effects (parallax, animated nebula/glows, all hero decor)
 * - medium: keeps motion but drops the paint-heavy loops (animated blurs, box-shadow breathing)
 * - low:    no parallax, no blur/backdrop-filter, decorative loops off
 *
 * Smooth wheel scrolling runs on every tier; only the OS reduced-motion setting turns it off.
 *
 * The initial tier comes from hardware hints; a lightweight frame monitor then
 * downgrades (never upgrades) if the device can't keep up in practice. It only ever steps
 * down to `medium`: `low` (no parallax or blur) is for devices the hardware hints
 * flag as weak, or a deliberate `?perf=low`, so a slow page load can't strip the effects.
 * Override for testing with `?perf=low|medium|high` (`?perf=auto` clears it).
 */
export type PerfTier = 'low' | 'medium' | 'high';

interface PerformanceState {
  tier: PerfTier;
  /** OS-level "reduce motion" preference */
  reduceMotion: boolean;
  setTier: (tier: PerfTier) => void;
  setReduceMotion: (reduce: boolean) => void;
}

const TIERS: PerfTier[] = ['low', 'medium', 'high'];
const OVERRIDE_KEY = 'perf-tier-override';
const SESSION_KEY = 'perf-tier-session';

type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

const isTier = (value: unknown): value is PerfTier =>
  typeof value === 'string' && (TIERS as string[]).includes(value);

const safeGet = (storage: () => Storage, key: string) => {
  try { return storage().getItem(key); } catch { return null; }
};
const safeSet = (storage: () => Storage, key: string, value: string | null) => {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch { /* storage unavailable */ }
};

const readOverride = (): PerfTier | null => {
  const param = new URLSearchParams(window.location.search).get('perf');
  if (param === 'auto') safeSet(() => localStorage, OVERRIDE_KEY, null);
  else if (isTier(param)) safeSet(() => localStorage, OVERRIDE_KEY, param);

  const stored = safeGet(() => localStorage, OVERRIDE_KEY);
  return isTier(stored) ? stored : null;
};

const detectTier = (): PerfTier => {
  const nav = navigator as NavigatorHints;
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory; // Chromium only, in GB (capped at 8)
  const connection = nav.connection;

  if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '')) return 'low';
  if (cores <= 2 || (memory !== undefined && memory <= 2)) return 'low';

  let tier: PerfTier = 'high';
  if (cores <= 4 || (memory !== undefined && memory <= 4)) tier = 'medium';

  // Phones: mobile GPUs struggle with large blurs even when the CPU is strong
  const isPhone = window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768;
  if (isPhone && tier === 'high') tier = 'medium';

  return tier;
};

const applyToDocument = (tier: PerfTier) => {
  document.documentElement.dataset.perf = tier;
};

export const usePerformanceStore = create<PerformanceState>((set) => ({
  tier: 'high',
  reduceMotion: false,
  setTier: (tier) => {
    applyToDocument(tier);
    set({ tier });
  },
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
}));

/**
 * Watches frame pacing while something is actually animating (initial load and
 * active scrolling) and steps the tier down after sustained jank.
 */
const startFrameMonitor = () => {
  const WINDOW_MS = 1000;
  const SLOW_FRAME_MS = 33; // averaging slower than ~30fps
  const BAD_WINDOWS_TO_DOWNGRADE = 3;
  const SCROLL_GRACE_MS = 1500;

  let measureUntil = performance.now() + 6000;
  let rafId: number | null = null;
  let last = 0;
  let windowStart = 0;
  let frames = 0;
  let badWindows = 0;

  const resetWindow = (now: number) => {
    windowStart = now;
    frames = 0;
  };

  const tick = (now: number) => {
    const { tier, setTier } = usePerformanceStore.getState();
    // The monitor only steps high -> medium; medium and low are left as they are
    if (tier !== 'high') {
      stop();
      return;
    }

    const delta = now - last;
    last = now;

    // Ignore tab switches / throttled frames — they aren't render jank
    if (document.hidden || delta > 250) {
      resetWindow(now);
    } else {
      frames++;
      const elapsed = now - windowStart;
      if (elapsed >= WINDOW_MS) {
        const avgFrame = elapsed / frames;
        badWindows = avgFrame > SLOW_FRAME_MS ? badWindows + 1 : 0;
        if (badWindows >= BAD_WINDOWS_TO_DOWNGRADE) {
          const next = TIERS[TIERS.indexOf(tier) - 1];
          setTier(next);
          safeSet(() => sessionStorage, SESSION_KEY, next);
          badWindows = 0;
        }
        resetWindow(now);
      }
    }

    if (now < measureUntil) rafId = requestAnimationFrame(tick);
    else stop();
  };

  const start = () => {
    if (rafId !== null) return;
    last = performance.now();
    resetWindow(last);
    rafId = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  };

  const onScroll = () => {
    if (usePerformanceStore.getState().tier !== 'high') {
      window.removeEventListener('scroll', onScroll);
      return;
    }
    measureUntil = Math.max(measureUntil, performance.now() + SCROLL_GRACE_MS);
    start();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  start();
};

/** Call once before the first render so components mount with the right tier. */
export const initPerformanceTier = () => {
  if (typeof window === 'undefined') return;

  const override = readOverride();

  // Only a measured `medium` is kept; an older build could also save `low`, which would switch smooth scrolling off
  const sessionTier = safeGet(() => sessionStorage, SESSION_KEY);
  const detected = detectTier();
  // A downgrade measured earlier this session wins over the optimistic hardware guess
  const initial = override
    ?? (sessionTier === 'medium' && detected === 'high' ? sessionTier : detected);

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const { setTier, setReduceMotion } = usePerformanceStore.getState();
  setTier(initial);
  setReduceMotion(reducedMotionQuery.matches);
  reducedMotionQuery.addEventListener('change', (e) => setReduceMotion(e.matches));

  if (!override && initial === 'high') {
    const begin = () => window.setTimeout(startFrameMonitor, 1000);
    if (document.readyState === 'complete') begin();
    else window.addEventListener('load', begin, { once: true });
  }
};

/** Convenience selectors for components */
export const usePerfTier = () => usePerformanceStore((s) => s.tier);

export const useMotionBudget = () => {
  const tier = usePerformanceStore((s) => s.tier);
  const reduceMotion = usePerformanceStore((s) => s.reduceMotion);
  return {
    tier,
    reduceMotion,
    /** scroll-linked parallax transforms */
    parallax: tier !== 'low' && !reduceMotion,
    /** cheap, transform/opacity-only looping decor */
    ambient: tier !== 'low' && !reduceMotion,
    /** paint-heavy loops: animated blurs, box-shadows, blend modes */
    rich: tier === 'high' && !reduceMotion,
  };
};
