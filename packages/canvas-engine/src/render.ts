import type { CanvasState, Stroke, Stamp } from "./types";

export type RegionDef = {
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
