import { describe, it, expect } from "vitest";
import { preprocess, getPixel, setPixel } from "../preprocess";

describe("preprocess", () => {
  it("loads and binarizes a simple box image", async () => {
    const img = await preprocess(
      "scripts/__tests__/fixtures/simple-box.png",
      128,
    );
    expect(img.width).toBe(400);
    expect(img.height).toBe(400);

    const fillPixels = Array.from(img.data).filter((v) => v === 255).length;
    expect(fillPixels).toBeGreaterThan(0);
  });

  it("getPixel returns 0 for out-of-bounds", () => {
    const img = { width: 10, height: 10, data: new Uint8Array(100) };
    expect(getPixel(img, -1, 0)).toBe(0);
    expect(getPixel(img, 0, -1)).toBe(0);
    expect(getPixel(img, 10, 0)).toBe(0);
    expect(getPixel(img, 0, 10)).toBe(0);
  });

  it("setPixel ignores out-of-bounds", () => {
    const img = { width: 10, height: 10, data: new Uint8Array(100) };
    setPixel(img, -1, 0, 255);
    setPixel(img, 10, 10, 255);
    expect(img.data[0]).toBe(0);
  });
});
