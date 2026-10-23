import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectStore, Project } from "@/stores/useProjectStore";
import { ProjectCard } from "./ProjectCard";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { convexClient } from '@/lib/convexClient';
import { api } from '../../../convex/_generated/api';
import { Button } from "@/components/ui/button";
import { TechIcons } from "@/components/ui/tech-icons";
import { useTechIcon } from "@/hooks/use-tech-icon";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ExternalLink, FolderOpen, Github, Search } from "lucide-react";
import { DetailBlock, DetailDialog, TagList } from "@/components/ui/detail-card";
import { useLatest } from "@/hooks/use-latest";
import { useLenis } from "lenis/react";

export function ProjectsSection() {
  const shouldReduceMotion = useReducedMotion();
  const { projects, loading, fetchProjects } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [showAllModal, setShowAllModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const savedScrollLeft = useRef(0);

  useEffect(() => {
    fetchProjects();
    trackPageView();
  }, []);

  // Restore scroll position after projects re-render
  useEffect(() => {
    if (scrollRef.current && projects.length > 0 && savedScrollLeft.current > 0) {
      scrollRef.current.scrollLeft = savedScrollLeft.current;
    }
  }, [projects]);

  const [cardsPerPage, setCardsPerPage] = useState(3);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setCardsPerPage(width < 768 ? 1 : width < 1024 ? 2 : 3);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const totalPages = Math.ceil(projects.length / cardsPerPage);
  const currentPage = Math.floor(currentCard / cardsPerPage);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || projects.length === 0) return;
    const el = scrollRef.current;
    savedScrollLeft.current = el.scrollLeft;
    const cardWidth = el.scrollWidth / projects.length;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setCurrentCard(Math.max(0, Math.min(idx, projects.length - 1)));
  }, [projects.length]);

  const scrollToCard = (idx: number) => {
    if (!scrollRef.current || projects.length === 0) return;
    const clamped = Math.max(0, Math.min(idx, projects.length - 1));
    const el = scrollRef.current;
    const cardWidth = el.scrollWidth / projects.length;
    el.scrollTo({ left: cardWidth * clamped, behavior: 'smooth' });
  };

  const scrollToPage = (page: number) => {
    scrollToCard(page * cardsPerPage);
  };

  const goToPrevPage = () => { if (currentPage > 0) scrollToPage(currentPage - 1); };
  const goToNextPage = () => { if (currentPage < totalPages - 1) scrollToPage(currentPage + 1); };

  // Drag/swipe handling — works for both mouse (desktop) and touch (mobile)
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const dragStartCard = useRef(0);
  const momentumRaf = useRef<number>(0);

  const startDrag = (clientX: number) => {
    if (!scrollRef.current) return;
    cancelAnimationFrame(momentumRaf.current);
    isDragging.current = true;
    hasDragged.current = false;
    dragStartX.current = clientX;
    dragScrollLeft.current = scrollRef.current.scrollLeft;
    dragStartCard.current = currentCard;
    scrollRef.current.style.scrollSnapType = 'none';
    scrollRef.current.style.scrollBehavior = 'auto';
    if (!isMobile) scrollRef.current.style.cursor = 'grabbing';
  };

  const moveDrag = (clientX: number) => {
    if (!isDragging.current || !scrollRef.current) return;
    const walk = clientX - dragStartX.current;
    if (Math.abs(walk) > 5) hasDragged.current = true;
    scrollRef.current.scrollLeft = dragScrollLeft.current - walk;
  };

  const endDrag = (clientX: number) => {
    if (!isDragging.current || !scrollRef.current) return;
    isDragging.current = false;
    const el = scrollRef.current;
    el.style.cursor = '';
    el.style.scrollSnapType = '';
    el.style.scrollBehavior = '';

    const swipeDist = clientX - dragStartX.current;
    const threshold = 30; // px — sensitive swipe
    const startPage = Math.floor(dragStartCard.current / cardsPerPage);

    if (Math.abs(swipeDist) > threshold) {
      // Swiped far enough — commit to next/prev page
      const targetPage = swipeDist < 0
        ? Math.min(startPage + 1, totalPages - 1)
        : Math.max(startPage - 1, 0);
      scrollToPage(targetPage);
    } else {
      // Didn't swipe far enough — snap back to original page
      scrollToPage(startPage);
    }
  };

  // Mouse events (desktop)
  const onMouseDown = (e: ReactMouseEvent) => {
    if (isMobile) return;
    startDrag(e.pageX);
  };
  const onMouseMove = (e: ReactMouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    moveDrag(e.pageX);
  };
  const onMouseUp = (e: ReactMouseEvent) => {
    endDrag(e.pageX);
  };

  // Touch events (mobile) — override CSS snap for controlled swiping
  const onTouchStart = (e: React.TouchEvent) => {
    startDrag(e.touches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    moveDrag(e.touches[0].clientX);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    endDrag(e.changedTouches[0].clientX);
  };

  const trackPageView = async () => {
    try {
      await convexClient.mutation(api.analytics.track, {
        event_type: 'page_view',
        page_url: '/projects',
        event_data: { section: 'projects' },
      });
    } catch (error) {
      console.warn('Analytics tracking error:', error);
    }
  };

  const openModalAt = useCallback((index: number) => {
    setSelectedIndex(index);
    setIsModalOpen(true);
  }, []);

  const safeOpenModal = useCallback((index: number) => {
    if (hasDragged.current) { hasDragged.current = false; return; }
    openModalAt(index);
  }, [openModalAt]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => { setSelectedIndex(null); }, 150);
  }, []);

  const showPrev = useCallback(() => {
    if (selectedIndex === null || projects.length === 0) return;
    setSelectedIndex((prev) => (Number(prev) - 1 + projects.length) % projects.length);
  }, [selectedIndex, projects.length]);

  const showNext = useCallback(() => {
    if (selectedIndex === null || projects.length === 0) return;
    setSelectedIndex((prev) => (Number(prev) + 1) % projects.length);
  }, [selectedIndex, projects.length]);

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); showPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); showNext(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, showPrev, showNext]);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6, staggerChildren: shouldReduceMotion ? 0 : 0.18 } },
  }), [shouldReduceMotion]);

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24, scale: shouldReduceMotion ? 1 : 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: shouldReduceMotion ? 0.45 : 0.75, ease: [0.4, 0, 0.2, 1] as const } },
  }), [shouldReduceMotion]);

  // --- Shared mobile card renderer ---
  const renderMobileCard = (project: Project, index: number) => (
    <div
      onClick={() => safeOpenModal(index)}
      className="h-full relative border border-border/50 rounded-xl transition-all duration-500 ease-in-out hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)] overflow-hidden cursor-pointer group"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/5 flex items-center justify-center">
        {project.image_url ? (
          <>
            <OptimizedImage
              src={project.image_url}
              alt={project.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              draggable={false}
              fallbackIcon={<FolderOpen className="w-12 h-12 text-muted-foreground/30" />}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-overlay-from)] via-transparent to-transparent" />
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-muted-foreground/20 group-hover:text-primary/30 transition-colors duration-500">
            <FolderOpen className="w-16 h-16" />
            <span className="text-[10px] font-medium opacity-50 uppercase tracking-widest">No Preview</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 text-center">
        <h3 className="text-base font-semibold text-foreground leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
          {project.title}
        </h3>
        <p className="text-xs text-muted-foreground/60 leading-relaxed line-clamp-2">{project.description}</p>
        <TechIcons technologies={project.technologies} className="justify-center" />
        <p className="text-[10px] text-primary/60 italic">Tap to view details</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <section id="projects" className="py-20 bg-transparent relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center mb-16 mx-auto w-fit">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
              <span className="text-cyan-400">Featured Projects</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center font-medium">
              A showcase of my best work and creative solutions
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-full bg-gradient-card border-border/20 shadow-card overflow-hidden rounded-xl">
                <div className="relative h-48 w-full"><div className="absolute inset-0 bg-muted/5 animate-pulse" /></div>
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted/5 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-6 w-3/5 bg-muted/5 animate-pulse rounded-md" />
                      <div className="h-4 w-2/5 bg-muted/5 animate-pulse rounded-md" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-muted/5 animate-pulse rounded-md" />
                    <div className="h-4 w-5/6 bg-muted/5 animate-pulse rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="projects" className="py-20 bg-transparent relative overflow-hidden border-none outline-none">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-16 mx-auto w-fit">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
              <span className="text-cyan-400">Featured Projects</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center font-medium">
              A showcase of my best work and creative solutions
            </p>
          </motion.div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No projects yet</h3>
              <p className="text-muted-foreground">Featured projects will be displayed here once added</p>
            </div>
          ) : (
            <>
              {/* See All button */}
              {projects.length > 0 && (
                <motion.div variants={itemVariants} className="flex justify-center mb-6 sm:mb-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllModal(true)}
                    className="border-border/40 hover:border-cyan-400/40 hover:bg-cyan-400/5 text-muted-foreground hover:text-cyan-400 transition-all duration-300 text-xs sm:text-sm"
                  >
                    <FolderOpen className="h-3.5 w-3.5 mr-2" />
                    See All {projects.length} Projects
                  </Button>
                </motion.div>
              )}

              {/* Unified swipeable carousel — 1 card mobile, 2 tablet, 3 desktop */}
              <motion.div variants={itemVariants} className="relative overflow-hidden -mx-6">
                <div
                  ref={scrollRef}
                  onScroll={handleScroll}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                  className={`flex gap-4 md:gap-6 overflow-x-auto pb-4 scroll-smooth ${!isMobile ? 'cursor-grab' : ''}`}
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y',
                    overscrollBehaviorX: 'contain',
                    overscrollBehaviorY: 'auto',
                    paddingLeft: isMobile ? 'calc((100vw - min(80vw, 340px)) / 2)' : '24px',
                    paddingRight: isMobile ? 'calc((100vw - min(80vw, 340px)) / 2)' : '24px',
                  }}
                >
                  {projects.map((project, index) => (
                    <div
                      key={project.id}
                      className="shrink-0"
                      style={{ width: isMobile ? 'min(80vw, 340px)' : `calc((100% - ${(cardsPerPage - 1) * 24}px) / ${cardsPerPage})` }}
                    >
                      {isMobile ? renderMobileCard(project, index) : (
                        <ProjectCard project={project} index={index} openModalAt={safeOpenModal} />
                      )}
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-2 mt-4">
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Go to page ${i + 1}`}
                          onClick={() => scrollToPage(i)}
                          className={`rounded-full transition-all duration-300 ${i === currentPage ? "w-6 h-2 bg-cyan-400" : "w-2 h-2 bg-border/20 hover:bg-border/40"}`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground/40 italic">{isMobile ? 'Swipe' : 'Drag'} to explore · {currentPage + 1} / {totalPages}</span>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Project detail modal */}
        <ProjectsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          projects={projects}
          selectedIndex={selectedIndex}
        />

        {/* See All modal */}
        <SeeAllProjectsModal
          isOpen={showAllModal}
          onOpenChange={setShowAllModal}
          projects={projects}
          onSelect={(index) => { openModalAt(index); }}
        />
      </div>
    </section>
  );
}

// See All Projects Modal
function SeeAllProjectsModal({
  isOpen,
  onOpenChange,
  projects,
  onSelect,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onSelect: (index: number) => void;
}) {
  const lenis = useLenis();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      lenis?.stop();
      document.body.style.overflow = 'hidden';
    } else {
      lenis?.start();
      document.body.style.overflow = '';
    }
    return () => {
      lenis?.start();
      document.body.style.overflow = '';
    };
  }, [isOpen, lenis]);

  // Start from the full list every time the modal opens
  useEffect(() => {
    if (isOpen) { setQuery(""); setCategory("All"); }
  }, [isOpen]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => { if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1); });
    return [["All", projects.length] as const, ...Array.from(counts.entries()).sort((a, b) => b[1] - a[1])];
  }, [projects]);

  // Keep each project's index in the full list: that is what the detail modal opens
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .map((project, index) => ({ project, index }))
      .filter(({ project }) => category === "All" || project.category === category)
      .filter(({ project }) => !q || [project.title, project.description, project.category, ...project.technologies].some((t) => t?.toLowerCase().includes(q)));
  }, [projects, query, category]);

  useEffect(() => { gridRef.current?.scrollTo({ top: 0 }); }, [query, category]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl border-[var(--border-subtle)] bg-[var(--surface-modal)] backdrop-blur-2xl !p-0 !gap-0 [&>button]:z-20 rounded-2xl md:rounded-3xl shadow-2xl">
        <div className="flex flex-col h-[85svh] md:h-[82vh] overflow-hidden rounded-2xl md:rounded-3xl" data-lenis-prevent>
          <div className="relative shrink-0 space-y-4 px-5 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-[var(--border-subtle)] bg-[var(--surface-bg-alt)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-accent/40 to-transparent rounded-t-2xl md:rounded-t-3xl" />
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                All Projects <span className="font-medium text-muted-foreground/60">({projects.length})</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide sm:pb-0" role="tablist" aria-label="Filter projects by type">
                {categories.map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={category === name}
                    onClick={() => setCategory(name)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      category === name
                        ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-300"
                        : "border-border/50 text-muted-foreground hover:border-cyan-400/40 hover:text-foreground"
                    }`}
                  >
                    {name} <span className="opacity-60">{count}</span>
                  </button>
                ))}
              </div>

              <div className="relative sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search projects or tech"
                  aria-label="Search projects"
                  className="h-9 w-full rounded-lg border border-border/50 bg-background/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-cyan-400/60 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div
            ref={gridRef}
            className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-6 bg-[var(--surface-bg-alt)] overscroll-contain scroll-smooth scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            {visible.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground/70">No projects match your search.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-12">
                {visible.map(({ project, index }) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => onSelect(index)}
                    className="group flex flex-col text-left rounded-xl border border-border/40 overflow-hidden hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all duration-500 bg-background/40 backdrop-blur-sm"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/10">
                      {project.image_url ? (
                        <OptimizedImage
                          src={project.image_url}
                          alt={project.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          draggable={false}
                          fallbackIcon={<FolderOpen className="h-8 w-8 text-muted-foreground/30" />}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderOpen className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-foreground leading-tight line-clamp-2 group-hover:text-cyan-400 transition-colors duration-300">
                          {project.title}
                        </p>
                        {(project.category || project.year) && (
                          <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground/60">
                            {[project.category, project.year].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <TechIcons technologies={project.technologies} limit={7} className="mt-auto" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Project detail modal
export function ProjectsModal({
  isOpen,
  onClose,
  projects,
  selectedIndex,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  selectedIndex: number | null;
}) {
  // Hold on to the last project while closing so the exit animation still has content
  const project = useLatest(selectedIndex !== null ? projects[selectedIndex] ?? null : null);
  const techIcon = useTechIcon();
  if (!project) return null;

  const about = project.about?.split(/\n{2,}/).filter(Boolean) ?? [];
  const linkClass =
    "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-primary ring-1 ring-inset ring-primary/30 transition-colors hover:bg-primary/10";

  return (
    <DetailDialog
      open={isOpen}
      onClose={onClose}
      onCloseAutoFocus={() => {}}
      title={project.title}
      subtitle={project.category ?? "Project"}
      badge={
        (project.live_url || project.github_url) && (
          <span className="inline-flex items-center gap-2">
            {project.live_url && (
              <a href={project.live_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                <ExternalLink className="h-3.5 w-3.5" />
                Live demo
              </a>
            )}
            {project.github_url && (
              <a href={project.github_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                <Github className="h-3.5 w-3.5" />
                Source
              </a>
            )}
          </span>
        )
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8">
        {/* Image with the tech stack under it; the stack sits at the bottom so both columns end together */}
        <div className="flex flex-col gap-5">
          <div className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl bg-muted/10 ring-1 ring-border/40">
            {project.image_url ? (
              <OptimizedImage
                src={project.image_url}
                alt={project.title}
                className="h-full w-full select-none object-contain"
                draggable={false}
                fallbackIcon={<FolderOpen className="h-12 w-12 text-muted-foreground/30" />}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
                <FolderOpen className="h-12 w-12" strokeWidth={1.5} />
                <span className="text-[10px] font-medium uppercase tracking-widest">No Preview</span>
              </div>
            )}
          </div>

          {project.technologies.length > 0 && (
            <DetailBlock title="Tech stack" className="mt-auto">
              <TagList items={project.technologies} icon={techIcon} />
            </DetailBlock>
          )}
        </div>

        <DetailBlock title="About this project">
          <p className="text-sm font-medium leading-relaxed text-foreground">{project.description}</p>
          {about.length > 0 && (
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {about.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          )}
        </DetailBlock>
      </div>

    </DetailDialog>
  );
}
