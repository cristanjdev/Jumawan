"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useSkillStore } from "@/stores/useSkillStore";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";

export function SkillsSection() {
  const { skillCategories, fetchCategories } = useSkillStore();
  const { scrollToSection } = useSmoothScroll();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.075,
      },
    },
  }), []);

  const itemVariants = useMemo(() => ({
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
    <section id="skills" className="py-24 relative overflow-hidden">
      <div className="container px-4 md:px-6 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={containerVariants}
          className="max-w-6xl mx-auto"
        >
          {/* Header - Centered to match Certificates */}
          <motion.div variants={itemVariants} className="flex flex-col items-center mb-16 mx-auto w-fit"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-center">
              <span className="text-cyan-400">
                My Skills
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center font-medium">
              A comprehensive overview of my technical expertise, and how I build with AI
            </p>
          </motion.div>

          {/* Skills Grid - Minimalist Layout */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {skillCategories.map((category, index) => (
              <motion.div key={`${category.title}-${index}`} variants={itemVariants}>
                <div className="p-6 h-full border border-border/50 rounded-xl transition-all duration-500 ease-in-out hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                  <div className="space-y-6">
                    {/* Category Header */}
                    <div className="flex items-center justify-center md:justify-start gap-3 border-b border-border/50 pb-3">
                      <category.icon className={`h-5 w-5 ${category.color}`} />
                      <h3 className="text-xl font-semibold text-foreground tracking-tight">
                        {category.title}
                      </h3>
                    </div>

                    {/* Skills Tags */}
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      {category.skills.map((skill, skillIndex) => (
                        <motion.span
                          key={skill}
                          whileHover={{ scale: 1.05, y: -2 }}
                          className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-secondary/40 text-muted-foreground border border-transparent hover:border-primary/20 hover:bg-secondary/60 hover:text-foreground transition-all duration-300 cursor-default shadow-sm"
                        >
                          {skill}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom CTA */}
          <motion.div
            variants={itemVariants}
            className="mt-20 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-6 text-center sm:text-left"
          >
            <p className="text-muted-foreground text-lg">
              Ready to deploy these technologies on your next project?
            </p>
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
    </section>
  );
}