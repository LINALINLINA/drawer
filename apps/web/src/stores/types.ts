import type { CanvasState } from "@drawer/canvas-engine";

export type Artwork = {
  id: string;
  templateId: string;
  templateName?: string;
  state: CanvasState;
  palette: string[];
  /** base64 PNG 缩略图，保存时由编辑器生成 */
  thumbnail?: string;
  createdAt: number;
  updatedAt?: number;
};
