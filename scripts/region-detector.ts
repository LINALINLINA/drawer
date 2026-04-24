import type { BinaryImage } from "./preprocess";
import { getPixel } from "./preprocess";

export interface DetectedRegion {
  pixels: Array<{ x: number; y: number }>;
  area: number;
}

export function detectRegions(
  img: BinaryImage,
  minArea: number = 500,
): DetectedRegion[] {
  const visited = new Uint8Array(img.width * img.height);
  const regions: DetectedRegion[] = [];

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const idx = y * img.width + x;
      if (visited[idx]) continue;
      if (getPixel(img, x, y) === 0) continue;

      const pixels: Array<{ x: number; y: number }> = [];
      const queue: Array<{ x: number; y: number }> = [{ x, y }];
      visited[idx] = 1;

      while (queue.length > 0) {
        const p = queue.shift()!;
        pixels.push(p);

        const neighbors = [
          { x: p.x - 1, y: p.y },
          { x: p.x + 1, y: p.y },
          { x: p.x, y: p.y - 1 },
          { x: p.x, y: p.y + 1 },
        ];

        for (const n of neighbors) {
          if (n.x < 0 || n.x >= img.width || n.y < 0 || n.y >= img.height)
            continue;
          const nIdx = n.y * img.width + n.x;
          if (visited[nIdx]) continue;
          if (getPixel(img, n.x, n.y) === 0) continue;
          visited[nIdx] = 1;
          queue.push(n);
        }
      }

      if (pixels.length >= minArea) {
        regions.push({ pixels, area: pixels.length });
      }
    }
  }

  return regions;
}
