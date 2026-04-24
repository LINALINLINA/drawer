import { describe, it, expect } from "vitest";
import { generateRandomPalette, hexToHSL, hslToHex } from "../generator";

describe("hexToHSL / hslToHex roundtrip", () => {
  it("converts hex to HSL and back", () => {
    const hex = "#FF6B6B";
    const hsl = hexToHSL(hex);
    const back = hslToHex(hsl.h, hsl.s, hsl.l);
    expect(back).toBe("#ff6b6b");
  });
});

describe("generateRandomPalette", () => {
  it("generates a palette with 5 colors", () => {
    const palette = generateRandomPalette(5);
    expect(palette.length).toBe(5);
    for (const color of palette) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("generates different palettes with different seeds", () => {
    const a = generateRandomPalette(5, 42);
    const b = generateRandomPalette(5, 99);
    expect(a).not.toEqual(b);
  });
});
