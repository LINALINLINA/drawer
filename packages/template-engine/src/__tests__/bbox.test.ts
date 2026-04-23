import { describe, it, expect } from "vitest";
import { computeBBox } from "../bbox";

describe("computeBBox", () => {
  it("computes bbox for a simple rectangle path", () => {
    const path = "M10,10 L100,10 L100,80 L10,80 Z";
    const bbox = computeBBox(path);
    expect(bbox).toEqual({ x: 10, y: 10, w: 90, h: 70 });
  });

  it("computes bbox for a circle path", () => {
    const path = "M200,150 A50,50,0,1,1,200,250 A50,50,0,1,1,200,150 Z";
    const bbox = computeBBox(path);
    expect(bbox.x).toBeCloseTo(150, 0);
    expect(bbox.y).toBeCloseTo(150, 0);
    expect(bbox.w).toBeCloseTo(100, 0);
    expect(bbox.h).toBeCloseTo(100, 0);
  });

  it("computes bbox for a curved path", () => {
    const path = "M10,10 C10,100 100,100 100,10";
    const bbox = computeBBox(path);
    expect(bbox.x).toBe(10);
    expect(bbox.y).toBe(10);
    expect(bbox.w).toBeCloseTo(90, -1);
    expect(bbox.h).toBeCloseTo(68, -1);
  });
});
