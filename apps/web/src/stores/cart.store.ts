import { create } from 'zustand';
import { api } from '../api/client';
import { CartDto } from '@techstore/shared';

interface CartState {
  cart: CartDto | null;
  isLoading: boolean;
  isCartDrawerOpen: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, variantId?: string | null, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  isCartDrawerOpen: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get('/cart');
      set({ cart: response.data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addItem: async (productId, variantId, quantity = 1) => {
    try {
      set({ isLoading: true });
      const response = await api.post('/cart/items', { productId, variantId, quantity });
      set({ cart: response.data.data, isLoading: false, isCartDrawerOpen: true });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateQuantity: async (itemId, quantity) => {
    try {
      const response = await api.patch(`/cart/items/${itemId}`, { quantity });
      set({ cart: response.data.data });
    } catch (error) {
      throw error;
    }
  },

  removeItem: async (itemId) => {
    try {
      const response = await api.delete(`/cart/items/${itemId}`);
      set({ cart: response.data.data });
    } catch (error) {
      throw error;
    }
  },

  clearCart: async () => {
    try {
      const response = await api.delete('/cart');
      set({ cart: response.data.data });
    } catch (error) {
      throw error;
    }
  },

  openCartDrawer: () => set({ isCartDrawerOpen: true }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),
}));
