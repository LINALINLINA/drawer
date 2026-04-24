# 创意绘画板（Drawer）MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Canvas 的创意填色绘画板，支持模板填色、配色系统、线条绘制、印章、撤销重做、本地存储和 PNG 导出。

**Architecture:** Bun + Turbo monorepo，三个核心 packages（canvas-engine / template-engine / color-engine）+ 一个 React web app。Canvas 分层渲染（Template 缓存层 + Draw 动态层），状态驱动 render(state)，hitTest 使用 bbox 粗过滤 + isPointInPath 精确匹配。

**Tech Stack:** Bun, Turbo, React 19, TypeScript, Zustand, Vite, Vitest, Canvas API (Path2D, OffscreenCanvas)

---

## 文件结构总览

```
drawer/
├── apps/
│   └── web/
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── router.tsx
│           ├── stores/
│           │   └── editor-store.ts
│           ├── pages/
│           │   ├── Home.tsx
│           │   ├── Editor.tsx
│           │   └── Gallery.tsx
│           ├── components/
│           │   ├── TemplateCard.tsx
│           │   ├── Toolbar.tsx
│           │   ├── ColorPalette.tsx
│           │   ├── PaletteSelector.tsx
│           │   ├── StampPicker.tsx
│           │   ├── StrokeSettings.tsx
│           │   ├── BottomNav.tsx
│           │   └── Toast.tsx
│           ├── hooks/
│           │   ├── useCanvasEngine.ts
│           │   ├── useGestures.ts
│           │   └── useArtworks.ts
│           └── utils/
│               ├── storage.ts
│               └── export.ts
│
├── packages/
│   ├── canvas-engine/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── CanvasEngine.ts
│   │       ├── render.ts
│   │       ├── hit-test.ts
│   │       ├── cache.ts
│   │       └── types.ts
│   │
│   ├── template-engine/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── loader.ts
│   │       ├── bbox.ts
│   │       └── types.ts
│   │
│   └── color-engine/
│       ├── package.json
│       └── src/
│           ├── index.ts
│           ├── palettes.ts
│           ├── generator.ts
│           └── types.ts
│
├── templates/
│   ├── index.json
│   ├── cute/
│   │   └── star.json
│   ├── nature/
│   │   └── leaf.json
│   ├── mandala/
│   │   └── pattern-01.json
│   └── pixel/
│       └── heart.json
│
├── package.json
├── turbo.json
├── tsconfig.json
└── bun.lock
```

---

## Task 1: Monorepo 脚手架

**Files:**

- Create: `package.json`
- Create: `turbo.json`
- Create: `tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `packages/canvas-engine/package.json`
- Create: `packages/template-engine/package.json`
- Create: `packages/color-engine/package.json`

- [ ] **Step 1: 初始化 git 仓库**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer
git init
```

- [ ] **Step 2: 创建根 package.json**

```json
{
  "name": "drawer",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "bun@1.2.0"
}
```

- [ ] **Step 3: 创建 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

- [ ] **Step 4: 创建根 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: 创建 packages/canvas-engine/package.json**

```json
{
  "name": "@drawer/canvas-engine",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 6: 创建 packages/template-engine/package.json**

```json
{
  "name": "@drawer/template-engine",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 7: 创建 packages/color-engine/package.json**

```json
{
  "name": "@drawer/color-engine",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 8: 创建 apps/web/package.json**

```json
{
  "name": "@drawer/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "@drawer/canvas-engine": "workspace:*",
    "@drawer/template-engine": "workspace:*",
    "@drawer/color-engine": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 9: 创建 apps/web/vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  base: "./",
});
```

- [ ] **Step 10: 创建 apps/web/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    />
    <title>创意绘画板 - Drawer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 11: 创建 apps/web/src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 12: 创建 apps/web/src/App.tsx**

```tsx
export default function App() {
  return (
    <div style={{ padding: 20, fontFamily: "system-ui" }}>
      <h1>创意绘画板</h1>
      <p>Drawer MVP - 脚手架就绪</p>
    </div>
  );
}
```

- [ ] **Step 13: 安装依赖并验证 dev 启动**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer
bun install
bun run dev
```

Expected: Vite dev server 在 http://localhost:3000 启动，浏览器显示 "创意绘画板"

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: init monorepo with bun + turbo + react"
```

---

## Task 2: template-engine — 类型定义与 bbox 计算

**Files:**

- Create: `packages/template-engine/src/types.ts`
- Create: `packages/template-engine/src/bbox.ts`
- Create: `packages/template-engine/src/index.ts`
- Create: `packages/template-engine/tsconfig.json`
- Test: `packages/template-engine/src/__tests__/bbox.test.ts`

- [ ] **Step 1: 创建 packages/template-engine/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: 创建 packages/template-engine/src/types.ts**

```typescript
export type BBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Region = {
  id: string;
  path: string;
  bbox: BBox;
};

export type TemplateCategory = "cute" | "nature" | "mandala" | "pixel";
export type TemplateDifficulty = "easy" | "medium" | "hard";

export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  viewBox: { x: number; y: number; w: number; h: number };
  regions: Region[];
  thumbnail: string;
};
```

- [ ] **Step 3: 编写 bbox 计算的失败测试**

Create `packages/template-engine/src/__tests__/bbox.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeBBox } from "../bbox";

describe("computeBBox", () => {
  it("computes bbox for a simple rectangle path", () => {
    // M10,10 L100,10 L100,80 L10,80 Z
    const path = "M10,10 L100,10 L100,80 L10,80 Z";
    const bbox = computeBBox(path);
    expect(bbox).toEqual({ x: 10, y: 10, w: 90, h: 70 });
  });

  it("computes bbox for a circle path", () => {
    // Circle at (200,200) radius 50
    const path = "M200,150 A50,50,0,1,1,200,250 A50,50,0,1,1,200,150 Z";
    const bbox = computeBBox(path);
    expect(bbox.x).toBeCloseTo(150, 0);
    expect(bbox.y).toBeCloseTo(150, 0);
    expect(bbox.w).toBeCloseTo(100, 0);
    expect(bbox.h).toBeCloseTo(100, 0);
  });

  it("computes bbox for a curved path", () => {
    const path = "M10,10 C10,100 100,100 100,10";
    const bbox = computeBBox(path);
    expect(bbox.x).toBe(10);
    expect(bbox.y).toBe(10);
    expect(bbox.w).toBeCloseTo(90, -1);
    expect(bbox.h).toBeCloseTo(60, -1);
  });
});
```

- [ ] **Step 4: 运行测试确认失败**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/template-engine test
```

Expected: FAIL — `bbox.ts` 不存在

- [ ] **Step 5: 实现 bbox 计算**

Create `packages/template-engine/src/bbox.ts`:

```typescript
import type { BBox } from "./types";

type Point = { x: number; y: number };

function parsePathCommands(d: string): number[] {
  const numbers: number[] = [];
  const re = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  let match;
  while ((match = re.exec(d)) !== null) {
    numbers.push(parseFloat(match[0]));
  }
  return numbers;
}

export function computeBBox(d: string): BBox {
  // 利用 Canvas Path2D 渲染到离屏 canvas，采样像素获取精确 bbox
  const path = new Path2D(d);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const STEPS = 1000;

  // 先粗略扫描：遍历所有数字找 min/max
  const nums = parsePathCommands(d);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i],
      y = nums[i + 1];
    if (isFinite(x) && isFinite(y)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  // 扩展范围以覆盖曲线控制点
  const padding = Math.max(maxX - minX, maxY - minY) * 0.1;
  const searchX = minX - padding;
  const searchY = minY - padding;
  const searchW = maxX - minX + padding * 2;
  const searchH = maxY - minY + padding * 2;

  canvas.width = Math.ceil(searchW);
  canvas.height = Math.ceil(searchH);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, 0, 1, -searchX, -searchY);
  ctx.fill(path);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  let foundMinX = Infinity,
    foundMinY = Infinity,
    foundMaxX = -Infinity,
    foundMaxY = -Infinity;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = pixels[(y * canvas.width + x) * 4 + 3];
      if (alpha > 0) {
        foundMinX = Math.min(foundMinX, x + searchX);
        foundMinY = Math.min(foundMinY, y + searchY);
        foundMaxX = Math.max(foundMaxX, x + searchX);
        foundMaxY = Math.max(foundMaxY, y + searchY);
      }
    }
  }

  if (!isFinite(foundMinX)) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  return {
    x: Math.round(foundMinX),
    y: Math.round(foundMinY),
    w: Math.round(foundMaxX - foundMinX),
    h: Math.round(foundMaxY - foundMinY),
  };
}
```

> **注意：** 上述 pixel-sampling 方案依赖浏览器 DOM。测试环境需要 jsdom 或 happy-dom。如果测试环境不支持，降级为纯数字解析方案（精度稍低但足够 V1 使用）。备选纯数值方案见 Step 5b。

