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
  Globe,
  Smartphone,
  ShieldCheck,
  Radio,
  Sparkles,
  Rocket,
  AppWindow,
  MonitorSmartphone,
  Fingerprint,
  CircuitBoard,
  WandSparkles,
  LucideIcon,
} from "lucide-react";
import { convexClient } from '@/lib/convexClient';
import { api } from '../../convex/_generated/api';

export interface SkillCategory {
  title: string;
  icon: LucideIcon;
  color: string;
  skills: string[];
  /** A plain-language line under the title */
  description?: string;
  /** Titles of projects that show this skill; each opens that project's details */
  examples: string[];
}

interface SkillCategoryRow {
  _id: string;
  title: string;
  icon_slug: string;
  color_slug: string;
  skills: string[];
  description?: string;
  examples?: string[];
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
  globe: Globe,
  smartphone: Smartphone,
  shield: ShieldCheck,
  radio: Radio,
  sparkles: Sparkles,
  rocket: Rocket,
  appwindow: AppWindow,
  monitorsmartphone: MonitorSmartphone,
  fingerprint: Fingerprint,
  circuitboard: CircuitBoard,
  wand: WandSparkles,
};

// Pale shades are only for the dark theme; the light theme gets a deeper one so the icon doesn't wash out
const COLOR_MAP: Record<string, string> = {
  cyan: "text-cyan-600 dark:text-cyan-400",
  "sky-blue": "text-sky-600 dark:text-sky-400",
  "blue-primary": "text-blue-600 dark:text-blue-400",
  "primary-accent": "text-primary",
  "accent-sky": "text-cyan-600 dark:text-cyan-300",
  sky: "text-sky-600 dark:text-sky-300",
  navy: "text-navy-300",
};

// Shown until the list loads, or if it can't be reached. Keep it in step with the cards in the admin.
const DEFAULT_CATEGORIES: SkillCategory[] = [
  {
    title: "Web Applications", icon: AppWindow, color: "text-sky-600 dark:text-sky-400",
    description: "Complete systems used in a browser, with separate spaces for staff and customers.",
    skills: ["React", "Next.js", "TypeScript", "Laravel", "Django", "Tailwind CSS", "Vite", "Express.js", "Svelte"],
    examples: ["LDCU Clinic", "MCA Portal", "School Management System", "Motor PH HR Hub"],
  },
  {
    title: "Mobile & Desktop Apps", icon: MonitorSmartphone, color: "text-blue-600 dark:text-blue-400",
    description: "Apps for phones, tablets and Windows computers that work in everyday settings.",
    skills: ["React Native", "Flutter", "Kotlin", "Java", "C#", ".NET", "Expo", "Dart", "Swift"],
    examples: ["Dizkarte", "ShopLendr", "SmartSpend", "Saint Lawrence HMS"],
  },
  {
    title: "Data, Accounts & Security", icon: Fingerprint, color: "text-primary",
    description: "Keeping information organised and private, so people only see what they should.",
    skills: ["MySQL", "PostgreSQL", "Supabase", "Firebase", "Convex", "Permissions", "Prisma", "Redis", "Zod"],
    examples: ["AGRODATA", "PayrollProject", "Uy-Laurio Legal & Notarial Portal"],
  },
  {
    title: "Real-World & Connected Systems", icon: CircuitBoard, color: "text-cyan-600 dark:text-cyan-300",
    description: "Software that connects to the real world: live maps, ID cards, QR codes and sensors.",
    skills: ["Leaflet", "Google Maps", "Arduino", "ESP32", "QR codes", "Real-time", "RFID", "GPS", "WebSockets"],
    examples: ["ArmoryDB", "RFID Room Access", "Queueing System", "Smart Cemetery Navigation (Menteryo)"],
  },
  {
    title: "Smart Features", icon: WandSparkles, color: "text-cyan-600 dark:text-cyan-400",
    description: "Helpful automation in an app: a chatbot, suggestions and photo recognition.",
    skills: ["Chatbot", "Suggestions", "Recognition", "Gemini", "Groq", "Python", "Keras", "OpenCV", "FastAPI"],
    examples: ["MSEUF Library Portal", "MatriQ"],
  },
  {
    title: "Launching & Teamwork", icon: Rocket, color: "text-sky-600 dark:text-sky-300",
    description: "Taking a system from idea to launch, then keeping it running with the people who use it.",
    skills: ["Vercel", "Netlify", "Railway", "Git", "GitHub", "Documentation", "GitLab", "Docker", "Linux"],
    examples: ["Hopelink v2", "FoundIt!", "EduCatch Lite"],
  },
];

function mapRowToCategory(row: SkillCategoryRow): SkillCategory {
  const icon = ICON_MAP[row.icon_slug] ?? Code2;
  const color = COLOR_MAP[row.color_slug] ?? "text-cyan-400";
  return {
    title: row.title,
    icon,
    color,
    skills: Array.isArray(row.skills) ? row.skills : [],
    description: row.description,
    examples: Array.isArray(row.examples) ? row.examples : [],
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
