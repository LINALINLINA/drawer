# Drawer - 创意绘画板

一个基于 `Bun + Turborepo + React + TypeScript` 的创意填色应用。  
核心能力是让用户在不同难度与分类的底图上进行配色创作，支持印章/水印等个性化编辑。

## 功能概览

- 按模板区域进行颜色填充
- 模板按难度分组（`easy` / `medium` / `hard`）
- 支持边界线相关绘制能力（画布引擎）
- 支持印章与水印相关能力
- 支持作品保存与管理（前端状态管理）
- 支持 GitHub Pages 自动部署

## 项目结构

```text
.
├── apps/
│   └── web/                    # React + Vite 前端应用
├── packages/
│   ├── canvas-engine/          # 画布渲染与交互引擎
│   ├── template-engine/        # 模板加载与处理
│   └── color-engine/           # 颜色相关逻辑
├── scripts/                    # 模板/图片处理脚本
├── docs/                       # 需求与设计文档
└── .github/workflows/deploy.yml# GitHub Pages 工作流
```

## 环境要求

- `bun >= 1.2.0`
- Node.js（建议 `>= 20`，用于部分工具链兼容）

## 快速开始

```bash
# 1) 安装依赖
bun install

# 2) 本地开发（Monorepo 并行启动）
bun run dev

# 3) 构建
bun run build

# 4) 测试
bun run test
```

## 常用脚本

- 根目录
  - `bun run dev`：启动所有工作区开发任务
  - `bun run build`：构建所有工作区
  - `bun run test`：执行所有工作区测试
  - `bun run lint`：执行所有工作区 lint

- Web 应用（`apps/web`）
  - `bun run dev`：启动 Vite 开发服务器
  - `bun run build`：TypeScript 构建 + Vite 打包
  - `bun run preview`：预览生产构建结果
  - `bun run test`：运行 Vitest

## GitHub Pages 部署

仓库已配置工作流：`.github/workflows/deploy.yml`，在 `main` 分支推送后自动执行部署。

请确保仓库设置中已开启 Pages：

1. 进入仓库 Settings -> Pages
2. `Build and deployment` 的 `Source` 选择 `GitHub Actions`
3. 保存后重新触发工作流（push 或手动 rerun）

## 模板与资源说明

- 模板索引：`apps/web/public/templates/index.json`
- 模板数据目录：`apps/web/public/templates/*`
- 脚本目录：`scripts/`（用于图片预处理、路径生成、模板构建等）

## 备注

当前仓库为 Monorepo，推荐在根目录统一执行依赖安装与构建命令。  
如遇到缓存或构建异常，可先清理本地缓存后再重新执行 `bun install && bun run build`。
