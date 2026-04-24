import { describe, it, expect } from "vitest";
import { detectRegions } from "../region-detector";
import type { BinaryImage } from "../preprocess";

function createTestImage(
  width: number,
  height: number,
  fillRects: Array<{ x: number; y: number; w: number; h: number }>,
): BinaryImage {
  const data = new Uint8Array(width * height);
  for (const rect of fillRects) {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          data[y * width + x] = 255;
        }
      }
    }
  }
  return { width, height, data };
}

describe("detectRegions", () => {
  it("detects two separate regions", () => {
    const img = createTestImage(100, 100, [
      { x: 5, y: 5, w: 20, h: 20 },
      { x: 50, y: 50, w: 20, h: 20 },
    ]);
    const regions = detectRegions(img, 100);
    expect(regions).toHaveLength(2);
    expect(regions[0].area).toBe(400);
    expect(regions[1].area).toBe(400);
  });

  it("filters out regions smaller than minArea", () => {
    const img = createTestImage(100, 100, [
      { x: 5, y: 5, w: 3, h: 3 },
      { x: 50, y: 50, w: 20, h: 20 },
    ]);
    const regions = detectRegions(img, 100);
    expect(regions).toHaveLength(1);
    expect(regions[0].area).toBe(400);
  });

  it("returns empty for blank image", () => {
    const img: BinaryImage = {
      width: 50,
      height: 50,
      data: new Uint8Array(2500),
    };
    const regions = detectRegions(img, 10);
    expect(regions).toHaveLength(0);
  });
});
