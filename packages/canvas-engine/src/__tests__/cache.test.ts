import { describe, it, expect, beforeEach } from "vitest";
import { TemplateCache } from "../cache";

describe("TemplateCache", () => {
  let cache: TemplateCache;
  const regions = [
    {
      id: "r1",
      path: "M10,10 L90,10 L90,80 L10,80 Z",
      bbox: { x: 10, y: 10, w: 80, h: 70 },
    },
  ];

  beforeEach(() => {
    cache = new TemplateCache();
  });

  it("builds and returns an OffscreenCanvas", () => {
    const result = cache.build(400, 400, regions, { r1: "#ff0000" });
    expect(result).toBeDefined();
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
  });

  it("getCanvas returns the cached canvas after build", () => {
    expect(cache.getCanvas()).toBeNull();
    cache.build(400, 400, regions, { r1: "#ff0000" });
    const canvas = cache.getCanvas();
    expect(canvas).not.toBeNull();
    expect(canvas!.width).toBe(400);
  });

  it("reuses the same OffscreenCanvas for same dimensions", () => {
    const first = cache.build(400, 400, regions, { r1: "#ff0000" });
    const second = cache.build(400, 400, regions, { r1: "#00ff00" });
    expect(first).toBe(second); // same reference
  });

  it("creates a new OffscreenCanvas when dimensions change", () => {
    const first = cache.build(400, 400, regions, { r1: "#ff0000" });
    const second = cache.build(800, 600, regions, { r1: "#ff0000" });
    expect(first).not.toBe(second); // different reference
    expect(second.width).toBe(800);
    expect(second.height).toBe(600);
  });

  it("destroy clears the cached canvas", () => {
    cache.build(400, 400, regions, { r1: "#ff0000" });
    expect(cache.getCanvas()).not.toBeNull();
    cache.destroy();
    expect(cache.getCanvas()).toBeNull();
  });
});
