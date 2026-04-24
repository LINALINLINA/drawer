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
