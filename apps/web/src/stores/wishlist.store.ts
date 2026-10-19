import { create } from 'zustand';
import { api } from '../api/client';

interface WishlistState {
  items: any[];
  isLoading: boolean;
  fetchWishlist: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<boolean>;
  isSaved: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchWishlist: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get('/wishlist');
      set({ items: response.data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleWishlist: async (productId: string) => {
    try {
      const response = await api.post('/wishlist/toggle', { productId });
      await get().fetchWishlist();
      return response.data.isSaved;
    } catch (error) {
      throw error;
    }
  },

  isSaved: (productId: string) => {
    return get().items.some((item) => item.productId === productId || item.product?.id === productId);
  },
}));
