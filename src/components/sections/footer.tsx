"use client";

import { Github, Linkedin, Mail, Phone } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { BrandLogo } from "@/components/ui/brand-logo";

const SITEMAP = ["Home", "About", "Skills", "Projects", "Contact"];

// No background of its own: the footer sits on the same galaxy backdrop as the sections above it, so
// every color here is a theme token (or has a light-mode override in index.css)
const link = "inline-flex items-center justify-center gap-2 transition-colors hover:text-cyan-400";

// Sized so the eight letters span the container without overflowing
const WORDMARK_SIZE = "clamp(3.25rem, 17.5vw, 30rem)";
const WORDMARK = "font-heading w-full bg-clip-text text-center font-bold leading-[0.85] tracking-[-0.02em] text-transparent";
// Gradients are arbitrary `background-image` values, not Tailwind gradient utilities: index.css recolors
// `.bg-clip-text.text-transparent` gradient stops in light mode, which would turn these blue
const BASE_FILL =
  "[background-image:linear-gradient(to_bottom,#0f172a,#94a3b8)] dark:[background-image:linear-gradient(to_bottom,#fff,#334155)]";
const SPOTLIGHT_FILL =
  "[background-image:linear-gradient(to_bottom,#0284c7,#1d4ed8)] dark:[background-image:linear-gradient(to_bottom,#38bdf8,#1d4ed8)]";
const WORDMARK_STYLE = { fontSize: WORDMARK_SIZE };

export function Footer() {
  const { scrollToTop, scrollToSection } = useSmoothScroll();
  const year = new Date().getFullYear();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlight = useMotionTemplate`radial-gradient(min(30vw, 350px) circle at ${mouseX}px ${mouseY}px, black 0%, transparent 100%)`;

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <footer className="relative overflow-hidden pb-10 pt-24 text-foreground">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="text-center md:col-span-6 md:text-left">
            <div className="flex items-center justify-center gap-3 md:justify-start">
              <BrandLogo className="h-10" />
              <span className="text-sm uppercase tracking-[0.2em] text-cyan-400">Cristan Jade Jumawan</span>
            </div>
            <p className="mx-auto mt-6 max-w-md text-lg text-muted-foreground md:mx-0">
              Crafting polished digital experiences, from pixel-perfect interfaces to robust backend systems. Open to freelance work and collaborations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16 md:col-span-6">
            {/* Connect */}
            <div className="flex flex-col items-center text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70">Connect</div>
              <ul className="mt-4 space-y-2 text-foreground/90">
                <li>
                  <a href="https://github.com/cristanjdev" target="_blank" rel="noreferrer" className={link}>
                    <Github className="h-4 w-4" /> GitHub
                  </a>
                </li>
                <li>
                  <a href="https://www.linkedin.com/in/cristan-jade-jumawan-45b27b39b" target="_blank" rel="noreferrer" className={link}>
                    <Linkedin className="h-4 w-4" /> LinkedIn
                  </a>
                </li>
                <li>
                  <a href="tel:+639617110582" className={link}>
                    <Phone className="h-4 w-4" /> <span className="hidden sm:inline">+63 961 711 0582</span>
                    <span className="sm:hidden">Call</span>
                  </a>
                </li>
                <li>
                  <a href="mailto:cristanjade14@gmail.com" className={link}>
                    <Mail className="h-4 w-4 shrink-0" /> Email
                  </a>
                </li>
              </ul>
            </div>

            {/* Sitemap */}
            <div className="flex flex-col items-center text-center">
              <div className="text-xs uppercase tracking-wider text-muted-foreground/70">Sitemap</div>
              <ul className="mt-4 space-y-2 text-foreground/90">
                {SITEMAP.map((label) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => (label === "Home" ? scrollToTop() : scrollToSection(label.toLowerCase()))}
                      className="transition-colors hover:text-cyan-400"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Wordmark: a theme-colored fade, with a sky-blue spotlight that follows the cursor */}
      <div
        aria-hidden
        className="group relative mt-20 flex w-full select-none justify-center px-4 py-4 md:px-6"
        onMouseMove={handleMouseMove}
      >
        <h2 className={`${WORDMARK} ${BASE_FILL}`} style={WORDMARK_STYLE}>
          CRISTANJ
        </h2>

        <motion.div
          className="pointer-events-none absolute inset-0 px-4 py-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:px-6"
          style={{ maskImage: spotlight, WebkitMaskImage: spotlight }}
        >
          <h2 className={`${WORDMARK} ${SPOTLIGHT_FILL}`} style={WORDMARK_STYLE}>
            CRISTANJ
          </h2>
        </motion.div>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="mt-10 text-center text-xs text-muted-foreground/70">© {year} Cristan Jade Jumawan. All rights reserved.</div>
      </div>
    </footer>
  );
}
