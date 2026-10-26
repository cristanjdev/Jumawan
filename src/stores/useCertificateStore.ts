import { create } from 'zustand';
import { convexClient } from '@/lib/convexClient';
import { api } from '../../convex/_generated/api';

export interface Certificate {
  _id: string;
  id: string;
  title: string;
  issuer: string;
  issue_date: string;
  credential_id?: string;
  credential_url?: string;
  verification_image_url?: string;
  image_url?: string;
  /** A small copy of image_url, for the cards */
  thumbnail_url?: string;
  description?: string;
  order_index: number;
  type?: 'participation' | 'recognition';
  _creationTime: number;
}

interface CertificateState {
  certificates: Certificate[];
  loading: boolean;
  error: string | null;
  fetchCertificates: () => Promise<void>;
  subscribeToChanges: () => () => void;
}

export const useCertificateStore = create<CertificateState>((set, get) => ({
  certificates: [],
  loading: false,
  error: null,

  fetchCertificates: async () => {
    set({ loading: true, error: null });
    try {
      const data = await convexClient.query(api.certificates.list);
      const mapped = (data || []).map((c: any) => ({ ...c, id: c._id }));
      set({ certificates: mapped, loading: false });
    } catch (error) {
      console.warn('Failed to fetch certificates:', error);
      set({ certificates: [], loading: false });
    }
  },

  // Convex provides automatic reactivity via useQuery - this is a no-op for compatibility
  subscribeToChanges: () => {
    // Convex handles reactivity automatically
    return () => {};
  },
}));