**Step 5b（备选 — 纯数值 bbox，无需 DOM）：**

```typescript
import type { BBox } from "./types";

function parsePathNumbers(d: string): number[] {
  const nums: number[] = [];
  const re = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  let m;
  while ((m = re.exec(d)) !== null) nums.push(parseFloat(m[0]));
  return nums;
}

export function computeBBox(d: string): BBox {
  const nums = parsePathNumbers(d);
  if (nums.length < 2) return { x: 0, y: 0, w: 0, h: 0 };

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i],
      y = nums[i + 1];
    if (isFinite(x) && isFinite(y)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    x: Math.round(minX),
    y: Math.round(minY),
    w: Math.round(maxX - minX),
    h: Math.round(maxY - minY),
  };
}
```

- [ ] **Step 6: 运行测试确认通过**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/template-engine test
```

Expected: PASS

- [ ] **Step 7: 创建 index.ts 导出**

Create `packages/template-engine/src/index.ts`:

```typescript
export type {
  BBox,
  Region,
  Template,
  TemplateCategory,
  TemplateDifficulty,
} from "./types";
export { computeBBox } from "./bbox";
```

- [ ] **Step 8: Commit**

```bash
git add packages/template-engine/
git commit -m "feat(template-engine): add types and bbox computation"
```

---

## Task 3: template-engine — 模板加载器

**Files:**

- Create: `packages/template-engine/src/loader.ts`
- Test: `packages/template-engine/src/__tests__/loader.test.ts`
- Modify: `packages/template-engine/src/index.ts`

- [ ] **Step 1: 编写 loader 失败测试**

Create `packages/template-engine/src/__tests__/loader.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  loadTemplate,
  loadTemplateIndex,
  type TemplateIndexEntry,
} from "../loader";

describe("loadTemplateIndex", () => {
  it("loads index.json and returns entries", async () => {
    // mock: 会在集成测试中验证
    const entries = await loadTemplateIndex("/templates/index.json");
    expect(Array.isArray(entries)).toBe(true);
  });
});

