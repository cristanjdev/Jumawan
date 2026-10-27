"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { motion, type Variants } from "framer-motion";
import { BookOpen, Cable, KeyRound, Lightbulb, LocateFixed, MessagesSquare, Nfc, QrCode, ScanEye, Zap, type LucideIcon } from "lucide-react";
import { useSkillStore, type SkillCategory } from "@/stores/useSkillStore";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { useTechIcon } from "@/hooks/use-tech-icon";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { ProjectsModal } from "./projects-section";

// Skills that are not a product have no logo, so they get a symbol that says what they are. Each symbol is used for
// one skill only; a skill with neither a logo nor an entry here gets its own initial, never a shared placeholder.
// Names the list used earlier are kept too, so a page that still holds them in memory shows the right symbol.
const SYMBOLS: Record<string, LucideIcon> = {
  "logins & permissions": KeyRound,
  "access control": KeyRound,
  permissions: KeyRound,
  "chat assistants": MessagesSquare,
  "chat helper": MessagesSquare,
  chatbot: MessagesSquare,
  "smart suggestions": Lightbulb,
  suggestions: Lightbulb,
  "photo recognition": ScanEye,
  recognition: ScanEye,
  "qr codes": QrCode,
  "real-time updates": Zap,
  "real-time": Zap,
  rfid: Nfc,
  gps: LocateFixed,
  websockets: Cable,
  documentation: BookOpen,
};

// Logos that only come as a single-colour file: drawn through a mask so they can carry the brand colour
const TINTED_LOGOS: Record<string, { src: string; color: string }> = {
  groq: { src: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest/icons/groq.svg", color: "#F55036" },
};

// A thin edge keeps white logos (Vercel, GitHub) and pale ones (React) visible on the light theme, and black ones (Next.js) on the dark
const LOGO_EDGE =
  "[filter:drop-shadow(0_0_0.5px_rgba(15,23,42,0.9))_drop-shadow(0_0_1px_rgba(15,23,42,0.45))] dark:[filter:drop-shadow(0_0_1.5px_rgba(255,255,255,0.85))]";

/**
 * Opens a card's projects. A mouse opens it by hovering (in CSS, only on devices with a real hover) and a keyboard by focus;
 * on a touch screen a tap toggles it, and a tap anywhere else closes it. A tap is a click: a finger that moves to scroll never
 * produces one, so scrolling past a card never opens it.
 */
function useOpenOnTap() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // True from the first hover, focus or tap: the screenshots are only downloaded then, not for every card up front
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  // What started the current press: a click that came from a finger or pen toggles the card
  const pointer = useRef("mouse");

  return {
    ref,
    open,
    armed,
    onPointerEnter: (event: ReactPointerEvent) => {
      if (event.pointerType === "mouse") setArmed(true);
    },
    onFocus: () => setArmed(true),
    onPointerDown: (event: ReactPointerEvent) => {
      pointer.current = event.pointerType;
    },
    onClick: (event: ReactMouseEvent) => {
      if (pointer.current === "mouse") return;
      setArmed(true);
      // A tap on a project opens that project; only a tap on the card itself toggles it
      if (!(event.target as HTMLElement).closest("button")) setOpen((value) => !value);
    },
  };
}

