# PNG 转模板 JSON 工具设计文档

## 1. 目标

为创意绘画板项目提供一个 Node.js 脚本，将黑白线稿 PNG 自动转换为模板 JSON（含 SVG path regions），实现批量制作填色模板。

## 2. 背景

项目 `templates/originPng/` 中有 11 张黑白线稿 PNG 素材，当前模板 JSON 均为手动制作，缺少自动化工具。模板格式要求每个填色区域由独立的 SVG path + bbox 定义。

## 3. 技术方案

**方案：potrace + flood-fill 闭区域检测**

选择理由：

- potrace 成熟稳定，贝塞尔曲线平滑度高
- flood-fill 是标准闭区域检测算法，逻辑清晰
- 纯 Node.js + Canvas API，与项目技术栈一致（bun）
- 对清晰黑白线稿效果最佳

## 4. 转换流程

```
输入：originPng/*.png（黑白线稿）
        │
        ▼
  ① 预处理（灰度化 + 二值化 + 反色）
        │
        ▼
  ② potrace 轮廓提取 → SVG paths（描述所有轮廓线）
        │
        ▼
  ③ Canvas flood-fill 闭区域检测 → 每个区域的像素集
        │
        ▼
  ④ 区域合并/过滤（太小的区域合并到相邻区域）
        │
        ▼
  ⑤ 将像素区域转换为 SVG path（用 potrace 逐区域描边）
        │
        ▼
  ⑥ 计算 bbox，生成 region id
        │
        ▼
输出：模板 JSON（可直接放入 templates/）
```

## 5. 文件结构

```
scripts/
├── png2template.ts          # 主入口 CLI
├── preprocess.ts            # 图像预处理（灰度、二值化、反色）
├── region-detector.ts       # flood-fill 闭区域检测 + 合并
├── path-generator.ts        # 区域像素 → SVG path（potrace）
├── template-builder.ts      # 组装最终模板 JSON
└── utils.ts                 # 辅助函数
```

## 6. 核心模块设计

### 6.1 预处理模块 (preprocess.ts)

- 读取 PNG，转为 Canvas ImageData
- 灰度化：`gray = 0.299R + 0.587G + 0.114B`
- 二值化：根据阈值（默认 128）分为黑/白
- 反色：确保线稿为白色线条在黑色背景上（potrace 提取黑色前景）

### 6.2 区域检测模块 (region-detector.ts)

- 对二值化图像执行 flood-fill，找出所有闭合白色区域
- 每个区域记录像素坐标集
- 过滤：面积 < minArea（默认 500px²）的区域忽略
- 合并：相邻小区域合并为较大区域

### 6.3 Path 生成模块 (path-generator.ts)

- 对每个检测到的区域，创建独立的黑底白块图像
- 调用 potrace 将该区域转换为 SVG path
- 输出标准 SVG path d 属性字符串

### 6.4 模板组装模块 (template-builder.ts)

- 为每个 region 生成 id（`region-1`, `region-2`, ...）
- 计算 bbox（遍历 path 点或从像素集直接计算）
- 组装模板 JSON，包含 id、name、category、difficulty、viewBox、regions

## 7. CLI 接口

```bash
# 单张转换
bun scripts/png2template.ts templates/originPng/猫咪.png --category cute --name "小猫咪" --difficulty easy

# 批量转换
bun scripts/png2template.ts templates/originPng/ --batch

# 指定输出目录
bun scripts/png2template.ts templates/originPng/猫咪.png --output templates/cute/
```

## 8. 可调参数

| 参数             | 默认值     | 说明                                 |
| ---------------- | ---------- | ------------------------------------ |
| `--threshold`    | 128        | 二值化阈值                           |
| `--min-area`     | 500        | 最小区域面积（px²）                  |
| `--viewbox-size` | 400        | 输出 viewBox 边长（正方形）          |
| `--category`     | 自动推断   | 模板分类 (cute/nature/mandala/pixel) |
| `--name`         | 文件名     | 模板名称                             |
| `--difficulty`   | auto       | 难度 (easy/medium/hard/auto)         |
| `--output`       | templates/ | 输出目录                             |

## 9. 错误处理

| 场景                | 处理方式                   |
| ------------------- | -------------------------- |
| 线稿线条不闭合      | 跳过该图，输出警告         |
| 检测到 0 个有效区域 | 跳过该图，提示检查图片质量 |
| potrace 转换失败    | 输出错误信息，跳过该区域   |
| 非 PNG 文件         | 跳过，提示仅支持 PNG/WebP  |

## 10. 依赖

| 包名            | 用途                       |
| --------------- | -------------------------- |
| `potrace` (npm) | 位图转 SVG path            |
| `sharp` (npm)   | 图像读取与预处理           |
| `canvas` (npm)  | Canvas API 用于 flood-fill |

## 11. 输出格式

输出的 JSON 遵循现有模板格式，可直接放入 `templates/` 目录：

```json
{
  "id": "cute-cat-01",
  "name": "小猫咪",
  "category": "cute",
  "difficulty": "medium",
  "viewBox": { "x": 0, "y": 0, "w": 400, "h": 400 },
  "regions": [
    {
      "id": "region-1",
      "path": "M200,50 C260,50...",
      "bbox": { "x": 90, "y": 50, "w": 220, "h": 260 }
    }
  ]
}
```

## 12. 约束

- 仅处理黑白线稿图片，彩色图片效果不保证
- 区域 id 为通用编号，用户可后续手动改为语义化名称
- 难度默认根据区域数量自动推断：≤5 easy，6-12 medium，>12 hard
- 不做强行的区域处理——检测困难的图片跳过不生成
