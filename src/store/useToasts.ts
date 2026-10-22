import { create } from 'zustand';
import { uid } from '@/lib/utils';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  emoji?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = uid('toast');
    set({ toasts: [...get().toasts.slice(-2), { ...t, id }] });
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (t: Omit<Toast, 'id'>) => useToasts.getState().push(t);
