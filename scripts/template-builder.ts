import type { Region } from "./utils";

export type TemplateCategory = "cute" | "nature" | "mandala" | "pixel";
export type TemplateDifficulty = "easy" | "medium" | "hard";

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  viewBox: { x: number; y: number; w: number; h: number };
  regions: Region[];
  /** 原始线条 PNG 图像路径（相对于 /templates/ 目录），用 multiply 混合叠加显示线条 */
  outlineImage?: string;
  thumbnail: string;
}

export function inferDifficulty(regionCount: number): TemplateDifficulty {
  // 难度规则保持与前端筛选/测试约定一致，避免批量生成后难度分布失真
  if (regionCount <= 5) return "easy";
  if (regionCount <= 12) return "medium";
  return "hard";
}

let idCounter = 0;

export function generateTemplateId(
  category: TemplateCategory,
  name: string,
): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  idCounter++;
  return `${category}-${slug || `img-${idCounter}`}`;
}

export function buildTemplate(options: {
  name: string;
  category: TemplateCategory;
  difficulty?: TemplateDifficulty;
  viewBoxSize?: number;
  regions: Region[];
  outlineImage?: string;
  id?: string;
}): Template {
  const size = options.viewBoxSize ?? 400;
  const difficulty =
    options.difficulty ?? inferDifficulty(options.regions.length);

  return {
    id: options.id ?? generateTemplateId(options.category, options.name),
    name: options.name,
    category: options.category,
    difficulty,
    viewBox: { x: 0, y: 0, w: size, h: size },
    regions: options.regions,
    outlineImage: options.outlineImage,
    thumbnail: "",
  };
}