function SkillChip({ skill, iconFor }: { skill: string; iconFor: (tech: string) => string | undefined }) {
  const icon = iconFor(skill);
  const tinted = TINTED_LOGOS[skill.toLowerCase()];
  const Glyph = SYMBOLS[skill.toLowerCase()];

  return (
    <li
      data-icon={icon ? "logo" : tinted ? "tinted" : Glyph ? "symbol" : "initial"}
      className="flex min-w-0 items-center justify-center gap-1.5 rounded-full px-1 py-1.5 text-center text-[clamp(0.625rem,3.4cqw,0.75rem)] font-medium leading-tight text-muted-foreground transition-colors duration-300 hover:text-foreground [@container(max-width:18.75rem)]:flex-col [@container(max-width:18.75rem)]:gap-1 [@container(max-width:18.75rem)]:px-0 [@container(max-width:18.75rem)]:text-[10.5px]"
    >
      {icon ? (
        <img src={icon} alt="" loading="lazy" decoding="async" draggable={false} className={`h-3.5 w-3.5 shrink-0 object-contain ${LOGO_EDGE}`} />
      ) : tinted ? (
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0"
          style={{
            backgroundColor: tinted.color,
            WebkitMaskImage: `url(${tinted.src})`,
            maskImage: `url(${tinted.src})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
          }}
        />
      ) : Glyph ? (
        <Glyph aria-hidden className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-300" strokeWidth={2} />
      ) : (
        <span
          aria-hidden
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] bg-cyan-500/15 text-[9px] font-bold leading-none text-cyan-700 dark:text-cyan-300"
        >
          {skill.charAt(0).toUpperCase()}
        </span>
      )}
      {skill}
    </li>
  );
}

function SkillCard({
  category,
  examples,
  iconFor,
  titleSize,
  variants,
  onOpenProject,
}: {
  category: SkillCategory;
  examples: { title: string; image?: string }[];
  iconFor: (tech: string) => string | undefined;
  titleSize: string;
  variants: Variants;
  onOpenProject: (title: string) => void;
}) {
  const { ref, open, armed, onPointerEnter, onFocus, onPointerDown, onClick } = useOpenOnTap();

  return (
    <motion.div
      ref={ref}
      data-open={open}
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      onPointerDown={onPointerDown}
      onClick={onClick}
      variants={variants}
      className="group/card relative w-full md:w-[calc((100%_-_1.5rem)/2)] xl:w-[calc((100%_-_3rem)/3)] min-[1800px]:w-[calc((100%_-_4.5rem)/4)]"
    >
      <article className="group relative flex h-full min-h-[16.5rem] flex-col items-center text-center [container-type:inline-size] rounded-2xl border border-border/50 bg-card/30 p-6 transition-all duration-500 ease-in-out [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:border-cyan-400 [@media(hover:hover)]:hover:shadow-[0_0_14px_rgba(34,211,238,0.12)] group-data-[open=true]/card:border-cyan-400 sm:p-7">
        <div className={`flex w-full items-center justify-center gap-3 [container-type:inline-size] ${examples.length > 0 ? "transition-opacity duration-500 [@media(hover:hover)]:group-hover/card:opacity-0 group-has-[:focus-visible]/card:opacity-0 group-data-[open=true]/card:opacity-0" : ""}`}>
          <category.icon className={`h-6 w-6 shrink-0 ${category.color}`} strokeWidth={1.75} />
          <h3 className="min-w-0 truncate font-semibold leading-snug tracking-tight text-foreground" style={{ fontSize: titleSize }}>
            {category.title}
          </h3>
        </div>

        {/* The card's content. On hover (a tap on a touch screen, focus from the keyboard) all of it, title included, fades
            out and the projects' screenshots fade in over the same space, so the card never changes size. */}
        <div className="flex w-full flex-1 flex-col items-center transition-opacity duration-500 [@media(hover:hover)]:group-hover/card:opacity-0 group-has-[:focus-visible]/card:opacity-0 group-data-[open=true]/card:opacity-0">
          {category.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{category.description}</p>}

          <ul className="mt-5 grid w-full grid-cols-3 gap-x-1 gap-y-2.5" aria-label={`${category.title} skills`}>
            {category.skills.map((skill) => (
              <SkillChip key={skill} skill={skill} iconFor={iconFor} />
            ))}
          </ul>
        </div>

        {examples.length > 0 && (
          <div className="pointer-events-none absolute inset-x-6 inset-y-4 flex translate-y-2 flex-col justify-center opacity-0 transition-[opacity,transform] duration-500 ease-out [@media(hover:hover)]:group-hover/card:pointer-events-auto [@media(hover:hover)]:group-hover/card:translate-y-0 [@media(hover:hover)]:group-hover/card:opacity-100 group-has-[:focus-visible]/card:pointer-events-auto group-has-[:focus-visible]/card:translate-y-0 group-has-[:focus-visible]/card:opacity-100 group-data-[open=true]/card:pointer-events-auto group-data-[open=true]/card:translate-y-0 group-data-[open=true]/card:opacity-100 sm:inset-x-8">
            {/* Small framed thumbnails, two across, the project's name beneath each. An odd last one sits centred. */}
            <ul className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              {examples.map(({ title, image }, i) => (
                <li
                  key={title}
                  className={i === examples.length - 1 && examples.length % 2 === 1 ? "col-span-2 mx-auto w-[calc(50%-0.5rem)]" : ""}
                >
                  <button
                    type="button"
                    onClick={() => onOpenProject(title)}
                    className="group/tile flex w-full flex-col items-center gap-1.5 text-center"
                  >
                    <span className="relative block aspect-[16/10] w-full max-w-[6.5rem] overflow-hidden rounded-md border border-border/60 bg-muted/20 shadow-sm transition-colors duration-300 group-hover/tile:border-cyan-400/70 group-focus-visible/tile:border-cyan-400">
                      {armed && image && (
                        <img
                          src={image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          className="absolute inset-0 h-full w-full object-cover object-top"
                        />
                      )}
                    </span>
                    <span className="line-clamp-2 min-h-[1.9em] text-[11px] font-medium leading-snug text-foreground/85 transition-colors duration-300 group-hover/tile:text-cyan-700 dark:group-hover/tile:text-cyan-300">
                      {title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </motion.div>
  );
}

// What I build, one card each: a plain-language line, the tools behind it, and projects that show it.
// A project in the "See it in" panel opens its details right here.

export function SkillsSection() {
  const { skillCategories, fetchCategories } = useSkillStore();
  const { projects, fetchProjects } = useProjectStore();
  const { scrollToSection } = useSmoothScroll();
  const iconFor = useTechIcon();
  const [openProject, setOpenProject] = useState<number | null>(null);

  useScrollLock(openProject !== null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // The Projects section loads the list too; this only covers the case where it has not yet
  useEffect(() => {
    if (projects.length === 0) fetchProjects();
  }, [projects.length, fetchProjects]);

  // Every title uses one size, worked out from the longest, so none wraps and they all match.
  // The title font runs about 0.51em per character (measured), so 0.53 leaves a small margin; the icon and its gap take 2.25rem.
  const longestTitle = useMemo(() => Math.max(1, ...skillCategories.map((c) => c.title.length)), [skillCategories]);
  const titleSize = `clamp(0.8rem, calc((100cqw - 2.25rem) / (${longestTitle} * 0.53)), 1.25rem)`;

  // A listed project that no longer exists is simply left out
  const indexByTitle = useMemo(() => new Map(projects.map((p, i) => [p.title, i])), [projects]);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.075,
      },
    },
  }), []);

  const itemVariants = useMemo<Variants>(() => ({
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.75,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  }), []);

  return (
    <section id="skills" className="py-14 sm:py-24 relative overflow-hidden">
      <div className="container px-4 md:px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
          className="max-w-6xl mx-auto"
        >
          {/* Header - Centered to match Certificates */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-12 sm:mb-16 mx-auto w-fit">
            <h2 className="text-[clamp(1.5rem,7.2vw,2.25rem)] md:text-5xl font-bold mb-4 text-center">
              <span className="text-cyan-400">My Skills</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-center font-medium">
              Turning paperwork and spreadsheets into systems people enjoy using
            </p>
          </motion.div>

          {/* Same width rule as the Projects and Certificates rows: past a 1360px screen the row grows into the free
              space (up to 300px each side), and it goes 1, 2, 3, then 4 across at 768, 1280 and 1800px, with the
              same 24px gap (3 across starts at 1280px, since a card needs that much room for its chips). A last row that is
              not full is centred. */}
          <div className="flex flex-wrap justify-center gap-6 md:[margin-inline:calc(0px_-_clamp(0px,(100vw_-_1360px)/2,300px))]">
            {skillCategories.map((category, index) => (
              <SkillCard
                key={`${category.title}-${index}`}
                category={category}
                examples={category.examples
                  .filter((title) => indexByTitle.has(title))
                  .map((title) => ({ title, image: projects[indexByTitle.get(title) ?? 0]?.image_url }))}
                iconFor={iconFor}
                titleSize={titleSize}
                variants={itemVariants}
                onOpenProject={(title) => setOpenProject(indexByTitle.get(title) ?? null)}
              />
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            variants={itemVariants}
            className="mt-16 sm:mt-20 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-6 text-center sm:text-left"
          >
            <p className="text-muted-foreground text-lg">Want to see these in action?</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => scrollToSection("projects")}
              className="px-8 py-3 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-full transition-all duration-300"
            >
              View My Projects
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <ProjectsModal
        isOpen={openProject !== null}
        onClose={() => setOpenProject(null)}
        projects={projects}
        selectedIndex={openProject}
      />
    </section>
  );
}
