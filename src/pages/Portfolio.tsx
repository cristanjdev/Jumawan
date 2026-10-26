import { Navigation } from "@/components/ui/navigation";
import { HeroSection } from "@/components/sections/hero-section";
import { AboutSection } from "@/components/sections/about-section";
import { SkillsSection } from "@/components/sections/skills-section";
import { ToolsCarousel } from "@/components/sections/tools-carousel";
import { CertificatesSection } from "@/components/sections/certificates-section-dynamic";
import { ExperienceSection } from "@/components/sections/experience-section";
import { EducationSection } from "@/components/sections/education-section";
import { ProjectsSection } from "@/components/sections/projects-section";
import { FeaturedProjectsSection } from "@/components/sections/featured-projects-section";
import { ContactSection } from "@/components/sections/contact-section-dynamic";
import { Footer } from "@/components/sections/footer";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { useMotionBudget } from "@/stores/usePerformanceStore";
import "@/styles/galaxy-background.css";


const Portfolio = () => {
  const galaxyRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  // Low tier / reduced motion: static starfield, no scroll-linked transforms
  const { parallax } = useMotionBudget();

  // Detect mobile/tablet for performance optimization
  useEffect(() => {
    const checkDevice = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const { scrollYProgress } = useScroll({
    target: galaxyRef,
    offset: ["start start", "end end"],
    layoutEffect: false
  });

  // Direct scroll transforms — no spring for better scroll performance
  const starsLayer1Y = useTransform(scrollYProgress, [0, 1], isMobile ? ["0%", "5%"] : isTablet ? ["0%", "7%"] : ["0%", "10%"]);
  const starsLayer2Y = useTransform(scrollYProgress, [0, 1], isMobile ? ["0%", "8%"] : isTablet ? ["0%", "12%"] : ["0%", "18%"]);
  const starsLayer3Y = useTransform(scrollYProgress, [0, 1], isMobile ? ["0%", "12%"] : isTablet ? ["0%", "18%"] : ["0%", "28%"]);
  const nebulaY = useTransform(scrollYProgress, [0, 1], isMobile ? ["0%", "4%"] : isTablet ? ["0%", "6%"] : ["0%", "8%"]);

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] text-foreground">
      <Navigation />

      {/* On phones the bottom tab bar is fixed over the page: leave room for it */}
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <HeroSection />

        {/* Unified Space/Galaxy Background for all sections */}
        <div ref={galaxyRef} className="relative bg-[var(--surface-bg)] -mt-px" style={{ contain: 'paint' }}>
          {/* Scroll-based Animated Stars layers */}
          {/* The stars and nebula fade in over the top of the section, so they don't start with a hard edge under the hero */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Layer 1 - Slow parallax stars */}
            <motion.div
              className="stars-layer stars-layer-1"
              style={parallax ? { y: starsLayer1Y, willChange: 'transform' } : undefined}
            />
            {/* Layer 2 - Medium parallax stars */}
            <motion.div
              className="stars-layer stars-layer-2"
              style={parallax ? { y: starsLayer2Y, willChange: 'transform' } : undefined}
            />
            {/* Layer 3 - Fast parallax stars with twinkle */}
            <motion.div
              className="stars-layer stars-layer-3"
              style={parallax ? { y: starsLayer3Y, willChange: 'transform' } : undefined}
            />

            {/* Nebula glow effects - scroll-based parallax */}
            <motion.div className="nebula-wrapper" style={parallax ? { y: nebulaY, willChange: 'transform' } : undefined}>
              <div className="nebula-glow nebula-1" />
              <div className="nebula-glow nebula-2" />
              <div className="nebula-glow nebula-3" />
              <div className="nebula-glow nebula-4" />
            </motion.div>

            {/* Fades the stars in under the hero. A gradient over them rather than a mask, which would be re-blended every frame */}
            <div className="absolute inset-x-0 top-0 h-[clamp(160px,28vh,320px)] bg-gradient-to-b from-[var(--surface-bg)] to-transparent" />
          </div>

          {/* Content sections - seamless flow */}
          <div className="relative z-10">
            <AboutSection />
            <FeaturedProjectsSection />
            <SkillsSection />
            <ToolsCarousel />
            <CertificatesSection />
            <ExperienceSection />
            <EducationSection />
            <ProjectsSection />
            <ContactSection />
            <Footer />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Portfolio;