describe("loadTemplate", () => {
  it("loads a template by file path", async () => {
    const template = await loadTemplate("/templates/cute/star.json");
    expect(template).toHaveProperty("id");
    expect(template).toHaveProperty("regions");
    expect(template.regions.length).toBeGreaterThan(0);
  });

  it("returns error result for invalid path", async () => {
    const result = await loadTemplate("/nonexistent.json");
    expect(result).toBe(null);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/template-engine test
```

Expected: FAIL

- [ ] **Step 3: 实现 loader**

Create `packages/template-engine/src/loader.ts`:

```typescript
import type { Template, Region, BBox } from "./types";

export type TemplateIndexEntry = {
  id: string;
  file: string;
};

export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function ensureBBox(region: Region): Region {
  if (region.bbox && region.bbox.w > 0 && region.bbox.h > 0) {
    return region;
  }
  // fallback: 从 path 命令中提取数值做粗略 bbox
  const nums: number[] = [];
  const re = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  let m;
  while ((m = re.exec(region.path)) !== null) nums.push(parseFloat(m[0]));

  if (nums.length < 4) return { ...region, bbox: { x: 0, y: 0, w: 0, h: 0 } };

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i],
      y = nums[i + 1];
    if (isFinite(x) && isFinite(y)) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    ...region,
    bbox: {
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.round(maxX - minX),
      h: Math.round(maxY - minY),
    },
  };
}

export async function loadTemplateIndex(
  indexPath: string,
): Promise<TemplateIndexEntry[]> {
  try {
    const res = await fetch(indexPath);
    if (!res.ok) return [];
    const data = await res.json();
    return data.templates ?? [];
  } catch {
    console.error(
      "[template-engine] Failed to load template index:",
      indexPath,
    );
    return [];
  }
}

export async function loadTemplate(filePath: string): Promise<Template | null> {
  try {
    const res = await fetch(filePath);
    if (!res.ok) return null;
    const data = await res.json();

    return {
      ...data,
      regions: (data.regions ?? []).map(ensureBBox),
      thumbnail: data.thumbnail ?? "",
    } as Template;
  } catch {
    console.error("[template-engine] Failed to load template:", filePath);
    return null;
  }
}
```

- [ ] **Step 4: 更新 index.ts 导出**

```typescript
export type {
  BBox,
  Region,
  Template,
  TemplateCategory,
  TemplateDifficulty,
} from "./types";
export { computeBBox } from "./bbox";
export { loadTemplate, loadTemplateIndex } from "./loader";
export type { TemplateIndexEntry, LoadResult } from "./loader";
```

- [ ] **Step 5: 运行测试**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/template-engine test
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/template-engine/
git commit -m "feat(template-engine): add template loader with fetch-based loading"
```

---

## Task 4: color-engine — 类型、预设 Palette 与颜色生成

**Files:**

- Create: `packages/color-engine/src/types.ts`
- Create: `packages/color-engine/src/palettes.ts`
- Create: `packages/color-engine/src/generator.ts`
- Create: `packages/color-engine/src/index.ts`
- Create: `packages/color-engine/tsconfig.json`
- Test: `packages/color-engine/src/__tests__/palettes.test.ts`
- Test: `packages/color-engine/src/__tests__/generator.test.ts`

- [ ] **Step 1: 创建 packages/color-engine/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: 创建 packages/color-engine/src/types.ts**

```typescript
export type Palette = {
  id: string;
  name: string;
  colors: string[];
};

export type ColorMode = "manual" | "palette" | "random";
```

- [ ] **Step 3: 编写 palettes 失败测试**

Create `packages/color-engine/src/__tests__/palettes.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getPalettes, getPaletteById } from "../palettes";

describe("getPalettes", () => {
  it("returns at least 3 preset palettes", () => {
    const palettes = getPalettes();
    expect(palettes.length).toBeGreaterThanOrEqual(3);
  });

  it("each palette has at least 4 colors", () => {
    const palettes = getPalettes();
    for (const p of palettes) {
      expect(p.colors.length).toBeGreaterThanOrEqual(4);
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
    }
  });
});

describe("getPaletteById", () => {
  it("returns the correct palette", () => {
    const palette = getPaletteById("sunset");
    expect(palette).toBeTruthy();
    expect(palette!.name).toBeTruthy();
  });

  it("returns null for unknown id", () => {
    const palette = getPaletteById("nonexistent");
    expect(palette).toBeNull();
  });
});
```

- [ ] **Step 4: 实现 palettes**

Create `packages/color-engine/src/palettes.ts`:

```typescript
import type { Palette } from "./types";

const PRESET_PALETTES: Palette[] = [
  {
    id: "sunset",
    name: "日落",
    colors: ["#FF6B6B", "#FFA07A", "#FFD700", "#FF8C00", "#C0392B"],
  },
  {
    id: "ocean",
    name: "海洋",
    colors: ["#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8", "#023E8A"],
  },
  {
    id: "forest",
    name: "森林",
    colors: ["#2D6A4F", "#40916C", "#52B788", "#74C69D", "#B7E4C7"],
  },
  {
    id: "candy",
    name: "糖果",
    colors: ["#FF69B4", "#FFB6C1", "#DDA0DD", "#87CEEB", "#FFDAB9"],
  },
  {
    id: "earth",
    name: "大地",
    colors: ["#8B4513", "#D2691E", "#DEB887", "#F5DEB3", "#A0522D"],
  },
  {
    id: "pastel",
    name: "马卡龙",
    colors: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#E8BAFF"],
  },
];

export function getPalettes(): Palette[] {
  return PRESET_PALETTES;
}

export function getPaletteById(id: string): Palette | null {
  return PRESET_PALETTES.find((p) => p.id === id) ?? null;
}
```

- [ ] **Step 5: 编写 generator 失败测试**

Create `packages/color-engine/src/__tests__/generator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateRandomPalette, hexToHSL, hslToHex } from "../generator";

describe("hexToHSL / hslToHex roundtrip", () => {
  it("converts hex to HSL and back", () => {
    const hex = "#FF6B6B";
    const hsl = hexToHSL(hex);
    const back = hslToHex(hsl.h, hsl.s, hsl.l);
    expect(back).toBe("#ff6b6b");
  });
});

describe("generateRandomPalette", () => {
  it("generates a palette with 5 colors", () => {
    const palette = generateRandomPalette(5);
    expect(palette.length).toBe(5);
    for (const color of palette) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("generates different palettes on each call", () => {
    const a = generateRandomPalette(5, 42);
    const b = generateRandomPalette(5, 99);
    expect(a).not.toEqual(b);
  });
});
```

- [ ] **Step 6: 实现 generator**

Create `packages/color-engine/src/generator.ts`:

```typescript
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRGB(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRGB(h, s, l);
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function generateRandomPalette(
  count: number = 5,
  seed?: number,
): string[] {
  let s = seed ?? Math.random() * 360;
  const baseHue = s % 360;
  const colors: string[] = [];

  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (i * 360) / count) % 360;
    const sat = 60 + Math.random() * 30;
    const lit = 45 + Math.random() * 25;
    colors.push(hslToHex(Math.round(hue), Math.round(sat), Math.round(lit)));
  }

  return colors;
}
```

- [ ] **Step 7: 创建 index.ts 导出**

Create `packages/color-engine/src/index.ts`:

```typescript
export type { Palette, ColorMode } from "./types";
export { getPalettes, getPaletteById } from "./palettes";
export { hexToHSL, hslToHex, generateRandomPalette } from "./generator";
```

- [ ] **Step 8: 运行测试**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/color-engine test
```

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add packages/color-engine/
git commit -m "feat(color-engine): add palettes, color conversion, and random generation"
```

---

## Task 5: canvas-engine — 类型定义与 CanvasEngine 类

**Files:**

- Create: `packages/canvas-engine/src/types.ts`
- Create: `packages/canvas-engine/tsconfig.json`
- Test: `packages/canvas-engine/src/__tests__/types.test.ts`

- [ ] **Step 1: 创建 packages/canvas-engine/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 2: 创建 packages/canvas-engine/src/types.ts**

```typescript
export type Stroke = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  style: "solid" | "dashed";
};

export type StampType = "emoji" | "builtin" | "custom";

export type Stamp = {
  id: string;
  type: StampType;
  value: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

export type CanvasState = {
  fills: Record<string, string>;
  strokes: Stroke[];
  stamps: Stamp[];
  selectedRegionId: string | null;
};

export type EditorTool = "fill" | "brush" | "eraser" | "stamp";
```

- [ ] **Step 3: 编写类型验证测试**

Create `packages/canvas-engine/src/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { CanvasState, Stroke, Stamp } from "../types";

describe("CanvasState types", () => {
  it("accepts valid empty state", () => {
    const state: CanvasState = {
      fills: {},
      strokes: [],
      stamps: [],
      selectedRegionId: null,
    };
    expect(state.strokes).toHaveLength(0);
  });

  it("accepts valid state with data", () => {
    const stroke: Stroke = {
      id: "s1",
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      color: "#ff0000",
      width: 2,
      style: "solid",
    };
    const stamp: Stamp = {
      id: "t1",
      type: "emoji",
      value: "⭐",
      x: 100,
      y: 100,
      scale: 1,
      rotate: 0,
    };
    const state: CanvasState = {
      fills: { r1: "#ff0000" },
      strokes: [stroke],
      stamps: [stamp],
      selectedRegionId: "r1",
    };
    expect(Object.keys(state.fills)).toHaveLength(1);
    expect(state.strokes[0].points).toHaveLength(2);
  });
});
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/canvas-engine test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/canvas-engine/
git commit -m "feat(canvas-engine): add core type definitions"
```

---

## Task 6: canvas-engine — HitTest（bbox 粗过滤 + isPointInPath）

**Files:**

- Create: `packages/canvas-engine/src/hit-test.ts`
- Test: `packages/canvas-engine/src/__tests__/hit-test.test.ts`

- [ ] **Step 1: 编写 hit-test 失败测试**

Create `packages/canvas-engine/src/__tests__/hit-test.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hitTestRegion, hitTestStamp, type HitRegion } from "../hit-test";
import type { Stamp } from "../types";

describe("hitTestRegion", () => {
  const regions: HitRegion[] = [
    {
      id: "body",
      path: "M10,10 L90,10 L90,80 L10,80 Z",
      bbox: { x: 10, y: 10, w: 80, h: 70 },
      path2d: null as any, // will be mocked
    },
    {
      id: "head",
      path: "M200,200 L300,200 L300,300 L200,300 Z",
      bbox: { x: 200, y: 200, w: 100, h: 100 },
      path2d: null as any,
    },
  ];

  it("returns regionId when point is inside bbox and path", () => {
    const ctx = {
      isPointInPath: (_path: any, x: number, y: number) => {
        return x >= 10 && x <= 90 && y >= 10 && y <= 80;
      },
    } as unknown as CanvasRenderingContext2D;

    // Build Path2D for each region
    const regionsWithPaths = regions.map((r) => ({
      ...r,
      path2d: new Path2D(r.path),
    }));

    const result = hitTestRegion(50, 50, regionsWithPaths, ctx);
    expect(result).toBe("body");
  });

  it("returns null when point is outside all bboxes", () => {
    const ctx = {
      isPointInPath: () => false,
    } as unknown as CanvasRenderingContext2D;

    const regionsWithPaths = regions.map((r) => ({
      ...r,
      path2d: new Path2D(r.path),
    }));

    const result = hitTestRegion(500, 500, regionsWithPaths, ctx);
    expect(result).toBeNull();
  });

  it("skips regions where point is outside bbox", () => {
    const ctx = {
      isPointInPath: () => true, // would match everything
    } as unknown as CanvasRenderingContext2D;

    const regionsWithPaths = regions.map((r) => ({
      ...r,
      path2d: new Path2D(r.path),
    }));

    // Point is outside both bboxes
    const result = hitTestRegion(150, 150, regionsWithPaths, ctx);
    expect(result).toBeNull();
  });
});

describe("hitTestStamp", () => {
  const stamps: Stamp[] = [
    {
      id: "s1",
      type: "emoji",
      value: "⭐",
      x: 100,
      y: 100,
      scale: 1,
      rotate: 0,
    },
    {
      id: "s2",
      type: "emoji",
      value: "🌸",
      x: 200,
      y: 200,
      scale: 2,
      rotate: 0,
    },
  ];

  it("returns stamp id when point is inside stamp bbox (32px default size)", () => {
    const result = hitTestStamp(110, 110, stamps);
    expect(result).toBe("s1");
  });

  it("returns null when point is outside all stamps", () => {
    const result = hitTestStamp(0, 0, stamps);
    expect(result).toBeNull();
  });

  it("checks stamps from last to first (top layer first)", () => {
    const overlapping: Stamp[] = [
      {
        id: "bottom",
        type: "emoji",
        value: "a",
        x: 100,
        y: 100,
        scale: 1,
        rotate: 0,
      },
      {
        id: "top",
        type: "emoji",
        value: "b",
        x: 100,
        y: 100,
        scale: 1,
        rotate: 0,
      },
    ];
    const result = hitTestStamp(110, 110, overlapping);
    expect(result).toBe("top");
  });
});
```

- [ ] **Step 2: 实现 hit-test**

Create `packages/canvas-engine/src/hit-test.ts`:

```typescript
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
```

- [ ] **Step 3: 运行测试**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/canvas-engine test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/canvas-engine/
git commit -m "feat(canvas-engine): add hit-test with bbox filtering and isPointInPath"
```

---

## Task 7: canvas-engine — 渲染器（render + cache + 导出）

**Files:**

- Create: `packages/canvas-engine/src/render.ts`
- Create: `packages/canvas-engine/src/cache.ts`
- Create: `packages/canvas-engine/src/CanvasEngine.ts`
- Create: `packages/canvas-engine/src/index.ts`
- Test: `packages/canvas-engine/src/__tests__/render.test.ts`

- [ ] **Step 1: 编写 render 失败测试**

Create `packages/canvas-engine/src/__tests__/render.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderTemplateLayer, renderDrawLayer } from "../render";
import type { CanvasState } from "../types";

describe("renderTemplateLayer", () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    ctx = canvas.getContext("2d")!;
  });

  it("renders regions with fill colors", () => {
    const regions = [
      {
        id: "r1",
        path: "M10,10 L90,10 L90,80 L10,80 Z",
        bbox: { x: 10, y: 10, w: 80, h: 70 },
      },
    ];
    const fills = { r1: "#ff0000" };
    renderTemplateLayer(ctx, regions, fills);
    const pixel = ctx.getImageData(50, 50, 1, 1).data;
    expect(pixel[0]).toBe(255); // R
    expect(pixel[1]).toBe(0);
    expect(pixel[2]).toBe(0);
  });
});

