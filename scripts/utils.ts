export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Region {
  id: string;
  path: string;
  bbox: BBox;
}

export function computeBBoxFromPixels(
  pixels: Array<{ x: number; y: number }>,
): BBox {
  if (pixels.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const { x, y } of pixels) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function generateId(index: number): string {
  return `region-${index + 1}`;
}
