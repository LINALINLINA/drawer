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
    // Build cache for exportPNG, but render directly onto templateCtx
    // to avoid cross-canvas drawImage compatibility issues
    this.cache.build(this.width, this.height, this.regions, fills);

    this.templateCtx.clearRect(0, 0, this.width, this.height);

    for (const region of this.regions) {
      const color = fills[region.id];
      if (color) {
        this.templateCtx.fillStyle = color;
        this.templateCtx.fill(region.path2d);
      }
      this.templateCtx.strokeStyle = "#e0e0e0";
      this.templateCtx.lineWidth = 1;
      this.templateCtx.stroke(region.path2d);
    }
  }

  private renderDraw(state: CanvasState): void {
    renderDrawLayer(this.drawCtx, state);
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