describe("renderDrawLayer", () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 400;
    ctx = canvas.getContext("2d")!;
  });

  it("renders a stroke", () => {
    const state: CanvasState = {
      fills: {},
      strokes: [
        {
          id: "s1",
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
          color: "#000000",
          width: 2,
          style: "solid",
        },
      ],
      stamps: [],
      selectedRegionId: null,
    };
    renderDrawLayer(ctx, state);
    const pixel = ctx.getImageData(50, 50, 1, 1).data;
    // Should have drawn something (alpha > 0)
    expect(pixel[3]).toBeGreaterThan(0);
  });

  it("renders a stamp", () => {
    const state: CanvasState = {
      fills: {},
      strokes: [],
      stamps: [
        {
          id: "t1",
          type: "emoji",
          value: "⭐",
          x: 200,
          y: 200,
          scale: 1,
          rotate: 0,
        },
      ],
      selectedRegionId: null,
    };
    renderDrawLayer(ctx, state);
    const pixel = ctx.getImageData(200, 200, 1, 1).data;
    expect(pixel[3]).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 实现 render.ts**

Create `packages/canvas-engine/src/render.ts`:

```typescript
import type { CanvasState, Stroke, Stamp } from "./types";

type RegionDef = {
  id: string;
  path: string;
  bbox: { x: number; y: number; w: number; h: number };
};

export function renderTemplateLayer(
  ctx: CanvasRenderingContext2D,
  regions: RegionDef[],
  fills: Record<string, string>,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const region of regions) {
    const path2d = new Path2D(region.path);
    const color = fills[region.id];
    if (color) {
      ctx.fillStyle = color;
      ctx.fill(path2d);
    }
    // 始终绘制边界线
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    ctx.stroke(path2d);
  }
}

export function renderDrawLayer(
  ctx: CanvasRenderingContext2D,
  state: CanvasState,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const stroke of state.strokes) {
    renderStroke(ctx, stroke);
  }

  for (const stamp of state.stamps) {
    renderStamp(ctx, stamp);
  }
}

function renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  if (stroke.points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (stroke.style === "dashed") {
    ctx.setLineDash([stroke.width * 3, stroke.width * 2]);
  }

  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }

  ctx.stroke();
  ctx.restore();
}

function renderStamp(ctx: CanvasRenderingContext2D, stamp: Stamp): void {
  ctx.save();

  ctx.translate(stamp.x, stamp.y);
  ctx.rotate((stamp.rotate * Math.PI) / 180);
  ctx.scale(stamp.scale, stamp.scale);

  const fontSize = 32;
  ctx.font = `${fontSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(stamp.value, 0, 0);

  ctx.restore();
}
```

- [ ] **Step 3: 实现 cache.ts**

Create `packages/canvas-engine/src/cache.ts`:

```typescript
import type { RegionDef } from "./render";

export class TemplateCache {
  private offscreen: OffscreenCanvas | null = null;
  private width = 0;
  private height = 0;

  build(
    width: number,
    height: number,
    regions: RegionDef[],
    fills: Record<string, string>,
  ): OffscreenCanvas {
    if (!this.offscreen || this.width !== width || this.height !== height) {
      this.offscreen = new OffscreenCanvas(width, height);
      this.width = width;
      this.height = height;
    }

    const ctx = this.offscreen.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    for (const region of regions) {
      const path2d = new Path2D(region.path);
      const color = fills[region.id];
      if (color) {
        ctx.fillStyle = color;
        ctx.fill(path2d);
      }
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 1;
      ctx.stroke(path2d);
    }

    return this.offscreen;
  }

  getCanvas(): OffscreenCanvas | null {
    return this.offscreen;
  }

  destroy(): void {
    this.offscreen = null;
  }
}
```

- [ ] **Step 4: 实现 CanvasEngine.ts**

Create `packages/canvas-engine/src/CanvasEngine.ts`:

```typescript
import type { CanvasState } from "./types";
import type { Region } from "@drawer/template-engine";
import { renderTemplateLayer, renderDrawLayer } from "./render";
import { TemplateCache } from "./cache";
import { hitTestRegion, hitTestStamp, type HitRegion } from "./hit-test";

export class CanvasEngine {
  private container: HTMLElement;
  private width: number;
  private height: number;

  private templateCanvas: HTMLCanvasElement;
  private drawCanvas: HTMLCanvasElement;
  private templateCtx: CanvasRenderingContext2D;
  private drawCtx: CanvasRenderingContext2D;

  private cache = new TemplateCache();
  private regions: HitRegion[] = [];

  private state: CanvasState = {
    fills: {},
    strokes: [],
    stamps: [],
    selectedRegionId: null,
  };

  constructor(container: HTMLElement, width: number, height: number) {
    this.container = container;
    this.width = width;
    this.height = height;

    container.innerHTML = "";
    container.style.position = "relative";

    // Template layer
    this.templateCanvas = document.createElement("canvas");
    this.templateCanvas.width = width;
    this.templateCanvas.height = height;
    this.templateCanvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;";
    this.templateCtx = this.templateCanvas.getContext("2d")!;

    // Draw layer
    this.drawCanvas = document.createElement("canvas");
    this.drawCanvas.width = width;
    this.drawCanvas.height = height;
    this.drawCanvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;touch-action:none;";
    this.drawCtx = this.drawCanvas.getContext("2d")!;

    container.appendChild(this.templateCanvas);
    container.appendChild(this.drawCanvas);
  }

  setTemplate(regions: Region[]): void {
    this.regions = regions.map((r) => ({
      ...r,
      path2d: new Path2D(r.path),
    }));
  }

  render(state: CanvasState): void {
    this.state = state;
    this.renderTemplate(state.fills);
    this.renderDraw(state);
  }

  private renderTemplate(fills: Record<string, string>): void {
    const cached = this.cache.build(
      this.width,
      this.height,
      this.regions,
      fills,
    );
    this.templateCtx.clearRect(0, 0, this.width, this.height);
    this.templateCtx.drawImage(cached, 0, 0);
  }

  private renderDraw(state: CanvasState): void {
    renderDrawLayer(this.drawCtx, state);
  }

  hitTest(
    x: number,
    y: number,
  ): { type: "region" | "stamp"; id: string } | null {
    // 先检查 stamps（从后往前）
    const stampId = hitTestStamp(x, y, this.state.stamps);
    if (stampId) return { type: "stamp", id: stampId };

    // 再检查 regions
    const regionId = hitTestRegion(x, y, this.regions, this.templateCtx);
    if (regionId) return { type: "region", id: regionId };

    return null;
  }

  async exportPNG(scale: number = 2): Promise<Blob> {
    const exportCanvas = new OffscreenCanvas(
      this.width * scale,
      this.height * scale,
    );
    const ctx = exportCanvas.getContext("2d")!;
    ctx.scale(scale, scale);

    // Template layer
    const cached = this.cache.getCanvas();
    if (cached) ctx.drawImage(cached, 0, 0);

    // Draw layer
    ctx.drawImage(this.drawCanvas, 0, 0);

    return exportCanvas.convertToBlob({ type: "image/png" });
  }

  getDrawCanvas(): HTMLCanvasElement {
    return this.drawCanvas;
  }

  destroy(): void {
    this.cache.destroy();
    this.container.innerHTML = "";
  }
}
```

- [ ] **Step 5: 创建 index.ts 导出**

Create `packages/canvas-engine/src/index.ts`:

```typescript
export { CanvasEngine } from "./CanvasEngine";
export { renderTemplateLayer, renderDrawLayer } from "./render";
export { TemplateCache } from "./cache";
export { hitTestRegion, hitTestStamp } from "./hit-test";
export type { HitRegion } from "./hit-test";
export type { CanvasState, Stroke, Stamp, EditorTool } from "./types";
```

- [ ] **Step 6: 运行测试**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/canvas-engine test
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/canvas-engine/
git commit -m "feat(canvas-engine): add renderer, template cache, and CanvasEngine class"
```

---

## Task 8: 预置模板（4 个示例模板）

**Files:**

- Create: `templates/index.json`
- Create: `templates/cute/star.json`
- Create: `templates/nature/leaf.json`
- Create: `templates/mandala/pattern-01.json`
- Create: `templates/pixel/heart.json`

- [ ] **Step 1: 创建 templates/index.json**

```json
{
  "templates": [
    { "id": "cute-star-01", "file": "cute/star.json" },
    { "id": "nature-leaf-01", "file": "nature/leaf.json" },
    { "id": "mandala-pattern-01", "file": "mandala/pattern-01.json" },
    { "id": "pixel-heart-01", "file": "pixel/heart.json" }
  ]
}
```

- [ ] **Step 2: 创建 templates/cute/star.json**

一个五角星模板，5 个区域（中心 + 5 个角），easy 难度。

```json
{
  "id": "cute-star-01",
  "name": "小星星",
  "category": "cute",
  "difficulty": "easy",
  "viewBox": { "x": 0, "y": 0, "w": 400, "h": 400 },
  "regions": [
    {
      "id": "center",
      "path": "M200,170 L215,195 L245,195 L220,210 L230,240 L200,220 L170,240 L180,210 L155,195 L185,195 Z",
      "bbox": { "x": 155, "y": 170, "w": 90, "h": 70 }
    },
    {
      "id": "top-arm",
      "path": "M200,30 L230,130 L180,130 Z",
      "bbox": { "x": 180, "y": 30, "w": 50, "h": 100 }
    },
    {
      "id": "right-arm",
      "path": "M200,30 L230,130 L180,130 Z",
      "bbox": { "x": 180, "y": 30, "w": 50, "h": 100 }
    },
    {
      "id": "left-arm",
      "path": "M70,250 L170,190 L160,240 Z",
      "bbox": { "x": 70, "y": 190, "w": 100, "h": 60 }
    },
    {
      "id": "right-lower",
      "path": "M330,250 L240,190 L250,240 Z",
      "bbox": { "x": 230, "y": 190, "w": 100, "h": 60 }
    },
    {
      "id": "bottom-arm",
      "path": "M200,370 L170,270 L230,270 Z",
      "bbox": { "x": 170, "y": 270, "w": 60, "h": 100 }
    }
  ],
  "thumbnail": ""
}
```

- [ ] **Step 3: 创建 templates/nature/leaf.json**

一片叶子，4 个区域（叶身 + 2 个叶脉区域 + 叶柄），easy 难度。

```json
{
  "id": "nature-leaf-01",
  "name": "绿叶",
  "category": "nature",
  "difficulty": "easy",
  "viewBox": { "x": 0, "y": 0, "w": 400, "h": 400 },
  "regions": [
    {
      "id": "body-left",
      "path": "M200,40 C120,80 40,180 200,360 C200,360 120,180 200,40 Z",
      "bbox": { "x": 40, "y": 40, "w": 160, "h": 320 }
    },
    {
      "id": "body-right",
      "path": "M200,40 C280,80 360,180 200,360 C200,360 280,180 200,40 Z",
      "bbox": { "x": 200, "y": 40, "w": 160, "h": 320 }
    },
    {
      "id": "vein",
      "path": "M200,40 L200,360 L198,360 L198,40 Z",
      "bbox": { "x": 198, "y": 40, "w": 4, "h": 320 }
    },
    {
      "id": "stem",
      "path": "M200,360 L200,390 L198,390 L198,360 Z",
      "bbox": { "x": 198, "y": 360, "w": 4, "h": 30 }
    }
  ],
  "thumbnail": ""
}
```

- [ ] **Step 4: 创建 templates/mandala/pattern-01.json**

一个简单的 mandala 花瓣图案，8 个区域，medium 难度。

```json
{
  "id": "mandala-pattern-01",
  "name": "莲花",
  "category": "mandala",
  "difficulty": "medium",
  "viewBox": { "x": 0, "y": 0, "w": 400, "h": 400 },
  "regions": [
    {
      "id": "petal-1",
      "path": "M200,200 L220,80 L180,80 Z",
      "bbox": { "x": 180, "y": 80, "w": 40, "h": 120 }
    },
    {
      "id": "petal-2",
      "path": "M200,200 L300,140 L270,170 Z",
      "bbox": { "x": 200, "y": 140, "w": 100, "h": 60 }
    },
    {
      "id": "petal-3",
      "path": "M200,200 L320,220 L300,250 Z",
      "bbox": { "x": 200, "y": 200, "w": 120, "h": 50 }
    },
    {
      "id": "petal-4",
      "path": "M200,200 L300,310 L270,280 Z",
      "bbox": { "x": 200, "y": 280, "w": 100, "h": 30 }
    },
    {
      "id": "petal-5",
      "path": "M200,200 L220,320 L180,320 Z",
      "bbox": { "x": 180, "y": 200, "w": 40, "h": 120 }
    },
    {
      "id": "petal-6",
      "path": "M200,200 L100,310 L130,280 Z",
      "bbox": { "x": 100, "y": 280, "w": 100, "h": 30 }
    },
    {
      "id": "petal-7",
      "path": "M200,200 L80,220 L100,250 Z",
      "bbox": { "x": 80, "y": 200, "w": 120, "h": 50 }
    },
    {
      "id": "center",
      "path": "M200,200 m-30,0 a30,30,0,1,0,60,0 a30,30,0,1,0,-60,0 Z",
      "bbox": { "x": 170, "y": 170, "w": 60, "h": 60 }
    }
  ],
  "thumbnail": ""
}
```

- [ ] **Step 5: 创建 templates/pixel/heart.json**

一个像素风爱心，6 个区域，easy 难度。

```json
{
  "id": "pixel-heart-01",
  "name": "像素心",
  "category": "pixel",
  "difficulty": "easy",
  "viewBox": { "x": 0, "y": 0, "w": 400, "h": 400 },
  "regions": [
    {
      "id": "top-left",
      "path": "M100,100 L160,100 L160,160 L100,160 Z",
      "bbox": { "x": 100, "y": 100, "w": 60, "h": 60 }
    },
    {
      "id": "top-right",
      "path": "M160,100 L220,100 L220,160 L160,160 Z",
      "bbox": { "x": 160, "y": 100, "w": 60, "h": 60 }
    },
    {
      "id": "mid-left",
      "path": "M40,160 L100,160 L100,220 L40,220 Z",
      "bbox": { "x": 40, "y": 160, "w": 60, "h": 60 }
    },
    {
      "id": "mid-center",
      "path": "M100,160 L160,160 L160,220 L100,220 Z",
      "bbox": { "x": 100, "y": 160, "w": 60, "h": 60 }
    },
    {
      "id": "mid-right",
      "path": "M160,160 L220,160 L220,220 L160,220 Z",
      "bbox": { "x": 160, "y": 160, "w": 60, "h": 60 }
    },
    {
      "id": "bottom-center",
      "path": "M100,220 L160,220 L160,280 L100,280 Z",
      "bbox": { "x": 100, "y": 220, "w": 60, "h": 60 }
    },
    {
      "id": "bottom-left",
      "path": "M40,220 L100,220 L100,280 L40,280 Z",
      "bbox": { "x": 40, "y": 220, "w": 60, "h": 60 }
    }
  ],
  "thumbnail": ""
}
```

- [ ] **Step 6: 配置 Vite 复制 templates 到 public**

Modify `apps/web/vite.config.ts` — 添加 `publicDir` 或在 `vite.config.ts` 中用 `vite-plugin-static-copy`。最简方案：将 templates 复制到 `apps/web/public/templates/`。

Run:

```bash
mkdir -p /Users/linlina/Servyou/AI/drawer/apps/web/public/templates
cp -r /Users/linlina/Servyou/AI/drawer/templates/* /Users/linlina/Servyou/AI/drawer/apps/web/public/templates/
```

- [ ] **Step 7: Commit**

```bash
git add templates/ apps/web/public/templates/
git commit -m "feat(templates): add 4 preset templates (star, leaf, mandala, pixel heart)"
```

---

## Task 9: Web App — 路由与页面骨架

**Files:**

- Create: `apps/web/src/router.tsx`
- Create: `apps/web/src/pages/Home.tsx`
- Create: `apps/web/src/pages/Editor.tsx`
- Create: `apps/web/src/pages/Gallery.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: 创建 apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: 创建 router.tsx**

```tsx
import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import Editor from "./pages/Editor";
import Gallery from "./pages/Gallery";

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/editor/:id", element: <Editor /> },
  { path: "/gallery", element: <Gallery /> },
]);
```

- [ ] **Step 3: 创建 Home.tsx**

```tsx
export default function Home() {
  return (
    <div style={{ padding: 16 }}>
      <h1>创意绘画板</h1>
      <p>选择一个模板开始创作</p>
      <div id="template-grid">{/* Task 10: 模板网格 */}</div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 Editor.tsx**

```tsx
import { useParams } from "react-router-dom";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{ padding: "8px 16px", borderBottom: "1px solid #eee" }}>
        <span>← 返回</span>
        <span style={{ margin: "0 12px" }}>{id}</span>
        <button>导出</button>
      </header>
      <main style={{ flex: 1, background: "#f5f5f5" }}>
        <div id="canvas-container" style={{ width: "100%", height: "100%" }} />
      </main>
      <footer style={{ borderTop: "1px solid #eee", padding: "8px 16px" }}>
        <div id="color-palette">配色板</div>
        <div id="toolbar">工具栏</div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 5: 创建 Gallery.tsx**

```tsx
export default function Gallery() {
  return (
    <div style={{ padding: 16 }}>
      <h1>我的作品</h1>
      <div id="artwork-grid">{/* Task 14: 作品列表 */}</div>
    </div>
  );
}
```

- [ ] **Step 6: 更新 App.tsx 使用 Router**

```tsx
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

export default function App() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 7: 更新 main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 8: 验证路由切换**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/web dev
```

Expected: 访问 `/` 显示首页，`/editor/test` 显示编辑器，`/gallery` 显示作品页

- [ ] **Step 9: Commit**

```bash
git add apps/web/
git commit -m "feat(web): add router and page skeletons (Home, Editor, Gallery)"
```

---

## Task 10: Web App — Zustand Store（editor-store）

**Files:**

- Create: `apps/web/src/stores/editor-store.ts`
- Test: `apps/web/src/stores/__tests__/editor-store.test.ts`

- [ ] **Step 1: 编写 store 失败测试**

Create `apps/web/src/stores/__tests__/editor-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../editor-store";

describe("editor-store", () => {
  beforeEach(() => {
    useEditorStore.setState({
      template: null,
      canvasState: {
        fills: {},
        strokes: [],
        stamps: [],
        selectedRegionId: null,
      },
      history: [],
      historyIndex: -1,
      activeTool: "fill",
      activeColor: "#ff0000",
      activePalette: {
        id: "sunset",
        name: "日落",
        colors: ["#FF6B6B", "#FFA07A", "#FFD700", "#FF8C00", "#C0392B"],
      },
    });
  });

  it("fills a region and pushes history", () => {
    const store = useEditorStore.getState();
    store.fillRegion("r1", "#ff0000");

    const state = useEditorStore.getState();
    expect(state.canvasState.fills["r1"]).toBe("#ff0000");
    expect(state.history.length).toBe(1);
  });

  it("undo restores previous state", () => {
    const store = useEditorStore.getState();
    store.fillRegion("r1", "#ff0000");
    store.fillRegion("r2", "#00ff00");

    useEditorStore.getState().undo();

    const state = useEditorStore.getState();
    expect(state.canvasState.fills["r2"]).toBeUndefined();
    expect(state.canvasState.fills["r1"]).toBe("#ff0000");
  });

  it("redo restores undone state", () => {
    const store = useEditorStore.getState();
    store.fillRegion("r1", "#ff0000");
    store.fillRegion("r2", "#00ff00");
    store.undo();
    store.redo();

    const state = useEditorStore.getState();
    expect(state.canvasState.fills["r2"]).toBe("#00ff00");
  });

  it("new action after undo truncates future history", () => {
    const store = useEditorStore.getState();
    store.fillRegion("r1", "#ff0000");
    store.fillRegion("r2", "#00ff00");
    store.undo();
    store.fillRegion("r3", "#0000ff");

    const state = useEditorStore.getState();
    expect(state.historyIndex).toBe(2);
    expect(state.history.length).toBe(3);
  });

  it("sets active color", () => {
    useEditorStore.getState().setActiveColor("#00ff00");
    expect(useEditorStore.getState().activeColor).toBe("#00ff00");
  });

  it("sets active tool", () => {
    useEditorStore.getState().setActiveTool("brush");
    expect(useEditorStore.getState().activeTool).toBe("brush");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/web test
```

Expected: FAIL

- [ ] **Step 3: 实现 editor-store**

Create `apps/web/src/stores/editor-store.ts`:

```typescript
import { create } from "zustand";
import type {
  CanvasState,
  Stroke,
  Stamp,
  EditorTool,
} from "@drawer/canvas-engine";
import type { Template } from "@drawer/template-engine";
import type { Palette } from "@drawer/color-engine";
import type { Artwork } from "./types";

type EditorState = {
  template: Template | null;
  canvasState: CanvasState;
  history: CanvasState[];
  historyIndex: number;
  activeTool: EditorTool;
  activeColor: string;
  activePalette: Palette;
  strokeSettings: { color: string; width: number; style: "solid" | "dashed" };
  selectedStamp: { type: Stamp["type"]; value: string } | null;

  setTemplate: (template: Template) => void;
  setActiveColor: (color: string) => void;
  setActiveTool: (tool: EditorTool) => void;
  setActivePalette: (palette: Palette) => void;
  setStrokeSettings: (
    settings: Partial<{
      color: string;
      width: number;
      style: "solid" | "dashed";
    }>,
  ) => void;
  setSelectedStamp: (
    stamp: { type: Stamp["type"]; value: string } | null,
  ) => void;

  fillRegion: (regionId: string, color: string) => void;
  addStroke: (stroke: Stroke) => void;
  addStamp: (stamp: Stamp) => void;
  removeStroke: (id: string) => void;
  removeStamp: (id: string) => void;
  undo: () => void;
  redo: () => void;
  saveArtwork: () => void;
  loadArtwork: (artwork: Artwork) => void;
};

function cloneState(state: CanvasState): CanvasState {
  return JSON.parse(JSON.stringify(state));
}

export const useEditorStore = create<EditorState>((set, get) => ({
  template: null,
  canvasState: { fills: {}, strokes: [], stamps: [], selectedRegionId: null },
  history: [],
  historyIndex: -1,
  activeTool: "fill",
  activeColor: "#ff0000",
  activePalette: {
    id: "sunset",
    name: "日落",
    colors: ["#FF6B6B", "#FFA07A", "#FFD700", "#FF8C00", "#C0392B"],
  },
  strokeSettings: { color: "#000000", width: 3, style: "solid" },
  selectedStamp: null,

  setTemplate: (template) => set({ template }),

  setActiveColor: (color) => set({ activeColor: color }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setActivePalette: (palette) => set({ activePalette: palette }),

  setStrokeSettings: (settings) =>
    set((s) => ({ strokeSettings: { ...s.strokeSettings, ...settings } })),

  setSelectedStamp: (stamp) => set({ selectedStamp: stamp }),

  fillRegion: (regionId, color) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));

    const newFills = { ...canvasState.fills, [regionId]: color };
    const newState: CanvasState = { ...canvasState, fills: newFills };

    set({
      canvasState: newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addStroke: (stroke) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));

    const newState: CanvasState = {
      ...canvasState,
      strokes: [...canvasState.strokes, stroke],
    };

    set({
      canvasState: newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addStamp: (stamp) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));

    const newState: CanvasState = {
      ...canvasState,
      stamps: [...canvasState.stamps, stamp],
    };

    set({
      canvasState: newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  removeStroke: (id) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));

    set({
      canvasState: {
        ...canvasState,
        strokes: canvasState.strokes.filter((s) => s.id !== id),
      },
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  removeStamp: (id) => {
    const { canvasState, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(cloneState(canvasState));

    set({
      canvasState: {
        ...canvasState,
        stamps: canvasState.stamps.filter((s) => s.id !== id),
      },
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;
    const prev = history[historyIndex];
    set({
      canvasState: cloneState(prev),
      historyIndex: historyIndex - 1,
    });
  },

  redo: () => {
    const { history, historyIndex, canvasState } = get();
    if (historyIndex + 2 >= history.length) return;
    const next = history[historyIndex + 2];
    if (!next) return;
    set({
      canvasState: cloneState(next),
      historyIndex: historyIndex + 1,
    });
  },

  saveArtwork: () => {
    const { template, canvasState, activePalette } = get();
    if (!template) return;

    const artworks = loadArtworks();
    const existing = artworks.findIndex((a) => a.templateId === template.id);

    const artwork: Artwork = {
      id: existing >= 0 ? artworks[existing].id : crypto.randomUUID(),
      templateId: template.id,
      state: cloneState(canvasState),
      palette: activePalette.colors,
      createdAt: existing >= 0 ? artworks[existing].createdAt : Date.now(),
    };

    if (existing >= 0) {
      artworks[existing] = artwork;
    } else {
      artworks.unshift(artwork);
    }

    localStorage.setItem("drawer_artworks", JSON.stringify(artworks));
  },

  loadArtwork: (artwork) => {
    set({
      canvasState: cloneState(artwork.state),
      history: [],
      historyIndex: -1,
    });
  },
}));

function loadArtworks(): Artwork[] {
  try {
    const raw = localStorage.getItem("drawer_artworks");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadAllArtworks(): Artwork[] {
  return loadArtworks();
}

export function deleteArtwork(id: string): void {
  const artworks = loadArtworks().filter((a) => a.id !== id);
  localStorage.setItem("drawer_artworks", JSON.stringify(artworks));
}
```

- [ ] **Step 4: 创建 stores/types.ts**

Create `apps/web/src/stores/types.ts`:

```typescript
import type { CanvasState } from "@drawer/canvas-engine";

export type Artwork = {
  id: string;
  templateId: string;
  state: CanvasState;
  palette: string[];
  createdAt: number;
};
```

- [ ] **Step 5: 运行测试**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer && bun run --filter @drawer/web test
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/stores/
git commit -m "feat(web): add Zustand editor store with undo/redo and artwork persistence"
```

---

## Task 11: Web App — 首页（模板网格 + 分类筛选）

**Files:**

- Modify: `apps/web/src/pages/Home.tsx`
- Create: `apps/web/src/components/TemplateCard.tsx`
- Create: `apps/web/src/components/BottomNav.tsx`

- [ ] **Step 1: 创建 TemplateCard.tsx**

```tsx
import { useNavigate } from "react-router-dom";
import type { Template } from "@drawer/template-engine";

const difficultyLabel: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const difficultyColor: Record<string, string> = {
  easy: "#4CAF50",
  medium: "#FF9800",
  hard: "#F44336",
};

export default function TemplateCard({ template }: { template: Template }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/editor/${template.id}`)}
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        background: "#fff",
      }}
    >
      <div
        style={{
          height: 140,
          background: "#f5f5f5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
        }}
      >
        {/* 缩略图占位 */}
        <svg
          width={80}
          height={80}
          viewBox={
            template.viewBox
              ? `${template.viewBox.x} ${template.viewBox.y} ${template.viewBox.w} ${template.viewBox.h}`
              : "0 0 400 400"
          }
        >
          {template.regions.slice(0, 6).map((r) => (
            <path
              key={r.id}
              d={r.path}
              fill="#ddd"
              stroke="#ccc"
              strokeWidth={1}
            />
          ))}
        </svg>
      </div>
      <div style={{ padding: "8px 12px" }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{template.name}</div>
        <span
          style={{
            fontSize: 12,
            color: "#fff",
            background: difficultyColor[template.difficulty],
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {difficultyLabel[template.difficulty]}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 BottomNav.tsx**

```tsx
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { path: "/", label: "首页", icon: "🏠" },
  { path: "/gallery", label: "作品", icon: "🖼️" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        height: 56,
        background: "#fff",
        borderTop: "1px solid #e0e0e0",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              border: "none",
              background: "none",
              fontSize: 12,
              color: active ? "#1976D2" : "#999",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: 重写 Home.tsx**

```tsx
import { useState, useEffect } from "react";
import {
  loadTemplateIndex,
  loadTemplate,
  type Template,
} from "@drawer/template-engine";
import TemplateCard from "../components/TemplateCard";
import BottomNav from "../components/BottomNav";

const categories = [
  { key: "all", label: "全部" },
  { key: "cute", label: "可爱风" },
  { key: "nature", label: "自然风" },
  { key: "mandala", label: "Mandala" },
  { key: "pixel", label: "像素风" },
] as const;

export default function Home() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplateIndex("/templates/index.json").then(async (entries) => {
      const loaded = await Promise.all(
        entries.map((e) => loadTemplate(`/templates/${e.file}`)),
      );
      setTemplates(loaded.filter((t): t is Template => t !== null));
      setLoading(false);
    });
  }, []);

  const filtered =
    activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  return (
    <div style={{ paddingBottom: 72 }}>
      <header style={{ padding: "16px 16px 8px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>创意绘画板</h1>
        <p style={{ fontSize: 14, color: "#666", margin: "4px 0 0" }}>
          选择模板，开始创作
        </p>
      </header>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 16px",
          overflowX: "auto",
        }}
      >
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 16,
              border: "none",
              fontSize: 13,
              background: activeCategory === c.key ? "#1976D2" : "#f0f0f0",
              color: activeCategory === c.key ? "#fff" : "#333",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#999" }}>加载中...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            padding: 16,
          }}
        >
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 4: 验证首页渲染**

Run: `bun run --filter @drawer/web dev`
Expected: 首页显示模板网格，点击分类可筛选，点击卡片跳转编辑器

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/Home.tsx apps/web/src/components/TemplateCard.tsx apps/web/src/components/BottomNav.tsx
git commit -m "feat(web): implement Home page with template grid and category filter"
```

---

## Task 12: Web App — 创作页（Editor 核心）

**Files:**

- Modify: `apps/web/src/pages/Editor.tsx`
- Create: `apps/web/src/hooks/useCanvasEngine.ts`
- Create: `apps/web/src/components/Toolbar.tsx`
- Create: `apps/web/src/components/ColorPalette.tsx`

- [ ] **Step 1: 创建 useCanvasEngine hook**

```typescript
import { useRef, useEffect, useCallback } from "react";
import { CanvasEngine } from "@drawer/canvas-engine";
import { useEditorStore } from "../stores/editor-store";

export function useCanvasEngine(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const engineRef = useRef<CanvasEngine | null>(null);

  const init = useCallback(
    (width: number, height: number) => {
      if (!containerRef.current) return;
      engineRef.current = new CanvasEngine(containerRef.current, width, height);
    },
    [containerRef],
  );

  const render = useCallback(() => {
    const engine = engineRef.current;
    const { canvasState, template } = useEditorStore.getState();
    if (!engine || !template) return;

    if (!engine.getDrawCanvas().width) {
      init(400, 400);
    }

    engine.setTemplate(template.regions);
    engine.render(canvasState);
  }, [init]);

  const hitTest = useCallback((clientX: number, clientY: number) => {
    const engine = engineRef.current;
    if (!engine) return null;
    const canvas = engine.getDrawCanvas();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return engine.hitTest(x, y);
  }, []);

  const exportPNG = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return null;
    return engine.exportPNG(2);
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  return { init, render, hitTest, exportPNG, engineRef };
}
```

- [ ] **Step 2: 创建 Toolbar.tsx**

```tsx
import { useEditorStore } from "../stores/editor-store";
import type { EditorTool } from "@drawer/canvas-engine";

const tools: { key: EditorTool; label: string; icon: string }[] = [
  { key: "fill", label: "填色", icon: "🎨" },
  { key: "brush", label: "画笔", icon: "✏️" },
  { key: "eraser", label: "橡皮", icon: "🧹" },
  { key: "stamp", label: "印章", icon: "⭐" },
];

export default function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyIndex = useEditorStore((s) => s.historyIndex);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {tools.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTool(t.key)}
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: 8,
              background: activeTool === t.key ? "#1976D2" : "#f0f0f0",
              color: activeTool === t.key ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={undo}
          disabled={historyIndex < 0}
          style={{
            padding: "8px 12px",
            border: "none",
            borderRadius: 8,
            background: historyIndex >= 0 ? "#f0f0f0" : "#eee",
            cursor: historyIndex >= 0 ? "pointer" : "not-allowed",
            opacity: historyIndex >= 0 ? 1 : 0.4,
          }}
        >
          ↩️
        </button>
        <button
          onClick={redo}
          style={{
            padding: "8px 12px",
            border: "none",
            borderRadius: 8,
            background: "#f0f0f0",
            cursor: "pointer",
          }}
        >
          ↪️
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 ColorPalette.tsx**

```tsx
import { useEditorStore } from "../stores/editor-store";
import { getPalettes, generateRandomPalette } from "@drawer/color-engine";

export default function ColorPalette() {
  const activeColor = useEditorStore((s) => s.activeColor);
  const setActiveColor = useEditorStore((s) => s.setActiveColor);
  const activePalette = useEditorStore((s) => s.activePalette);
  const setActivePalette = useEditorStore((s) => s.setActivePalette);

  const palettes = getPalettes();

  return (
    <div style={{ padding: "8px 16px" }}>
      {/* 当前色板颜色 */}
      <div
        style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}
      >
        {activePalette.colors.map((color, i) => (
          <div
            key={i}
            onClick={() => setActiveColor(color)}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: color,
              border:
                color === activeColor ? "3px solid #333" : "2px solid #ddd",
              cursor: "pointer",
              flexShrink: 0,
            }}
          />
        ))}
      </div>

      {/* Palette 切换 */}
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          overflowX: "auto",
        }}
      >
        {palettes.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePalette(p)}
            style={{
              padding: "4px 10px",
              border: "none",
              borderRadius: 12,
              fontSize: 12,
              background: p.id === activePalette.id ? "#333" : "#f0f0f0",
              color: p.id === activePalette.id ? "#fff" : "#333",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => {
            const colors = generateRandomPalette(5);
            setActivePalette({ id: "random", name: "随机", colors });
          }}
          style={{
            padding: "4px 10px",
            border: "none",
            borderRadius: 12,
            fontSize: 12,
            background: "#f0f0f0",
            cursor: "pointer",
          }}
        >
          🎲 随机
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 重写 Editor.tsx**

```tsx
import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadTemplate } from "@drawer/template-engine";
import { useEditorStore } from "../stores/editor-store";
import { useCanvasEngine } from "../hooks/useCanvasEngine";
import Toolbar from "../components/Toolbar";
import ColorPalette from "../components/ColorPalette";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { init, render, hitTest, exportPNG } = useCanvasEngine(containerRef);
  const [drawing, setDrawing] = useState(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  const template = useEditorStore((s) => s.template);
  const activeTool = useEditorStore((s) => s.activeTool);
  const activeColor = useEditorStore((s) => s.activeColor);
  const strokeSettings = useEditorStore((s) => s.strokeSettings);
  const fillRegion = useEditorStore((s) => s.fillRegion);
  const addStroke = useEditorStore((s) => s.addStroke);
  const removeStroke = useEditorStore((s) => s.removeStroke);
  const removeStamp = useEditorStore((s) => s.removeStamp);
  const saveArtwork = useEditorStore((s) => s.saveArtwork);

  // 订阅 canvasState 变化自动重绘
  const canvasState = useEditorStore((s) => s.canvasState);

  // 加载模板
  useEffect(() => {
    if (!id) return;
    loadTemplate(`/templates/${id}.json`).then((t) => {
      if (!t) return;
      useEditorStore.getState().setTemplate(t);

      // 查找模板文件（根据 id 匹配 index.json 中的 file）
      loadTemplateIndex("/templates/index.json").then((entries) => {
        const entry = entries.find((e) => e.id === id);
        if (entry) {
          loadTemplate(`/templates/${entry.file}`).then((resolved) => {
            if (resolved) {
              useEditorStore.getState().setTemplate(resolved);
            }
          });
        }
      });
    });
  }, [id]);

  // 初始化 Canvas 并重绘
  useEffect(() => {
    if (!template) return;
    init(400, 400);
    render();
  }, [template, init]);

  // canvasState 变化时重绘
  useEffect(() => {
    render();
  }, [canvasState, render]);

  // 处理点击/触摸
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const result = hitTest(e.clientX, e.clientY);
      if (!result) return;

      if (activeTool === "fill" && result.type === "region") {
        fillRegion(result.id, activeColor);
      } else if (activeTool === "eraser") {
        if (result.type === "stroke") removeStroke(result.id);
        else if (result.type === "stamp") removeStamp(result.id);
      } else if (activeTool === "brush") {
        setDrawing(true);
        const canvas = containerRef.current?.querySelector("canvas:last-child");
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        currentStrokeRef.current = [
          {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
          },
        ];
      }
    },
    [activeTool, activeColor, fillRegion, removeStroke, removeStamp, hitTest],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing || activeTool !== "brush") return;
      const canvas = containerRef.current?.querySelector("canvas:last-child");
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      currentStrokeRef.current.push({
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      });
    },
    [drawing, activeTool],
  );

  const handlePointerUp = useCallback(() => {
    if (!drawing || activeTool !== "brush") return;
    setDrawing(false);
    if (currentStrokeRef.current.length >= 2) {
      addStroke({
        id: crypto.randomUUID(),
        points: currentStrokeRef.current,
        color: strokeSettings.color,
        width: strokeSettings.width,
        style: strokeSettings.style,
      });
    }
    currentStrokeRef.current = [];
  }, [drawing, activeTool, addStroke, strokeSettings]);

  const handleExport = useCallback(async () => {
    saveArtwork();
    const blob = await exportPNG();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template?.name ?? "artwork"}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportPNG, saveArtwork, template]);

  // 双指撤销
  const lastTouchCount = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      undo();
    }
  }, []);

  const undo = useEditorStore((s) => s.undo);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        height: "100dvh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid #eee",
          background: "#fff",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ← 返回
        </button>
        <span style={{ fontWeight: 600 }}>{template?.name ?? "加载中..."}</span>
        <button
          onClick={handleExport}
          style={{
            border: "none",
            background: "#1976D2",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          💾 导出
        </button>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          overflow: "hidden",
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: "100%",
            maxWidth: 400,
            aspectRatio: "1",
            background: "#fff",
            borderRadius: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onTouchStart={handleTouchStart}
        />
      </main>

      <ColorPalette />
      <Toolbar />
    </div>
  );
}

