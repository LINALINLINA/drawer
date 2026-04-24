# PNG 转模板 JSON 工具实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 CLI 脚本，将黑白线稿 PNG 自动转换为模板 JSON（含多 region SVG path），支持单张/批量处理。

**Architecture:** potrace 提取轮廓 → Canvas API 二值化 + flood-fill 检测闭区域 → 逐区域 potrace 描边 → 组装模板 JSON。脚本放在 `scripts/` 目录下，使用 bun 运行，不作为 monorepo workspace package。

**Tech Stack:** Bun, TypeScript, sharp (图像预处理), @napi-rs/canvas (flood-fill), potrace (位图转 SVG path), vitest (测试)

---

## 文件结构总览

```
scripts/
├── png2template.ts          # CLI 主入口
├── preprocess.ts            # 图像预处理
├── region-detector.ts       # flood-fill 闭区域检测
├── path-generator.ts        # 区域像素 → SVG path
├── template-builder.ts      # 组装模板 JSON
├── utils.ts                 # 辅助函数
└── __tests__/
    ├── preprocess.test.ts
    ├── region-detector.test.ts
    ├── path-generator.test.ts
    └── template-builder.test.ts
```

**说明：** `scripts/` 不在 monorepo workspaces 范围内（`apps/*` + `packages/*`），所以是独立脚本，直接用 `bun run scripts/png2template.ts` 运行。依赖安装在根目录。

---

## Task 1: 项目脚手架与依赖安装

**Files:**

- Modify: `package.json` (根目录，添加 scripts 依赖)
- Create: `scripts/utils.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/linlina/Servyou/AI/drawer
bun add -d sharp @napi-rs/canvas potrace
```

- [ ] **Step 2: 验证依赖可用**

```bash
bun -e "import potrace from 'potrace'; import sharp from 'sharp'; import { createCanvas } from '@napi-rs/canvas'; console.log('OK')"
```

Expected: 输出 `OK`

- [ ] **Step 3: 创建 scripts/utils.ts**

```ts
import { execSync } from "node:child_process";

export function runPotrace(
  bitmapBuffer: Buffer,
  options: Record<string, unknown> = {},
): string {
  const { createCanvas } = require("@napi-rs/canvas");
  const potrace = require("potrace");

  const params: potrace.PotraceParameters = {
    threshold: 120,
    color: "black",
    ...options,
  };

  return new Promise<string>((resolve, reject) => {
    potrace.posterize(
      bitmapBuffer,
      params,
      (err: Error | null, svg: string) => {
        if (err) reject(err);
        else resolve(svg);
      },
    );
  }) as unknown as string;
}
```

> 注：后续 Task 中会完善 utils.ts，此处先创建空壳确保目录存在。

实际创建内容：

```ts
// scripts/utils.ts
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
```

- [ ] **Step 4: 创建测试 setup**

创建 `scripts/__tests__/.gitkeep`（空文件占位）。

```bash
mkdir -p scripts/__tests__
touch scripts/__tests__/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock scripts/
git commit -m "feat(scripts): scaffold png2template tool with dependencies"
```

---

## Task 2: 图像预处理模块 (preprocess.ts)

**Files:**

- Create: `scripts/preprocess.ts`
- Create: `scripts/__tests__/preprocess.test.ts`
- Create: `scripts/__tests__/fixtures/simple-line.png` (测试用图片)

- [ ] **Step 1: 创建测试用 fixtures**

在 `scripts/__tests__/fixtures/` 下用 Canvas API 生成一个简单的测试图片（40x40，黑色背景 + 白色矩形线条，形成一个 10x10 的闭合方块）。

```ts
// scripts/__tests__/fixtures/generate-fixtures.ts
// 运行: bun scripts/__tests__/fixtures/generate-fixtures.ts
import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";

// 简单闭合方块：黑底，白色正方形框（20x20，居中在 40x40 画布）
const canvas = createCanvas(40, 40);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "black";
ctx.fillRect(0, 0, 40, 40);
ctx.strokeStyle = "white";
ctx.lineWidth = 2;
ctx.strokeRect(10, 10, 20, 20);

writeFileSync(
  "scripts/__tests__/fixtures/simple-box.png",
  Buffer.from(canvas.toBuffer("image/png")),
);
```

运行生成：

```bash
bun scripts/__tests__/fixtures/generate-fixtures.ts
```

