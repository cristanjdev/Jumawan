"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TechIcons } from "@/components/ui/tech-icons";
import {
  BulletList,
  DetailBlock,
  DetailCard,
  DetailDialog,
  FactsRow,
  StatusPill,
  TagList,
} from "@/components/ui/detail-card";
import { useLatest } from "@/hooks/use-latest";
import { useReturnFocus } from "@/hooks/use-return-focus";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { reveal } from "@/lib/section-ui";
import { cn } from "@/lib/utils";
import { useExperienceStore, WorkExperience } from "@/stores/useExperienceStore";
import { convexClient } from "@/lib/convexClient";
import { api } from "../../../convex/_generated/api";

// ─── helpers ────────────────────────────────────────────────────────────────

// Dates are calendar dates, so read them in UTC — otherwise visitors west of
// UTC see December 2023 for a role that started on "2024-01-01".
const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "January 2024 – Present", "January – April 2026" (year shown once when it doesn't change) */
function formatPeriod(exp: WorkExperience) {
  const start = parseDate(exp.start_date);
  const end = exp.current ? null : parseDate(exp.end_date);
  const label = (date: Date) => `${monthFormat.format(date)} ${date.getUTCFullYear()}`;
  if (!start) return end ? label(end) : "Present";
  if (!end) return `${label(start)} – Present`;
  if (start.getUTCFullYear() !== end.getUTCFullYear()) return `${label(start)} – ${label(end)}`;
  if (start.getUTCMonth() === end.getUTCMonth()) return label(start);
  return `${monthFormat.format(start)} – ${label(end)}`;
}

const normalize = (text: string) => text.trim().toLowerCase();

/** Highlights plus responsibilities with the lines the admin data repeats removed */
function splitLists(exp: WorkExperience) {
  const highlights = exp.achievements ?? [];
  const seen = new Set(highlights.map(normalize));
  const duties = (exp.responsibilities ?? []).filter((r) => !seen.has(normalize(r)));
  return { highlights, duties };
}

// ─── modal ──────────────────────────────────────────────────────────────────

function ExperienceDialog({
  experience,
  onClose,
  onCloseAutoFocus,
}: {
  experience: WorkExperience | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  // Hold on to the last role while closing so the exit animation and focus return still run
  const exp = useLatest(experience);
  if (!exp) return null;

  const { highlights, duties } = splitLists(exp);
  const stack = exp.technologies ?? [];
  // Company size is skipped when it just repeats the company ("Self-employed" under "Self-Employed")
  const companySize = exp.company_size && normalize(exp.company_size) !== normalize(exp.company) ? exp.company_size : null;

  return (
    <DetailDialog
      open={experience !== null}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      title={exp.position}
      subtitle={exp.company}
      badge={exp.current && <StatusPill>Current</StatusPill>}
    >
      {exp.image_url && (
        <img
          src={exp.image_url}
          alt={`${exp.position} at ${exp.company}`}
          className="mb-5 aspect-[16/9] w-full rounded-xl object-cover sm:mb-6"
          draggable={false}
        />
      )}

      <FactsRow
        facts={[
          ["Period", formatPeriod(exp)],
          ["Duration", exp.duration],
          ["Type", exp.type],
          ["Location", exp.location],
          ["Team", exp.team_size],
          ["Company size", companySize],
        ]}
      />

      {(highlights.length > 0 || duties.length > 0) && (
        <div className={cn("mt-5 grid gap-5 sm:mt-6 sm:gap-6", highlights.length > 0 && duties.length > 0 && "md:grid-cols-2 md:gap-10")}>
          {highlights.length > 0 && (
            <DetailBlock title="Highlights">
              <BulletList items={highlights} tone="primary" />
            </DetailBlock>
          )}
          {duties.length > 0 && (
            <DetailBlock title="Responsibilities">
              <BulletList items={duties} tone="muted" />
            </DetailBlock>
          )}
        </div>
      )}

      {stack.length > 0 && (
        <DetailBlock title="Tech stack" className="mt-5 sm:mt-6">
          <TagList items={stack} />
        </DetailBlock>
      )}
    </DetailDialog>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/30">
      <div className="space-y-3 p-6 sm:p-7">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="!mt-5 h-6 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex justify-between px-6 pb-6 sm:px-7 sm:pb-7">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  );
}

// ─── section ────────────────────────────────────────────────────────────────

export function ExperienceSection() {
  const { experiences, loading, fetchExperiences } = useExperienceStore();
  const [selected, setSelected] = useState<WorkExperience | null>(null);
  const { remember, onCloseAutoFocus } = useReturnFocus();
  useScrollLock(selected !== null);

  useEffect(() => {
    fetchExperiences();

    convexClient
      .mutation(api.analytics.track, {
        event_type: "page_view",
        page_url: "/experience",
        event_data: { section: "experience" },
      })
      .catch((error: unknown) => console.warn("Analytics tracking error:", error));
  }, [fetchExperiences]);

  const open = (exp: WorkExperience) => {
    remember();
    setSelected(exp);
  };

  return (
    <section id="experience" className="relative overflow-hidden py-24">
      <div className="container relative z-10 px-4 md:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div {...reveal} className="mx-auto mb-14 flex w-fit flex-col items-center sm:mb-16">
            <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">
              <span className="text-cyan-400">Work Experience</span>
            </h2>
            <p className="mx-auto max-w-2xl text-center text-lg font-medium text-muted-foreground">
              My professional journey and career milestones
            </p>
          </motion.div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : experiences.length === 0 ? (
            <div className="py-16 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-muted-foreground">Work experience will appear here once it's added.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {experiences.map((exp) => (
                <motion.div
                  key={exp.id}
                  {...reveal}
                  // On tablet an odd last card spans the row instead of sitting alone
                  className="h-full min-w-0 md:[&:last-child:nth-child(odd)]:col-span-2 lg:[&:last-child:nth-child(odd)]:col-span-1"
                >
                  <DetailCard
                    period={formatPeriod(exp)}
                    badge={exp.current && <StatusPill>Current</StatusPill>}
                    title={exp.position}
                    subtitle={exp.company}
                    details={exp.location}
                    tags={exp.technologies ?? []}
                    tagsLabel="Tech stack"
                    media={{ src: exp.image_url, alt: `${exp.position} at ${exp.company}`, badge: exp.type }}
                    icons={<TechIcons technologies={exp.technologies ?? []} />}
                    onOpen={() => open(exp)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ExperienceDialog
        experience={selected}
        onClose={() => setSelected(null)}
        onCloseAutoFocus={onCloseAutoFocus}
      />
    </section>
  );
}
