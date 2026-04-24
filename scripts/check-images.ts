#!/usr/bin/env bun
/**
 * check-images.ts
 * 快速检测图片是否适合制作模板素材（上色图谱风格）
 *
 * 判断标准（加权打分）：
 *  ① 背景亮度：上色图谱应以白色/浅色为主（均值 > 170）
 *  ② 线条存在：应有适量深色轮廓（深色像素比 5%–50%）
 *  ③ 高对比度：标准差较大表示有明显线条（std > 25）
 *  ④ 颜色简洁：上色图谱通常颜色少（近灰度或彩度低）
 *  ⑤ 封闭区域：存在可填充的独立区域（≥ 2 个）
 *
 * 用法：
 *   bun scripts/check-images.ts <目录>  [--move] [--dry-run]
 *   bun scripts/check-images.ts <单个文件>  [--move] [--dry-run]
 */
import { parseArgs } from "node:util";
import { readdir, mkdir, rename, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import sharp from "sharp";

const SUPPORTED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

// ─────────────────────────────────────────────────────────────────────────────
// 快速区域计数（不跑 potrace，只做 BFS 泛洪计数）
// ─────────────────────────────────────────────────────────────────────────────

/** 轻量二值化：白色区域→255，线条→0 */
async function toBinary(
  inputPath: string,
  size = 300,
  threshold = 128,
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const raw = await sharp(inputPath)
    .grayscale()
    .resize(size, size, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .raw()
    .toBuffer();

  const pixels = new Uint8Array(raw);
  const data = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    data[i] = pixels[i] > threshold ? 255 : 0;
  }
  return { data, width: size, height: size };
}

/** 轻量膨胀：扩展线条宽度以封闭断口（radius=1 即可，速度快） */
function dilateLines(
  data: Uint8Array,
  width: number,
  height: number,
  radius = 1,
): Uint8Array {
  const out = new Uint8Array(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[y * width + x] !== 255) continue;
      // 判断当前白色像素是否靠近黑色线条
      let nearLine = false;
      lo: for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (data[ny * width + nx] === 0) {
            nearLine = true;
            break lo;
          }
        }
      }
      if (nearLine) out[y * width + x] = 0;
    }
  }
  return out;
}

/** BFS 泛洪填充，统计不与边缘相连的白色连通区域数量 */
function countEnclosedRegions(
  data: Uint8Array,
  width: number,
  height: number,
  minArea = 50,
): number {
  const visited = new Uint8Array(width * height);
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || data[idx] !== 255) continue;

      // BFS 泛洪，收集连通白色像素
      const pixels: number[] = [];
      const queue: number[] = [idx];
      visited[idx] = 1;
      let touchesEdge = false;

      while (queue.length > 0) {
        const cur = queue.pop()!;
        pixels.push(cur);
        const cx = cur % width;
        const cy = (cur - cx) / width;

        if (cx === 0 || cy === 0 || cx === width - 1 || cy === height - 1) {
          touchesEdge = true;
        }

        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni] || data[ni] !== 255) continue;
          visited[ni] = 1;
          queue.push(ni);
        }
      }

      if (!touchesEdge && pixels.length >= minArea) {
        count++;
      }
    }
  }

  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// 图片质量检测
// ─────────────────────────────────────────────────────────────────────────────

export type CheckResult = "suitable" | "not-suitable";

export interface ImageCheckReport {
  file: string;
  result: CheckResult;
  reason: string;
  stats: {
    brightness: number; // 平均亮度 0-255
    std: number; // 标准差
    darkRatio: number; // 深色像素比 (0-1)
    enclosedRegions: number; // 封闭区域数
  };
}

