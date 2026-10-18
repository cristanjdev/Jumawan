"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Github, Linkedin, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { useThemeStore } from "@/stores/useThemeStore";
import { BrandLogo } from "@/components/ui/brand-logo";

const navigationItems = [
  { name: "Home", href: "#home" },
  { name: "About", href: "#about" },
  { name: "Projects", href: "#projects" },
  { name: "Contact", href: "#contact" },
];



export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollToSection: smoothScrollTo, scrollToTop } = useSmoothScroll();
  const { theme, toggleTheme } = useThemeStore();

  // When a nav link is clicked, lock the active section so scroll events
  // don't cause the indicator to jump through intermediate sections.
  const scrollLockRef = useRef(false);

  useEffect(() => {
    let ticking = false;

    const updateOnScroll = () => {
      const scrolled = window.scrollY > 50;
      if (scrolled !== isScrolled) setIsScrolled(scrolled);

      // Skip section detection while a programmatic scroll is in progress
      if (scrollLockRef.current) {
        ticking = false;
        return;
      }

      const sections = navigationItems.map(item => item.href.substring(1));
      const scrollPosition = window.scrollY + 150;

      let currentSection = "home";
      for (const section of sections) {
        const element = document.getElementById(section);
        if (!element) continue;

        const offsetTop = element.getBoundingClientRect().top + window.scrollY;
        if (scrollPosition >= offsetTop) currentSection = section;
      }

      if (currentSection !== activeSection) setActiveSection(currentSection);
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateOnScroll);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run once on mount to initialize state correctly
    updateOnScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSection, isScrolled]);

  const scrollToSection = (href: string) => {
    const sectionId = href.substring(1);

    const performScroll = () => {
      // Immediately set the active section and lock it
      setActiveSection(sectionId);
      scrollLockRef.current = true;

      if (sectionId === "home") {
        scrollToTop();
      } else {
        smoothScrollTo(sectionId);
      }

      // Unlock after the scroll animation finishes so normal
      // scroll-based detection resumes.
      setTimeout(() => {
        scrollLockRef.current = false;
      }, 1200);
    };

    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
      setTimeout(performScroll, 300);
    } else {
      performScroll();
    }
  };

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, type: "spring", stiffness: 80, damping: 20 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled || isMobileMenuOpen
          ? "bg-[var(--surface-nav)] backdrop-blur-md shadow-lg py-2"
          : "bg-transparent py-3 sm:py-4"
      )}
      style={{ transform: "translateZ(0)", willChange: "transform" }}
    >
      <nav className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-auto">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="select-none group"
          >
            <BrandLogo className="block h-9 sm:h-10 md:h-11 object-contain transition duration-300 dark:drop-shadow-[0_0_10px_rgba(56,189,248,0.45)] dark:group-hover:drop-shadow-[0_0_16px_rgba(56,189,248,0.75)] group-hover:brightness-110" />
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <button
                key={item.name}
                onClick={() => scrollToSection(item.href)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary relative group",
                  activeSection === item.href.substring(1)
                    ? "text-primary"
                    : "text-foreground/80"
                )}
              >
                {item.name}
                <span className={cn(
                  "absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full",
                  activeSection === item.href.substring(1) && "w-full"
                )} />
              </button>
            ))}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="text-foreground/70 hover:text-primary transition-colors duration-300"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Social Icons */}
            <div className="flex items-center space-x-4 ml-2 border-l border-border/20 pl-6">
              <a
                href="https://github.com/cristanjdev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-foreground/70 hover:text-primary transition-colors duration-300"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/cristan-jade-jumawan-45b27b39b"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-foreground/70 hover:text-primary transition-colors duration-300"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Mobile: Theme Toggle + Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="text-foreground hover:text-primary transition-colors"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              className="text-foreground hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ 
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.3 }
            }}
            className="md:hidden bg-[var(--surface-nav)] backdrop-blur-md border-t border-border/20 overflow-hidden"
          >
            <motion.div 
              className="container mx-auto px-4 sm:px-6 py-6"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ 
                duration: 0.3,
                delay: 0.1,
                ease: [0.4, 0, 0.2, 1]
              }}
            >
              {/* Navigation Links and Social Icons in Row */}
              <div className="flex flex-wrap items-center justify-center gap-4">
                {navigationItems.map((item, index) => (
                  <motion.button
                    key={item.name}
                    onClick={() => scrollToSection(item.href)}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ 
                      duration: 0.3,
                      delay: 0.1 + (index * 0.05),
                      ease: [0.4, 0, 0.2, 1]
                    }}
                    className={cn(
                      "px-4 py-2 h-10 text-sm font-medium transition-all duration-300 rounded-lg border flex items-center justify-center",
                      activeSection === item.href.substring(1)
                        ? "text-primary border-primary/40 bg-primary/10"
                        : "text-foreground/80 border-border/20 hover:text-primary hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    {item.name}
                  </motion.button>
                ))}

                {/* Social Icons */}
                <motion.a
                  href="https://github.com/cristanjdev"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.3,
                    delay: 0.1 + (navigationItems.length * 0.05),
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  className="px-4 py-2 h-10 text-sm font-medium transition-all duration-300 rounded-lg border text-foreground/80 border-border/20 hover:text-primary hover:border-primary/30 hover:bg-primary/5 flex items-center justify-center"
                >
                  <Github className="h-4 w-4" />
                </motion.a>
                <motion.a
                  href="https://www.linkedin.com/in/cristan-jade-jumawan-45b27b39b"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ 
                    duration: 0.3,
                    delay: 0.1 + ((navigationItems.length + 1) * 0.05),
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  className="px-4 py-2 h-10 text-sm font-medium transition-all duration-300 rounded-lg border text-foreground/80 border-border/20 hover:text-primary hover:border-primary/30 hover:bg-primary/5 flex items-center justify-center"
                >
                  <Linkedin className="h-4 w-4" />
                </motion.a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}


