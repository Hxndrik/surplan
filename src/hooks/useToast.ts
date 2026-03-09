import { create } from 'zustand';
import { createId } from '../lib/id';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],

  add: (message, type = 'info', duration = 3000) => {
    const id = createId();
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },

  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  success: (message) => {
    const id = createId();
    set((state) => ({ toasts: [...state.toasts, { id, message, type: 'success', duration: 2500 }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 2500);
  },

  error: (message) => {
    const id = createId();
    set((state) => ({ toasts: [...state.toasts, { id, message, type: 'error', duration: 4000 }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  info: (message) => {
    const id = createId();
    set((state) => ({ toasts: [...state.toasts, { id, message, type: 'info', duration: 2500 }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 2500);
  },
}));
