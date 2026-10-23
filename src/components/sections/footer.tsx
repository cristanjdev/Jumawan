"use client";

import { Github, Linkedin, Mail, Phone } from "lucide-react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";

const SITEMAP = ["Home", "About", "Skills", "Projects", "Contact"];

// The footer stays dark in both themes, so it uses fixed colors (and arbitrary values, which the
// light-mode `.text-white` override in index.css leaves alone)
const link = "inline-flex items-center justify-center gap-2 transition-colors hover:text-sky-400 md:justify-start";

// Sized so the eight letters span the container without overflowing
const WORDMARK_SIZE = "clamp(3.25rem, 17.5vw, 30rem)";
const WORDMARK = "font-heading w-full bg-clip-text text-center font-bold leading-[0.85] tracking-[-0.02em] text-transparent";
// Set inline: index.css recolors `.bg-clip-text.text-transparent` gradients in light mode, which would turn this blue
const BASE_FILL = { backgroundImage: "linear-gradient(to bottom, #fff, #334155)", fontSize: WORDMARK_SIZE };
const SPOTLIGHT_FILL = { backgroundImage: "linear-gradient(to bottom, #38bdf8, #1d4ed8)", fontSize: WORDMARK_SIZE };

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
    <footer className="relative overflow-hidden bg-[#020617] pb-10 pt-24 text-[#fff]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="text-center md:col-span-6 md:text-left">
            <div className="flex items-center justify-center gap-3 md:justify-start">
              <img src="/cj-logo-white.svg" alt="CJ logo" width={616} height={606} loading="lazy" decoding="async" draggable={false} className="h-10 w-auto select-none" />
              <span className="text-sm uppercase tracking-[0.2em] text-sky-400">CRISTANJ</span>
            </div>
            <p className="mx-auto mt-6 max-w-md text-lg text-slate-300 md:mx-0">
              Crafting polished digital experiences, from pixel-perfect interfaces to robust backend systems. Open to freelance work and collaborations.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16 md:col-span-6">
            {/* Connect */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <div className="text-xs uppercase tracking-wider text-slate-500">Connect</div>
              <ul className="mt-4 space-y-2 text-slate-200">
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
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <div className="text-xs uppercase tracking-wider text-slate-500">Sitemap</div>
              <ul className="mt-4 space-y-2 text-slate-200">
                {SITEMAP.map((label) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => (label === "Home" ? scrollToTop() : scrollToSection(label.toLowerCase()))}
                      className="transition-colors hover:text-sky-400"
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

      {/* Wordmark: white to slate, with a sky-blue spotlight that follows the cursor */}
      <div
        aria-hidden
        className="group relative mt-20 flex w-full select-none justify-center px-4 py-4 md:px-6"
        onMouseMove={handleMouseMove}
      >
        <h2 className={WORDMARK} style={BASE_FILL}>
          CRISTANJ
        </h2>

        <motion.div
          className="pointer-events-none absolute inset-0 px-4 py-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:px-6"
          style={{ maskImage: spotlight, WebkitMaskImage: spotlight }}
        >
          <h2 className={WORDMARK} style={SPOTLIGHT_FILL}>
            CRISTANJ
          </h2>
        </motion.div>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-slate-500 md:flex-row">
          <div>© {year} Cristan Jade Jumawan. All rights reserved.</div>
          <div>Built with care · React · Vite · Lenis · Framer Motion</div>
        </div>
      </div>
    </footer>
  );
}
