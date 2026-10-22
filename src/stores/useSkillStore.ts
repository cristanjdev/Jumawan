import { create } from "zustand";
import {
  Code2,
  Server,
  Database,
  Cloud,
  TestTube,
  GitBranch,
  Layers,
  Cpu,
  LucideIcon,
} from "lucide-react";
import { convexClient } from '@/lib/convexClient';
import { api } from '../../convex/_generated/api';

export interface SkillCategory {
  title: string;
  icon: LucideIcon;
  color: string;
  skills: string[];
}

interface SkillCategoryRow {
  _id: string;
  title: string;
  icon_slug: string;
  color_slug: string;
  skills: string[];
  order_index: number;
  is_active: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  code: Code2,
  server: Server,
  database: Database,
  cloud: Cloud,
  testtube: TestTube,
  gitbranch: GitBranch,
  layers: Layers,
  cpu: Cpu,
};

const COLOR_MAP: Record<string, string> = {
  cyan: "text-cyan-400",
  "sky-blue": "text-sky-400",
  "blue-primary": "text-blue-400",
  "primary-accent": "text-primary",
  "accent-sky": "text-cyan-300",
  sky: "text-sky-300",
  navy: "text-navy-300",
};

const DEFAULT_CATEGORIES: SkillCategory[] = [
  { title: "Languages", icon: Code2, color: "text-sky-400", skills: ["HTML/CSS", "JavaScript", "Python", "PHP", "SQL", "TypeScript", "Kotlin"] },
  { title: "Frameworks & Libraries", icon: Server, color: "text-blue-400", skills: ["Laravel", "React", "Next.js", "React Native", "Node.js", "Express.js"] },
  { title: "Tools & Platforms", icon: Database, color: "text-primary", skills: ["Linux", "Git", "Docker", "Node.js", "XAMPP"] },
  { title: "Deployment & Cloud", icon: Cloud, color: "text-cyan-300", skills: ["Vercel", "Netlify", "Railway", "Firebase", "Convex"] },
  { title: "Databases", icon: TestTube, color: "text-sky-300", skills: ["MySQL", "PostgreSQL", "Firebase", "Convex"] },
  { title: "Version Control", icon: GitBranch, color: "text-navy-300", skills: ["Git", "GitHub", "GitLab"] },
  { title: "AI-Assisted Development", icon: Cpu, color: "text-cyan-400", skills: ["Agentic Coding", "Prompt Engineering", "Context Engineering", "Spec-Driven Development", "AI Code Review"] },
  { title: "AI Integration", icon: Layers, color: "text-sky-400", skills: ["Gemini API", "AI Chatbots", "LLM APIs", "Prompt Design"] },
];

function mapRowToCategory(row: SkillCategoryRow): SkillCategory {
  const icon = ICON_MAP[row.icon_slug] ?? Code2;
  const color = COLOR_MAP[row.color_slug] ?? "text-cyan-400";
  return {
    title: row.title,
    icon,
    color,
    skills: Array.isArray(row.skills) ? row.skills : [],
  };
}

interface SkillState {
  skillCategories: SkillCategory[];
  loading: boolean;
  fetchCategories: () => Promise<void>;
}

export const useSkillStore = create<SkillState>((set) => ({
  skillCategories: DEFAULT_CATEGORIES,
  loading: false,

  fetchCategories: async () => {
    set({ loading: true });

    try {
      const data = await convexClient.query(api.skillCategories.listActive);

      const list = Array.isArray(data) && data.length > 0
        ? (data as unknown as SkillCategoryRow[]).map(mapRowToCategory)
        : DEFAULT_CATEGORIES;

      set({ skillCategories: list, loading: false });
    } catch (error) {
      console.warn('Failed to fetch skill categories:', error);
      set({ skillCategories: DEFAULT_CATEGORIES, loading: false });
    }
  },
}));
