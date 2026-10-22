"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue, useMotionValue, useAnimationFrame, useMotionTemplate, useInView } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from '../../../convex/_generated/api';
import { useMotionBudget } from "@/stores/usePerformanceStore";
import { usePageVisible } from "@/hooks/use-page-visible";
import { ToolsOrbit3D } from "./tools-orbit-3d";

// "Next.js", "NextJS" and "next js" are the same technology
const toolKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/js$/, "");
// The orbit shows only the technologies used most across the projects
const MAX_ORBIT_TOOLS = 24;

// --- Types ---
interface DisplayTool {
  name: string;
  image: string;
}

// --- Shared scroll velocity tracker for mobile marquee ---
function useScrollVelocity(active: boolean) {
  const velocity = useRef(0);

  useEffect(() => {
    if (!active) return;
    let rafId: number;
    let prevY = window.scrollY;
    let prevTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - prevTime) / 1000; // seconds
      const currentY = window.scrollY;
      const dist = Math.abs(currentY - prevY);

      if (dt > 0) {
        // Pixels per second — true velocity
        const instantSpeed = dist / dt;
        // Smooth it so it doesn't spike/drop instantly
        const smoothing = 0.3;
        velocity.current += (instantSpeed - velocity.current) * smoothing;
      }

      prevY = currentY;
      prevTime = now;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [active]);

  return velocity;
}

// --- Marquee Row driven by requestAnimationFrame with scroll-responsive speed ---
// Each logo slot is 2.75rem wide + 1.25rem margin per side = 84px
const MARQUEE_SLOT_PX = 84;
// The marquee only renders below the lg breakpoint
const MARQUEE_MAX_VIEWPORT_PX = 1024;

