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
  /** 原始线条的 PNG 图像路径（相对于 /templates/ 目录），用 multiply 混合叠加显示线条 */
  outlineImage?: string;
  thumbnail: string;
};
