import { create } from 'zustand';

interface UIState {
  lastWeekendId?: string;
  setLastWeekend: (id: string) => void;
}

export const useUI = create<UIState>((set) => ({
  lastWeekendId: localStorage.getItem('joy.lastWeekend') || undefined,
  setLastWeekend: (id) => {
    localStorage.setItem('joy.lastWeekend', id);
    set({ lastWeekendId: id });
  },
}));
