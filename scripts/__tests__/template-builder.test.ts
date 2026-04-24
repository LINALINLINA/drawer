import { describe, it, expect } from "vitest";
import {
  inferDifficulty,
  generateTemplateId,
  buildTemplate,
} from "../template-builder";

describe("inferDifficulty", () => {
  it("returns easy for 5 or fewer regions", () => {
    expect(inferDifficulty(0)).toBe("easy");
    expect(inferDifficulty(3)).toBe("easy");
    expect(inferDifficulty(5)).toBe("easy");
  });

  it("returns medium for 6-12 regions", () => {
    expect(inferDifficulty(6)).toBe("medium");
    expect(inferDifficulty(12)).toBe("medium");
  });

  it("returns hard for more than 12 regions", () => {
    expect(inferDifficulty(13)).toBe("hard");
    expect(inferDifficulty(30)).toBe("hard");
  });
});

describe("generateTemplateId", () => {
  it("generates id from category and name", () => {
    const id = generateTemplateId("cute", "小猫咪");
    expect(id).toContain("cute");
    expect(id).toContain("小猫咪");
  });

  it("generates id with fallback for non-latin names", () => {
    const id = generateTemplateId("nature", "!");
    expect(id).toContain("nature");
    expect(id).toContain("img-");
  });
});

describe("buildTemplate", () => {
  it("builds a valid template with auto difficulty", () => {
    const template = buildTemplate({
      name: "测试",
      category: "nature",
      regions: [
        {
          id: "r1",
          path: "M0,0 L10,0 L10,10 Z",
          bbox: { x: 0, y: 0, w: 10, h: 10 },
        },
        {
          id: "r2",
          path: "M20,20 L30,20 L30,30 Z",
          bbox: { x: 20, y: 20, w: 10, h: 10 },
        },
      ],
    });

    expect(template.name).toBe("测试");
    expect(template.category).toBe("nature");
    expect(template.difficulty).toBe("easy");
    expect(template.viewBox).toEqual({ x: 0, y: 0, w: 400, h: 400 });
    expect(template.regions).toHaveLength(2);
    expect(template.thumbnail).toBe("");
  });

  it("uses explicit difficulty when provided", () => {
    const template = buildTemplate({
      name: "测试",
      category: "cute",
      difficulty: "hard",
      regions: [],
    });
    expect(template.difficulty).toBe("hard");
  });

  it("uses custom id when provided", () => {
    const template = buildTemplate({
      name: "测试",
      category: "mandala",
      id: "custom-id-01",
      regions: [],
    });
    expect(template.id).toBe("custom-id-01");
  });
});
