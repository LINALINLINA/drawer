import sharp from "sharp";

/**
 * 检测图像四周是否存在内缩矩形边框（如四边有一条高密度暗色线），
 * 有则返回边框内侧的裁剪参数。
 *
 * 注意：边框可能离图像边缘有一段白色间距（例如鲨鱼图距边缘 ~15px），
 * 因此检测时不要求行/列首尾像素必须为暗色，只要整行/列暗色密度 >80% 即可。
 */
async function detectBorderCrop(inputPath: string): Promise<{
  left: number;
  top: number;
  width: number;
  height: number;
} | null> {
  const meta = await sharp(inputPath).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H) return null;

  const raw = await sharp(inputPath).grayscale().raw().toBuffer();
  const p = new Uint8Array(raw);

  // 最多扫描 10% 的图像边长，不超过 120px
  const SCAN = Math.min(120, Math.floor(Math.min(W, H) * 0.1));
  // 暗色密度阈值：超过此值认定为边框线
  const BORDER_DENSITY = 0.8;

  /** 计算某行暗色像素比例 */
  const rowDensity = (y: number): number => {
    let cnt = 0;
    for (let x = 0; x < W; x++) if (p[y * W + x] < 128) cnt++;
    return cnt / W;
  };

  /** 计算某列暗色像素比例 */
  const colDensity = (x: number): number => {
    let cnt = 0;
    for (let y = 0; y < H; y++) if (p[y * W + x] < 128) cnt++;
    return cnt / H;
  };

  /**
   * 在 [0, SCAN) 范围内，找到第一条暗色密度超过阈值的行/列。
   * fromEnd=true 时从反方向扫描（检测底部/右侧边框）。
   */
  const findBorderLine = (isRow: boolean, fromEnd: boolean): number => {
    const total = isRow ? H : W;
    for (let i = 0; i < SCAN; i++) {
      const idx = fromEnd ? total - 1 - i : i;
      const density = isRow ? rowDensity(idx) : colDensity(idx);
      if (density >= BORDER_DENSITY) return idx;
    }
    return -1;
  };

  const topBorder = findBorderLine(true, false);
  const bottomBorder = findBorderLine(true, true);
  const leftBorder = findBorderLine(false, false);
  const rightBorder = findBorderLine(false, true);

  // 至少检测到上下或左右两条对边才认为是有效边框
  const hasTB = topBorder >= 0 && bottomBorder >= 0 && topBorder < bottomBorder;
  const hasLR = leftBorder >= 0 && rightBorder >= 0 && leftBorder < rightBorder;
  if (!hasTB && !hasLR) return null;

  // 裁剪到边框内侧（边框线本身也去掉）
  const cropTop = hasTB ? topBorder + 1 : 0;
  const cropBottom = hasTB ? bottomBorder : H;
  const cropLeft = hasLR ? leftBorder + 1 : 0;
  const cropRight = hasLR ? rightBorder : W;

  const w = cropRight - cropLeft;
  const h = cropBottom - cropTop;
  if (w <= 0 || h <= 0) return null;

  console.log(
    `    [去边框] 检测到边框 top=${topBorder} bottom=${bottomBorder} left=${leftBorder} right=${rightBorder}`,
  );
  console.log(
    `    [去边框] 裁剪为 left=${cropLeft} top=${cropTop} ${w}×${h}（原始: ${W}×${H}）`,
  );
  return { left: cropLeft, top: cropTop, width: w, height: h };
}

export interface BinaryImage {
  width: number;
  height: number;
  data: Uint8Array; // 0 = 线条/边界，255 = 可填充区域
}

/**
 * 对二值图像中的「线条」像素（值=0）执行膨胀（Dilation），
 * 以封闭线条断口。半径越大，封闭的缝隙越宽。
 */
function dilateLines(
  data: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const result = new Uint8Array(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 只处理「可填充」像素（255），看邻域内是否存在线条（0）
      if (data[y * width + x] !== 255) continue;
      let hasLine = false;
      outer: for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (data[ny * width + nx] === 0) {
            hasLine = true;
            break outer;
          }
        }
      }
      // 如果邻域内有线条，则将当前像素也归为线条（扩展线条宽度）
      if (hasLine) result[y * width + x] = 0;
    }
  }
  return result;
}

export interface PreprocessResult {
  /** 膨胀后的二值图：用于区域检测（dilation 封闭线条断口） */
  binary: BinaryImage;
  /** 原始二值图（无膨胀）：用于轮廓路径生成，保留细线视觉 */
  rawBinary: BinaryImage;
  /**
   * 自动检测到的边框裁剪参数（原始分辨率坐标）。
   * 生成 outline PNG 时应先 extract 此区域再 resize，保持视觉一致性。
   */
  cropBox?: { left: number; top: number; width: number; height: number };
}

export async function preprocess(
  inputPath: string,
  threshold: number = 128,
  closeRadius: number = 2, // 形态学闭合半径（像素），用于封闭线条断口
): Promise<PreprocessResult> {
  const size = 400;

  // ① 自动检测并去除矩形边框（如图片四周存在黑色框线）
  const cropBox = await detectBorderCrop(inputPath);

  let pipeline = sharp(inputPath).grayscale();
  if (cropBox) {
    pipeline = pipeline.extract(cropBox) as typeof pipeline;
  }

  const raw = await pipeline
    .resize(size, size, {
      fit: "contain",
      // 白色背景：确保 SVG 透明区域和 PNG 空白区域都变为白色
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .raw()
    .toBuffer();

  const pixels = new Uint8Array(raw);
  const data = new Uint8Array(pixels.length);

  for (let i = 0; i < pixels.length; i++) {
    // 标准上色图谱：亮色(>threshold) → 255(可填充)，暗色 → 0(线条边界)
    data[i] = pixels[i] > threshold ? 255 : 0;
  }

  const rawBinary: BinaryImage = { width: size, height: size, data };

  // 对线条做膨胀（Dilation），封闭线条断口，让封闭区域与背景分离
  const dilated: BinaryImage =
    closeRadius > 0
      ? {
          width: size,
          height: size,
          data: dilateLines(data, size, size, closeRadius),
        }
      : rawBinary;

  return { binary: dilated, rawBinary, cropBox: cropBox ?? undefined };
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
