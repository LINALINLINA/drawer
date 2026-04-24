import { create } from "zustand";
import type {
  CanvasState,
  Stroke,
  Stamp,
  EditorTool,
} from "@drawer/canvas-engine";
import type { Template } from "@drawer/template-engine";
import type { Palette } from "@drawer/color-engine";
import type { Artwork } from "./types";

type EditorState = {
  template: Template | null;
  canvasState: CanvasState;
  history: CanvasState[];
  historyIndex: number;
  activeTool: EditorTool;
  activeColor: string;
  activePalette: Palette;
  strokeSettings: { color: string; width: number; style: "solid" | "dashed" };
  selectedStamp: { type: Stamp["type"]; value: string } | null;

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
    stamp: { type: Stamp["type"]; value: string } | null,
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

export const useEditorStore = create<EditorState>((set, get) => ({
  template: null,
  canvasState: { fills: {}, strokes: [], stamps: [], selectedRegionId: null },
  history: [],
  historyIndex: -1,
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
  setActiveColor: (color) => set({ activeColor: color }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setActivePalette: (palette) => set({ activePalette: palette }),
  setStrokeSettings: (settings) =>
    set((s) => ({ strokeSettings: { ...s.strokeSettings, ...settings } })),
  setSelectedStamp: (stamp) => set({ selectedStamp: stamp }),

  fillRegion: (regionId, color) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));
    const newFills = { ...canvasState.fills, [regionId]: color };
    const newState: CanvasState = { ...canvasState, fills: newFills };
    set({
      canvasState: newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addStroke: (stroke) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));
    const newState: CanvasState = {
      ...canvasState,
      strokes: [...canvasState.strokes, stroke],
    };
    set({
      canvasState: newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addStamp: (stamp) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));
    const newState: CanvasState = {
      ...canvasState,
      stamps: [...canvasState.stamps, stamp],
    };
    set({
      canvasState: newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  removeStroke: (id) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));
    const newState: CanvasState = {
      ...canvasState,
      strokes: canvasState.strokes.filter((s) => s.id !== id),
    };
    set({
      canvasState: newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  removeStamp: (id) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));
    const newState: CanvasState = {
      ...canvasState,
      stamps: canvasState.stamps.filter((s) => s.id !== id),
    };
    set({
      canvasState: newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { canvasState, history, historyIndex } = get();
    if (historyIndex < 0) return;
    const prev = history[historyIndex];
    set({
      canvasState: cloneState(prev),
      history: [...history, cloneState(canvasState)],
      historyIndex,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    const nextIndex = historyIndex + 1;
    if (nextIndex >= history.length) return;
    set({
      canvasState: cloneState(history[nextIndex]),
      historyIndex: nextIndex,
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
    set({
      canvasState: cloneState(artwork.state),
      history: [],
      historyIndex: -1,
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