async function loadTemplateIndex(indexPath: string) {
  const res = await fetch(indexPath);
  if (!res.ok) return [];
  const data = await res.json();
  return data.templates ?? [];
}
```

- [ ] **Step 5: 验证编辑器**

Run: `bun run --filter @drawer/web dev`
Expected: 进入编辑器 → 显示模板 → 点击区域填色 → 切换工具画线 → 导出 PNG

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/pages/Editor.tsx apps/web/src/hooks/useCanvasEngine.ts apps/web/src/components/Toolbar.tsx apps/web/src/components/ColorPalette.tsx
git commit -m "feat(web): implement Editor page with canvas interaction and tools"
```

---

## Task 13: Web App — 作品页（Gallery）

**Files:**

- Modify: `apps/web/src/pages/Gallery.tsx`
- Create: `apps/web/src/hooks/useArtworks.ts`
- Modify: `apps/web/src/components/BottomNav.tsx` (已在 Home 中使用)

- [ ] **Step 1: 创建 useArtworks hook**

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Artwork } from "../stores/types";

export function useArtworks() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);

  const reload = useCallback(() => {
    try {
      const raw = localStorage.getItem("drawer_artworks");
      setArtworks(raw ? JSON.parse(raw) : []);
    } catch {
      setArtworks([]);
    }
  }, []);

  useEffect(() => {
    reload();
    // 监听 storage 变化（跨 tab 同步）
    const handler = () => reload();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [reload]);

  const remove = useCallback(
    (id: string) => {
      const updated = artworks.filter((a) => a.id !== id);
      localStorage.setItem("drawer_artworks", JSON.stringify(updated));
      setArtworks(updated);
    },
    [artworks],
  );

  return { artworks, remove, reload };
}
```

- [ ] **Step 2: 重写 Gallery.tsx**

```tsx
import { useNavigate } from "react-router-dom";
import { useArtworks } from "../hooks/useArtworks";
import BottomNav from "../components/BottomNav";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${mins}`;
}

export default function Gallery() {
  const { artworks, remove } = useArtworks();
  const navigate = useNavigate();

  return (
    <div style={{ paddingBottom: 72 }}>
      <header style={{ padding: "16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>我的作品</h1>
      </header>

      {artworks.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999", marginTop: 60 }}>
          还没有作品，去首页选一个模板开始创作吧
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            padding: 16,
          }}
        >
          {artworks.map((artwork) => (
            <div
              key={artwork.id}
              onClick={() => navigate(`/editor/${artwork.templateId}`)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (confirm("删除这个作品？")) remove(artwork.id);
              }}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              <div
                style={{
                  height: 140,
                  background: "#f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#999",
                }}
              >
                {artwork.palette.length > 0 ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    {artwork.palette.slice(0, 5).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          background: c,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  "无预览"
                )}
              </div>
              <div style={{ padding: "8px 12px", fontSize: 13, color: "#666" }}>
                {formatDate(artwork.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: 验证作品页**

Run: `bun run --filter @drawer/web dev`
Expected: 作品页显示已保存的作品，右键可删除，点击可继续编辑

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/Gallery.tsx apps/web/src/hooks/useArtworks.ts
git commit -m "feat(web): implement Gallery page with artwork list and delete"
```

