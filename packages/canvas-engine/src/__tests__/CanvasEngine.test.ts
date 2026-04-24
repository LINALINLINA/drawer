import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CanvasEngine } from "../CanvasEngine";
import type { CanvasState } from "../types";

describe("CanvasEngine", () => {
  let container: HTMLElement;
  let engine: CanvasEngine;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    engine = new CanvasEngine(container, 400, 300);
  });

  afterEach(() => {
    engine.destroy();
    document.body.removeChild(container);
  });

  const regions = [
    {
      id: "header",
      path: "M0,0 L400,0 L400,60 L0,60 Z",
      bbox: { x: 0, y: 0, w: 400, h: 60 } as {
        x: number;
        y: number;
        w: number;
        h: number;
      },
    },
    {
      id: "body",
      path: "M0,60 L400,60 L400,300 L0,300 Z",
      bbox: { x: 0, y: 60, w: 400, h: 240 } as {
        x: number;
        y: number;
        w: number;
        h: 240;
      },
    },
  ];

  const emptyState: CanvasState = {
    fills: {},
    strokes: [],
    stamps: [],
    selectedRegionId: null,
  };

  it("creates two canvas elements in the container", () => {
    const canvases = container.querySelectorAll("canvas");
    expect(canvases.length).toBe(2);
  });

  it("getDrawCanvas returns the draw layer canvas", () => {
    const drawCanvas = engine.getDrawCanvas();
    expect(drawCanvas).toBeDefined();
    expect(drawCanvas.width).toBe(400);
    expect(drawCanvas.height).toBe(300);
  });

  it("setTemplate stores regions for hit testing", () => {
    engine.setTemplate(regions);
    const result = engine.hitTest(200, 30);
    expect(result).toEqual({ type: "region", id: "header" });
  });

  it("hitTest returns null when nothing is hit", () => {
    engine.setTemplate(regions);
    const result = engine.hitTest(-10, -10);
    expect(result).toBeNull();
  });

  it("render does not throw with valid state", () => {
    engine.setTemplate(regions);
    const state: CanvasState = {
      fills: { header: "#ff0000", body: "#ffffff" },
      strokes: [],
      stamps: [],
      selectedRegionId: null,
    };
    expect(() => engine.render(state)).not.toThrow();
  });

  it("render stores state for hit testing stamps", () => {
    engine.setTemplate(regions);
    const state: CanvasState = {
      fills: { header: "#ff0000", body: "#ffffff" },
      strokes: [],
      stamps: [
        {
          id: "s1",
          type: "emoji",
          value: "X",
          x: 200,
          y: 150,
          scale: 1,
          rotate: 0,
        },
      ],
      selectedRegionId: null,
    };
    engine.render(state);
    const result = engine.hitTest(200, 150);
    expect(result).toEqual({ type: "stamp", id: "s1" });
  });

  it("destroy cleans up the container", () => {
    engine.destroy();
    expect(container.innerHTML).toBe("");
  });

  it("hitTest prefers stamps over regions (top layer first)", () => {
    engine.setTemplate(regions);
    const state: CanvasState = {
      fills: { header: "#ff0000", body: "#ffffff" },
      strokes: [],
      stamps: [
        {
          id: "s1",
          type: "emoji",
          value: "X",
          x: 200,
          y: 30,
          scale: 2,
          rotate: 0,
        },
      ],
      selectedRegionId: null,
    };
    engine.render(state);
    const result = engine.hitTest(200, 30);
    expect(result).toEqual({ type: "stamp", id: "s1" });
  });
});
