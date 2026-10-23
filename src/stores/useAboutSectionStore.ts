import { create } from 'zustand';
import { convexClient } from '@/lib/convexClient';
import { api } from '../../convex/_generated/api';

export interface AboutSectionImage {
    _id: string;
    id: string;
    image_url: string;
    label: string;
    order_index: number;
    is_active: boolean;
    _creationTime: number;
}

const DEFAULT_CAROUSEL_ITEMS = [
    { src: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80', label: 'Development' },
    { src: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&q=80', label: 'Design' },
    { src: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80', label: 'Innovation' },
];

interface AboutSectionState {
    images: AboutSectionImage[];
    loading: boolean;
    error: string | null;
    fetchImages: () => Promise<void>;
}

export const useAboutSectionStore = create<AboutSectionState>((set) => ({
    images: [],
    loading: false,
    error: null,

    fetchImages: async () => {
        set({ loading: true, error: null });
        try {
            const data = await convexClient.query(api.aboutSectionImages.listActive);
            const mapped = (data || []).map((img: any) => ({ ...img, id: img._id }));
            set({ images: mapped, loading: false });
        } catch (error) {
            console.warn('Failed to fetch about section images:', error);
            set({ images: [], loading: false });
        }
    },
}));

/** Carousel items for About section: from API or static fallback. A photo with no label shows no caption. */
export function getAboutCarouselItems(images: AboutSectionImage[]): { id: string; src: string; label: string }[] {
    if (images.length > 0) {
        return images.map((img) => ({ id: img.id || img._id, src: img.image_url, label: img.label?.trim() ?? '' }));
    }
    return DEFAULT_CAROUSEL_ITEMS.map((item, i) => ({ id: `fallback-${i}`, src: item.src, label: item.label }));
}
