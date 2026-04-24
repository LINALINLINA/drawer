import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadTemplateIndex, loadTemplate } from "../loader";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("loadTemplateIndex", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns template entries from valid response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ templates: [{ id: "t1", file: "cute/star.json" }] }),
    });
    const entries = await loadTemplateIndex("/templates/index.json");
    expect(entries).toEqual([{ id: "t1", file: "cute/star.json" }]);
  });

  it("returns empty array on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const entries = await loadTemplateIndex("/templates/index.json");
    expect(entries).toEqual([]);
  });

  it("returns empty array when ok is false", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const entries = await loadTemplateIndex("/templates/index.json");
    expect(entries).toEqual([]);
  });

  it("returns empty array when templates field is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const entries = await loadTemplateIndex("/templates/index.json");
    expect(entries).toEqual([]);
  });
});

describe("loadTemplate", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("loads and validates a template", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "test-1",
        name: "Test",
        category: "cute",
        difficulty: "easy",
        viewBox: { x: 0, y: 0, w: 400, h: 400 },
        regions: [
          {
            id: "r1",
            path: "M10,10 L90,10 L90,80 L10,80 Z",
            bbox: { x: 10, y: 10, w: 80, h: 70 },
          },
        ],
        thumbnail: "",
      }),
    });
    const template = await loadTemplate("/test.json");
    expect(template).not.toBeNull();
    expect(template!.id).toBe("test-1");
    expect(template!.regions).toHaveLength(1);
  });

  it("returns null on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Not found"));
    const result = await loadTemplate("/nonexistent.json");
    expect(result).toBeNull();
  });

  it("returns null when ok is false", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await loadTemplate("/nonexistent.json");
    expect(result).toBeNull();
  });

  it("ensures bbox on regions without bbox", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "test-2",
        name: "Test",
        category: "cute",
        difficulty: "easy",
        viewBox: { x: 0, y: 0, w: 400, h: 400 },
        regions: [{ id: "r1", path: "M10,10 L90,10 L90,80 L10,80 Z" }],
        thumbnail: "",
      }),
    });
    const template = await loadTemplate("/test2.json");
    expect(template!.regions[0].bbox).toBeDefined();
    expect(template!.regions[0].bbox.w).toBeGreaterThan(0);
    expect(template!.regions[0].bbox.h).toBeGreaterThan(0);
  });

  it("ensures bbox on regions with invalid bbox (w=0)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "test-3",
        name: "Test",
        category: "cute",
        difficulty: "easy",
        viewBox: { x: 0, y: 0, w: 400, h: 400 },
        regions: [
          {
            id: "r1",
            path: "M10,10 L90,10 L90,80 L10,80 Z",
            bbox: { x: 0, y: 0, w: 0, h: 0 },
          },
        ],
        thumbnail: "",
      }),
    });
    const template = await loadTemplate("/test3.json");
    // Invalid bbox should be recomputed from path
    expect(template!.regions[0].bbox.w).toBeGreaterThan(0);
  });

  it("defaults thumbnail to empty string", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "test-4",
        name: "Test",
        category: "cute",
        difficulty: "easy",
        viewBox: { x: 0, y: 0, w: 400, h: 400 },
        regions: [],
      }),
    });
    const template = await loadTemplate("/test4.json");
    expect(template!.thumbnail).toBe("");
  });
});