- [ ] **Step 2: 编写 preprocess.ts**

```ts
// scripts/preprocess.ts
import sharp from "sharp";

export interface BinaryImage {
  width: number;
  height: number;
  data: Uint8Array; // 0 = background (line), 255 = fillable area
}

export async function loadImage(filePath: string): Promise<Buffer> {
  const buf = await sharp(filePath).png().toBuffer();
  return buf;
}

export async function preprocess(
  inputPath: string,
  threshold: number = 128,
): Promise<BinaryImage> {
  const raw = await sharp(inputPath)
    .grayscale()
    .resize(400, 400, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .raw()
    .toBuffer();

  const pixels = new Uint8Array(raw);
  const data = new Uint8Array(pixels.length / 1); // grayscale = 1 channel

  for (let i = 0; i < pixels.length; i++) {
    // 二值化 + 反色：白色线条(>threshold)变为0(背景)，黑色区域变为255(可填充)
    data[i] = pixels[i] > threshold ? 0 : 255;
  }

  // sharp .raw() 返回的 buffer 长度是 width * height * channels
  // grayscale 时 channels=1，所以 data 长度 = width * height
  // 但我们需要知道 width/height，从 resize 参数获取
  const size = 400;
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
```

- [ ] **Step 3: 编写 preprocess 测试**

