"use client";

import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Download, ExternalLink, FileText, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useHeroSettingsStore } from "@/stores/useHeroSettingsStore";
import { HeroPortrait } from "@/components/portrait/hero-portrait";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { useMotionBudget } from "@/stores/usePerformanceStore";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  buildResumeStorageFetchUrls,
  extractStorageId,
  fetchFirstOk,
} from "@/lib/convexSite";

const FULL_NAME = "Cristan Jade Jumawan";

const DYNAMIC_PHRASES = [
  "Crafting exceptional digital experiences that drive business growth and user engagement.",
  "Building scalable, high-performance applications with clean architecture and modern practices.",
  "Transforming complex ideas into elegant, intuitive solutions that users love.",
  "Delivering end-to-end digital products from concept to deployment with precision.",
  "Passionate about creating seamless experiences across web and mobile platforms.",
];

// The heading types the name, then each credential in turn, and loops. It lives in its own component so each
// keystroke re-renders only this heading text, not the whole hero.
const TYPED_LINES = [FULL_NAME, "Graduated with Honors", "Outstanding Intern"];

function TypingName({ animate }: { animate: boolean }) {
  const [line, setLine] = useState(0);
  const [count, setCount] = useState(animate ? 0 : FULL_NAME.length);
  const [isDeleting, setIsDeleting] = useState(false);
  const text = animate ? TYPED_LINES[line] : FULL_NAME;

  useEffect(() => {
    if (!animate) {
      setLine(0);
      setCount(FULL_NAME.length);
      return;
    }
    const atEnd = !isDeleting && count === text.length;
    const atStart = isDeleting && count === 0;
    const delay = atEnd ? 1800 : atStart ? 250 : isDeleting ? 60 : 110;

    const timeout = window.setTimeout(() => {
      if (atEnd) setIsDeleting(true);
      else if (atStart) {
        setIsDeleting(false);
        setLine((l) => (l + 1) % TYPED_LINES.length);
      } else setCount((c) => c + (isDeleting ? -1 : 1));
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [animate, count, isDeleting, text]);

  return (
    <>
      {/* Screen readers and crawlers always get the full, stable name */}
      <span className="sr-only">{FULL_NAME}</span>
      <span aria-hidden="true" className="bg-gradient-to-r from-[hsl(197,100%,85%)] via-[hsl(202,85%,70%)] to-[hsl(197,100%,60%)] bg-clip-text text-transparent">
        {text.slice(0, count)}
      </span>
      <motion.span
        key={`cursor-${animate}`}
        aria-hidden="true"
        animate={animate ? { opacity: [1, 0, 1] } : undefined}
        transition={{ duration: 1, repeat: Infinity }}
        className="text-primary ml-0.5"
      >
        |
      </motion.span>
    </>
  );
}

const ROLE_MAX_PX = 13;
const ROLE_MIN_PX = 8;

/**
 * The hero badges as plain text on one line, separated by dots. The roles come from the admin, so the line
 * shrinks its text to the width it has instead of wrapping: it measures itself at full size, then scales down.
 */
function RoleLine({ roles }: { roles: string[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const line = lineRef.current;
    if (!box || !line) return;
    const fit = () => {
      line.style.fontSize = `${ROLE_MAX_PX}px`;
      const ratio = box.clientWidth / line.scrollWidth;
      const size = Math.max(ROLE_MIN_PX, Math.min(ROLE_MAX_PX, Math.floor(ROLE_MAX_PX * ratio * 10) / 10));
      line.style.fontSize = `${size}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [roles]);

  return (
    <div ref={boxRef} className="w-full">
      <p
        ref={lineRef}
        // `w-max` lets the line report its natural width so it can be measured
        className="flex w-max items-center justify-center whitespace-nowrap font-medium text-muted-foreground/90 max-lg:mx-auto"
        style={{ fontSize: ROLE_MAX_PX }}
      >
        {roles.map((role, i) => (
          <span key={role} className="inline-flex items-center">
            {i > 0 && <span aria-hidden className="mx-[0.7em] h-[0.3em] w-[0.3em] shrink-0 rounded-full bg-muted-foreground/50" />}
            {role}
          </span>
        ))}
      </p>
    </div>
  );
}

// Rotating tagline, isolated for the same reason as TypingName
function RotatingPhrase() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % DYNAMIC_PHRASES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {DYNAMIC_PHRASES[index]}
      </motion.p>
    </AnimatePresence>
  );
}

export function HeroSection() {
  // parallax: scroll-linked transforms · ambient: cheap looping decor · rich: paint-heavy loops
  const { tier, parallax, ambient, rich } = useMotionBudget();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewBlobType, setPreviewBlobType] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  // Resume modal zoom + drag — same state pattern as verification modal
  const [resumeZoom, setResumeZoom] = useState(1);
  const [resumePos, setResumePos] = useState({ x: 0, y: 0 });
  const [resumeDragStart, setResumeDragStart] = useState({ x: 0, y: 0 });
  const [resumeDragging, setResumeDragging] = useState(false);
  const resumeContainerRef = useRef<HTMLDivElement>(null);
  const [animationsReady, setAnimationsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Fetch dynamic hero settings
  const { badges, resumeUrl, profileImageUrl, hoverLogoUrl, fetchSettings, loading } = useHeroSettingsStore();

  // Detect mobile/tablet for performance optimization
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Only disable for very small mobile devices
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { toast } = useToast();
  const { scrollToSection } = useSmoothScroll();

  // Parallax effect
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Scroll-based parallax transforms — lighter on mobile for smooth feel
  const backgroundY = useTransform(scrollYProgress, [0, 1], isMobile ? ["0%", "5%"] : ["0%", "25%"]);
  const avatarY = useTransform(scrollYProgress, [0, 1], isMobile ? ["0%", "8%"] : ["0%", "35%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], isMobile ? ["0%", "4%"] : ["0%", "18%"]);
  const avatarScale = useTransform(scrollYProgress, [0, 0.6], isMobile ? [1, 0.97] : [1, 0.88]);
  const floatingElementsY = useTransform(scrollYProgress, [0, 1], isMobile ? ["0%", "10%"] : ["0%", "50%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.3, 0]);
  const nameX = useTransform(scrollYProgress, [0, 0.5], isMobile ? ["0%", "0%"] : ["0%", "-3%"]);
  const fadeGradientOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7], [0, 0.8, 1]);

  // Fetch hero settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Close resume modal on Esc key + reset zoom
  useEffect(() => {
    if (!isResumeModalOpen) {
      setResumeZoom(1);
      setResumePos({ x: 0, y: 0 });
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsResumeModalOpen(false);
        setResumeZoom(1);
        setResumePos({ x: 0, y: 0 });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isResumeModalOpen]);

  // Fetch file as a blob URL when modal opens so the iframe uses a same-origin
  // blob: URL — this bypasses browser ad/tracker blockers (e.g. Opera) that
  // block the convex.site domain when loaded as an iframe src.
  useEffect(() => {
    if (!isResumeModalOpen) {
      // Revoke old blob URL to free memory
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl(null);
      }
      return;
    }

    if (!resumeUrl?.trim()) {
      setPreviewLoading(false);
      setPreviewBlobType("");
      setPreviewBlobUrl(null);
      return;
    }

    const buildPreview = async () => {
      setPreviewLoading(true);
      try {
        const sid = extractStorageId(resumeUrl);
        const tryUrls = sid
          ? buildResumeStorageFetchUrls(resumeUrl, sid, "preview")
          : [resumeUrl];

        const res = await fetchFirstOk(tryUrls);
        const blob = await res.blob();
        setPreviewBlobType(blob.type || "");
        setPreviewBlobUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.warn("Preview fetch failed, falling back to direct URL", err);
        setPreviewBlobType("");
        setPreviewBlobUrl(null);
      } finally {
        setPreviewLoading(false);
      }
    };

    buildPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResumeModalOpen, resumeUrl]);

  // Delay heavy animations until after initial render
  useEffect(() => {
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleAnimations = () => {
      // Longer delay on mobile for better initial load
      const delay = isMobile ? 800 : 500;
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => setAnimationsReady(true), { timeout: delay + 500 });
      } else {
        setTimeout(() => setAnimationsReady(true), delay);
      }
    };

    scheduleAnimations();
  }, [isMobile]);

  // Low tier keeps the avatar's static borders but skips the extra rings, dots and pulses
  const showDecor = animationsReady && tier !== "low";

  // The portrait shows the developer role from the hero badges
  const cardRole = badges.find((badge) => /developer/i.test(badge)) ?? "Full Stack Developer";

  const scrollToProjects = () => {
    scrollToSection("projects");
  };

  const scrollToContact = () => {
    scrollToSection("contact");
  };

  const handleOpenResume = () => {
    setIsResumeModalOpen(true);
  };

  const handleModalDownload = async () => {
    if (isDownloading || !resumeUrl?.trim()) return;
    setIsDownloading(true);

    const currentToast = toast({
      title: "Downloading Resume",
      description: "Preparing your download…",
    });

    try {
      const storageId = extractStorageId(resumeUrl);

      if (resumeUrl.startsWith("/") && !resumeUrl.startsWith("//")) {
        const link = document.createElement("a");
        link.href = resumeUrl;
        link.download = "Jumawan-Resume";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (!storageId) {
        window.open(resumeUrl, "_blank", "noopener,noreferrer");
        return;
      }

      let storedFilename = "Jumawan-Resume";
      try {
        const parsed = new URL(resumeUrl);
        const fn = parsed.searchParams.get("filename");
        if (fn) storedFilename = decodeURIComponent(fn);
      } catch {
        /* ignore */
      }

      const tryUrls = buildResumeStorageFetchUrls(resumeUrl, storageId, storedFilename);
      const response = await fetchFirstOk(tryUrls);
      const blob = await response.blob();
      const contentType = blob.type || '';
      const isImage = contentType.startsWith('image/');

      if (isImage) {
        // Convert image to PDF using jsPDF so visitors always get a .pdf file
        const imgDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        // Determine image dimensions via an HTMLImageElement
        const imgEl = new Image();
        await new Promise<void>((resolve) => {
          imgEl.onload = () => resolve();
          imgEl.onerror = () => resolve(); // proceed even if we can't measure
          imgEl.src = imgDataUrl;
        });

        const imgW = imgEl.naturalWidth || 595;
        const imgH = imgEl.naturalHeight || 842;
        const pdfW = 210; // A4 mm
        const pdfH = Math.round((imgH / imgW) * pdfW);

        // Loaded on demand — keeps ~340 KB out of the initial bundle
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({
          orientation: pdfW >= pdfH ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pdfW, pdfH],
        });
        pdf.addImage(imgDataUrl, 'PNG', 0, 0, pdfW, pdfH);
        pdf.save('Jumawan-Resume.pdf');
      } else {
        // PDF or other document — download directly
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'Jumawan-Resume.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Absolute fallback — open in new tab
      window.open(resumeUrl, '_blank', 'noopener,noreferrer');
      toast({
        title: "Opening in new tab",
        description: "Direct download unavailable — opening in a new tab.",
      });
    } finally {
      setTimeout(() => {
        currentToast.dismiss();
        setIsDownloading(false);
      }, 2000);
    }
  };

  // Stagger animation config
  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.18, delayChildren: 0.3 }
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1, y: 0,
      transition: { duration: 1.05, ease: [0.25, 0.46, 0.45, 0.94] as const }
    }
  };

  const fadeIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1, scale: 1,
      transition: { duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] as const }
    }
  };

  return (
    <>
      <section
      ref={sectionRef}
      id="home"
      className="min-h-[100svh] flex flex-col relative overflow-hidden bg-[var(--surface-bg)]"
    >
      {/* Background with Mesh Gradient */}
      <motion.div
        className="absolute inset-0 bg-[var(--surface-bg)]"
        style={parallax ? { y: backgroundY, willChange: 'transform' } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-hero opacity-20" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `
              radial-gradient(at 15% 25%, hsl(202 85% 55% / 0.15) 0%, transparent 55%),
              radial-gradient(at 85% 15%, hsl(197 100% 70% / 0.1) 0%, transparent 55%),
              radial-gradient(at 50% 60%, hsl(227 85% 18% / 0.2) 0%, transparent 50%)
            `
          }}
        />
        {/* Fade-out mask so highlights don't create a hard edge at section bottom */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, transparent 60%, var(--surface-bg) 100%)',
          }}
        />
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(to bottom, white 0%, white 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, white 0%, white 70%, transparent 100%)',
          }}
        />
      </motion.div>

      {/* Floating Background Elements with Parallax */}
      {showDecor && (
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={parallax ? { y: floatingElementsY, willChange: 'transform' } : undefined}
      >
        {/* Keyed so a runtime tier downgrade remounts it static (framer keeps looping otherwise) */}
        <motion.div
          key={`blob-${rich}`}
          animate={!rich ? undefined : {
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{ duration: 35, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ 
            background: 'hsl(197 100% 70%)',
            filter: 'blur(150px)',
            willChange: 'transform'
          }}
        />
      </motion.div>
      )}

      {/* Main Content - 2 Column Layout */}
      <motion.div
        className="flex-1 flex flex-col justify-center relative z-10 px-5 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8"
        style={{ opacity: heroOpacity, willChange: 'opacity' }}
      >
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center min-h-[65vh]">

            {/* Left Column - Text & Buttons */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="text-center lg:text-left order-2 lg:order-1"
              style={parallax ? { y: contentY, willChange: 'transform' } : undefined}
            >
              {/* Typing Name */}
              <motion.div variants={fadeUp} style={parallax ? { x: nameX } : undefined}>
                <h1 className="text-[clamp(1.5rem,4.4vw,3.75rem)] font-extrabold leading-[1.08] tracking-tight whitespace-nowrap">
                  <TypingName animate={ambient} />
                </h1>
              </motion.div>

              {/* Roles: plain text on one line, dot-separated, sized to fit */}
              <motion.div variants={fadeUp} className="mt-5 sm:mt-6 mb-6 sm:mb-7">
                <RoleLine roles={badges} />
              </motion.div>

              {/* Description - Dynamic rotating phrases */}
              <motion.div
                variants={fadeUp}
                className="text-[15px] sm:text-base text-muted-foreground/70 mb-9 sm:mb-10 leading-[1.7] max-w-lg mx-auto lg:mx-0 min-h-[5.1em] sm:min-h-[3.4em]"
              >
                <RotatingPhrase />
              </motion.div>

              {/* CTA Buttons - Inline on mobile, styled on desktop */}
              <motion.div
                variants={fadeUp}
                className="flex flex-row flex-wrap gap-4 sm:gap-6 items-center justify-center lg:justify-start"
              >
                <Button
                  onClick={scrollToProjects}
                  variant="ghost"
                  size="sm"
                  className="group relative bg-transparent hover:bg-transparent text-muted-foreground/70 hover:text-primary !h-auto px-0 text-xs sm:text-sm font-semibold tracking-wide transition-all duration-300"
                >
                  <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 transition-transform group-hover:rotate-[-8deg]" />
                  <span>Projects</span>
                </Button>

                <Button
                  onClick={scrollToContact}
                  variant="ghost"
                  size="sm"
                  className="group relative bg-transparent hover:bg-transparent text-muted-foreground/70 hover:text-primary !h-auto px-0 text-xs sm:text-sm font-semibold tracking-wide transition-all duration-300"
                >
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 transition-transform group-hover:scale-110" />
                  <span>Contact</span>
                </Button>

                {resumeUrl && (
                  <Button
                    onClick={handleOpenResume}
                    variant="ghost"
                    size="sm"
                    className="group relative bg-transparent hover:bg-transparent text-muted-foreground/70 hover:text-primary !h-auto px-0 text-xs sm:text-sm font-semibold tracking-wide transition-all duration-300"
                    title="View Resume"
                  >
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 transition-transform group-hover:scale-110" />
                    <span>Resume</span>
                  </Button>
                )}
              </motion.div>
            </motion.div>

            {/* Right Column - Profile Photo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={parallax ? { scale: avatarScale, y: avatarY, willChange: 'transform' } : undefined}
              className="relative flex justify-center lg:justify-end order-1 lg:order-2"
            >
              {/* Float animation wraps the portrait and its glow */}
              <motion.div
                animate={!ambient || !animationsReady ? undefined : { y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                {/* Ambient glow - breathing (static below the high tier: animating a blurred, blended layer repaints every frame) */}
                <motion.div
                  key={`glow-${rich}`}
                  animate={!rich || !animationsReady ? undefined : {
                    opacity: [0.6, 0.8, 0.6],
                    scale: [1.1, 1.25, 1.1],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, var(--avatar-glow-1), var(--avatar-glow-2), var(--avatar-glow-3), transparent 70%)',
                    filter: 'blur(60px)',
                    mixBlendMode: 'screen',
                    willChange: rich && animationsReady ? 'opacity, transform' : 'auto',
                  }}
                />
                {/* The 3D portrait, in the style picked in admin */}
                <HeroPortrait
                  photoUrl={profileImageUrl}
                  loading={loading}
                  name="Cristan Jade Jumawan"
                  role={cardRole}
                  logoUrl={hoverLogoUrl}
                  animated={ambient && animationsReady}
                  interactive={parallax}
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll Indicator - Refined */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="flex flex-col items-center mt-12 sm:mt-16 lg:mt-20 gap-2"
          >
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-muted-foreground/30 font-medium">Scroll</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="cursor-pointer w-6 h-10 rounded-full border border-border/20 flex items-start justify-center pt-2 hover:border-primary/20 transition-colors"
              onClick={() => scrollToSection("about")}
            >
              <motion.div
                animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-1 h-2 rounded-full bg-primary/50"
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom fade gradient for smooth transition to about section */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-72 sm:h-80 md:h-72 pointer-events-none z-20"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, var(--surface-bg) 80%)',
          opacity: fadeGradientOpacity,
          willChange: 'opacity'
        }}
      />
    </section>

      {/* ── Resume Preview Modal (certificate-style: zoom / pan / drag) ── */}
      <AnimatePresence>
        {isResumeModalOpen && (() => {
          const isImage = previewBlobType.startsWith('image/');

          // Handlers mirror verification modal exactly (state-based dragStart, useCallback-equivalent inline)
          const handleWheel = (e: React.WheelEvent) => {
            e.preventDefault(); e.stopPropagation();
            const next = Math.min(Math.max(resumeZoom + (e.deltaY > 0 ? -0.1 : 0.1), 1), 4);
            setResumeZoom(next);
            if (next === 1) setResumePos({ x: 0, y: 0 });
          };
          const handleMouseDown = (e: React.MouseEvent) => {
            setResumeDragging(true);
            setResumeDragStart({ x: e.clientX - resumePos.x, y: e.clientY - resumePos.y });
          };
          const handleMouseMove = (e: React.MouseEvent) => {
            if (!resumeDragging) return;
            e.preventDefault();
            setResumePos({ x: e.clientX - resumeDragStart.x, y: e.clientY - resumeDragStart.y });
          };
          const stopDrag = () => {
            setResumeDragging(false);
            setTimeout(() => setResumePos({ x: 0, y: 0 }), 50);
          };
          const zoomOut = () => { const z = Math.max(resumeZoom - 0.25, 1); setResumeZoom(z); if (z === 1) setResumePos({ x: 0, y: 0 }); };
          const zoomIn = () => setResumeZoom(Math.min(resumeZoom + 0.25, 4));

          return (
            <motion.div
              key="resume-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5"
              style={{ background: 'rgba(5, 10, 24, 0.85)' }}
              onClick={(e) => { if (e.target === e.currentTarget) { setIsResumeModalOpen(false); setResumeZoom(1); setResumePos({ x: 0, y: 0 }); } }}
            >
              {/* Blur layer — separate from card so card content is never blurred */}
              <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }} />
              <motion.div
                  key="resume-modal-content"
                  initial={{ opacity: 0, scale: 0.93, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.93, y: 20 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="relative w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-4xl flex flex-col rounded-xl sm:rounded-2xl"
                  style={{
                    background: 'var(--surface-modal)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-modal)',
                    height: 'min(85dvh, 85vh)',
                    overflow: 'hidden',
                  }}
                >
                {/* ── Header ── */}
                <div
                  className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 pointer-events-none"
                  style={{ background: 'linear-gradient(to bottom, var(--modal-header-bg, hsl(220 40% 6% / 0.95)) 0%, transparent 100%)' }}
                >
                  {/* Title */}
                  <div className="flex items-center gap-2.5 pointer-events-auto">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'hsl(202 85% 55% / 0.15)', border: '1px solid hsl(202 85% 55% / 0.25)' }}
                    >
                      <FileText className="w-3.5 h-3.5" style={{ color: 'hsl(202 85% 65%)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground/90 leading-tight">Jumawan — Resume</p>
                      <p className="text-[10px] sm:text-[11px] text-foreground/50">Cristan Jade Jumawan</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      onClick={handleModalDownload}
                      disabled={isDownloading}
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-50 active:scale-95 hover:bg-muted/10 border"
                      style={{
                        background: 'var(--modal-btn-bg)',
                        borderColor: 'var(--modal-btn-border)',
                        color: 'var(--modal-btn-text)',
                      }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isDownloading ? 'Saving…' : 'Download'}</span>
                    </button>
                    <button
                      onClick={() => { setIsResumeModalOpen(false); setResumeZoom(1); setResumePos({ x: 0, y: 0 }); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95 hover:bg-muted/10 border"
                      style={{ background: 'var(--modal-btn-bg)', borderColor: 'var(--modal-btn-border)', color: 'var(--modal-btn-text)' }}
                    >
                      <X className="w-4 h-4 text-foreground/70" />
                    </button>
                  </div>
                </div>

                {/* ── Preview area ── */}
                <div
                  ref={resumeContainerRef}
                  className={`relative flex-1 min-h-0 bg-[var(--surface-bg)] flex items-center justify-center overflow-hidden overscroll-contain ${
                    resumeDragging ? 'cursor-grabbing' : isImage ? 'cursor-grab' : 'cursor-default'
                  }`}
                  style={{ overflow: 'hidden' }}
                  onWheel={isImage ? handleWheel : undefined}
                  onMouseDown={isImage ? handleMouseDown : undefined}
                  onMouseMove={isImage ? handleMouseMove : undefined}
                  onMouseUp={isImage ? stopDrag : undefined}
                  onMouseLeave={isImage ? stopDrag : undefined}
                  onTouchStart={isImage ? (e) => {
                    if (e.touches.length === 1) {
                      setResumeDragging(true);
                      setResumeDragStart({ x: e.touches[0].clientX - resumePos.x, y: e.touches[0].clientY - resumePos.y });
                    }
                  } : undefined}
                  onTouchMove={isImage ? (e) => {
                    if (!resumeDragging || e.touches.length !== 1) return;
                    e.preventDefault();
                    setResumePos({ x: e.touches[0].clientX - resumeDragStart.x, y: e.touches[0].clientY - resumeDragStart.y });
                  } : undefined}
                  onTouchEnd={isImage ? stopDrag : undefined}
                  onDoubleClick={isImage ? () => { const next = resumeZoom > 1 ? 1 : 2; setResumeZoom(next); if (next === 1) setResumePos({ x: 0, y: 0 }); } : undefined}
                >
                  {/* Subtle radial glow */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, hsl(202 85% 30% / 0.06) 0%, transparent 70%)' }} />

                  {previewLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'hsl(202 85% 55% / 0.3)', borderTopColor: 'hsl(202 85% 65%)' }} />
                      <p className="text-xs text-foreground/50">Loading preview…</p>
                    </div>
                  ) : isImage && previewBlobUrl ? (
                    // Image resume — zoomable, draggable
                    <div
                      className="relative w-full h-full flex items-center justify-center"
                      style={{ padding: '52px 12px 48px' }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      <img
                        src={previewBlobUrl}
                        alt="Resume preview"
                        draggable={false}
                        className={`select-none max-w-full max-h-full object-contain shadow-2xl pointer-events-none ${
                          resumeDragging ? '' : 'transition-transform duration-700'
                        }`}
                        style={{
                          transform: `translate(${resumePos.x}px, ${resumePos.y}px) scale(${resumeZoom})`,
                          transformOrigin: 'center center',
                          transitionTimingFunction: resumeDragging ? 'none' : 'cubic-bezier(0.19, 1, 0.22, 1)',
                        }}
                      />
                    </div>
                  ) : (
                    // PDF — iframe (blob: URL, never blocked)
                    <iframe
                      key={previewBlobUrl || resumeUrl}
                      src={previewBlobUrl || resumeUrl}
                      className="absolute inset-0 w-full h-full"
                      style={{ border: 'none', background: '#fff' }}
                      title="Resume Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  )}

                  {/* Zoom controls — shown for images (same as certificate modal) */}
                  {isImage && !previewLoading && previewBlobUrl && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                      <button
                        type="button"
                        onClick={zoomOut}
                        className="p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 border hover:bg-muted/10"
                        style={{ background: 'var(--modal-btn-bg)', borderColor: 'var(--modal-btn-border)', color: 'var(--modal-btn-text)' }}
                        title="Zoom out"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </button>
                      <div
                        className="text-xs px-3 py-1.5 rounded-full border pointer-events-none min-w-[52px] text-center backdrop-blur-sm"
                        style={{ background: 'var(--modal-btn-bg)', borderColor: 'var(--modal-btn-border)', color: 'var(--modal-btn-text)' }}
                      >
                        {Math.round(resumeZoom * 100)}%
                      </div>
                      <button
                        type="button"
                        onClick={zoomIn}
                        className="p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 border hover:bg-muted/10"
                        style={{ background: 'var(--modal-btn-bg)', borderColor: 'var(--modal-btn-border)', color: 'var(--modal-btn-text)' }}
                        title="Zoom in"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
