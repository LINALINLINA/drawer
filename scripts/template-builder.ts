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
  thumbnail: string;
}

export function inferDifficulty(regionCount: number): TemplateDifficulty {
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
    thumbnail: "",
  };
}