```ts
// scripts/__tests__/preprocess.test.ts
import { describe, it, expect } from "vitest";
import { preprocess, getPixel, setPixel } from "../preprocess";

describe("preprocess", () => {
  it("loads and binarizes a simple box image", async () => {
    const img = await preprocess(
      "scripts/__tests__/fixtures/simple-box.png",
      128,
    );
    expect(img.width).toBe(400);
    expect(img.height).toBe(400);

    // 线条区域（白色）应被反色为 0
    // 填充区域（黑色）应被反色为 255
    const totalPixels = img.width * img.height;
    const fillPixels = Array.from(img.data).filter((v) => v === 255).length;
    // 应有可填充区域（内部方块面积）
    expect(fillPixels).toBeGreaterThan(0);
  });

  it("getPixel returns 0 for out-of-bounds", () => {
    const img = { width: 10, height: 10, data: new Uint8Array(100) };
    expect(getPixel(img, -1, 0)).toBe(0);
    expect(getPixel(img, 0, -1)).toBe(0);
    expect(getPixel(img, 10, 0)).toBe(0);
    expect(getPixel(img, 0, 10)).toBe(0);
  });

  it("setPixel ignores out-of-bounds", () => {
    const img = { width: 10, height: 10, data: new Uint8Array(100) };
    setPixel(img, -1, 0, 255);
    setPixel(img, 10, 10, 255);
    expect(img.data[0]).toBe(0); // 未被修改
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
bunx vitest run scripts/__tests__/preprocess.test.ts
```

Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/preprocess.ts scripts/__tests__/preprocess.test.ts scripts/__tests__/fixtures/
git commit -m "feat(scripts): add image preprocessing module with tests"
```

---

## Task 3: 区域检测模块 (region-detector.ts)

**Files:**

- Create: `scripts/region-detector.ts`
- Create: `scripts/__tests__/region-detector.test.ts`

- [ ] **Step 1: 编写 region-detector.ts**

```ts
// scripts/region-detector.ts
import type { BinaryImage } from "./preprocess";
import { getPixel, setPixel } from "./preprocess";

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
      if (getPixel(img, x, y) === 0) continue; // 跳过线条/背景

      // flood-fill 从该点开始
      const pixels: Array<{ x: number; y: number }> = [];
      const queue: Array<{ x: number; y: number }> = [{ x, y }];
      visited[idx] = 1;

      while (queue.length > 0) {
        const p = queue.shift()!;
        pixels.push(p);

        // 4-connected neighbors
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
```

- [ ] **Step 2: 编写 region-detector 测试**

```ts
// scripts/__tests__/region-detector.test.ts
import { describe, it, expect } from "vitest";
import { detectRegions } from "../region-detector";
import type { BinaryImage } from "../preprocess";

describe("detectRegions", () => {
  function createTestImage(
    width: number,
    height: number,
    fillRects: Array<{ x: number; y: number; w: number; h: number }>,
  ): BinaryImage {
    const data = new Uint8Array(width * height);
    for (const rect of fillRects) {
      for (let y = rect.y; y < rect.y + rect.h; y++) {
        for (let x = rect.x; x < rect.x + rect.w; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            data[y * width + x] = 255;
          }
        }
      }
    }
    return { width, height, data };
  }

  it("detects two separate regions", () => {
    const img = createTestImage(100, 100, [
      { x: 5, y: 5, w: 20, h: 20 }, // 400px
      { x: 50, y: 50, w: 20, h: 20 }, // 400px
    ]);
    const regions = detectRegions(img, 100);
    expect(regions).toHaveLength(2);
    expect(regions[0].area).toBe(400);
    expect(regions[1].area).toBe(400);
  });

  it("filters out regions smaller than minArea", () => {
    const img = createTestImage(100, 100, [
      { x: 5, y: 5, w: 3, h: 3 }, // 9px — too small
      { x: 50, y: 50, w: 20, h: 20 }, // 400px
    ]);
    const regions = detectRegions(img, 100);
    expect(regions).toHaveLength(1);
    expect(regions[0].area).toBe(400);
  });

  it("returns empty for blank image", () => {
    const img: BinaryImage = {
      width: 50,
      height: 50,
      data: new Uint8Array(2500),
    };
    const regions = detectRegions(img, 10);
    expect(regions).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
bunx vitest run scripts/__tests__/region-detector.test.ts
```

Expected: 全部 PASS

- [ ] **Step 4: Commit**

```bash
git add scripts/region-detector.ts scripts/__tests__/region-detector.test.ts
git commit -m "feat(scripts): add flood-fill region detector with tests"
```

---

## Task 4: Path 生成模块 (path-generator.ts)

**Files:**

- Create: `scripts/path-generator.ts`
- Create: `scripts/__tests__/path-generator.test.ts`

- [ ] **Step 1: 编写 path-generator.ts**

```ts
// scripts/path-generator.ts
import { createCanvas } from "@napi-rs/canvas";
import type { DetectedRegion } from "./region-detector";
import { computeBBoxFromPixels } from "./utils";
import type { Region } from "./utils";
import potrace from "potrace";

export interface PathGeneratorOptions {
  potraceThreshold?: number;
}

export function generateRegionPath(
  region: DetectedRegion,
  canvasWidth: number,
  canvasHeight: number,
  options: PathGeneratorOptions = {},
): Region {
  const bbox = computeBBoxFromPixels(region.pixels);

  // 创建一个仅包含该区域的黑底白块图像
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = "white";

  for (const { x, y } of region.pixels) {
    ctx.fillRect(x, y, 1, 1);
  }

  const pngBuffer = Buffer.from(canvas.toBuffer("image/png"));

  return new Promise((resolve, reject) => {
    potrace.trace(
      pngBuffer,
      {
        threshold: options.potraceThreshold ?? 120,
        color: "black",
      },
      (err: Error | null, svg: string) => {
        if (err) {
          reject(err);
          return;
        }

        // 从 SVG 中提取 path d 属性
        const match = svg.match(/<path[^>]*d="([^"]+)"/);
        const path = match ? match[1] : "";

        resolve({
          id: "", // 由 template-builder 填充
          path,
          bbox,
        });
      },
    );
  }) as unknown as Region;
}

export async function generateAllPaths(
  regions: DetectedRegion[],
  canvasWidth: number,
  canvasHeight: number,
  options: PathGeneratorOptions = {},
): Promise<Region[]> {
  const results: Region[] = [];

  for (let i = 0; i < regions.length; i++) {
    try {
      const region = await generateRegionPath(
        regions[i],
        canvasWidth,
        canvasHeight,
        options,
      );
      if (region.path) {
        results.push({ ...region, id: `region-${i + 1}` });
      }
    } catch (err) {
      console.warn(`[WARN] Failed to trace region ${i + 1}:`, err);
    }
  }

  return results;
}
```

- [ ] **Step 2: 编写 path-generator 测试**

```ts
// scripts/__tests__/path-generator.test.ts
import { describe, it, expect } from "vitest";
import { generateAllPaths } from "../path-generator";
import type { DetectedRegion } from "../region-detector";

describe("generateAllPaths", () => {
  it("generates SVG path for a rectangular region", async () => {
    const region: DetectedRegion = {
      area: 100,
      pixels: Array.from({ length: 100 }, (_, i) => ({
        x: 10 + (i % 10),
        y: 10 + Math.floor(i / 10),
      })),
    };

    const results = await generateAllPaths([region], 40, 40);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("region-1");
    expect(results[0].path).toContain("M"); // SVG path 必须以 M 开头
    expect(results[0].bbox.x).toBe(10);
    expect(results[0].bbox.y).toBe(10);
    expect(results[0].bbox.w).toBe(10);
    expect(results[0].bbox.h).toBe(10);
  });

  it("skips regions that fail to trace", async () => {
    // 0 像素的区域应该被跳过
    const emptyRegion: DetectedRegion = {
      area: 0,
      pixels: [],
    };

    const results = await generateAllPaths([emptyRegion], 10, 10);
    expect(results).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
bunx vitest run scripts/__tests__/path-generator.test.ts
```

Expected: 全部 PASS

- [ ] **Step 4: Commit**

```bash
git add scripts/path-generator.ts scripts/__tests__/path-generator.test.ts
git commit -m "feat(scripts): add path generator using potrace with tests"
```

---

## Task 5: 模板组装模块 (template-builder.ts)

**Files:**

- Create: `scripts/template-builder.ts`
- Create: `scripts/__tests__/template-builder.test.ts`

- [ ] **Step 1: 编写 template-builder.ts**

```ts
// scripts/template-builder.ts
import type { Region } from "./utils";
import type { Template } from "./template-builder";

export type TemplateCategory = "cute" | "nature" | "mandala" | "pixel";
export type TemplateDifficulty = "easy" | "medium" | "hard";

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  viewBox: { x: number; y: number; w: number; h: number };
  regions: Region[];
  thumbnail: string;
}

export function inferDifficulty(regionCount: number): TemplateDifficulty {
  if (regionCount <= 5) return "easy";
  if (regionCount <= 12) return "medium";
  return "hard";
}

export function generateTemplateId(
  category: TemplateCategory,
  name: string,
): string {
  const slug = name
    .toLowerCase()
    .replace(/[\s一-鿿]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 30);
  return `${category}-${slug}-01`;
}

export function buildTemplate(options: {
  name: string;
  category: TemplateCategory;
  difficulty?: TemplateDifficulty;
  viewBoxSize?: number;
  regions: Region[];
  id?: string;
}): Template {
  const size = options.viewBoxSize ?? 400;
  const difficulty =
    options.difficulty ?? inferDifficulty(options.regions.length);

  return {
    id: options.id ?? generateTemplateId(options.category, options.name),
    name: options.name,
    category: options.category,
    difficulty,
    viewBox: { x: 0, y: 0, w: size, h: size },
    regions: options.regions,
    thumbnail: "",
  };
}
```

- [ ] **Step 2: 编写 template-builder 测试**

```ts
// scripts/__tests__/template-builder.test.ts
import { describe, it, expect } from "vitest";
import {
  inferDifficulty,
  generateTemplateId,
  buildTemplate,
} from "../template-builder";

describe("inferDifficulty", () => {
  it("returns easy for 5 or fewer regions", () => {
    expect(inferDifficulty(0)).toBe("easy");
    expect(inferDifficulty(3)).toBe("easy");
    expect(inferDifficulty(5)).toBe("easy");
  });

  it("returns medium for 6-12 regions", () => {
    expect(inferDifficulty(6)).toBe("medium");
    expect(inferDifficulty(12)).toBe("medium");
  });

  it("returns hard for more than 12 regions", () => {
    expect(inferDifficulty(13)).toBe("hard");
    expect(inferDifficulty(30)).toBe("hard");
  });
});

describe("generateTemplateId", () => {
  it("generates id from category and name", () => {
    expect(generateTemplateId("cute", "小猫咪")).toContain("cute");
    expect(generateTemplateId("cute", "小猫咪")).toContain("01");
  });
});

describe("buildTemplate", () => {
  it("builds a valid template with auto difficulty", () => {
    const template = buildTemplate({
      name: "测试",
      category: "nature",
      regions: [
        {
          id: "r1",
          path: "M0,0 L10,0 L10,10 Z",
          bbox: { x: 0, y: 0, w: 10, h: 10 },
        },
        {
          id: "r2",
          path: "M20,20 L30,20 L30,30 Z",
          bbox: { x: 20, y: 20, w: 10, h: 10 },
        },
      ],
    });

    expect(template.name).toBe("测试");
    expect(template.category).toBe("nature");
    expect(template.difficulty).toBe("easy");
    expect(template.viewBox).toEqual({ x: 0, y: 0, w: 400, h: 400 });
    expect(template.regions).toHaveLength(2);
    expect(template.thumbnail).toBe("");
  });

  it("uses explicit difficulty when provided", () => {
    const template = buildTemplate({
      name: "测试",
      category: "cute",
      difficulty: "hard",
      regions: [],
    });
    expect(template.difficulty).toBe("hard");
  });

  it("uses custom id when provided", () => {
    const template = buildTemplate({
      name: "测试",
      category: "mandala",
      id: "custom-id-01",
      regions: [],
    });
    expect(template.id).toBe("custom-id-01");
  });
});
```

- [ ] **Step 3: 运行测试**

```bash
bunx vitest run scripts/__tests__/template-builder.test.ts
```

Expected: 全部 PASS

- [ ] **Step 4: Commit**

```bash
git add scripts/template-builder.ts scripts/__tests__/template-builder.test.ts
git commit -m "feat(scripts): add template builder with difficulty inference"
```

---

## Task 6: CLI 主入口 (png2template.ts)

**Files:**

- Create: `scripts/png2template.ts`
- Modify: `package.json` (添加 npm script)

- [ ] **Step 1: 编写 png2template.ts**

```ts
#!/usr/bin/env bun
// scripts/png2template.ts
import { parseArgs } from "node:util";
import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { preprocess } from "./preprocess";
import { detectRegions } from "./region-detector";
import { generateAllPaths } from "./path-generator";
import { buildTemplate } from "./template-builder";
import type { TemplateCategory, TemplateDifficulty } from "./template-builder";

const USAGE = `
用法:
  bun scripts/png2template.ts <input> [options]

  <input>    PNG 文件或包含 PNG 的目录路径

选项:
  --category, -c     模板分类 (cute/nature/mandala/pixel)
  --name, -n         模板名称（默认使用文件名）
  --difficulty, -d   难度 (easy/medium/hard/auto)
  --output, -o       输出目录 (默认: templates/)
  --threshold, -t    二值化阈值 (默认: 128)
  --min-area, -m     最小区域面积 px² (默认: 500)
  --viewbox-size, -s viewBox 边长 (默认: 400)
  --batch            批量处理目录下所有 PNG
  --dry-run          仅检测，不生成文件
`;

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      category: { type: "string", short: "c" },
      name: { type: "string", short: "n" },
      difficulty: { type: "string", short: "d" },
      output: { type: "string", short: "o", default: "templates" },
      threshold: { type: "string", short: "t", default: "128" },
      "min-area": { type: "string", short: "m", default: "500" },
      "viewbox-size": { type: "string", short: "s", default: "400" },
      batch: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(USAGE);
    process.exit(0);
  }

  const inputPath = positionals[0];
  const isBatch = values.batch;
  const isDryRun = values["dry-run"] as boolean;
  const threshold = parseInt(values.threshold as string, 10);
  const minArea = parseInt(values["min-area"] as string, 10);
  const viewBoxSize = parseInt(values["viewbox-size"] as string, 10);
  const outputDir = values.output as string;

  if (isBatch) {
    const files = await readdir(inputPath);
    const pngFiles = files.filter(
      (f) =>
        extname(f).toLowerCase() === ".png" ||
        extname(f).toLowerCase() === ".webp",
    );

    console.log(`[INFO] 批量处理 ${pngFiles.length} 个文件...\n`);

    for (const file of pngFiles) {
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
  console.log(`  阈值: ${opts.threshold}, 最小区域: ${opts.minArea}px²`);

  try {
    // 1. 预处理
    console.log("  ① 预处理...");
    const binaryImage = await preprocess(filePath, opts.threshold);

    // 2. 区域检测
    console.log("  ② 检测区域...");
    const regions = detectRegions(binaryImage, opts.minArea);
    console.log(`  检测到 ${regions.length} 个区域`);

    if (regions.length === 0) {
      console.warn(`  [SKIP] ${name}: 无有效区域，跳过`);
      console.log("");
      return;
    }

    // 3. 生成 SVG paths
    console.log("  ③ 生成 SVG paths...");
    const pathRegions = await generateAllPaths(
      regions,
      opts.viewBoxSize,
      opts.viewBoxSize,
    );
    console.log(`  成功生成 ${pathRegions.length} 个 paths`);

    if (pathRegions.length === 0) {
      console.warn(`  [SKIP] ${name}: path 生成失败，跳过`);
      console.log("");
      return;
    }

    // 4. 组装模板
    console.log("  ④ 组装模板...");
    const template = buildTemplate({
      name,
      category: (values.category as TemplateCategory) || "nature",
      difficulty: values.difficulty as TemplateDifficulty | undefined,
      viewBoxSize: opts.viewBoxSize,
      regions: pathRegions,
    });

    console.log(`  模板 ID: ${template.id}`);
    console.log(`  难度: ${template.difficulty}`);
    console.log(`  区域数: ${template.regions.length}`);

    if (opts.isDryRun) {
      console.log(`  [DRY-RUN] 跳过写入\n`);
      return;
    }

    // 5. 写入文件
    const category = template.category;
    const finalDir = join(opts.outputDir, category);
    await mkdir(finalDir, { recursive: true });
    const outputFile = join(finalDir, `${template.id}.json`);
    await writeFile(outputFile, JSON.stringify(template, null, 2), "utf-8");

    console.log(`  [OK] 写入: ${outputFile}`);
    console.log("");
  } catch (err) {
    console.error(`  [ERROR] ${name} 处理失败:`, err);
    console.log("");
  }
}

main();
```

- [ ] **Step 2: 添加 npm script**

在根 `package.json` 的 `scripts` 中添加：

```json
"png2template": "bun scripts/png2template.ts"
```

- [ ] **Step 3: 端到端测试 — 用 fixture 图片验证**

```bash
bun scripts/png2template.ts scripts/__tests__/fixtures/simple-box.png --category nature --name "测试方块" --output /tmp/template-test --min-area 50
```

Expected: 在 `/tmp/template-test/nature/` 下生成 JSON 文件，包含至少 1 个 region，path 以 M 开头。

- [ ] **Step 4: 端到端测试 — dry-run 模式**

```bash
bun scripts/png2template.ts scripts/__tests__/fixtures/simple-box.png --category nature --name "测试方块" --dry-run
```

Expected: 输出检测信息但不写入文件。

- [ ] **Step 5: Commit**

```bash
git add scripts/png2template.ts package.json
git commit -m "feat(scripts): add png2template CLI with batch and dry-run support"
```

---

## Task 7: 实际素材验证

**Files:** 无新文件，使用现有 `templates/originPng/` 素材验证。

- [ ] **Step 1: 用一张实际图片测试**

```bash
bun scripts/png2template.ts "templates/originPng/猫咪.png" --category cute --name "小猫咪" --output /tmp/template-test --min-area 200
```

检查输出：

- 是否成功检测到多个区域？
- 区域数量是否合理？
- SVG path 是否有效？

- [ ] **Step 2: 根据结果调整参数**

如果区域过多或过少，调整 `--min-area` 和 `--threshold` 参数：

- 区域过碎 → 增大 `--min-area`（如 1000、2000）
- 线条太粗导致区域太小 → 调整 `--threshold`（如 100、150）

- [ ] **Step 3: 记录最佳参数到设计文档**

将验证后的推荐参数追加到 `docs/superpowers/specs/2026-04-24-png2template-design.md` 的「约束」部分。

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-24-png2template-design.md
git commit -m "docs: update png2template spec with validated parameters"
```

---

## Task 8: 批量处理并集成到 templates/

**Files:**

- Modify: `templates/index.json` (可能需要更新索引)

- [ ] **Step 1: 批量处理所有素材**

```bash
bun scripts/png2template.ts templates/originPng/ --batch --output templates/ --min-area 200
```

- [ ] **Step 2: 检查输出质量**

检查生成的 JSON 文件：

- 区域数量是否合理（5-30 个之间）
- path 数据是否有效（能被 template-engine 加载）
- bbox 是否准确

- [ ] **Step 3: 手动清理不可用的输出**

删除质量不合格的 JSON 文件（区域检测失败的图片）。

- [ ] **Step 4: 更新 templates/index.json**

将新生成的模板添加到索引中。

- [ ] **Step 5: 验证模板在应用中可用**

```bash
bun run dev
```

在浏览器中打开首页，确认新模板出现在列表中，点击进入编辑器确认填色正常。

- [ ] **Step 6: Commit**

```bash
git add templates/
git commit -m "feat(templates): add auto-generated templates from originPng"
```
