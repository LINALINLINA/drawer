import { describe, it, expect } from "vitest";
import { getPalettes, getPaletteById } from "../palettes";

describe("getPalettes", () => {
  it("returns at least 3 preset palettes", () => {
    const palettes = getPalettes();
    expect(palettes.length).toBeGreaterThanOrEqual(3);
  });

  it("each palette has at least 4 colors", () => {
    const palettes = getPalettes();
    for (const p of palettes) {
      expect(p.colors.length).toBeGreaterThanOrEqual(4);
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
    }
  });
});

describe("getPaletteById", () => {
  it("returns the correct palette", () => {
    const palette = getPaletteById("sunset");
    expect(palette).toBeTruthy();
    expect(palette!.name).toBeTruthy();
  });

  it("returns null for unknown id", () => {
    const palette = getPaletteById("nonexistent");
    expect(palette).toBeNull();
  });
});