const MarqueeRow = ({ tools, reverse = false, baseSpeed = 40, scrollVelocity, active }: { 
  tools: DisplayTool[]; 
  reverse?: boolean;
  baseSpeed?: number;
  scrollVelocity: React.MutableRefObject<number>;
  /** false while offscreen or the tab is hidden — stops the rAF loop */
  active: boolean;
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const setARef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const widthRef = useRef(0);
  const initializedRef = useRef(false);
  const smoothSpeedRef = useRef(baseSpeed);
  
  // One set only needs to span the widest viewport the marquee shows on; the three
  // copies below handle the seamless wrap. (Was a fixed 8+ repeats → ~1,500 <img>.)
  const repeatCount = tools.length > 0 ? Math.max(1, Math.ceil(MARQUEE_MAX_VIEWPORT_PX / (tools.length * MARQUEE_SLOT_PX))) : 0;
  const oneSet = useMemo(
    () => (repeatCount > 0 ? Array(repeatCount).fill(tools).flat() : []),
    [tools, repeatCount]
  );

  // Measure width of one set
  useEffect(() => {
    if (tools.length === 0) return;
    const measure = () => {
      if (setARef.current) {
        widthRef.current = setARef.current.offsetWidth;
        if (!initializedRef.current && reverse && widthRef.current > 0) {
          offsetRef.current = -widthRef.current;
          initializedRef.current = true;
        }
      }
    };
    measure();
    const timer = setTimeout(measure, 200);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(timer);
    };
  }, [tools.length, reverse]);

  // Animation loop — single smooth pipeline
  useEffect(() => {
    if (tools.length === 0 || !active) return;
    let rafId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      if (lastTime === 0) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const w = widthRef.current;
      if (w > 0 && trackRef.current && dt > 0 && dt < 0.1) {
        // Scroll boost: map velocity to a 0-4 multiplier for noticeable effect
        const scrollSpeed = scrollVelocity.current;
        const boost = Math.min(4, scrollSpeed / 200);
        const targetSpeed = baseSpeed + baseSpeed * boost;
        
        // Frame-rate independent exponential smoothing
        const halfLife = boost > 0.1 ? 0.15 : 0.6; // fast ramp-up, slow decay
        const factor = 1 - Math.pow(0.5, dt / halfLife);
        smoothSpeedRef.current += (targetSpeed - smoothSpeedRef.current) * factor;
        
        const direction = reverse ? 1 : -1;
        offsetRef.current += direction * smoothSpeedRef.current * dt;

        // Modulo wrap
        if (!reverse) {
          if (offsetRef.current <= -w) {
            offsetRef.current = offsetRef.current % w;
          }
        } else {
          if (offsetRef.current >= 0) {
            offsetRef.current = -w + (offsetRef.current % w);
          }
        }

        trackRef.current.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [tools.length, baseSpeed, reverse, scrollVelocity, active]);

  if (tools.length === 0) return null;

  return (
    <div className="overflow-hidden" style={{ height: '4.5rem', borderTop: '1px solid var(--marquee-border, rgba(6,182,212,0.15))', borderBottom: '1px solid var(--marquee-border, rgba(6,182,212,0.15))' }}>
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          width: 'max-content',
          willChange: 'transform',
        }}
      >
        {/* 3 identical sets for bulletproof seamless loop */}
        {[0, 1, 2].map((setIdx) => (
          <div key={setIdx} ref={setIdx === 0 ? setARef : undefined} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {oneSet.map((tool, i) => (
              <div
                key={`${setIdx}-${i}`}
                className="flex-shrink-0 flex items-center justify-center"
                style={{ width: '2.75rem', height: '2.75rem', margin: '0 1.25rem' }}
              >
                <img src={tool.image} alt={setIdx === 0 ? tool.name : ""} className="w-full h-full object-contain opacity-70" draggable={false} decoding="async" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Mobile Horizontal Lines Component ---
const MobileToolsLayout = ({ 
  innerRing, 
  middleRing, 
  outerRing 
}: { 
  innerRing: DisplayTool[];
  middleRing: DisplayTool[];
  outerRing: DisplayTool[];
}) => {
  const { ambient } = useMotionBudget();
  const layoutRef = useRef<HTMLDivElement>(null);
  const inView = useInView(layoutRef, { margin: "100px 0px" });
  const pageVisible = usePageVisible();
  const active = inView && pageVisible;
  const scrollVelocity = useScrollVelocity(active);
  const allTools = [...innerRing, ...middleRing, ...outerRing];
  
  // Fisher-Yates shuffle with a seed so it's stable per mount but random per row
  const shuffle = (arr: DisplayTool[], seed: number) => {
    const copy = [...arr];
    let s = seed;
    for (let i = copy.length - 1; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const line1 = shuffle(allTools, 1);
  const line2 = shuffle(allTools, 2);
  const line3 = shuffle(allTools, 3);

  return (
    <motion.div 
      ref={layoutRef}
      className="w-full relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <motion.div 
        className="flex flex-col gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      >
        <MarqueeRow tools={line1} baseSpeed={44} scrollVelocity={scrollVelocity} active={active} />
        <MarqueeRow tools={line2} reverse baseSpeed={28} scrollVelocity={scrollVelocity} active={active} />
        <MarqueeRow tools={line3} baseSpeed={50} scrollVelocity={scrollVelocity} active={active} />
      </motion.div>

      {/* Central Logo In Front */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.75, delay: 0.45 }}
      >
        <motion.img
          src="/blutech.webp"
          alt="Tech Core"
          className="w-[10rem] h-[10rem] sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
          animate={ambient && active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={ambient && active ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6, ease: "easeOut" }}
        />
      </motion.div>
    </motion.div>
  );
};

// --- Desktop Solar System Component ---
// Laser Beam Component
const LaserBeam = ({ pulse }: { pulse: boolean }) => {
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
      <defs>
        <linearGradient id="laserGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="20%" stopColor="var(--laser-mid, rgba(56, 189, 248, 0.3))" />
          <stop offset="100%" stopColor="var(--laser-tip, rgba(34, 211, 238, 0.9))" />
        </linearGradient>
      </defs>
      <line
        x1="50%" y1="50%"
        x2="50%" y2="0%"
        stroke="url(#laserGradient)"
        strokeWidth="1"
        strokeDasharray="4 4"
        className={pulse ? "animate-pulse" : undefined}
      />
    </svg>
  );
};

// A single planet sitting at a fixed slot angle inside its (rotating) orbit ring
const PlanetNode = ({
  tool,
  angle,
  ringCounterRotate,
  pulseLaser,
}: {
  tool: DisplayTool;
  angle: number;
  ringCounterRotate: MotionValue<number>;
  pulseLaser: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  // Cancel both the ring's rotation and this slot's angle so the logo stays upright
  const iconRotate = useTransform(ringCounterRotate, (r) => r - angle);

  return (
    <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
      <div className="absolute inset-0 opacity-30">
        <LaserBeam pulse={pulseLaser} />
      </div>
      <div
        className="absolute top-0 left-1/2 z-10"
        style={{
          transform: "translate(-50%, -50%)",
          transformOrigin: "50% 50%"
        }}
      >
        <motion.div
          style={{ rotate: iconRotate, willChange: "transform" }}
          className="relative group pointer-events-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative flex items-center justify-center scale-90 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12">
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={tool.image}
                alt={tool.name}
                className="w-full h-full object-contain drop-shadow-lg"
                decoding="async"
              />
            </div>
          </div>
          <div className={`
            absolute left-1/2 -translate-x-1/2 top-full mt-2
            px-2 py-1 bg-[var(--surface-bg)]/90 border border-cyan-500/30 rounded
            text-[10px] sm:text-xs text-foreground whitespace-nowrap pointer-events-none
            opacity-0 transform translate-y-2 transition-all duration-200
            ${isHovered ? "opacity-100 translate-y-0" : ""}
          `}>
            {tool.name}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// One orbit: the whole ring rotates as a single composited layer instead of
// every planet transforming (and repainting) its own 720px-wide box each frame.
const OrbitRing = ({
  tools,
  diameterClasses,
  rotation,
  pulseLasers,
}: {
  tools: DisplayTool[];
  diameterClasses: string;
  rotation: MotionValue<number>;
  pulseLasers: boolean;
}) => {
  const counterRotate = useTransform(rotation, (r) => -r);

  return (
    <motion.div
      className={`absolute top-1/2 left-1/2 pointer-events-none rounded-full ${diameterClasses}`}
      style={{
        x: "-50%",
        y: "-50%",
        rotate: rotation,
        willChange: "transform",
      }}
    >
      {tools.map((tool, i) => (
        <PlanetNode
          key={tool.name}
          tool={tool}
          angle={(360 / tools.length) * i}
          ringCounterRotate={counterRotate}
          pulseLaser={pulseLasers}
        />
      ))}
    </motion.div>
  );
};

const DesktopSolarSystem = ({
  innerRing,
  middleRing,
  outerRing,
  containerRef,
}: {
  innerRing: DisplayTool[];
  middleRing: DisplayTool[];
  outerRing: DisplayTool[];
  containerRef: React.RefObject<HTMLElement>;
}) => {
  const { tier, ambient, rich } = useMotionBudget();
  const inView = useInView(containerRef, { margin: "200px 0px" });
  const pageVisible = usePageVisible();
  const active = inView && pageVisible;
  const loop = ambient && active;
  const loopRef = useRef(loop);
  loopRef.current = loop;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
    layoutEffect: false // Prevents warning during SSR/initial render
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const baseRotation = useMotionValue(0);
  const speedFactor = useRef(1);

  useAnimationFrame((_, delta) => {
    // Idle drift only while visible; scroll-linked rotation still works on every tier
    if (!loopRef.current) return;
    if (speedFactor.current > 1) {
      speedFactor.current = Math.max(1, speedFactor.current * 0.95);
    }
    const current = baseRotation.get();
    baseRotation.set(current + delta * 0.005 * speedFactor.current);
  });

  const innerRotate = useTransform(
    [baseRotation, smoothProgress],
    ([base, scroll]) => ((base as number) * 3) + ((scroll as number) * 360)
  );

  const middleRotate = useTransform(
    [baseRotation, smoothProgress],
    ([base, scroll]) => ((base as number) * -2) + (30 + (scroll as number) * -360)
  );

  const outerRotate = useTransform(
    [baseRotation, smoothProgress],
    ([base, scroll]) => ((base as number) * 1) + ((scroll as number) * 180)
  );

  const coreScale = useTransform(smoothProgress, [0, 0.5, 1], [0.8, 1.2, 0.8]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightMask = useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, black, transparent)`;
  // The cursor spotlight repaints the orbit lines on every mouse move — skipped on the low tier
  const spotlight = tier !== "low";

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const [pulses, setPulses] = useState<number[]>([]);

  const triggerPulse = () => {
    setPulses(prev => [...prev, Date.now()]);
    speedFactor.current = Math.min(20, speedFactor.current + 4);
  };

  const removePulse = (id: number) => {
    setPulses(prev => prev.filter(pulseId => pulseId !== id));
  };

  return (
    <motion.div
      onMouseMove={spotlight ? handleMouseMove : undefined}
      // Animating back to 0 (instead of dropping `animate`) is what actually stops a framer loop
      animate={loop ? { y: [-10, 10] } : { y: 0 }}
      transition={loop ? {
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      } : { duration: 0.6, ease: "easeOut" }}
      style={{ willChange: 'transform' }}
      className="relative group w-[240px] h-[240px] sm:w-[400px] sm:h-[400px] md:w-[560px] md:h-[560px] flex items-center justify-center perspective-1000"
    >
      <motion.div
        style={{ scale: coreScale }}
        className="absolute z-20 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 flex items-center justify-center cursor-pointer"
        onClick={triggerPulse}
      >
        <motion.img
          src="/blutech.webp"
          alt="Tech Core"
          className="w-full h-full object-contain z-10"
          animate={loop ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={loop ? {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          } : { duration: 0.6, ease: "easeOut" }}
        />
        {pulses.map((id) => (
          <motion.div
            key={id}
            initial={{ scale: 0.8, opacity: 0.8, borderWidth: "4px" }}
            animate={{
              scale: 4.5,
              opacity: 0,
              borderWidth: "0px",
            }}
            transition={{
              duration: 2,
              ease: "easeOut",
            }}
            onAnimationComplete={() => removePulse(id)}
            className="absolute inset-0 rounded-full border border-cyan-300 pointer-events-none"
            style={{
              zIndex: -1,
              boxShadow: "var(--pulse-shadow, 0 0 20px 4px rgba(34, 211, 238, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.4))"
            }}
          />
        ))}
      </motion.div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute rounded-full border border-blue-500/10 w-[160px] h-[160px] sm:w-[240px] sm:h-[240px] md:w-[320px] md:h-[320px]" />
        <div className="absolute rounded-full border border-blue-500/10 w-[260px] h-[260px] sm:w-[390px] sm:h-[390px] md:w-[520px] md:h-[520px]" />
        <div className="absolute rounded-full border border-blue-500/10 w-[360px] h-[360px] sm:w-[540px] sm:h-[540px] md:w-[720px] md:h-[720px]" />
      </div>

      {spotlight && (
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{
          maskImage: spotlightMask,
          WebkitMaskImage: spotlightMask,
        }}
      >
        <div className="absolute rounded-full border border-cyan-400/60 w-[160px] h-[160px] sm:w-[240px] sm:h-[240px] md:w-[320px] md:h-[320px]" />
        <div className="absolute rounded-full border border-cyan-400/60 w-[260px] h-[260px] sm:w-[390px] sm:h-[390px] md:w-[520px] md:h-[520px]" />
        <div className="absolute rounded-full border border-cyan-400/60 w-[360px] h-[360px] sm:w-[540px] sm:h-[540px] md:w-[720px] md:h-[720px]" />
      </motion.div>
      )}

      <div className="absolute inset-0 origin-center pointer-events-none">
        <div className="absolute inset-0 pointer-events-auto z-30">
          {/* Inner Ring */}
          <OrbitRing
            tools={innerRing}
            diameterClasses="w-[160px] h-[160px] sm:w-[240px] sm:h-[240px] md:w-[320px] md:h-[320px]"
            rotation={innerRotate}
            pulseLasers={rich}
          />
          {/* Middle Ring */}
          <OrbitRing
            tools={middleRing}
            diameterClasses="w-[260px] h-[260px] sm:w-[390px] sm:h-[390px] md:w-[520px] md:h-[520px]"
            rotation={middleRotate}
            pulseLasers={rich}
          />
          {/* Outer Ring */}
          <OrbitRing
            tools={outerRing}
            diameterClasses="w-[360px] h-[360px] sm:w-[540px] sm:h-[540px] md:w-[720px] md:h-[720px]"
            rotation={outerRotate}
            pulseLasers={rich}
          />
        </div>
      </div>
    </motion.div>
  );
};

// --- Main Component ---
export function ToolsCarousel() {
  const containerRef = useRef<HTMLElement>(null);
  
  // Reactive queries — auto-update when tools or projects change in admin
  const data = useQuery(api.tools.listActive);
  const projects = useQuery(api.projects.list);

  const { innerRing, middleRing, outerRing } = useMemo(() => {
    if (!data || data.length === 0 || projects === undefined) return { innerRing: [], middleRing: [], outerRing: [] };

    const uniqueToolsMap = new Map<string, DisplayTool>();
    data.forEach((t) => {
      if (!uniqueToolsMap.has(t.name)) {
        uniqueToolsMap.set(t.name, { name: t.name, image: t.icon_url });
      }
    });
    const allTools = Array.from(uniqueToolsMap.values());

    // Only the most used technologies: ranked by how many projects use them (ties keep the tools order).
    // With no project data the full list is shown instead of an empty orbit.
    const usage = new Map<string, number>();
    projects.forEach((project) => {
      new Set(project.technologies.map(toolKey)).forEach((k) => usage.set(k, (usage.get(k) ?? 0) + 1));
    });
    const ranked = allTools
      .map((tool, order) => ({ tool, order, count: usage.get(toolKey(tool.name)) ?? 0 }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count || a.order - b.order)
      .slice(0, MAX_ORBIT_TOOLS)
      .map((entry) => entry.tool);
    const shown = ranked.length > 0 ? ranked : allTools;

    const total = shown.length;
    const innerCount = Math.max(3, Math.floor(total * 0.2));
    const middleCount = Math.max(5, Math.floor(total * 0.35));

    return {
      innerRing: shown.slice(0, innerCount),
      middleRing: shown.slice(innerCount, innerCount + middleCount),
      outerRing: shown.slice(innerCount + middleCount),
    };
  }, [data, projects]);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Every screen size gets the 3D orbit (it lays itself out for narrow screens) unless the device is on
  // the low performance tier or WebGL fails; then phones get the marquee and desktops the 2D orbit
  const { tier, reduceMotion } = useMotionBudget();
  const [webglFailed, setWebglFailed] = useState(false);
  const use3D = tier !== "low" && !webglFailed;
  const rings = useMemo(() => [innerRing, middleRing, outerRing], [innerRing, middleRing, outerRing]);

  return (
    <section
      ref={containerRef}
      id="tools"
      className={`py-20 sm:py-24 relative overflow-hidden bg-transparent flex flex-col items-center justify-center ${use3D ? "" : "min-h-[600px] md:min-h-[1000px]"}`}
    >
      <motion.div 
        className="container mx-auto px-4 relative z-10 flex flex-col items-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.9 }}
      >
        <motion.div 
          className={`text-center ${use3D ? "mb-4" : "mb-28 sm:mb-36"}`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <div className="flex flex-col items-center mx-auto w-fit">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-cyan-400 mb-4 text-center">
              Tools & Technologies
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center font-medium">
              The technologies and tools I use to build exceptional digital experiences
            </p>
          </div>
        </motion.div>

        <motion.div 
          key={use3D ? "orbit-3d" : isMobile ? "mobile" : "desktop"}
          className={isMobile || use3D ? "w-full" : undefined}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.3 }}
        >
          {/* Only the active layout is mounted, so the hidden one costs nothing */}
          {use3D ? (
            <ToolsOrbit3D
              rings={rings}
              quality={tier === "high" && !isMobile ? "high" : "medium"}
              reduceMotion={reduceMotion}
              sectionRef={containerRef}
              onUnavailable={() => setWebglFailed(true)}
            />
          ) : isMobile ? (
            <MobileToolsLayout
              innerRing={innerRing}
              middleRing={middleRing}
              outerRing={outerRing}
            />
          ) : (
            <DesktopSolarSystem
              innerRing={innerRing}
              middleRing={middleRing}
              outerRing={outerRing}
              containerRef={containerRef}
            />
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
