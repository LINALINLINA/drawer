import { create } from "zustand";

type BlindBoxState = {
  unlockedIds: string[];
  openQueue: string[];
  isAnimating: boolean;
  totalCount: number;

  unlock: (id: string) => void;
  isUnlocked: (id: string) => boolean;
  queueOpen: (id: string) => void;
  setAnimating: (v: boolean) => void;
  setTotalCount: (n: number) => void;
  resetUnlocks: () => void;
};

const STORAGE_KEY = "drawer_unlocked";

function loadUnlocked(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUnlocked(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export const useBlindBoxStore = create<BlindBoxState>((set, get) => ({
  unlockedIds: loadUnlocked(),
  openQueue: [],
  isAnimating: false,
  totalCount: 0,

  unlock: (id) => {
    const next = [...get().unlockedIds, id];
    set({ unlockedIds: next });
    saveUnlocked(next);
  },

  isUnlocked: (id) => get().unlockedIds.includes(id),

  queueOpen: (id) => {
    if (get().isUnlocked(id)) return;
    set({ openQueue: [id], isAnimating: true });
  },

  setAnimating: (v) => set({ isAnimating: v }),

  setTotalCount: (n) => set({ totalCount: n }),

  resetUnlocks: () => {
    set({ unlockedIds: [] });
    saveUnlocked([]);
  },
}));
