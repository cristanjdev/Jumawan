"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Github, Linkedin, Sun, Moon, Home, User, FolderKanban, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { useThemeStore } from "@/stores/useThemeStore";
import { BrandLogo } from "@/components/ui/brand-logo";

const navigationItems = [
  { name: "Home", href: "#home", icon: Home },
  { name: "About", href: "#about", icon: User },
  { name: "Projects", href: "#projects", icon: FolderKanban },
  { name: "Contact", href: "#contact", icon: Mail },
];



export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
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

    performScroll();
  };

  return (
    <>
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, type: "spring", stiffness: 80, damping: 20 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-[var(--surface-nav)] backdrop-blur-md shadow-lg py-0 md:py-2"
          : "bg-transparent py-0 md:py-4"
      )}
      style={{ transform: "translateZ(0)", willChange: "transform" }}
    >
      <nav className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-auto">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="select-none group"
          >
            <BrandLogo className="block h-9 md:h-11 object-contain transition duration-300 dark:drop-shadow-[0_0_10px_rgba(56,189,248,0.45)] dark:group-hover:drop-shadow-[0_0_16px_rgba(56,189,248,0.75)] group-hover:brightness-110" />
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

          {/* Mobile: just the theme toggle; the sections are in the bottom bar */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="md:hidden -mr-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:text-primary"
          >
            {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
          </button>
        </div>
      </nav>

    </motion.header>

    {/* Mobile: a bottom tab bar with the sections, like an app; clears Android's gesture area */}
    <motion.nav
      aria-label="Sections"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, type: "spring", stiffness: 80, damping: 20 }}
      className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border/20 bg-[var(--surface-nav)] backdrop-blur-md shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.35)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch">
        {navigationItems.map((item) => {
          const active = activeSection === item.href.substring(1);
          const Icon = item.icon;
          return (
            <li key={item.name} className="flex-1">
              <button
                onClick={() => scrollToSection(item.href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-foreground/60 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {item.name}
              </button>
            </li>
          );
        })}
      </ul>
    </motion.nav>
    </>
  );
}


