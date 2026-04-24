import type { CanvasState, Stroke, Stamp } from "./types";
import { getStampSize } from "./types";

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
    ctx.strokeStyle = "#4a4238";
    ctx.lineWidth = 2;
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

function seededNoise(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function carveNoise(i: number, segments: number): number {
  return seededNoise(i * 3.7 + segments * 0.3) * 2 - 1;
}

function drawCarvedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  roughness: number,
): void {
  const ptsPerSide = 12;
  ctx.beginPath();

  // top edge: left→right
  for (let i = 0; i <= ptsPerSide; i++) {
    const t = i / ptsPerSide;
    const px = x + w * t;
    const n =
      carveNoise(0, ptsPerSide) * roughness * (1 - Math.abs(t - 0.5) * 0.5);
    const py = y + n;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  // right edge: top→bottom
  for (let i = 1; i <= ptsPerSide; i++) {
    const t = i / ptsPerSide;
    const py = y + h * t;
    const n =
      carveNoise(1, ptsPerSide) * roughness * (1 - Math.abs(t - 0.5) * 0.5);
    const px = x + w + n;
    ctx.lineTo(px, py);
  }
  // bottom edge: right→left
  for (let i = 1; i <= ptsPerSide; i++) {
    const t = i / ptsPerSide;
    const px = x + w * (1 - t);
    const n =
      carveNoise(2, ptsPerSide) * roughness * (1 - Math.abs(t - 0.5) * 0.5);
    const py = y + h + n;
    ctx.lineTo(px, py);
  }
  // left edge: bottom→top
  for (let i = 1; i < ptsPerSide; i++) {
    const t = i / ptsPerSide;
    const py = y + h * (1 - t);
    const n =
      carveNoise(3, ptsPerSide) * roughness * (1 - Math.abs(t - 0.5) * 0.5);
    const px = x + n;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawCarvedCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  roughness: number,
): void {
  const segments = 48;
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const n = carveNoise(i, segments) * roughness;
    const px = cx + (r + n) * Math.cos(angle);
    const py = cy + (r + n) * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function addWearTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  intensity: number,
): void {
  for (let i = 0; i < intensity; i++) {
    const px = x - size / 2 + seededNoise(i * 7.1 + 0.3) * size;
    const py = y - size / 2 + seededNoise(i * 11.3 + 0.7) * size;
    const s = 1 + seededNoise(i * 3.9) * 3;
    ctx.clearRect(px, py, s, s);
  }
}

function getFontSize(value: string): number {
  const len = value.length;
  if (len <= 1) return 28;
  if (len <= 2) return 22;
  return 18;
}

function renderStampChars(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
): void {
  if (text.length <= 2) {
    ctx.fillText(text, 0, 1);
  } else {
    const chars = Array.from(text);
    const cols = 2;
    const gap = fontSize * 1.15;
    const startX = (-(cols - 1) * gap) / 2;
    const rows = Math.ceil(chars.length / cols);
    const startY = (-(rows - 1) * gap) / 2;
    chars.forEach((ch, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      ctx.fillText(ch, startX + col * gap, startY + row * gap + 1);
    });
  }
}

function renderStamp(ctx: CanvasRenderingContext2D, stamp: Stamp): void {
  if (!stamp.value) return;

  ctx.save();
  ctx.translate(stamp.x, stamp.y);
  ctx.rotate(((stamp.rotate || 0) * Math.PI) / 180);
  ctx.scale(stamp.scale, stamp.scale);

  const size = getStampSize(stamp.value);
  const half = size / 2;
  const fontSize = getFontSize(stamp.value);
  const roughness = size * 0.04;

  const style = stamp.style ?? "chinese-square";
  const fontStr = `bold ${fontSize}px "SimSun", "STSong", "Noto Serif CJK SC", serif`;

  if (style === "chinese-square") {
    drawCarvedRect(ctx, -half, -half, size, size, roughness);
    ctx.fillStyle = "#C41A1A";
    ctx.fill();
    addWearTexture(ctx, 0, 0, size, 8);

    ctx.fillStyle = "#FAEBD7";
    ctx.font = fontStr;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    renderStampChars(ctx, stamp.value, fontSize);
  } else if (style === "chinese-circle") {
    const r = half - 1;
    drawCarvedCircle(ctx, 0, 0, r, roughness);
    ctx.fillStyle = "#C41A1A";
    ctx.fill();
    addWearTexture(ctx, 0, 0, size, 6);

    ctx.fillStyle = "#FAEBD7";
    ctx.font =
      stamp.value.length > 1
        ? `bold ${fontSize * 0.8}px "SimSun", "STSong", "Noto Serif CJK SC", serif`
        : fontStr;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(stamp.value, 0, 1);
  } else if (style === "chinese-border") {
    drawCarvedRect(ctx, -half, -half, size, size, roughness);
    ctx.fillStyle = "rgba(196, 26, 26, 0.06)";
    ctx.fill();
    ctx.strokeStyle = "#C41A1A";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = "#C41A1A";
    ctx.font = fontStr;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    renderStampChars(ctx, stamp.value, fontSize);
  } else {
    ctx.fillStyle = "#C41A1A";
    ctx.font = fontStr;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(196, 26, 26, 0.25)";
    ctx.shadowBlur = 3;
    ctx.fillText(stamp.value, 0, 0);
  }

  ctx.restore();
}
