#!/usr/bin/env bun
import { parseArgs } from "node:util";
import {
  readdir,
  stat,
  writeFile,
  mkdir,
  readFile,
  Dirent,
} from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { preprocess } from "./preprocess";
import { generateRegionsFromImage } from "./path-generator";
import { detectRegions } from "./region-detector";
import { buildTemplate } from "./template-builder";
import type { TemplateCategory, TemplateDifficulty } from "./template-builder";

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
  --min-area, -m     最小区域面积 px² (默认: 500)
  --viewbox-size, -s viewBox 边长 (默认: 400)
  --batch            批量处理目录下所有图片
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
  const seenNames = new Set<string>();
  const deduped: IndexEntry[] = [];

  for (const entry of entries) {
    const idKey = normalizeKeyPart(entry.id);
    const fileKey = normalizeKeyPart(entry.file);
    const nameKey = normalizeKeyPart(entry.name);

    const isDuplicateId = idKey !== "" && seenIds.has(idKey);
    const isDuplicateFile = fileKey !== "" && seenFiles.has(fileKey);
    const isDuplicateName = nameKey !== "" && seenNames.has(nameKey);

    if (isDuplicateId || isDuplicateFile || isDuplicateName) {
      continue;
    }

    if (idKey !== "") seenIds.add(idKey);
    if (fileKey !== "") seenFiles.add(fileKey);
    if (nameKey !== "") seenNames.add(nameKey);
    deduped.push(entry);
  }

  return deduped;
}

const generatedFiles: Array<{
  id: string;
  file: string;
  name: string;
  category: string;
  difficulty: string;
  regionCount: number;
}> = [];

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      category: { type: "string", short: "c" },
      name: { type: "string", short: "n" },
      difficulty: { type: "string", short: "d" },
      output: { type: "string", short: "o", default: DEFAULT_OUTPUT_DIR },
      threshold: { type: "string", short: "t", default: "128" },
      "min-area": { type: "string", short: "m", default: "500" },
      "viewbox-size": { type: "string", short: "s", default: "400" },
      batch: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(USAGE);
    process.exit(0);
  }

  const inputPath = positionals[0];
  const isDryRun = values["dry-run"] as boolean;
  const threshold = parseInt(values.threshold as string, 10);
  const minArea = parseInt(values["min-area"] as string, 10);
  const viewBoxSize = parseInt(values["viewbox-size"] as string, 10);
  const outputDir = values.output as string;

  if (values.batch) {
    const files = await readdir(inputPath);
    const imageFiles = files.filter((f) =>
      SUPPORTED_EXT.has(extname(f).toLowerCase()),
    );

    console.log(`[INFO] 批量处理 ${imageFiles.length} 个文件...\n`);

    for (const file of imageFiles) {
      const fullPath = join(inputPath, file);
      const name = values.name || basename(file, extname(file));
      await processFile(fullPath, name, values, {
        threshold,
        minArea,
        viewBoxSize,
        outputDir,
        isDryRun,
      });
    }
  } else {
    const name = values.name || basename(inputPath, extname(inputPath));
    await processFile(inputPath, name, values, {
      threshold,
      minArea,
      viewBoxSize,
      outputDir,
      isDryRun,
    });
  }

  if (!isDryRun && generatedFiles.length > 0) {
    await rebuildIndex(outputDir);
  }
}

async function processFile(
  filePath: string,
  name: string,
  values: Record<string, unknown>,
  opts: {
    threshold: number;
    minArea: number;
    viewBoxSize: number;
    outputDir: string;
    isDryRun: boolean;
  },
) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    console.warn(`[SKIP] ${filePath} 不是文件`);
    return;
  }

  console.log(`[处理] ${filePath}`);
  console.log(`  名称: ${name}`);
  console.log(`  阈值: ${opts.threshold}`);
  console.log(`  最小闭区面积: ${opts.minArea}`);

  try {
    console.log("  ① 预处理（二值化）...");
    const binaryImage = await preprocess(filePath, opts.threshold);

    console.log("  ② 闭区检测...");
    const detectedRegions = detectRegions(binaryImage, opts.minArea);
    console.log(`  闭区检测到 ${detectedRegions.length} 个候选区域`);

    console.log("  ③ potrace 提取区域...");
    const regions = await generateRegionsFromImage(
      binaryImage.data,
      binaryImage.width,
      binaryImage.height,
      {
        potraceThreshold: opts.threshold,
        minArea: opts.minArea,
      },
    );
    console.log(`  检测到 ${regions.length} 个区域`);

    const tracedOnlyOneOutline =
      regions.length === 1 && regions[0]?.id === "drawing";
    const hasMultipleClosedAreas = detectedRegions.length > 1;

    if (hasMultipleClosedAreas && tracedOnlyOneOutline) {
      console.warn(
        `  [SKIP] ${name}: 检测到 ${detectedRegions.length} 个闭合区域，但 SVG 仅产出整图轮廓。该图片过于复杂，当前自动转换会导致图形不完整。\n`,
      );
      return;
    }

    if (regions.length === 0) {
      console.warn(`  [SKIP] ${name}: 无有效区域，跳过\n`);
      return;
    }

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
      return;
    }

    const category = template.category;
    const finalDir = join(opts.outputDir, category);
    await mkdir(finalDir, { recursive: true });
    const outputFile = join(finalDir, `${template.id}.json`);
    await writeFile(outputFile, JSON.stringify(template, null, 2), "utf-8");

    generatedFiles.push({
      id: template.id,
      file: `${category}/${template.id}.json`,
      name: template.name,
      category: template.category,
      difficulty: template.difficulty,
      regionCount: template.regions.length,
    });

    console.log(`  [OK] 写入: ${outputFile}\n`);
  } catch (err) {
    console.error(`  [ERROR] ${name} 处理失败:`, err, "\n");
  }
}

async function updateIndexAndSync(
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
  console.log(`[INDEX] 已重建 ${indexPath}，共 ${index.templates.length} 个模板`);
}

main();
