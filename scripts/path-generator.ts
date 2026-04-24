import { createCanvas } from "@napi-rs/canvas";
import potrace from "potrace";
import { detectRegions } from "./region-detector";
import type { BinaryImage } from "./preprocess";
import type { Region } from "./utils";
import { computeBBoxFromPixels, generateId } from "./utils";

export interface PathGeneratorOptions {
  potraceThreshold?: number;
  minArea?: number;
  excludeEdgeRegions?: boolean;
}

function touchesCanvasEdge(
  pixels: Array<{ x: number; y: number }>,
  width: number,
  height: number,
): boolean {
  return pixels.some(
    ({ x, y }) => x === 0 || y === 0 || x === width - 1 || y === height - 1,
  );
}

async function traceMaskToPath(
  maskData: Uint8Array,
  width: number,
  height: number,
  options: PathGeneratorOptions,
): Promise<string | null> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(width, height);

  for (let i = 0; i < maskData.length; i++) {
    // potrace 追踪「暗色」像素（0=黑=前景），因此需要反转 mask：
    //   region 像素（255）→ 0（黑色，potrace 前景，生成该区域的轮廓路径）
    //   背景像素（0）→ 255（白色，potrace 背景，忽略）
    const v = maskData[i] === 255 ? 0 : 255;
    imgData.data[i * 4] = v;
    imgData.data[i * 4 + 1] = v;
    imgData.data[i * 4 + 2] = v;
    imgData.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  const pngBuffer = Buffer.from(canvas.toBuffer("image/png"));

  const svg: string = await new Promise((resolve, reject) => {
    potrace.trace(
      pngBuffer,
      {
        threshold: options.potraceThreshold ?? 128,
        turdsize: 2,
        alphamax: 1,
        optcurve: true,
      },
      (err: Error | null, tracedSvg: string) => {
        if (err) reject(err);
        else resolve(tracedSvg);
      },
    );
  });

  const match = svg.match(/<path[^>]*d="([^"]+)"/);
  return match?.[1]?.trim() ?? null;
}

export async function generateRegionsFromImage(
  binaryData: Uint8Array,
  width: number,
  height: number,
  options: PathGeneratorOptions = {},
): Promise<Region[]> {
  const image: BinaryImage = { data: binaryData, width, height };
  const detectedRegions = detectRegions(image, options.minArea ?? 20).filter(
    (region) =>
      options.excludeEdgeRegions === false ||
      !touchesCanvasEdge(region.pixels, width, height),
  );

  if (detectedRegions.length === 0) return [];

  const tracedRegions = await Promise.all(
    detectedRegions.map(async (region, index) => {
      const mask = new Uint8Array(width * height);
      for (const pixel of region.pixels) {
        mask[pixel.y * width + pixel.x] = 255;
      }

      const pathData = await traceMaskToPath(mask, width, height, options);
      if (!pathData) return null;

      const bbox = computeBBoxFromPixels(region.pixels);
      if (bbox.w < 2 || bbox.h < 2) return null;

      return {
        id: generateId(index),
        path: pathData,
        bbox,
      };
    }),
  );

  return tracedRegions.filter((region): region is Region => region !== null);
}

/**
 * 追踪整张二值图像中的暗色像素（线条）生成单一轮廓 path。
 * 与 traceMaskToPath 相反：不反转，让暗色(0)直接作为 potrace 前景。
 * 用于生成模板的 outlinePath 覆盖层（视觉线条展示）。
 */
export async function traceOutlinePath(
  binaryData: Uint8Array,
  width: number,
  height: number,
): Promise<string | null> {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(width, height);

  for (let i = 0; i < binaryData.length; i++) {
    // 不反转：暗色(0)=黑=potrace 前景 → 追踪原始线条
    const v = binaryData[i];
    imgData.data[i * 4] = v;
    imgData.data[i * 4 + 1] = v;
    imgData.data[i * 4 + 2] = v;
    imgData.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  const pngBuffer = Buffer.from(canvas.toBuffer("image/png"));

  const svg: string = await new Promise((resolve, reject) => {
    potrace.trace(
      pngBuffer,
      { threshold: 128, turdsize: 4, alphamax: 1, optcurve: true },
      (err: Error | null, tracedSvg: string) => {
        if (err) reject(err);
        else resolve(tracedSvg);
      },
    );
  });

  const match = svg.match(/<path[^>]*d="([^"]+)"/);
  return match?.[1]?.trim() ?? null;
}

export async function generateAllPaths(
  regions: import("./region-detector").DetectedRegion[],
  canvasWidth: number,
  canvasHeight: number,
  options: PathGeneratorOptions = {},
): Promise<Region[]> {
  const tracedRegions = await Promise.all(
    regions.map(async (region, index) => {
      const mask = new Uint8Array(canvasWidth * canvasHeight);
      for (const pixel of region.pixels) {
        mask[pixel.y * canvasWidth + pixel.x] = 255;
      }

      const pathData = await traceMaskToPath(
        mask,
        canvasWidth,
        canvasHeight,
        options,
      );
      if (!pathData) return null;

      return {
        id: generateId(index),
        path: pathData,
        bbox: computeBBoxFromPixels(region.pixels),
      };
    }),
  );

  return tracedRegions.filter((region): region is Region => region !== null);
}
