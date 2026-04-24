export type BBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Stroke = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  style: "solid" | "dashed";
};

export type StampType = "emoji" | "builtin" | "custom";

export type Stamp = {
  id: string;
  type: StampType;
  value: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

export type CanvasState = {
  fills: Record<string, string>;
  strokes: Stroke[];
  stamps: Stamp[];
  selectedRegionId: string | null;
};

export type EditorTool = "fill" | "brush" | "eraser" | "stamp";
