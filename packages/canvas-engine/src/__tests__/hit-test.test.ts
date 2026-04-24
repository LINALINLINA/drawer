import { describe, it, expect } from "vitest";
import { hitTestStamp } from "../hit-test";

// NOTE: hitTestRegion requires CanvasRenderingContext2D which needs jsdom/happy-dom
// For now we test hitTestStamp which is pure math

describe("hitTestStamp", () => {
  it("returns stamp id when point is inside stamp bbox", () => {
    const stamps = [
      { id: "s1", x: 100, y: 100, scale: 1 },
      { id: "s2", x: 200, y: 200, scale: 2 },
    ];
    const result = hitTestStamp(110, 110, stamps);
    expect(result).toBe("s1");
  });

  it("returns null when point is outside all stamps", () => {
    const stamps = [{ id: "s1", x: 100, y: 100, scale: 1 }];
    const result = hitTestStamp(0, 0, stamps);
    expect(result).toBeNull();
  });

  it("checks stamps from last to first (top layer first)", () => {
    const overlapping = [
      { id: "bottom", x: 100, y: 100, scale: 1 },
      { id: "top", x: 100, y: 100, scale: 1 },
    ];
    const result = hitTestStamp(110, 110, overlapping);
    expect(result).toBe("top");
  });

  it("accounts for stamp scale", () => {
    const stamps = [{ id: "big", x: 200, y: 200, scale: 2 }];
    // scale 2: half = (32*2)/2 = 32, so range is 168-232
    const result = hitTestStamp(230, 230, stamps);
    expect(result).toBe("big");
  });
});
