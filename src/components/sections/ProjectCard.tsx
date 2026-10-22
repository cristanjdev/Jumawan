"use client";

import { motion } from "framer-motion";
import { TechIcons } from "@/components/ui/tech-icons";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Project } from "@/stores/useProjectStore";
import { ViewDetailsHint } from "@/components/ui/view-details-hint";
import { ExternalLink, Github, FolderOpen } from "lucide-react";

interface ProjectCardProps {
    project: Project;
    index: number;
    openModalAt: (index: number) => void;
}

const itemVariants = {
    hidden: { y: 30, opacity: 0, scale: 0.98 },
    visible: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.75,
            ease: [0.25, 0.46, 0.45, 0.94] as const,
        },
    },
};

export function ProjectCard({ project, index, openModalAt }: ProjectCardProps) {
    return (
        <motion.div
            variants={itemVariants}
            className="transform-gpu h-full"
            style={{ willChange: "transform, opacity" }}
        >
            <div
                // The whole card opens the details; the image button below is the keyboard-focusable control
                onClick={() => openModalAt(index)}
                className="h-full relative flex flex-col border border-border/50 rounded-xl transition-all duration-500 ease-in-out hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)] overflow-hidden group cursor-pointer"
            >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

                <button
                    type="button"
                    className="relative aspect-[16/10] w-full overflow-hidden will-change-transform transform-gpu text-left select-none bg-muted/5 flex items-center justify-center"
                    tabIndex={-1}
                    aria-hidden
                    aria-label={`View details for ${project.title}`}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {project.image_url ? (
                        <>
                            <OptimizedImage
                                src={project.image_url}
                                alt={project.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                draggable={false}
                                fallbackIcon={<FolderOpen className="w-12 h-12 text-muted-foreground/30" />}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[var(--overlay-bg)] via-[var(--card-overlay-via)] to-transparent opacity-60 group-hover:opacity-10 transition-opacity duration-500" />
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-muted/10 gap-3 group-hover:bg-muted/20 transition-colors duration-500">
                            <FolderOpen className="w-12 h-12 text-muted-foreground/20 group-hover:text-primary/30 transition-colors duration-500" />
                            <span className="text-[10px] font-medium text-muted-foreground/30 uppercase tracking-widest group-hover:text-primary/40 transition-colors duration-500">No Preview</span>
                        </div>
                    )}
                    <ViewDetailsHint />
                </button>
                <div className="p-5 flex flex-col flex-1">
                    <div className="flex-grow">
                        <h3 className="text-xl font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors duration-300 leading-tight mb-2">
                            {project.title}
                        </h3>

                        <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-relaxed">
                            {project.description}
                        </p>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3">
                        <TechIcons technologies={project.technologies} />
                        {(project.github_url || project.live_url) && (
                            <div className="ml-auto flex shrink-0 items-center gap-3">
                                {project.github_url && (
                                    <a
                                        href={project.github_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label={`${project.title} source code`}
                                        className="text-muted-foreground transition-colors hover:text-primary"
                                    >
                                        <Github className="h-4 w-4" />
                                    </a>
                                )}
                                {project.live_url && (
                                    <a
                                        href={project.live_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label={`${project.title} live demo`}
                                        className="text-muted-foreground transition-colors hover:text-primary"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </motion.div>
    );
}
