import { describe, it, expect } from "vitest";
import { generateRegionsFromImage } from "../path-generator";

function createBinaryImage(
  width: number,
  height: number,
  fillPixels: Array<{ x: number; y: number }>,
): Uint8Array {
  const data = new Uint8Array(width * height);
  for (const { x, y } of fillPixels) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      data[y * width + x] = 255;
    }
  }
  return data;
}

describe("generateRegionsFromImage", () => {
  it("generates one region for one rectangular block", async () => {
    const pixels: Array<{ x: number; y: number }> = [];
    for (let y = 10; y < 30; y++) {
      for (let x = 10; x < 30; x++) {
        pixels.push({ x, y });
      }
    }
    const data = createBinaryImage(40, 40, pixels);
    const regions = await generateRegionsFromImage(data, 40, 40);

    expect(regions).toHaveLength(1);
    expect(regions[0].path).toContain("M");
    expect(regions[0].bbox.w).toBeGreaterThanOrEqual(15);
    expect(regions[0].bbox.h).toBeGreaterThanOrEqual(15);
  });

  it("generates multiple regions for separate filled blocks", async () => {
    const pixels: Array<{ x: number; y: number }> = [];

    for (let y = 4; y < 16; y++) {
      for (let x = 4; x < 16; x++) {
        pixels.push({ x, y });
      }
    }

    for (let y = 22; y < 34; y++) {
      for (let x = 22; x < 34; x++) {
        pixels.push({ x, y });
      }
    }

    const data = createBinaryImage(40, 40, pixels);
    const regions = await generateRegionsFromImage(data, 40, 40);

    expect(regions).toHaveLength(2);
    expect(regions[0].id).toBe("region-1");
    expect(regions[1].id).toBe("region-2");
  });

  it("returns empty for blank image", async () => {
    const data = new Uint8Array(40 * 40);
    const regions = await generateRegionsFromImage(data, 40, 40);
    expect(regions).toHaveLength(0);
  });

  it("handles single pixel gracefully", async () => {
    const data = createBinaryImage(40, 40, [{ x: 20, y: 20 }]);
    const regions = await generateRegionsFromImage(data, 40, 40);
    // 单像素太小，potrace 可能输出也可能不输出
    expect(Array.isArray(regions)).toBe(true);
  });
});
