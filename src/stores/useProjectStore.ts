import { create } from 'zustand';
import { convexClient } from '@/lib/convexClient';
import { api } from '../../convex/_generated/api';

export interface Project {
  _id: string;
  id: string;
  title: string;
  description: string;
  year?: string;
  image_url?: string;
  live_url?: string;
  github_url?: string;
  technologies: string[];
  featured: boolean;
  order_index: number;
  _creationTime: number;
}

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  error: null,
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const data = await convexClient.query(api.projects.list);
      const mapped = (data || []).map((p: any) => ({ ...p, id: p._id }));
      set({ projects: mapped, loading: false });
    } catch (error) {
      console.warn('Failed to fetch projects:', error);
      set({ projects: [], loading: false });
    }
  },
}));
