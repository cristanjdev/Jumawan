import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore } from "@/stores/useProjectStore";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { ProjectCard } from "./ProjectCard";
import { ProjectsModal } from "./projects-section";

// Featured Projects: the projects marked "Featured" in admin, as a grid (3 across on desktop, 2 on
// tablets, 1 on phones; it grows downward, never sideways). Same cards and details modal as All
// Projects. Hidden when nothing is featured.

export function FeaturedProjectsSection() {
  const shouldReduceMotion = useReducedMotion();
  const { projects, loading, fetchProjects } = useProjectStore();
  const { scrollToSection } = useSmoothScroll();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // All Projects fetches the same list; only fetch here if nothing has been loaded yet
  useEffect(() => {
    if (useProjectStore.getState().projects.length === 0 && !useProjectStore.getState().loading) fetchProjects();
  }, [fetchProjects]);

  const featured = useMemo(() => projects.filter((project) => project.featured), [projects]);

  const openModalAt = useCallback((index: number) => {
    setSelectedIndex(index);
    setIsModalOpen(true);
  }, []);
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedIndex(null), 150);
  }, []);

  // Arrow keys step through the featured projects while the details are open
  useEffect(() => {
    if (!isModalOpen || featured.length === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const step = e.key === "ArrowLeft" ? -1 : 1;
      setSelectedIndex((prev) => (prev === null ? prev : (prev + step + featured.length) % featured.length));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen, featured.length]);

  const containerVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.6, staggerChildren: shouldReduceMotion ? 0 : 0.12 } },
    }),
    [shouldReduceMotion],
  );
  // The cards arrive after the heading has already animated in (the list loads asynchronously), and a motion
  // child that mounts under a parent that already finished animating never leaves `hidden`. So the grid animates
  // itself, and only mounts once the cards are there.
  const gridVariants = useMemo(
    () => ({
      hidden: {},
      visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12 } },
    }),
    [shouldReduceMotion],
  );
  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
      visible: { opacity: 1, y: 0, transition: { duration: shouldReduceMotion ? 0.45 : 0.7, ease: [0.4, 0, 0.2, 1] as const } },
    }),
    [shouldReduceMotion],
  );

  if (!loading && featured.length === 0) return null;

  return (
    <section id="featured-projects" className="relative bg-transparent py-12 sm:py-20">
      <div className="container relative z-10 mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          variants={containerVariants}
          className="mx-auto max-w-6xl"
        >
          <motion.div variants={itemVariants} className="mx-auto mb-12 flex w-fit flex-col items-center sm:mb-16">
            <h2 className="mb-4 text-center text-[clamp(1.5rem,7.2vw,2.25rem)] font-bold md:text-5xl">
              <span className="text-cyan-400">Featured Projects</span>
            </h2>
            <p className="mx-auto max-w-2xl text-center text-base sm:text-lg font-medium text-muted-foreground">
              A selection of the work I'm most proud of
            </p>
          </motion.div>

          {featured.length === 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="overflow-hidden rounded-xl border border-border/30">
                  <div className="aspect-[16/10] animate-pulse bg-muted/5" />
                  <div className="space-y-3 p-5">
                    <div className="h-5 w-3/5 animate-pulse rounded-md bg-muted/5" />
                    <div className="h-4 w-full animate-pulse rounded-md bg-muted/5" />
                    <div className="h-4 w-4/5 animate-pulse rounded-md bg-muted/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.05 }}
              variants={gridVariants}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {featured.map((project, index) => (
                <ProjectCard key={project.id} project={project} index={index} openModalAt={openModalAt} />
              ))}
            </motion.div>
          )}

          {featured.length > 0 && (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={itemVariants}
              className="mt-10 flex justify-center"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToSection("projects")}
                className="border-border/40 text-xs text-muted-foreground transition-all duration-300 hover:border-cyan-400/40 hover:bg-cyan-400/5 hover:text-cyan-400 sm:text-sm"
              >
                View all projects
                <ArrowDown className="ml-2 h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </motion.div>

        <ProjectsModal isOpen={isModalOpen} onClose={closeModal} projects={featured} selectedIndex={selectedIndex} />
      </div>
    </section>
  );
}
