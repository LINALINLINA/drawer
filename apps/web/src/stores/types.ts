import type { CanvasState } from "@drawer/canvas-engine";

export type Artwork = {
  id: string;
  templateId: string;
  state: CanvasState;
  palette: string[];
  createdAt: number;
};
