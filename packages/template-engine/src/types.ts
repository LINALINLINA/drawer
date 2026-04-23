export type BBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Region = {
  id: string;
  path: string;
  bbox: BBox;
};

export type TemplateCategory = "cute" | "nature" | "mandala" | "pixel";
export type TemplateDifficulty = "easy" | "medium" | "hard";

export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  viewBox: { x: number; y: number; w: number; h: number };
  regions: Region[];
  thumbnail: string;
};
