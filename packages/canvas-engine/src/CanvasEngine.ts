import type { CanvasState, BBox } from "./types";
import { renderDrawLayer } from "./render";
import { TemplateCache } from "./cache";
import { hitTestRegion, hitTestStamp } from "./hit-test";
import type { HitRegion } from "./hit-test";

type RegionInput = {
  id: string;
  path: string;
  bbox: BBox;
};

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
  private outlineImg: HTMLImageElement | null = null;
  private _lastState: CanvasState = {
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

    this.templateCanvas = document.createElement("canvas");
    this.templateCanvas.width = width;
    this.templateCanvas.height = height;
    this.templateCanvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;";
    this.templateCtx = this.templateCanvas.getContext("2d")!;

    this.drawCanvas = document.createElement("canvas");
    this.drawCanvas.width = width;
    this.drawCanvas.height = height;
    this.drawCanvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;touch-action:none;";
    this.drawCtx = this.drawCanvas.getContext("2d")!;

    container.appendChild(this.templateCanvas);
    container.appendChild(this.drawCanvas);
  }

  setTemplate(regions: RegionInput[], outlineImageUrl?: string): void {
    this.regions = regions.map((r) => ({
      ...r,
      path2d: new Path2D(r.path),
    }));
    // 异步加载轮廓 PNG（加载完成后触发重渲染）
    this.outlineImg = null;
    if (outlineImageUrl) {
      const img = new Image();
      img.onload = () => {
        this.outlineImg = img;
        // 图片加载完成后重渲染
        this.renderTemplate(this._lastState.fills);
      };
      img.src = outlineImageUrl;
    }
  }

  render(state: CanvasState): void {
    this._lastState = state;
    this.renderTemplate(state.fills);
    this.renderDraw(state);
  }

  private renderTemplate(fills: Record<string, string>): void {
    const ctx = this.templateCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    // ① 白色底色（multiply 混合模式需要白底，否则透明区域混合结果不正确）
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.outlineImg) {
      // ── 有轮廓 PNG 时：填色区域 + multiply 线条叠加 ──
      // ② 填充用户已着色的区域
      for (const region of this.regions) {
        const color = fills[region.id];
        if (color) {
          ctx.fillStyle = color;
          ctx.fill(region.path2d);
        }
      }
      // ③ multiply 叠加原始线条 PNG（黑色像素保持黑色，白色像素透明显示下方颜色）
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(this.outlineImg, 0, 0, this.width, this.height);
      ctx.globalCompositeOperation = "source-over";
    } else {
      // ── 无轮廓 PNG 时（手工/SVG 模板）：沿用旧的 fill + stroke 方式 ──
      for (const region of this.regions) {
        const color = fills[region.id] || "#f5f0ea";
        ctx.fillStyle = color;
        ctx.fill(region.path2d);
        ctx.strokeStyle = "#4a4238";
        ctx.lineWidth = 2;
        ctx.stroke(region.path2d);
      }
    }
  }

  private renderDraw(state: CanvasState): void {
    renderDrawLayer(this.drawCtx, state);
  }

  renderLiveStroke(
    points: { x: number; y: number }[],
    color: string,
    width: number,
    style: "solid" | "dashed" = "solid",
  ): void {
    if (points.length < 2) return;
    const ctx = this.drawCtx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (style === "dashed") {
      ctx.setLineDash([width * 3, width * 2]);
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  clearDrawLayer(): void {
    this.drawCtx.clearRect(0, 0, this.width, this.height);
  }

  redrawDrawLayer(): void {
    renderDrawLayer(this.drawCtx, this._lastState);
  }

  hitTest(
    x: number,
    y: number,
  ): { type: "region" | "stamp"; id: string } | null {
    const stampId = hitTestStamp(x, y, this._lastState.stamps);
    if (stampId) return { type: "stamp", id: stampId };

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

    // 直接使用 templateCanvas（包含填色 + outlinePath 轮廓层）
    ctx.drawImage(this.templateCanvas, 0, 0);
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