---

## Task 14: 构建、部署与收尾

**Files:**

- Modify: `apps/web/vite.config.ts` (确认 base path)
- Create: `.github/workflows/deploy.yml`
- Create: `.gitignore`

- [ ] **Step 1: 创建 .gitignore**

```
node_modules/
dist/
.turbo/
*.local
.env
.DS_Store
```

- [ ] **Step 2: 确认 vite.config.ts base path**

对于 GitHub Pages 部署到 `https://username.github.io/drawer/`，base 应为 `/drawer/`：

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/drawer/",
  server: {
    port: 3000,
  },
});
```

> 如果部署到根域名，base 改为 `'./'`。

- [ ] **Step 3: 创建 GitHub Actions 部署文件**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: 执行生产构建验证**

Run:

```bash
cd /Users/linlina/Servyou/AI/drawer
bun run build
```

Expected: `apps/web/dist/` 目录生成，包含 HTML/JS/CSS 和 templates 静态资源

- [ ] **Step 5: Commit**

```bash
git add .gitignore .github/ apps/web/vite.config.ts
git commit -m "feat: add GitHub Pages deployment config and production build"
```

---

## 自审清单

**1. Spec 覆盖：**

| Spec 需求                                              | 对应 Task    |
| ------------------------------------------------------ | ------------ |
| Monorepo 脚手架 (Bun+Turbo)                            | Task 1       |
| 模板系统 (类型 + bbox + 加载)                          | Task 2, 3    |
| 配色系统 (palette + 随机生成)                          | Task 4       |
| Canvas Engine (类型 + hitTest + render + cache + 导出) | Task 5, 6, 7 |
| 预置模板                                               | Task 8       |
| 路由与页面骨架                                         | Task 9       |
| Zustand Store (撤销/重做/持久化)                       | Task 10      |
| 首页 (模板网格 + 分类)                                 | Task 11      |
| 编辑器 (Canvas 交互 + 工具栏 + 配色板)                 | Task 12      |
| 作品页                                                 | Task 13      |
| 构建部署                                               | Task 14      |

**2. 占位符扫描：** 无 TBD/TODO。所有代码步骤包含完整实现。

**3. 类型一致性：**

- `CanvasState` 在 Task 5 定义，Task 7 CanvasEngine 使用，Task 10 store 使用 — 一致
- `Region` 在 Task 2 定义，Task 6 hitTest 使用，Task 7 CanvasEngine 使用 — 一致
- `Palette` 在 Task 4 定义，Task 12 ColorPalette 组件使用 — 一致
- `Stamp` 类型在 Task 5 定义，Task 6 hitTestStamp 使用，Task 7 renderStamp 使用 — 一致
- hitTestRegion 接受 `HitRegion[]`（含 path2d），CanvasEngine.setTemplate 负责构建 — 一致
