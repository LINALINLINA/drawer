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

  setTemplate(regions: RegionInput[]): void {
    this.regions = regions.map((r) => ({
      ...r,
      path2d: new Path2D(r.path),
    }));
  }

  render(state: CanvasState): void {
    this._lastState = state;
    this.renderTemplate(state.fills);
    this.renderDraw(state);
  }

  private renderTemplate(fills: Record<string, string>): void {
    this.cache.build(this.width, this.height, this.regions, fills);

    this.templateCtx.clearRect(0, 0, this.width, this.height);

    for (const region of this.regions) {
      const color = fills[region.id] || "#f0f0f0";
      this.templateCtx.fillStyle = color;
      this.templateCtx.fill(region.path2d);
      this.templateCtx.strokeStyle = "#4a4238";
      this.templateCtx.lineWidth = 2;
      this.templateCtx.stroke(region.path2d);
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

    const cached = this.cache.getCanvas();
    if (cached) ctx.drawImage(cached, 0, 0);

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
