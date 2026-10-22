import { create } from 'zustand';
import { convexClient } from '@/lib/convexClient';
import { api } from '../../convex/_generated/api';

export interface WorkExperience {
  _id: string;
  id: string;
  company: string;
  position: string;
  type: 'Full-time' | 'Part-time' | 'Freelance' | 'Internship' | 'Contract';
  location: string;
  start_date: string;
  end_date?: string;
  current: boolean;
  duration?: string;
  achievements: string[];
  responsibilities: string[];
  technologies: string[];
  team_size?: string;
  company_size?: string;
  /** Photo for the card and the details modal, uploaded from the admin */
  image_url?: string;
  order_index: number;
  _creationTime: number;
}

interface ExperienceState {
  experiences: WorkExperience[];
  loading: boolean;
  error: string | null;
  fetchExperiences: () => Promise<void>;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  experiences: [],
  loading: false,
  error: null,
  fetchExperiences: async () => {
    set({ loading: true, error: null });
    try {
      const data = await convexClient.query(api.workExperience.list);
      const mapped = (data || []).map((e: any) => ({ ...e, id: e._id }));
      set({ experiences: mapped, loading: false });
    } catch (error) {
      console.warn('Failed to fetch experiences:', error);
      set({ experiences: [], loading: false });
    }
  },
}));
