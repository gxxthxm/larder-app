import { create } from 'zustand';

type ActionSheet = { kind: 'use' | 'toss'; itemId: string } | null;

interface UIState {
  actionSheet: ActionSheet;
  settingsOpen: boolean;
  confetti: number;
  openAction: (kind: 'use' | 'toss', itemId: string) => void;
  closeAction: () => void;
  setSettingsOpen: (v: boolean) => void;
  celebrate: () => void;
}

export const useUI = create<UIState>()((set, get) => ({
  actionSheet: null,
  settingsOpen: false,
  confetti: 0,
  openAction: (kind, itemId) => set({ actionSheet: { kind, itemId } }),
  closeAction: () => set({ actionSheet: null }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  celebrate: () => set({ confetti: get().confetti + 1 }),
}));

/** Rows read this to know which way to slide out when removed. */
export const exitDirection = new Map<string, 'left' | 'right' | 'up'>();
