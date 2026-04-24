# 创意绘画板（Drawer）设计文档

## 1. 项目概述

创意绘画板是一款面向 10-25 岁轻用户的配色创作工具，通过"模板填色 + 自由创作"的方式，让用户低门槛完成具有美感的作品。纯前端应用，通过 GitHub Pages 发布。

## 2. 技术选型

| 决策项   | 选择                          | 理由                        |
| -------- | ----------------------------- | --------------------------- |
| 前端框架 | React                         | 生态成熟、TypeScript 支持好 |
| 状态管理 | Zustand                       | 轻量，适合 Canvas 场景      |
| 渲染方案 | Canvas 主渲染 + 少量 SVG 辅助 | 高性能 + 交互灵活           |
| 构建工具 | Bun + Turbo + Vite            | Monorepo 管理，快速构建     |
| 存储     | localStorage                  | 纯前端，V1 足够             |
| 部署     | GitHub Pages                  | 零成本静态部署              |

## 3. 项目结构

```
drawer/
├── apps/
│   └── web/                    # React 应用（入口、页面、路由）
│       ├── src/
│       │   ├── pages/          # Home / Editor / Gallery
│       │   ├── components/     # UI 组件（工具栏、颜色选择器等）
│       │   ├── hooks/          # 自定义 hooks
│       │   └── App.tsx
│       └── index.html
│
├── packages/
│   ├── canvas-engine/          # 核心：分层 Canvas 渲染、HitTest、OffscreenCanvas 缓存
│   ├── template-engine/        # 模板加载、Region 定义、bbox 计算
│   └── color-engine/           # Palette 管理、推荐配色、颜色工具函数
│
├── templates/                  # 预置模板 JSON + SVG 资源
├── docs/
└── turbo.json / package.json
```

职责边界：

- `canvas-engine`：不关心"画什么"，只负责"怎么画"。接收 state，执行 render/hitTest
- `template-engine`：负责模板数据结构、region path 解析、bbox 预计算
- `color-engine`：纯函数包，palette 数据 + 颜色转换/推荐算法

## 4. 核心数据模型

### 4.1 模板

```typescript
type Region = {
  id: string;
  path: string; // SVG path d 属性
  bbox: { x: number; y: number; w: number; h: number }; // 预计算
};

type Template = {
  id: string;
  name: string;
  category: "cute" | "nature" | "mandala" | "pixel";
  difficulty: "easy" | "medium" | "hard";
  regions: Region[];
  thumbnail: string; // 预览图路径
};
```

### 4.2 配色

```typescript
type Palette = {
  id: string;
  name: string;
  colors: string[]; // hex 色值数组
};

type ColorMode = "manual" | "palette" | "random";
```

### 4.3 画布状态

```typescript
type Stroke = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  style: "solid" | "dashed";
};

type Stamp = {
  id: string;
  type: "emoji" | "builtin" | "custom";
  value: string; // emoji 字符 / 内置图案 ID / base64
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

type CanvasState = {
  fills: Record<string, string>; // regionId → color
  strokes: Stroke[];
  stamps: Stamp[];
  selectedRegionId: string | null;
};
```

### 4.4 作品与历史

```typescript
type Artwork = {
  id: string;
  templateId: string;
  state: CanvasState;
  palette: string[]; // 本次使用的色板
  createdAt: number;
};

type HistoryAction = {
  type: "fill" | "stroke" | "stamp" | "erase";
  payload: unknown;
  timestamp: number;
};
```

## 5. Canvas Engine 架构

### 5.1 分层渲染

```
Canvas Stack:
┌─────────────────────────────┐
│  Interaction Layer (可选)    │  ← 事件代理层
├─────────────────────────────┤
│  Draw Layer (动态)           │  ← strokes + stamps 实时渲染
├─────────────────────────────┤
│  Template Layer (缓存)       │  ← 模板填充，用 OffscreenCanvas 缓存
└─────────────────────────────┘
```

### 5.2 核心 API

```typescript
class CanvasEngine {
  constructor(container: HTMLElement, width: number, height: number);

  render(state: CanvasState): void;
  // 状态驱动渲染：template 层读缓存，draw 层全量重绘

  hitTest(x: number, y: number, regions: Region[]): string | null;
  // bbox 粗过滤 → isPointInPath 精确匹配，返回 regionId

  updateState(partial: Partial<CanvasState>): void;
  // 合并状态并触发 render()

  buildTemplateCache(template: Template, fills: Record<string, string>): void;
  // 将 template + fills 渲染到 OffscreenCanvas

  exportPNG(width?: number, height?: number): Promise<Blob>;
  // 合并所有层到 OffscreenCanvas，toBlob 输出

  destroy(): void;
}
```

### 5.3 渲染流程

```
updateState({ fills: { r1: '#ff0000' } })
  │
  ├── fills 变了？
  │     └── rebuildTemplateCache() → 写入 OffscreenCanvas
  │
  ├── stamps / strokes 变了？
  │     └── 跳过 template 缓存
  │
  └── render(state)
        ├── template 层：drawImage(offscreenCache)
        └── draw 层：
              ├── 遍历 strokes → stroke()
              └── 遍历 stamps → drawImage/fillText
```

### 5.4 HitTest 流程

```
用户点击 (x, y)
  │
  └── hitTest(x, y, regions)
        │
        ├── 先检查 stamps（从后往前，后添加的在上层）
        │     └── pointInStampBbox → 命中则返回 stamp.id
        │
        └── 再检查 regions
              ├── 遍历 regions
              │     ├── point in bbox？ → 跳过
              │     └── isPointInPath(path, x, y) → 命中返回 regionId
              └── 全部未命中 → null
```

