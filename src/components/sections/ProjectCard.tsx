"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Project } from "@/stores/useProjectStore";
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
                className="h-full relative border border-border/50 rounded-xl transition-all duration-500 ease-in-out hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)] overflow-hidden group"
            >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/60 via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

                <button
                    type="button"
                    className="relative h-48 w-full overflow-hidden will-change-transform transform-gpu text-left select-none bg-muted/5 flex items-center justify-center"
                    onClick={() => openModalAt(index)}
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
                </button>
                <div className="p-6 flex flex-col">
                    <div className="flex-grow">
                        <h3 className="text-xl font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors duration-300 leading-tight mb-2">
                            {project.title}
                        </h3>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground/80 mb-4">
                            {project.year && (
                                <span className="whitespace-nowrap">
                                    {project.year}
                                </span>
                            )}
                        </div>

                        <p className="text-muted-foreground mb-6 line-clamp-2 text-sm leading-relaxed">
                            {project.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        {project.technologies.slice(0, 4).map((tech, index) => (
                            <Badge
                                key={index}
                                variant="outline"
                                className="text-xs bg-primary/5 text-primary border-primary/20"
                            >
                                {tech}
                            </Badge>
                        ))}
                        {project.technologies.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                                +{project.technologies.length - 4} more
                            </Badge>
                        )}
                    </div>

                    <div className="flex gap-3 mt-auto pt-2">
                        <Button
                            size="sm"
                            className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all duration-300"
                            onClick={() => openModalAt(index)}
                        >
                            View Details
                        </Button>
                        {project.github_url && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-shrink-0 border-border/40 hover:border-primary/40 hover:bg-primary/5"
                                asChild
                            >
                                <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                                    <Github className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </a>
                            </Button>
                        )}
                        {project.live_url && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="flex-shrink-0 border-border/40 hover:border-primary/40 hover:bg-primary/5"
                                asChild
                            >
                                <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
