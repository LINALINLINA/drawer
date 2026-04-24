#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { readdir, stat, writeFile, mkdir, readFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { preprocess } from "./preprocess";
import type { PreprocessResult } from "./preprocess";
import sharp from "sharp";
import { generateAllPaths } from "./path-generator";
import { detectRegions } from "./region-detector";
import { buildTemplate } from "./template-builder";
import type { TemplateCategory, TemplateDifficulty } from "./template-builder";
import { extractSvgRegions } from "./svg-extractor";

/** 格式化毫秒为可读字符串，如 "1234 ms" 或 "12.3 s" */
function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

/** 带计时功能的日志工具 */
function makeTimer(label: string) {
  const t0 = Date.now();
  return {
    step(msg: string) {
      const elapsed = Date.now() - t0;
      console.log(`  [${fmtMs(elapsed).padStart(7)}] ${msg}`);
    },
    end() {
      return Date.now() - t0;
    },
  };
}

const USAGE = `
用法:
  bun scripts/png2template.ts <input> [options]

  <input>    图片文件路径 (PNG/JPG/WebP/SVG)，或包含图片的目录路径

选项:
  --category, -c     模板分类 (cute/nature/mandala/pixel)
  --name, -n         模板名称（默认使用文件名）
  --difficulty, -d   难度 (easy/medium/hard/auto)
  --output, -o       输出目录 (默认: apps/web/public/templates/)
  --threshold, -t    二值化阈值 (默认: 128)
  --min-area, -m     最小区域面积 px² (默认: 20)
  --max-regions      最大区域数量（默认: 200，防止过于复杂的 SVG）
  --viewbox-size, -s viewBox 边长 (默认: 400)
  --close-radius     线条膨胀半径 px（默认: 1，值越大封口越强但相邻区域易误合并）
  --batch            批量处理目录下所有图片
  --reindex          仅重建输出目录中的 index.json
  --dry-run          仅检测，不生成文件
  --help, -h         显示帮助
`;

const SUPPORTED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

interface IndexEntry {
  id: string;
  file: string;
  name?: string;
  category?: string;
  difficulty?: string;
  regionCount?: number;
}

interface IndexFile {
  templates: IndexEntry[];
}

const DEFAULT_OUTPUT_DIR = join("apps", "web", "public", "templates");

function normalizeKeyPart(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function dedupeIndexEntries(entries: IndexEntry[]): IndexEntry[] {
  const seenIds = new Set<string>();
  const seenFiles = new Set<string>();
  const deduped: IndexEntry[] = [];

  for (const entry of entries) {
    const idKey = normalizeKeyPart(entry.id);
    const fileKey = normalizeKeyPart(entry.file);

    const isDuplicateId = idKey !== "" && seenIds.has(idKey);
    const isDuplicateFile = fileKey !== "" && seenFiles.has(fileKey);

    if (isDuplicateId || isDuplicateFile) {
      continue;
    }

    if (idKey !== "") seenIds.add(idKey);
    if (fileKey !== "") seenFiles.add(fileKey);
    deduped.push(entry);
  }

  return deduped;
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      category: { type: "string", short: "c" },
      name: { type: "string", short: "n" },
      difficulty: { type: "string", short: "d" },
      output: { type: "string", short: "o", default: DEFAULT_OUTPUT_DIR },
      threshold: { type: "string", short: "t", default: "128" },
      "min-area": { type: "string", short: "m", default: "20" },
      "max-regions": { type: "string", default: "200" },
      "viewbox-size": { type: "string", short: "s", default: "400" },
      "close-radius": { type: "string", default: "1" },
      batch: { type: "boolean", default: false },
      reindex: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help || (positionals.length === 0 && !values.reindex)) {
    console.log(USAGE);
    process.exit(0);
  }

  const inputPath = positionals[0];
  const isDryRun = values["dry-run"] as boolean;
  const threshold = parseInt(values.threshold as string, 10);
  const minArea = parseInt(values["min-area"] as string, 10);
  const maxRegions = parseInt(values["max-regions"] as string, 10);
  const viewBoxSize = parseInt(values["viewbox-size"] as string, 10);
  const closeRadius = parseInt(values["close-radius"] as string, 10);
  const outputDir = values.output as string;

  if (values.reindex) {
    await rebuildIndex(outputDir);
    process.exit(0);
  }

  if (values.batch) {
    const files = await readdir(inputPath);
    const imageFiles = files.filter((f) =>
      SUPPORTED_EXT.has(extname(f).toLowerCase()),
    );

    const total = imageFiles.length;
    console.log(`[INFO] 批量处理 ${total} 个文件...\n`);

    // 统计结果
    const results: Array<{
      file: string;
      status: "ok" | "skip" | "fail";
      reason?: string;
      elapsed?: number;
    }> = [];
    const batchStart = Date.now();

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const fullPath = join(inputPath, file);
      const name = values.name || basename(file, extname(file));

      console.log(`\n${"─".repeat(60)}`);
      console.log(`[${i + 1}/${total}] 处理: ${file}`);

      const t0 = Date.now();
      const result = await processFile(fullPath, name, values, {
        threshold,
        minArea,
        maxRegions,
        viewBoxSize,
        closeRadius,
        outputDir,
        isDryRun,
      });
      const elapsed = Date.now() - t0;
      results.push({ file, ...result, elapsed });
    }

    // 最终汇总报告
    const totalElapsed = Date.now() - batchStart;
    const okList = results.filter((r) => r.status === "ok");
    const skipList = results.filter((r) => r.status === "skip");
    const failList = results.filter((r) => r.status === "fail");

    console.log(`\n${"═".repeat(60)}`);
    console.log(
      `[汇总] 共 ${total} 张 | ✓ 成功 ${okList.length} | ⊘ 跳过 ${skipList.length} | ✗ 失败 ${failList.length} | 总耗时 ${fmtMs(totalElapsed)}`,
    );

    if (okList.length > 0) {
      console.log("\n  成功:");
      for (const r of okList) {
        console.log(`    ✓ ${r.file} (${fmtMs(r.elapsed ?? 0)})`);
      }
    }
    if (skipList.length > 0) {
      console.log("\n  跳过:");
      for (const r of skipList) {
        console.log(`    ⊘ ${r.file}: ${r.reason ?? ""}`);
      }
    }
    if (failList.length > 0) {
      console.log("\n  失败:");
      for (const r of failList) {
        console.log(`    ✗ ${r.file}: ${r.reason ?? ""}`);
      }
    }
    console.log(`${"═".repeat(60)}\n`);
  } else {
    const name = values.name || basename(inputPath, extname(inputPath));
    await processFile(inputPath, name, values, {
      threshold,
      minArea,
      maxRegions,
      viewBoxSize,
      closeRadius,
      outputDir,
      isDryRun,
    });
  }

  if (!isDryRun) {
    await rebuildIndex(outputDir);
  }
}