### 5.5 手势支持

- 单指点击：fill / select stamp / start brush
- 单指拖动：draw stroke / drag stamp
- 双指缩放：CSS transform scale on canvas container
- 双指撤销：gesture 识别 → undo()

## 6. 页面设计

### 6.1 路由

| 路径          | 页面    | 说明                     |
| ------------- | ------- | ------------------------ |
| `/`           | Home    | 首页，模板选择           |
| `/editor/:id` | Editor  | 创作页，id 为 templateId |
| `/gallery`    | Gallery | 作品管理                 |

### 6.2 首页

模板网格布局，支持分类筛选（可爱风/自然风/mandala/像素风）和难度标识。底部 Tab 导航（首页/作品/设置）。

### 6.3 创作页

顶部栏：返回 + 模板名 + 导出按钮
配色板：横向滚动色条，支持手动/推荐/随机三种模式切换
工具栏：填色、画笔、橡皮、印章、撤销、重做

| 工具 | 交互行为                                      |
| ---- | --------------------------------------------- |
| 填色 | 点击区域 → 填充当前选中颜色                   |
| 画笔 | 单指拖动 → 自由绘制线条                       |
| 橡皮 | 点击 stroke/stamp → 删除                      |
| 印章 | 点击画布 → 放置印章，已有印章可拖拽/缩放/旋转 |

### 6.4 状态管理

```typescript
useEditorStore {
  template: Template | null
  canvasState: CanvasState
  history: CanvasState[]
  historyIndex: number
  activeTool: 'fill' | 'brush' | 'eraser' | 'stamp'
  activeColor: string
  activePalette: Palette

  fillRegion(regionId: string, color: string): void
  addStroke(stroke: Stroke): void
  addStamp(stamp: Stamp): void
  undo(): void
  redo(): void
  saveArtwork(): void
  exportArtwork(): Promise<void>
}
```

撤销/重做：每次操作前 push 当前 state 到 history，undo/redo 通过 historyIndex 切换。新操作截断 historyIndex 之后的记录。

## 7. 模板系统

### 7.1 制作流程

Figma/Illustrator 设计 → 导出 SVG → 脚本提取 path 数据生成 JSON → 手工填写元数据 → 放入 templates/ 目录

### 7.2 模板 JSON 格式

```json
{
  "id": "cute-cat-01",
  "name": "小猫咪",
  "category": "cute",
  "difficulty": "easy",
  "viewBox": { "x": 0, "y": 0, "w": 400, "h": 400 },
  "regions": [
    {
      "id": "body",
      "path": "M200,50 C260,50...",
      "bbox": { "x": 90, "y": 50, "w": 220, "h": 260 }
    }
  ]
}
```

### 7.3 资源目录

```
templates/
├── index.json            # 模板注册表
├── cute/
│   ├── cat.json
│   └── rabbit.json
├── nature/
│   └── flower.json
├── mandala/
│   └── pattern-01.json
└── pixel/
    └── heart.json
```

### 7.4 V1 预置计划

| 分类    | 数量   | 难度分布    |
| ------- | ------ | ----------- |
| 可爱风  | 3-4 个 | easy 为主   |
| 自然风  | 2-3 个 | easy/medium |
| mandala | 2-3 个 | medium/hard |
| 像素风  | 1-2 个 | easy        |

总计 8-12 个模板。

## 8. 错误处理与性能

### 8.1 错误处理

- canvas-engine：静默降级 + console.error，渲染失败不崩溃
- template-engine：Result 类型返回，上层处理
- web UI：Toast 提示用户

### 8.2 性能优化

- Template 层：OffscreenCanvas 缓存，fills 变更时才重建
- Draw 层：增量绘制，新 stroke 追加到当前帧
- 印章拖拽：requestAnimationFrame 节流
- HitTest：bbox 粗过滤 → isPointInPath
- 首屏：模板列表懒加载，canvas-engine 按需初始化
- 导出：离屏合成，不阻塞 UI

### 8.3 存储

- localStorage 存储 Artwork[]，预估单作品 ~50KB，可存约 80-100 个
- 超限时提示清理

## 9. V1 范围确认

### 包含

| 模块      | 功能                               | 优先级 |
| --------- | ---------------------------------- | ------ |
| 模板系统  | 预置 8-12 个模板，分类 + 难度筛选  | P0     |
| 填色      | 点击区域填充颜色，支持替换         | P0     |
| 配色系统  | 手动选色 + 推荐 palette + 随机配色 | P0     |
| 撤销/重做 | 操作栈，支持手势撤销               | P0     |
| 作品管理  | 本地保存/继续编辑/删除             | P0     |
| 导出      | PNG 高清导出                       | P0     |
| 移动端    | 手势支持、底部工具栏、safe-area    | P0     |
| 线条      | 自由绘制 + 描边                    | P1     |
| 印章      | emoji + 内置图案，拖拽/缩放/旋转   | P1     |

### 不做

- 云同步/分享
- 用户上传底图
- AI 配色
- PWA 离线

### 风险

| 风险              | 应对                                        |
| ----------------- | ------------------------------------------- |
| Canvas 性能       | OffscreenCanvas 缓存 + bbox 过滤 + 增量绘制 |
| 模板制作成本      | 手工 8-12 个 + 开发提取脚本                 |
| 移动端手势冲突    | touch-action: none + passive: false         |
| localStorage 空间 | 超限提醒，预留云存储接口                    |
