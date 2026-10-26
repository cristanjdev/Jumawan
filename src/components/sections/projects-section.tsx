import { BrowseCard, BrowseDialog } from "@/components/ui/browse-dialog";
import { useProjectStore, Project } from "@/stores/useProjectStore";
import { ProjectCard } from "./ProjectCard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { convexClient } from '@/lib/convexClient';
import { api } from '../../../convex/_generated/api';
import { Button } from "@/components/ui/button";
import { TechIcons } from "@/components/ui/tech-icons";
import { CarouselProgress } from "@/components/ui/carousel-progress";
import { useDragCarousel } from "@/hooks/use-drag-carousel";
import { useTechIcon } from "@/hooks/use-tech-icon";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import { ExternalLink, FolderOpen, Github } from "lucide-react";
import { DetailBlock, DetailDialog, TagList } from "@/components/ui/detail-card";
import { useLatest } from "@/hooks/use-latest";
import { useLenis } from "lenis/react";

export function ProjectsSection() {
  const shouldReduceMotion = useReducedMotion();
  const { projects, loading, fetchProjects } = useProjectStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showAllModal, setShowAllModal] = useState(false);

  useEffect(() => {
    fetchProjects();
    trackPageView();
  }, []);

  // The row loops and turns a page on its own; it waits while a dialog is open
  const { scrollRef, handlers, layout, slots, isMobile, totalPages, currentPage, scrollToPage, consumeDrag } = useDragCarousel(projects.length, {
    paused: isModalOpen || showAllModal,
  });

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
    if (consumeDrag()) return;
    openModalAt(index);
  }, [openModalAt, consumeDrag]);

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
      className="h-full relative flex flex-col border border-border/50 rounded-xl transition-all duration-500 ease-in-out hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)] overflow-hidden cursor-pointer group"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted/5 flex items-center justify-center">
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

      {/* Every block has a fixed height (two lines of title and description, one row of icons), so the cards in a
          row are the same height without leftover space under the shorter ones */}
      <div className="flex flex-1 flex-col gap-3 p-4 text-center">
        <h3 className="min-h-[2.5em] text-base font-semibold text-foreground leading-tight group-hover:text-primary transition-colors duration-300 line-clamp-2">
          {project.title}
        </h3>
        <p className="min-h-[3.25em] text-xs text-muted-foreground/60 leading-relaxed line-clamp-2">{project.description}</p>
        <TechIcons technologies={project.technologies} fit className="justify-center" />
        <p className="mt-auto text-[10px] text-primary/60 italic">Tap to view details</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <section id="projects" className="py-12 sm:py-20 bg-transparent relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center mb-16 mx-auto w-fit">
            <h2 className="text-[clamp(1.5rem,7.2vw,2.25rem)] md:text-5xl font-bold mb-4 text-center">
              <span className="text-cyan-400">All Projects</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-center font-medium">
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
    <section id="projects" className="py-12 sm:py-20 bg-transparent relative overflow-hidden border-none outline-none">
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-16 mx-auto w-fit">
            <h2 className="text-[clamp(1.5rem,7.2vw,2.25rem)] md:text-5xl font-bold mb-4 text-center">
              <span className="text-cyan-400">All Projects</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto text-center font-medium">
              A showcase of my best work and creative solutions
            </p>
          </motion.div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No projects yet</h3>
              <p className="text-muted-foreground">Projects will be displayed here once added</p>
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
                    View {projects.length} Projects
                  </Button>
                </motion.div>
              )}

              {/* Draggable, looping carousel: 1 card on phones, 2 on tablets, 3 on desktop, 4 on very wide screens */}
              <motion.div
                variants={itemVariants}
                className="relative overflow-hidden -mx-6"
                style={layout.wrapStyle}
              >
                <div
                  ref={scrollRef}
                  {...handlers}
                  className={`flex gap-4 md:gap-6 overflow-x-auto pb-4 ${!isMobile ? 'cursor-grab' : ''}`}
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y',
                    overscrollBehaviorX: 'contain',
                    overscrollBehaviorY: 'auto',
                    ...layout.rowStyle,
                  }}
                >
                  {slots.map((slot) => {
                    const project = projects[slot.index];
                    return (
                      <div
                        key={slot.clone ? slot.key : project.id}
                        className="shrink-0"
                        style={{ width: layout.cardWidth }}
                        aria-hidden={slot.clone || undefined}
                      >
                        {isMobile ? renderMobileCard(project, slot.index) : (
                          <ProjectCard project={project} index={slot.index} openModalAt={safeOpenModal} />
                        )}
                      </div>
                    );
                  })}
                  {Array.from({ length: layout.emptySlots }, (_, i) => (
                    <div key={`slot-${i}`} aria-hidden className="shrink-0" style={{ width: layout.cardWidth }} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <CarouselProgress
                    page={currentPage}
                    pages={totalPages}
                    hint={`${isMobile ? 'Swipe' : 'Drag'} to explore`}
                    onSeek={scrollToPage}
                  />
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

  const filters = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((p) => { if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1); });
    return [
      { key: "All", label: "All", count: projects.length },
      ...Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ key: name, label: name, count })),
    ];
  }, [projects]);

  // Keep each project's index in the full list: that is what the detail modal opens
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .map((project, index) => ({ project, index }))
      .filter(({ project }) => category === "All" || project.category === category)
      .filter(({ project }) => !q || [project.title, project.description, project.category, ...project.technologies].some((t) => t?.toLowerCase().includes(q)));
  }, [projects, query, category]);

  return (
    <BrowseDialog
      open={isOpen}
      onOpenChange={onOpenChange}
      title="All Projects"
      summary={`${projects.length} projects across ${filters.length - 1} areas`}
      searchLabel="Search projects"
      searchPlaceholder="Search projects or tech"
      query={query}
      onQueryChange={setQuery}
      filtersLabel="Filter projects by type"
      filters={filters}
      filter={category}
      onFilterChange={setCategory}
      resultCount={visible.length}
      noun={["project", "projects"]}
      emptyText="No projects match your search."
      onReset={() => { setQuery(""); setCategory("All"); }}
    >
      {visible.map(({ project, index }) => (
        <BrowseCard
          key={project.id}
          onClick={() => onSelect(index)}
          mediaShape="aspect-[16/10]"
          tag={project.category}
          media={
            project.image_url ? (
              <OptimizedImage
                src={project.image_url}
                alt={project.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                draggable={false}
                fallbackIcon={<FolderOpen className="h-8 w-8 text-muted-foreground/30" />}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <FolderOpen className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )
          }
          title={project.title}
          meta={[project.category, project.year].filter(Boolean).join(" · ")}
          description={project.description}
          footer={<TechIcons technologies={project.technologies} fit className="mt-auto" />}
        />
      ))}
    </BrowseDialog>
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
              <ZoomableImage key={project.image_url} src={project.image_url} alt={project.title} inline />
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