type ProcessResult = { status: "ok" | "skip" | "fail"; reason?: string };

async function processFile(
  filePath: string,
  name: string,
  values: Record<string, unknown>,
  opts: {
    threshold: number;
    minArea: number;
    maxRegions: number;
    viewBoxSize: number;
    closeRadius: number;
    outputDir: string;
    isDryRun: boolean;
  },
): Promise<ProcessResult> {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    console.warn(`[SKIP] ${filePath} 不是文件`);
    return { status: "skip", reason: "不是文件" };
  }

  console.log(`[处理] ${filePath}`);
  console.log(`  名称: ${name}`);

  try {
    const isSvg = extname(filePath).toLowerCase() === ".svg";

    if (isSvg) {
      // ─── SVG 专用流程：直接解析路径，无需栅格化再 potrace ───
      return await processSvgFile(filePath, name, values, opts);
    } else {
      // ─── 栅格图片流程：二值化 → 闭区检测 → potrace 描摹 ───
      return await processRasterFile(filePath, name, values, opts);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [ERROR] ${name} 处理失败: ${msg}\n`);
    return { status: "fail", reason: msg };
  }
}

/** SVG 专用处理流程：直接从 SVG XML 提取路径 */
async function processSvgFile(
  filePath: string,
  name: string,
  values: Record<string, unknown>,
  opts: {
    threshold: number;
    minArea: number;
    maxRegions: number;
    viewBoxSize: number;
    closeRadius: number;
    outputDir: string;
    isDryRun: boolean;
  },
): Promise<ProcessResult> {
  const timer = makeTimer(name);

  console.log("  ① SVG 路径直接提取...");
  let { viewBox, regions } = await extractSvgRegions(filePath, opts.minArea);
  timer.step(`提取完成，原始区域数: ${regions.length}`);

  // 区域数量过多时，按面积降序取前 maxRegions 个（保留最重要的大区域）
  if (regions.length > opts.maxRegions) {
    console.warn(
      `  [WARN] 区域数量 ${regions.length} 超过上限 ${opts.maxRegions}，按面积保留最大的 ${opts.maxRegions} 个`,
    );
    regions = regions
      .sort((a, b) => b.bbox.w * b.bbox.h - a.bbox.w * a.bbox.h)
      .slice(0, opts.maxRegions);
  }

  if (regions.length === 0) {
    console.warn(`  [SKIP] ${name}: SVG 中无有效填充区域，跳过\n`);
    return { status: "skip", reason: "SVG 无有效填充区域" };
  }

  console.log("  ② 组装模板...");
  const template = buildTemplate({
    name,
    category: (values.category as TemplateCategory) || "nature",
    difficulty: (values.difficulty as TemplateDifficulty) || undefined,
    // 使用 SVG 原始尺寸的较大边作为 viewBoxSize，保持比例
    viewBoxSize: Math.max(viewBox.w, viewBox.h),
    regions,
  });

  // 覆盖 viewBox 以保留原始 SVG 宽高比（非强制正方形）
  template.viewBox = { x: viewBox.x, y: viewBox.y, w: viewBox.w, h: viewBox.h };

  console.log(`  模板 ID: ${template.id}`);
  console.log(`  难度: ${template.difficulty}`);
  console.log(`  区域数: ${template.regions.length}`);
  for (const r of template.regions) {
    console.log(
      `    ${r.id}: bbox=${JSON.stringify(r.bbox)} path长度=${r.path.length}`,
    );
  }

  if (opts.isDryRun) {
    console.log(`  [DRY-RUN] 跳过写入\n`);
    return { status: "ok" };
  }

  const category = template.category;
  const finalDir = join(opts.outputDir, category);
  await mkdir(finalDir, { recursive: true });
  const outputFile = join(finalDir, `${template.id}.json`);
  await writeFile(outputFile, JSON.stringify(template, null, 2), "utf-8");
  timer.step(`写入完成: ${outputFile}`);
  console.log(`  [OK] 写入: ${outputFile} | 总耗时 ${fmtMs(timer.end())}\n`);
  return { status: "ok" };
}

/** 栅格图片处理流程：二值化 → 闭区检测 → potrace 描摹 */
async function processRasterFile(
  filePath: string,
  name: string,
  values: Record<string, unknown>,
  opts: {
    threshold: number;
    minArea: number;
    maxRegions: number;
    viewBoxSize: number;
    closeRadius: number;
    outputDir: string;
    isDryRun: boolean;
  },
): Promise<ProcessResult> {
  const timer = makeTimer(name);
  console.log(
    `  阈值: ${opts.threshold}  最小面积: ${opts.minArea}  最大区域: ${opts.maxRegions}  膨胀半径: ${opts.closeRadius}`,
  );

  // ① 预处理：灰度化、自动去边框、缩放到 400×400、二值化、线条膨胀封口
  console.log("  ① 预处理（灰度→自动去边框→缩放→二值化→线条膨胀）...");
  const preprocessResult: PreprocessResult = await preprocess(
    filePath,
    opts.threshold,
    opts.closeRadius,
  );
  const binaryImage = preprocessResult.binary; // 膨胀后：用于区域检测
  const rawBinaryImage = preprocessResult.rawBinary; // 未膨胀：用于轮廓路径（保留细线）
  const cropBox = preprocessResult.cropBox; // 如果检测到边框，记录裁剪参数供 outline PNG 使用

  const darkPixels = rawBinaryImage.data.filter((v) => v === 0).length;
  const darkRatio = ((darkPixels / rawBinaryImage.data.length) * 100).toFixed(
    1,
  );
  const dilatedDark = binaryImage.data.filter((v) => v === 0).length;
  const dilatedRatio = ((dilatedDark / binaryImage.data.length) * 100).toFixed(
    1,
  );
  timer.step(
    `预处理完成 | 原始暗色: ${darkRatio}%  膨胀后暗色: ${dilatedRatio}%`,
  );

  // ② 闭区检测：BFS flood-fill 找出所有不接触边缘的封闭白色区域
  console.log("  ② 闭区检测（BFS flood-fill）...");
  let detectedRegions = detectRegions(binaryImage, opts.minArea);
  timer.step(
    `检测到 ${detectedRegions.length} 个候选区域 (minArea=${opts.minArea})`,
  );

  if (detectedRegions.length === 0) {
    console.warn(`  [SKIP] ${name}: 未检测到封闭填充区域（线条可能未闭合）\n`);
    return { status: "skip", reason: "未检测到封闭填充区域" };
  }

  // 过滤接触画布边缘的区域（外部背景/溢出区域不应作为填充区）
  const { width: bw, height: bh } = binaryImage;
  const beforeEdgeFilter = detectedRegions.length;
  detectedRegions = detectedRegions.filter(
    (r) =>
      !r.pixels.some(
        ({ x, y }) => x === 0 || y === 0 || x === bw - 1 || y === bh - 1,
      ),
  );
  if (detectedRegions.length < beforeEdgeFilter) {
    timer.step(
      `过滤边缘区域: ${beforeEdgeFilter} → ${detectedRegions.length} 个`,
    );
  }

  if (detectedRegions.length === 0) {
    console.warn(`  [SKIP] ${name}: 过滤边缘后无有效区域\n`);
    return { status: "skip", reason: "过滤边缘后无有效区域" };
  }

  // 超出 maxRegions 时按像素面积降序截断，避免 potrace 调用过多导致超时
  if (detectedRegions.length > opts.maxRegions) {
    console.warn(
      `  [WARN] 候选区域 ${detectedRegions.length} 超过上限 ${opts.maxRegions}，按面积保留最大 ${opts.maxRegions} 个`,
    );
    detectedRegions = detectedRegions
      .sort((a, b) => b.pixels.length - a.pixels.length)
      .slice(0, opts.maxRegions);
  }

  // ③ potrace 矢量化：对每个区域生成 SVG path
  console.log(`  ③ potrace 矢量化 ${detectedRegions.length} 个区域（并行）...`);
  const regions = await generateAllPaths(
    detectedRegions,
    binaryImage.width,
    binaryImage.height,
    { potraceThreshold: opts.threshold },
  );
  timer.step(
    `potrace 完成，有效区域: ${regions.length}/${detectedRegions.length}`,
  );

  if (regions.length === 0) {
    console.warn(`  [SKIP] ${name}: potrace 无有效路径\n`);
    return { status: "skip", reason: "potrace 无有效路径" };
  }

  // ④ 组装模板 JSON（先不含 outlineImage，等写入目录后再更新）
  console.log("  ④ 组装模板...");
  const template = buildTemplate({
    name,
    category: (values.category as TemplateCategory) || "nature",
    difficulty: (values.difficulty as TemplateDifficulty) || undefined,
    viewBoxSize: opts.viewBoxSize,
    regions,
  });

  console.log(`  模板 ID: ${template.id}`);
  console.log(`  难度: ${template.difficulty}`);
  console.log(`  区域数: ${template.regions.length}`);
  for (const r of template.regions) {
    console.log(
      `    ${r.id}: bbox=${JSON.stringify(r.bbox)} path长度=${r.path.length}`,
    );
  }

  if (opts.isDryRun) {
    console.log(`  [DRY-RUN] 跳过写入\n`);
    return { status: "ok" };
  }

  const category = template.category;
  const finalDir = join(opts.outputDir, category);
  await mkdir(finalDir, { recursive: true });

  // ⑤ 生成轮廓 PNG（灰度缩放原图，保留抗锯齿/平滑线条，multiply 叠加效果最佳）
  // 如果预处理检测到边框，这里同样先裁掉边框再缩放，确保两者坐标系一致
  console.log(
    `  ⑤ 保存轮廓线条 PNG（灰度原图${cropBox ? "，已去边框" : ""}，保留平滑边缘）...`,
  );
  const outlineFile = join(finalDir, `${template.id}-outline.png`);
  let outlinePipeline = sharp(filePath).grayscale();
  if (cropBox) {
    outlinePipeline = outlinePipeline.extract(
      cropBox,
    ) as typeof outlinePipeline;
  }
  await outlinePipeline
    .resize(opts.viewBoxSize, opts.viewBoxSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(outlineFile);

  // 将相对路径写入模板（相对于 /templates/ 目录）
  template.outlineImage = `${category}/${template.id}-outline.png`;
  timer.step(`轮廓 PNG 写入: ${outlineFile}`);

  // ⑥ 写入模板 JSON
  const outputFile = join(finalDir, `${template.id}.json`);
  await writeFile(outputFile, JSON.stringify(template, null, 2), "utf-8");
  timer.step(`模板 JSON 写入: ${outputFile}`);
  console.log(`  [OK] 完成 | 总耗时 ${fmtMs(timer.end())}\n`);
  return { status: "ok" };
}

async function collectTemplateFiles(dir: string): Promise<string[]> {
  const entries: Dirent[] = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTemplateFiles(fullPath)));
      continue;
    }

    if (
      entry.isFile() &&
      extname(entry.name).toLowerCase() === ".json" &&
      entry.name !== "index.json"
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

async function rebuildIndex(outputDir: string) {
  const indexPath = join(outputDir, "index.json");
  const templateFiles = await collectTemplateFiles(outputDir);
  const templates: IndexEntry[] = [];

  for (const filePath of templateFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      const template = JSON.parse(content) as {
        id?: string;
        name?: string;
        category?: string;
        difficulty?: string;
        regions?: unknown[];
      };

      if (!template.id) continue;

      templates.push({
        id: template.id,
        file: relative(outputDir, filePath).replaceAll("\\", "/"),
        name: template.name,
        category: template.category,
        difficulty: template.difficulty,
        regionCount: Array.isArray(template.regions)
          ? template.regions.length
          : undefined,
      });
    } catch (err) {
      console.warn(`[INDEX] 跳过无效模板 ${filePath}:`, err);
    }
  }

  const index: IndexFile = {
    templates: dedupeIndexEntries(templates).sort((a, b) =>
      (a.name ?? a.id).localeCompare(b.name ?? b.id, "zh-Hans-CN"),
    ),
  };

  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
  console.log(
    `[INDEX] 已重建 ${indexPath}，共 ${index.templates.length} 个模板`,
  );
}

main();
