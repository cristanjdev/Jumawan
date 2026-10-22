"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { DetailBlock, DetailCard, DetailDialog, FactsRow, StatusPill, TagList } from "@/components/ui/detail-card";
import { useLatest } from "@/hooks/use-latest";
import { useReturnFocus } from "@/hooks/use-return-focus";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { reveal } from "@/lib/section-ui";
import { cn } from "@/lib/utils";
import { Achievement, Education, useEducationStore } from "@/stores/useEducationStore";

/** "Graduated with Honors" — honors fold into the status so the card carries a single badge */
const statusLabel = (edu: Education) =>
  edu.honors ? `${edu.status} ${edu.honors.charAt(0).toLowerCase()}${edu.honors.slice(1)}` : edu.status;

const startYear = (edu: Education) => Number.parseInt(edu.period, 10);
const endYear = (edu: Education) => Number.parseInt(edu.period.split("–").pop() ?? "", 10);

/** The entry that began when this one ended (ICT strand, 2020 – 2022 → BSIT, 2022 – 2026) */
function nextStep(all: Education[], edu: Education) {
  return all.find((other) => other !== edu && startYear(other) === endYear(edu)) ?? null;
}

const ACHIEVEMENT_GROUPS: Achievement["group"][] = ["Recognition", "Leadership & activities"];

/** Ruled rows with the year on the right edge, like an academic record */
function Ledger({ items }: { items: Achievement[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.title}
          className="flex items-baseline justify-between gap-4 border-b border-border/40 py-[5px] last:border-0 sm:py-2.5"
        >
          <span className="text-[13px] text-foreground/85 sm:text-sm">{item.title}</span>
          {item.detail && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

function EducationDialog({
  education,
  next,
  onClose,
  onCloseAutoFocus,
}: {
  education: Education | null;
  /** The entry this one led to, if any (senior high → bachelor's) */
  next: Education | null;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  // Hold on to the last entry while closing so the exit animation and focus return still run
  const edu = useLatest(education);
  if (!edu) return null;

  const groups = ACHIEVEMENT_GROUPS.map((group) => ({
    group,
    items: edu.achievements.filter((a) => a.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <DetailDialog
      open={education !== null}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
      title={edu.degree}
      subtitle={edu.school}
      // Honors already show in this badge ("Graduated with Honors")
      badge={edu.status && <StatusPill>{statusLabel(edu)}</StatusPill>}
    >
      <FactsRow
        facts={[
          ["Years attended", edu.period],
          ["Level", edu.level],
          ["GPA", edu.gpa],
          ["Location", edu.location],
        ]}
      />

      {edu.description && (
        <p className="mt-5 text-[13px] leading-normal text-foreground/80 sm:mt-6 sm:text-sm sm:leading-relaxed">{edu.description}</p>
      )}

      {next && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground sm:text-sm">
          <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" />
          Continued to <span className="font-medium text-foreground">{next.degree}</span>
          <span className="tabular-nums">({next.period})</span>
        </p>
      )}

      {groups.length > 0 && (
        <div className={cn("mt-5 grid gap-5 sm:mt-6 sm:gap-6", groups.length > 1 && "md:grid-cols-2 md:gap-10")}>
          {groups.map(({ group, items }) => (
            <DetailBlock key={group} title={group}>
              <Ledger items={items} />
            </DetailBlock>
          ))}
        </div>
      )}

      {edu.coursework.length > 0 && (
        <DetailBlock title="Key coursework" className="mt-5 sm:mt-6">
          <TagList items={edu.coursework} />
        </DetailBlock>
      )}
    </DetailDialog>
  );
}

export function EducationSection() {
  const { education } = useEducationStore();
  const [selected, setSelected] = useState<Education | null>(null);
  const { remember, onCloseAutoFocus } = useReturnFocus();
  useScrollLock(selected !== null);

  const open = (edu: Education) => {
    remember();
    setSelected(edu);
  };

  return (
    <section id="education" className="relative overflow-hidden py-24">
      <div className="container relative z-10 px-4 md:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div {...reveal} className="mx-auto mb-14 flex w-fit flex-col items-center sm:mb-16">
            <h2 className="mb-4 text-center text-4xl font-bold md:text-5xl">
              <span className="text-cyan-400">Education</span>
            </h2>
            <p className="mx-auto max-w-2xl text-center text-lg font-medium text-muted-foreground">
              My academic background and qualifications
            </p>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-2">
            {education.map((edu) => (
              <motion.div key={edu.id} {...reveal} className="h-full min-w-0">
                <DetailCard
                  period={edu.period}
                  badge={edu.status && <StatusPill>{statusLabel(edu)}</StatusPill>}
                  title={edu.degree}
                  subtitle={edu.school}
                  details={edu.location}
                  tags={edu.coursework}
                  tagsLabel="Key coursework"
                  media={{ alt: edu.school, badge: edu.level }}
                  onOpen={() => open(edu)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <EducationDialog
        education={selected}
        next={selected ? nextStep(education, selected) : null}
        onClose={() => setSelected(null)}
        onCloseAutoFocus={onCloseAutoFocus}
      />
    </section>
  );
}