export async function checkImage(filePath: string): Promise<ImageCheckReport> {
  const file = basename(filePath);

  // ─── 步骤 1：sharp 统计 ───
  const metadata = await sharp(filePath).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  // 如果是极小图片，直接跳过
  if (width < 50 || height < 50) {
    return {
      file,
      result: "not-suitable",
      reason: "图片尺寸过小",
      stats: { brightness: 0, std: 0, darkRatio: 0, enclosedRegions: 0 },
    };
  }

  // 获取灰度统计
  const statsResult = await sharp(filePath).grayscale().stats();

  const brightness = statsResult.channels[0]!.mean;
  const std = statsResult.channels[0]!.std;

  // 计算深色像素比例
  const { data: rawGray } = await sharp(filePath)
    .grayscale()
    .resize(300, 300, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const grayPixels = new Uint8Array(rawGray);
  let darkCount = 0;
  for (let i = 0; i < grayPixels.length; i++) {
    if (grayPixels[i] < 128) darkCount++;
  }
  const darkRatio = darkCount / grayPixels.length;

  // ─── 步骤 2：封闭区域计数 ───
  const binary = await toBinary(filePath, 300, 128);
  const closedData = dilateLines(binary.data, binary.width, binary.height, 1);
  const enclosedRegions = countEnclosedRegions(
    closedData,
    binary.width,
    binary.height,
    50,
  );

  const stats = {
    brightness: Math.round(brightness),
    std: Math.round(std),
    darkRatio: Math.round(darkRatio * 1000) / 1000,
    enclosedRegions,
  };

  // ─── 步骤 3：综合判断 ───
  const reasons: string[] = [];

  // 判断：背景是否足够亮（上色图谱以白色为主）
  if (brightness < 130) {
    reasons.push(`背景过暗(亮度${stats.brightness}<130)，疑为照片或彩色图`);
  }

  // 判断：是否有适量线条
  if (darkRatio < 0.03) {
    reasons.push(
      `线条过少(深色像素${(darkRatio * 100).toFixed(1)}%<3%)，图片过于空白`,
    );
  }
  if (darkRatio > 0.6) {
    reasons.push(
      `深色区域过多(${(darkRatio * 100).toFixed(1)}%>60%)，疑为复杂照片`,
    );
  }

  // 判断：对比度是否足够
  if (std < 20) {
    reasons.push(`对比度太低(std=${stats.std}<20)，线条不清晰`);
  }

  // 判断：是否存在可填充封闭区域
  if (enclosedRegions === 0) {
    reasons.push("未检测到封闭填充区域（线条可能未闭合或图片不是上色风格）");
  }

  if (reasons.length > 0) {
    return {
      file,
      result: "not-suitable",
      reason: reasons.join("；"),
      stats,
    };
  }

  return {
    file,
    result: "suitable",
    reason: `亮度${stats.brightness}，深色比${(darkRatio * 100).toFixed(1)}%，封闭区域${enclosedRegions}个`,
    stats,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI 入口
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      move: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "not-use-dir": { type: "string", default: "" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(`
用法:
  bun scripts/check-images.ts <目录或文件路径> [选项]

选项:
  --move         将不适合的图片移动到 notUse 目录
  --not-use-dir  指定 notUse 目录路径（默认：输入目录/../notUse）
  --dry-run      仅输出判断结果，不移动文件
`);
    process.exit(0);
  }

  const inputPath = positionals[0]!;
  const shouldMove = values.move as boolean;
  const isDryRun = values["dry-run"] as boolean;
  const inputStat = await stat(inputPath);

  // 收集待检测文件
  let files: string[] = [];
  let baseDir: string;

  if (inputStat.isDirectory()) {
    baseDir = inputPath;
    const entries = await readdir(inputPath);
    files = entries
      .filter((f) => SUPPORTED_EXT.has(extname(f).toLowerCase()))
      .map((f) => join(inputPath, f));
  } else {
    baseDir = inputPath.replace(/\/[^/]+$/, "");
    files = [inputPath];
  }

  if (files.length === 0) {
    console.log("未找到支持的图片文件（PNG/JPG/WebP）");
    process.exit(0);
  }

  // 确定 notUse 目录
  const notUseDir =
    (values["not-use-dir"] as string) || join(baseDir, "..", "notUse");

  console.log(`\n检测 ${files.length} 张图片...\n`);
  console.log(
    `${"文件名".padEnd(25)} ${"状态".padEnd(12)} ${"亮度".padEnd(6)} ${"深色%".padEnd(8)} ${"区域数".padEnd(8)} 原因`,
  );
  console.log("─".repeat(100));

  const notSuitable: string[] = [];

  for (const filePath of files) {
    let report: ImageCheckReport;
    try {
      report = await checkImage(filePath);
    } catch (err) {
      console.log(`${"  " + basename(filePath)}  [ERROR] ${err}`);
      continue;
    }

    const icon = report.result === "suitable" ? "✅ 适合" : "❌ 不适合";
    const s = report.stats;
    console.log(
      `${basename(filePath).padEnd(25)} ${icon.padEnd(12)} ${String(s.brightness).padEnd(6)} ${(s.darkRatio * 100).toFixed(1).padEnd(8)} ${String(s.enclosedRegions).padEnd(8)} ${report.reason}`,
    );

    if (report.result === "not-suitable") {
      notSuitable.push(filePath);
    }
  }

  console.log("\n─".repeat(100));
  console.log(
    `\n总计: ${files.length} 张 | ✅ 适合: ${files.length - notSuitable.length} 张 | ❌ 不适合: ${notSuitable.length} 张\n`,
  );

  // 移动不适合的文件
  if (notSuitable.length > 0 && (shouldMove || isDryRun)) {
    if (!isDryRun) {
      await mkdir(notUseDir, { recursive: true });
    }

    console.log(
      `${isDryRun ? "[DRY-RUN] " : ""}移动 ${notSuitable.length} 个不适合的文件到: ${notUseDir}\n`,
    );

    for (const filePath of notSuitable) {
      const dest = join(notUseDir, basename(filePath));
      if (isDryRun) {
        console.log(`  [DRY-RUN] ${basename(filePath)} → ${dest}`);
      } else {
        await rename(filePath, dest);
        console.log(`  [MOVED] ${basename(filePath)} → ${dest}`);
      }
    }
  } else if (notSuitable.length > 0 && !shouldMove) {
    console.log("提示：使用 --move 参数可自动将不适合的文件移到 notUse 目录\n");
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
