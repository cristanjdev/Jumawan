"use client";

import { Github, Linkedin, Mail, ArrowUp } from "lucide-react";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { BrandLogo } from "@/components/ui/brand-logo";

export function Footer() {
  const { scrollToTop, scrollToSection } = useSmoothScroll();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[var(--surface-nav)]/80 backdrop-blur-md shadow-lg text-muted-foreground border-t border-border/20">
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      <div className="container mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <BrandLogo className="h-9" />
              <span className="text-lg font-bold text-cyan-400">Jumawan Portfolio</span>
            </div>
            <p className="mt-4 text-sm leading-6">
              Crafting clean, performant web experiences with modern tools and thoughtful design.
            </p>

            <div className="mt-6 flex items-center justify-center md:justify-start gap-5">
              <a
                href="https://github.com/cristanjdev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-muted-foreground hover:text-cyan-400 transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/cristan-jade-jumawan-45b27b39b"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-muted-foreground hover:text-cyan-400 transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="mailto:cristanjade14@gmail.com"
                aria-label="Email"
                className="text-muted-foreground hover:text-cyan-400 transition-colors"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>

            {/* availability status */}
            <div className="mt-4 inline-flex items-center justify-center md:justify-start gap-2 rounded-full border border-border/20 bg-muted/10 px-3 py-1 text-xs text-foreground/90">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Available for opportunities
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <p className="text-cyan-400 font-semibold tracking-wide">Quick Links</p>
            <ul className="mt-6 flex flex-wrap justify-center md:block space-x-4 md:space-x-0 md:space-y-3 text-sm">
              {["Home", "About", "Skills", "Projects", "Contact"].map((label) => (
                <li key={label}>
                  <button
                    onClick={() => label === "Home" ? scrollToTop() : scrollToSection(label.toLowerCase())}
                    className="hover:text-cyan-400 transition-colors"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="text-center md:text-left">
            <p className="text-cyan-400 font-semibold tracking-wide">Resources</p>
            <ul className="mt-6 flex flex-wrap justify-center md:block space-x-4 md:space-x-0 md:space-y-3 text-sm">
              <li>
                <a href="#privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="#terms" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
              </li>
              <li>
                <a href="#support" className="hover:text-cyan-400 transition-colors">Support</a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="text-center md:text-left">
            <p className="text-cyan-400 font-semibold tracking-wide">Contact</p>
            <ul className="mt-6 flex flex-col items-center md:items-start space-y-3 text-sm">
              <li>
                <a href="mailto:cristanjade14@gmail.com" className="hover:text-cyan-400 transition-colors">cristanjade14@gmail.com</a>
              </li>
              <li>
                <a href="tel:+639617110582" className="hover:text-cyan-400 transition-colors">+63 961 711 0582</a>
              </li>
              <li className="text-foreground/80 max-w-[200px] md:max-w-none mx-auto md:mx-0">
                Zone 2-A Looc, Igpit Opol Misamis Oriental
              </li>
              <li className="text-cyan-400/80 pt-2 font-medium">Open to freelance and collabs</li>
            </ul>
          </div>


        </div>

        {/* bottom bar */}
        <div className="mt-12 flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs md:text-sm text-center md:text-left">© {currentYear} Cristan Jade Jumawan. All rights reserved.</p>

          <button
            type="button"
            aria-label="Back to top"
            onClick={() => scrollToTop()}
            className="inline-flex items-center gap-2 text-xs md:text-sm text-muted-foreground hover:text-cyan-400 transition-colors"
          >
            <ArrowUp className="h-4 w-4" />
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}


