import type { BBox } from "./types";

export type HitRegion = {
  id: string;
  path: string;
  bbox: BBox;
  path2d: Path2D;
};

const STAMP_BASE_SIZE = 32;

function pointInBBox(x: number, y: number, bbox: BBox): boolean {
  return (
    x >= bbox.x && x <= bbox.x + bbox.w && y >= bbox.y && y <= bbox.y + bbox.h
  );
}

export function hitTestRegion(
  x: number,
  y: number,
  regions: HitRegion[],
  ctx: CanvasRenderingContext2D,
): string | null {
  for (const region of regions) {
    if (!pointInBBox(x, y, region.bbox)) continue;
    if (ctx.isPointInPath(region.path2d, x, y)) {
      return region.id;
    }
  }
  return null;
}

export function hitTestStamp(
  x: number,
  y: number,
  stamps: { id: string; x: number; y: number; scale: number }[],
): string | null {
  for (let i = stamps.length - 1; i >= 0; i--) {
    const s = stamps[i];
    const half = (STAMP_BASE_SIZE * s.scale) / 2;
    if (
      x >= s.x - half &&
      x <= s.x + half &&
      y >= s.y - half &&
      y <= s.y + half
    ) {
      return s.id;
    }
  }
  return null;
}
