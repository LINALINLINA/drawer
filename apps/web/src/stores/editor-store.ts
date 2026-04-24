import { create } from "zustand";
import type {
  CanvasState,
  Stroke,
  Stamp,
  StampStyle,
  EditorTool,
} from "@drawer/canvas-engine";
import type { Template } from "@drawer/template-engine";
import type { Palette } from "@drawer/color-engine";
import type { Artwork } from "./types";

const INITIAL_STATE: CanvasState = {
  fills: {},
  strokes: [],
  stamps: [],
  selectedRegionId: null,
};

type EditorState = {
  template: Template | null;
  canvasState: CanvasState;
  history: CanvasState[];
  historyIndex: number;
  activeTool: EditorTool;
  activeColor: string;
  activePalette: Palette;
  strokeSettings: { color: string; width: number; style: "solid" | "dashed" };
  selectedStamp: {
    type: Stamp["type"];
    value: string;
    style: StampStyle;
  } | null;

  setTemplate: (template: Template) => void;
  setActiveColor: (color: string) => void;
  setActiveTool: (tool: EditorTool) => void;
  setActivePalette: (palette: Palette) => void;
  setStrokeSettings: (
    settings: Partial<{
      color: string;
      width: number;
      style: "solid" | "dashed";
    }>,
  ) => void;
  setSelectedStamp: (
    stamp: { type: Stamp["type"]; value: string; style: StampStyle } | null,
  ) => void;

  fillRegion: (regionId: string, color: string) => void;
  addStroke: (stroke: Stroke) => void;
  addStamp: (stamp: Stamp) => void;
  removeStroke: (id: string) => void;
  removeStamp: (id: string) => void;
  undo: () => void;
  redo: () => void;
  saveArtwork: () => void;
  loadArtwork: (artwork: Artwork) => void;
};

function cloneState(state: CanvasState): CanvasState {
  return JSON.parse(JSON.stringify(state));
}

function readArtworksFromStorage(): Artwork[] {
  try {
    const raw = localStorage.getItem("drawer_artworks");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushHistory(
  state: EditorState,
  newState: CanvasState,
): Partial<EditorState> {
  const { history, historyIndex } = state;
  // 惰性截断：只在新操作时截断未来历史
  if (historyIndex < history.length - 1) {
    history.length = historyIndex + 1;
  }
  history.push(cloneState(newState));
  return {
    canvasState: newState,
    historyIndex: history.length - 1,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  template: null,
  canvasState: { ...INITIAL_STATE },
  history: [{ ...INITIAL_STATE }],
  historyIndex: 0,
  activeTool: "fill",
  activeColor: "#ff0000",
  activePalette: {
    id: "sunset",
    name: "日落",
    colors: ["#FF6B6B", "#FFA07A", "#FFD700", "#FF8C00", "#C0392B"],
  },
  strokeSettings: { color: "#000000", width: 3, style: "solid" },
  selectedStamp: null,

  setTemplate: (template) => set({ template }),
  setActiveColor: (color) =>
    set((s) => ({
      activeColor: color,
      strokeSettings: { ...s.strokeSettings, color },
    })),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setActivePalette: (palette) => set({ activePalette: palette }),
  setStrokeSettings: (settings) =>
    set((s) => ({ strokeSettings: { ...s.strokeSettings, ...settings } })),
  setSelectedStamp: (stamp) => set({ selectedStamp: stamp }),

  fillRegion: (regionId, color) => {
    const s = get();
    const newState: CanvasState = {
      ...s.canvasState,
      fills: { ...s.canvasState.fills, [regionId]: color },
    };
    set(pushHistory(s, newState));
  },

  addStroke: (stroke) => {
    const s = get();
    const newState: CanvasState = {
      ...s.canvasState,
      strokes: [...s.canvasState.strokes, stroke],
    };
    set(pushHistory(s, newState));
  },

  addStamp: (stamp) => {
    const s = get();
    const newState: CanvasState = {
      ...s.canvasState,
      stamps: [...s.canvasState.stamps, stamp],
    };
    set(pushHistory(s, newState));
  },

  removeStroke: (id) => {
    const s = get();
    const newState: CanvasState = {
      ...s.canvasState,
      strokes: s.canvasState.strokes.filter((st) => st.id !== id),
    };
    set(pushHistory(s, newState));
  },

  removeStamp: (id) => {
    const s = get();
    const newState: CanvasState = {
      ...s.canvasState,
      stamps: s.canvasState.stamps.filter((st) => st.id !== id),
    };
    set(pushHistory(s, newState));
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    set({
      canvasState: cloneState(history[historyIndex - 1]),
      historyIndex: historyIndex - 1,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex + 1 >= history.length) return;
    set({
      canvasState: cloneState(history[historyIndex + 1]),
      historyIndex: historyIndex + 1,
    });
  },

  saveArtwork: () => {
    const { template, canvasState, activePalette } = get();
    if (!template) return;
    const artworks = readArtworksFromStorage();
    const existing = artworks.findIndex((a) => a.templateId === template.id);
    const artwork: Artwork = {
      id: existing >= 0 ? artworks[existing].id : crypto.randomUUID(),
      templateId: template.id,
      state: cloneState(canvasState),
      palette: activePalette.colors,
      createdAt: existing >= 0 ? artworks[existing].createdAt : Date.now(),
    };
    if (existing >= 0) {
      artworks[existing] = artwork;
    } else {
      artworks.unshift(artwork);
    }
    localStorage.setItem("drawer_artworks", JSON.stringify(artworks));
  },

  loadArtwork: (artwork) => {
    const state = cloneState(artwork.state);
    set({
      canvasState: state,
      history: [{ ...INITIAL_STATE }, cloneState(state)],
      historyIndex: 1,
    });
  },
}));

export function loadAllArtworks(): Artwork[] {
  return readArtworksFromStorage();
}

export function deleteArtwork(id: string): void {
  const artworks = readArtworksFromStorage().filter((a) => a.id !== id);
  localStorage.setItem("drawer_artworks", JSON.stringify(artworks));
}
