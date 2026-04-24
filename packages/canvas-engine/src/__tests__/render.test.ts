import { describe, it, expect, beforeEach } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { renderTemplateLayer, renderDrawLayer } from "../render";
import type { CanvasState } from "../types";

describe("renderTemplateLayer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    const canvas = createCanvas(400, 400);
    ctx = canvas.getContext("2d")!;
  });

  it("renders regions with fill colors", () => {
    const regions = [
      {
        id: "r1",
        path: "M10,10 L90,10 L90,80 L10,80 Z",
        bbox: { x: 10, y: 10, w: 80, h: 70 },
      },
    ];
    renderTemplateLayer(ctx, regions, { r1: "#ff0000" });
    const pixel = ctx.getImageData(50, 50, 1, 1).data;
    expect(pixel[0]).toBe(255); // R
    expect(pixel[1]).toBe(0);
    expect(pixel[2]).toBe(0);
  });

  it("renders region borders even without fill", () => {
    const regions = [
      {
        id: "r1",
        path: "M10,10 L90,10 L90,80 L10,80 Z",
        bbox: { x: 10, y: 10, w: 80, h: 70 },
      },
    ];
    renderTemplateLayer(ctx, regions, {});
    // Border should be drawn (check a border pixel)
    const pixel = ctx.getImageData(10, 10, 1, 1).data;
    expect(pixel[3]).toBeGreaterThan(0); // has alpha (border)
  });

  it("clears canvas before rendering", () => {
    const regions = [
      {
        id: "r1",
        path: "M10,10 L90,10 L90,80 L10,80 Z",
        bbox: { x: 10, y: 10, w: 80, h: 70 },
      },
    ];
    // First render
    renderTemplateLayer(ctx, regions, { r1: "#ff0000" });
    // Second render with no fills
    renderTemplateLayer(ctx, regions, {});
    const pixel = ctx.getImageData(50, 50, 1, 1).data;
    // Interior should no longer have fill color
    expect(pixel[0]).toBe(0);
  });

  it("renders multiple regions", () => {
    const regions = [
      {
        id: "r1",
        path: "M10,10 L50,10 L50,50 L10,50 Z",
        bbox: { x: 10, y: 10, w: 40, h: 40 },
      },
      {
        id: "r2",
        path: "M60,10 L100,10 L100,50 L60,50 Z",
        bbox: { x: 60, y: 10, w: 40, h: 40 },
      },
    ];
    renderTemplateLayer(ctx, regions, { r1: "#ff0000", r2: "#00ff00" });

    const pixel1 = ctx.getImageData(30, 30, 1, 1).data;
    expect(pixel1[0]).toBe(255);
    expect(pixel1[1]).toBe(0);

    const pixel2 = ctx.getImageData(80, 30, 1, 1).data;
    expect(pixel2[0]).toBe(0);
    expect(pixel2[1]).toBe(255);
  });
});

describe("renderDrawLayer", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    const canvas = createCanvas(400, 400);
    ctx = canvas.getContext("2d")!;
  });

  it("renders a stroke", () => {
    const state: CanvasState = {
      fills: {},
      strokes: [
        {
          id: "s1",
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
          color: "#000000",
          width: 2,
          style: "solid",
        },
      ],
      stamps: [],
      selectedRegionId: null,
    };
    renderDrawLayer(ctx, state);
    const pixel = ctx.getImageData(50, 50, 1, 1).data;
    expect(pixel[3]).toBeGreaterThan(0);
  });

  it("renders a stamp", () => {
    const state: CanvasState = {
      fills: {},
      strokes: [],
      stamps: [
        {
          id: "t1",
          type: "emoji",
          value: "X",
          x: 200,
          y: 200,
          scale: 1,
          rotate: 0,
        },
      ],
      selectedRegionId: null,
    };
    renderDrawLayer(ctx, state);
    const pixel = ctx.getImageData(200, 200, 1, 1).data;
    expect(pixel[3]).toBeGreaterThan(0);
  });

  it("renders dashed stroke", () => {
    const state: CanvasState = {
      fills: {},
      strokes: [
        {
          id: "s2",
          points: [
            { x: 0, y: 0 },
            { x: 200, y: 0 },
          ],
          color: "#000000",
          width: 2,
          style: "dashed",
        },
      ],
      stamps: [],
      selectedRegionId: null,
    };
    renderDrawLayer(ctx, state);
    // Dashed line: some pixels should have alpha, some shouldn't
    const onLine = ctx.getImageData(10, 0, 1, 1).data;
    expect(onLine[3]).toBeGreaterThan(0);
  });

  it("skips strokes with fewer than 2 points", () => {
    const state: CanvasState = {
      fills: {},
      strokes: [
        {
          id: "s1",
          points: [{ x: 50, y: 50 }],
          color: "#ff0000",
          width: 5,
          style: "solid",
        },
      ],
      stamps: [],
      selectedRegionId: null,
    };
    renderDrawLayer(ctx, state);
    const pixel = ctx.getImageData(50, 50, 1, 1).data;
    expect(pixel[3]).toBe(0);
  });

  it("clears canvas before rendering", () => {
    const state1: CanvasState = {
      fills: {},
      strokes: [
        {
          id: "s1",
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
          color: "#000000",
          width: 4,
          style: "solid",
        },
      ],
      stamps: [],
      selectedRegionId: null,
    };
    renderDrawLayer(ctx, state1);
    const pixel1 = ctx.getImageData(50, 50, 1, 1).data;
    expect(pixel1[3]).toBeGreaterThan(0);

    // Clear state
    const state2: CanvasState = {
      fills: {},
      strokes: [],
      stamps: [],
      selectedRegionId: null,
    };
    renderDrawLayer(ctx, state2);
    const pixel2 = ctx.getImageData(50, 50, 1, 1).data;
    expect(pixel2[3]).toBe(0);
  });
});
