import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../editor-store";

describe("editor-store", () => {
  beforeEach(() => {
    useEditorStore.setState({
      template: null,
      canvasState: {
        fills: {},
        strokes: [],
        stamps: [],
        selectedRegionId: null,
      },
      history: [],
      historyIndex: -1,
      activeTool: "fill",
      activeColor: "#ff0000",
      activePalette: {
        id: "sunset",
        name: "日落",
        colors: ["#FF6B6B", "#FFA07A", "#FFD700", "#FF8C00", "#C0392B"],
      },
    });
    localStorage.clear();
  });

  it("fills a region and pushes history", () => {
    useEditorStore.getState().fillRegion("r1", "#ff0000");
    const state = useEditorStore.getState();
    expect(state.canvasState.fills["r1"]).toBe("#ff0000");
    expect(state.history.length).toBe(1);
  });

  it("undo restores previous state", () => {
    const store = useEditorStore.getState();
    store.fillRegion("r1", "#ff0000");
    store.fillRegion("r2", "#00ff00");
    useEditorStore.getState().undo();
    const state = useEditorStore.getState();
    expect(state.canvasState.fills["r2"]).toBeUndefined();
    expect(state.canvasState.fills["r1"]).toBe("#ff0000");
  });

  it("redo restores undone state", () => {
    useEditorStore.getState().fillRegion("r1", "#ff0000");
    useEditorStore.getState().fillRegion("r2", "#00ff00");
    useEditorStore.getState().undo();
    useEditorStore.getState().redo();
    const state = useEditorStore.getState();
    expect(state.canvasState.fills["r2"]).toBe("#00ff00");
  });

  it("new action after undo truncates future history", () => {
    useEditorStore.getState().fillRegion("r1", "#ff0000");
    useEditorStore.getState().fillRegion("r2", "#00ff00");
    useEditorStore.getState().undo();
    useEditorStore.getState().fillRegion("r3", "#0000ff");
    const state = useEditorStore.getState();
    expect(state.historyIndex).toBe(2);
    expect(state.history.length).toBe(3);
  });

  it("sets active color", () => {
    useEditorStore.getState().setActiveColor("#00ff00");
    expect(useEditorStore.getState().activeColor).toBe("#00ff00");
  });

  it("sets active tool", () => {
    useEditorStore.getState().setActiveTool("brush");
    expect(useEditorStore.getState().activeTool).toBe("brush");
  });

  it("saves and loads artwork to localStorage", () => {
    useEditorStore.getState().setTemplate({
      id: "test-1",
      name: "Test",
      category: "cute",
      difficulty: "easy",
      viewBox: { x: 0, y: 0, w: 400, h: 400 },
      regions: [],
      thumbnail: "",
    });
    useEditorStore.getState().fillRegion("r1", "#ff0000");
    useEditorStore.getState().saveArtwork();

    const raw = localStorage.getItem("drawer_artworks");
    expect(raw).toBeTruthy();
    const artworks = JSON.parse(raw!);
    expect(artworks).toHaveLength(1);
    expect(artworks[0].state.fills["r1"]).toBe("#ff0000");
  });

  it("undo does nothing when history is empty", () => {
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().historyIndex).toBe(-1);
  });
});
