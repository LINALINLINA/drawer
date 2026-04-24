import { readFile } from "node:fs/promises";
import type { Region, BBox } from "./utils";

export interface SvgViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExtractedSvg {
  viewBox: SvgViewBox;
  regions: Region[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 仿射变换矩阵 [a, b, c, d, e, f]
// 变换公式：x' = ax + cy + e,  y' = bx + dy + f
// 单位矩阵：[1, 0, 0, 1, 0, 0]
// ─────────────────────────────────────────────────────────────────────────────
type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiplyMatrix(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function applyMatrix(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** 解析 SVG transform 属性为仿射矩阵 */
function parseTransform(transform: string): Matrix {
  let result: Matrix = [...IDENTITY];
  const funcRegex = /(\w+)\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;

  while ((m = funcRegex.exec(transform)) !== null) {
    const fn = m[1]!.toLowerCase();
    const args = m[2]!.split(/[\s,]+/).map(Number);

    let mat: Matrix = [...IDENTITY];

    if (fn === "translate") {
      mat = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
    } else if (fn === "scale") {
      const sx = args[0] ?? 1;
      const sy = args[1] ?? sx;
      mat = [sx, 0, 0, sy, 0, 0];
    } else if (fn === "rotate") {
      const angle = ((args[0] ?? 0) * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const cx = args[1] ?? 0;
      const cy = args[2] ?? 0;
      // rotate(angle, cx, cy) = translate(cx,cy) * rotate(angle) * translate(-cx,-cy)
      mat = [
        cos,
        sin,
        -sin,
        cos,
        cx - cos * cx + sin * cy,
        cy - sin * cx - cos * cy,
      ];
    } else if (fn === "matrix") {
      mat = [
        args[0] ?? 1,
        args[1] ?? 0,
        args[2] ?? 0,
        args[3] ?? 1,
        args[4] ?? 0,
        args[5] ?? 0,
      ];
    } else if (fn === "skewx") {
      const angle = ((args[0] ?? 0) * Math.PI) / 180;
      mat = [1, 0, Math.tan(angle), 1, 0, 0];
    } else if (fn === "skewy") {
      const angle = ((args[0] ?? 0) * Math.PI) / 180;
      mat = [1, Math.tan(angle), 0, 1, 0, 0];
    }

    result = multiplyMatrix(result, mat);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Path d 属性解析
// ─────────────────────────────────────────────────────────────────────────────

/** 解析 SVG path d 属性，收集所有顶点坐标，应用给定变换矩阵，返回 BBox */
function computePathBBox(d: string, transform: Matrix): BBox | null {
  if (!d || !d.trim()) return null;

  const xs: number[] = [];
  const ys: number[] = [];

  // 规范化：命令字母前后加空格，负号前加空格（处理连排负数）
  const normalized = d
    .replace(/([MmZzLlHhVvCcSsQqTtAa])/g, " $1 ")
    .replace(/,/g, " ")
    .replace(/([^\s])-/g, "$1 -")
    .trim();

  const tokens = normalized.split(/\s+/).filter((t) => t !== "");
  let i = 0;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  const isNum = (): boolean => {
    const t = tokens[i];
    return t !== undefined && /^-?[\d.]/.test(t) && t.length > 0;
  };

  const num = (): number => {
    const v = parseFloat(tokens[i++] ?? "0");
    return isNaN(v) ? 0 : v;
  };

  const rec = (x: number, y: number) => {
    const [tx, ty] = applyMatrix(transform, x, y);
    xs.push(tx);
    ys.push(ty);
  };

  while (i < tokens.length) {
    const tok = tokens[i];
    if (!tok) break;

    // 遇到非命令的数字，跳过（不应出现，保护性处理）
    if (isNum()) {
      i++;
      continue;
    }

    const cmd = tokens[i++]!;

    switch (cmd) {
      case "M":
        while (isNum()) {
          cx = num();
          cy = num();
          startX = cx;
          startY = cy;
          rec(cx, cy);
        }
        break;
      case "m":
        while (isNum()) {
          cx += num();
          cy += num();
          startX = cx;
          startY = cy;
          rec(cx, cy);
        }
        break;
      case "L":
        while (isNum()) {
          cx = num();
          cy = num();
          rec(cx, cy);
        }
        break;
      case "l":
        while (isNum()) {
          cx += num();
          cy += num();
          rec(cx, cy);
        }
        break;
      case "H":
        while (isNum()) {
          cx = num();
          rec(cx, cy);
        }
        break;
      case "h":
        while (isNum()) {
          cx += num();
          rec(cx, cy);
        }
        break;
      case "V":
        while (isNum()) {
          cy = num();
          rec(cx, cy);
        }
        break;
      case "v":
        while (isNum()) {
          cy += num();
          rec(cx, cy);
        }
        break;
      case "C": // x1 y1 x2 y2 x y
        while (isNum()) {
          rec(num(), num());
          rec(num(), num());
          cx = num();
          cy = num();
          rec(cx, cy);
        }
        break;
      case "c":
        while (isNum()) {
          rec(cx + num(), cy + num());
          rec(cx + num(), cy + num());
          cx += num();
          cy += num();
          rec(cx, cy);
        }
        break;
      case "S": // x2 y2 x y
        while (isNum()) {
          rec(num(), num());
          cx = num();
          cy = num();
          rec(cx, cy);
        }
        break;
      case "s":
        while (isNum()) {
          rec(cx + num(), cy + num());
          cx += num();
          cy += num();
          rec(cx, cy);
        }
        break;
      case "Q": // x1 y1 x y
        while (isNum()) {
          rec(num(), num());
          cx = num();
          cy = num();
          rec(cx, cy);
        }
        break;
      case "q":
        while (isNum()) {
          rec(cx + num(), cy + num());
          cx += num();
          cy += num();
          rec(cx, cy);
        }
        break;
      case "T":
        while (isNum()) {
          cx = num();
          cy = num();
          rec(cx, cy);
        }
        break;
      case "t":
        while (isNum()) {
          cx += num();
          cy += num();
          rec(cx, cy);
        }
        break;
      case "A": // rx ry x-rotation large-arc-flag sweep-flag x y
        while (isNum()) {
          num();
          num();
          num();
          num();
          num(); // 跳过弧参数
          cx = num();
          cy = num();
          rec(cx, cy);
        }
        break;
      case "a":
        while (isNum()) {
          num();
          num();
          num();
          num();
          num();
          cx += num();
          cy += num();
          rec(cx, cy);
        }
        break;
      case "Z":
      case "z":
        cx = startX;
        cy = startY;
        break;
      default:
        break;
    }
  }

  if (xs.length === 0) return null;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;

  if (w < 1 && h < 1) return null;

  return { x: minX, y: minY, w, h };
}

// ─────────────────────────────────────────────────────────────────────────────
// 属性提取
// ─────────────────────────────────────────────────────────────────────────────

function extractAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i");
  const m = tag.match(re);
  return m ? (m[1] ?? m[2] ?? null) : null;
}

function extractFill(style: string | null, fill: string | null): string | null {
  if (style) {
    const m = style.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i);
    if (m) {
      const v = m[1].trim().toLowerCase();
      if (v !== "none" && v !== "transparent") return v;
    }
  }
  if (
    fill &&
    fill.toLowerCase() !== "none" &&
    fill.toLowerCase() !== "transparent" &&
    fill !== ""
  ) {
    return fill;
  }
  return null;
}

function parseViewBox(vb: string): SvgViewBox {
  const nums = vb.trim().replace(/,/g, " ").split(/\s+/).map(Number);
  if (nums.length < 4 || nums.some(isNaN))
    return { x: 0, y: 0, w: 400, h: 400 };
  return { x: nums[0], y: nums[1], w: nums[2], h: nums[3] };
}

// ─────────────────────────────────────────────────────────────────────────────
// 主要导出函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 从 SVG 文件直接提取带填充颜色的路径作为模板区域
 * 支持嵌套 <g transform="..."> 变换叠加
 */
export async function extractSvgRegions(
  svgPath: string,
  minBBoxArea = 50,
): Promise<ExtractedSvg> {
  const content = await readFile(svgPath, "utf-8");

  // ① 解析根 SVG 的 viewBox
  const svgTagMatch = content.match(/<svg\b[^>]*>/i);
  let viewBox: SvgViewBox = { x: 0, y: 0, w: 400, h: 400 };

  if (svgTagMatch) {
    const tag = svgTagMatch[0];
    const vbAttr = extractAttr(tag, "viewBox");
    const widthAttr = extractAttr(tag, "width");
    const heightAttr = extractAttr(tag, "height");

    if (vbAttr) {
      viewBox = parseViewBox(vbAttr);
    } else if (widthAttr && heightAttr) {
      viewBox = {
        x: 0,
        y: 0,
        w: parseFloat(widthAttr),
        h: parseFloat(heightAttr),
      };
    }
  }

  // ② 用 token 扫描方式处理标签，维护 transform 栈
  // 使用正则依次匹配：开始标签、自闭合标签、结束标签
  const tokenRe = /<(\/?)(\w[\w:-]*)([^>]*?)(\/?)>/gs;
  const transformStack: Matrix[] = [IDENTITY];
  // 上层填充色栈（CSS 继承用）
  const fillStack: (string | null)[] = [null];

  const allPaths: Array<{
    d: string;
    fill: string | null;
    id: string | null;
    transform: Matrix;
  }> = [];

  let tm: RegExpExecArray | null;
  while ((tm = tokenRe.exec(content)) !== null) {
    const isClose = tm[1] === "/";
    const tagName = tm[2]!.toLowerCase();
    const attrs = tm[3]!;
    const isSelfClose = tm[4] === "/";

    if (isClose) {
      // 结束标签
      if (tagName === "g" || tagName === "svg") {
        if (transformStack.length > 1) transformStack.pop();
        if (fillStack.length > 1) fillStack.pop();
      }
      continue;
    }

    // 开始标签 / 自闭合标签
    if (tagName === "g" || tagName === "svg") {
      const transformAttr = extractAttr(attrs, "transform");
      const parentMatrix = transformStack[transformStack.length - 1]!;
      const localMatrix = transformAttr
        ? parseTransform(transformAttr)
        : IDENTITY;
      const combined = multiplyMatrix(parentMatrix, localMatrix);

      const style = extractAttr(attrs, "style");
      const fillAttr = extractAttr(attrs, "fill");
      const groupFill = extractFill(style, fillAttr);

      if (!isSelfClose) {
        transformStack.push(combined);
        fillStack.push(groupFill);
      }
      continue;
    }

    if (tagName === "path") {
      const d = extractAttr(attrs, "d");
      if (!d || !d.trim()) continue;

      const style = extractAttr(attrs, "style");
      const fillAttr = extractAttr(attrs, "fill");
      // 路径自身 fill 优先，否则继承父级
      const selfFill = extractFill(style, fillAttr);
      const inheritedFill = fillStack[fillStack.length - 1] ?? null;
      const fill = selfFill ?? inheritedFill;

      const id = extractAttr(attrs, "id");
      const transformAttr = extractAttr(attrs, "transform");
      const parentMatrix = transformStack[transformStack.length - 1]!;
      const pathMatrix = transformAttr
        ? multiplyMatrix(parentMatrix, parseTransform(transformAttr))
        : parentMatrix;

      allPaths.push({ d: d.trim(), fill, id, transform: pathMatrix });
    }
  }

  console.log(
    `  [SVG] viewBox: ${viewBox.x} ${viewBox.y} ${viewBox.w}×${viewBox.h}`,
  );
  console.log(`  [SVG] 找到 ${allPaths.length} 个 path 元素`);

  // ③ 优先有填充色的路径；全部无填充则取全量
  const filledPaths = allPaths.filter((p) => p.fill !== null);
  const targetPaths = filledPaths.length > 0 ? filledPaths : allPaths;
  console.log(
    `  [SVG] 使用 ${targetPaths.length} 个路径（${filledPaths.length > 0 ? "有填充色" : "无填充色，全量"}）`,
  );

  // ④ 计算 bbox 并组装 Region，过滤在 viewBox 外或太小的路径
  const regions: Region[] = [];
  for (let idx = 0; idx < targetPaths.length; idx++) {
    const p = targetPaths[idx]!;
    const bbox = computePathBBox(p.d, p.transform);
    if (!bbox) continue;
    if (bbox.w * bbox.h < minBBoxArea) continue;

    // 过滤完全在 viewBox 范围外的路径
    const vx2 = viewBox.x + viewBox.w;
    const vy2 = viewBox.y + viewBox.h;
    if (bbox.x + bbox.w < viewBox.x || bbox.x > vx2) continue;
    if (bbox.y + bbox.h < viewBox.y || bbox.y > vy2) continue;

    const rid = p.id ? `region-${p.id}` : `region-${idx + 1}`;
    regions.push({ id: rid, path: p.d, bbox });
  }

  console.log(`  [SVG] 有效区域: ${regions.length} 个`);

  return { viewBox, regions };
}
