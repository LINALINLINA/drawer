import sharp from "sharp";

export interface BinaryImage {
  width: number;
  height: number;
  data: Uint8Array; // 0 = background (line), 255 = fillable area
}

export async function preprocess(
  inputPath: string,
  threshold: number = 128,
): Promise<BinaryImage> {
  const size = 400;

  const raw = await sharp(inputPath)
    .grayscale()
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .raw()
    .toBuffer();

  const pixels = new Uint8Array(raw);
  const data = new Uint8Array(pixels.length);

  for (let i = 0; i < pixels.length; i++) {
    // 反色：白色线条(>threshold) → 0(背景)，黑色区域 → 255(可填充)
    data[i] = pixels[i] > threshold ? 0 : 255;
  }

  return { width: size, height: size, data };
}

export function getPixel(img: BinaryImage, x: number, y: number): number {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return 0;
  return img.data[y * img.width + x];
}

export function setPixel(
  img: BinaryImage,
  x: number,
  y: number,
  value: number,
): void {
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return;
  img.data[y * img.width + x] = value;
}
