import type { BBox } from "./types";

// Extract all numbers from a string
function extractNumbers(s: string): number[] {
  const nums: number[] = [];
  const re = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  let m;
  while ((m = re.exec(s)) !== null) nums.push(parseFloat(m[0]));
  return nums;
}

// Evaluate cubic bezier at parameter t
function cubicBezier(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): number {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

// Evaluate quadratic bezier at parameter t
function quadBezier(t: number, p0: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

// Solve quadratic equation ax^2 + bx + c = 0, return real roots in (0, 1)
function solveQuadratic(a: number, b: number, c: number): number[] {
  if (Math.abs(a) < 1e-10) {
    // Linear: bt + c = 0
    if (Math.abs(b) < 1e-10) return [];
    const t = -c / b;
    return t > 0 && t < 1 ? [t] : [];
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const sqrtDisc = Math.sqrt(disc);
  const roots: number[] = [];
  const t1 = (-b + sqrtDisc) / (2 * a);
  const t2 = (-b - sqrtDisc) / (2 * a);
  if (t1 > 0 && t1 < 1) roots.push(t1);
  if (t2 > 0 && t2 < 1) roots.push(t2);
  return roots;
}

// Compute exact bbox for a cubic bezier by finding derivative roots
function cubicBezierBounds(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
): [number, number] {
  // Derivative of cubic bezier is quadratic: 3(1-t)^2(p1-p0) + 6(1-t)t(p2-p1) + 3t^2(p3-p2)
  // Simplified: a = p3 - 3*p2 + 3*p1 - p0, b = 2*(3*p2 - 6*p1 + 3*p0) wait let me redo
  // B'(t) = 3(1-t)^2(p1-p0) + 6(1-t)t(p2-p1) + 3t^2(p3-p2)
  // Expand: 3(p1-p0) - 6(p1-p0)t + 6(p2-p1)t - 6(p2-p1)t^2 + 3(p3-p2)t^2
  //       = 3(p1-p0) + t[-6(p1-p0) + 6(p2-p1)] + t^2[-6(p2-p1) + 3(p3-p2)]
  // a = -3(p1-p0) + 6(p2-p1) - 3(p3-p2)  (coefficient of 3t^2)
  // Actually simpler: a = 3(p3 - 3p2 + 3p1 - p0), b = 6(3p2 - 2p1 - p0)... no

  // Standard form: B'(t)/3 = (1-t)^2(p1-p0) + 2(1-t)t(p2-p1) + t^2(p3-p2)
  // Expand fully:
  // = (p1-p0) + t[-2(p1-p0) + 2(p2-p1)] + t^2[(p1-p0) - 2(p2-p1) + (p3-p2)]
  // = (p1-p0) + t[2(p2-2p1+p0)] + t^2[(p1-p0) - 2p2 + 2p1 + p3 - p2]
  // = (p1-p0) + t[2(p2-2p1+p0)] + t^2[p3 - 3p2 + 3p1 - p0]
  const a = p3 - 3 * p2 + 3 * p1 - p0;
  const b = 2 * (p2 - 2 * p1 + p0);
  const c = p1 - p0;

  const criticalTs = solveQuadratic(a, b, c);

  let min = Math.min(p0, p3);
  let max = Math.max(p0, p3);
  for (const t of criticalTs) {
    const val = cubicBezier(t, p0, p1, p2, p3);
    min = Math.min(min, val);
    max = Math.max(max, val);
  }
  return [min, max];
}

// Compute exact bbox for a quadratic bezier by finding derivative root
function quadBezierBounds(
  p0: number,
  p1: number,
  p2: number,
): [number, number] {
  // B'(t)/2 = (1-t)(p1-p0) + t(p2-p1) = (p1-p0) + t[(p2-p1)-(p1-p0)] = (p1-p0) + t(p2-2p1+p0)
  const denom = p2 - 2 * p1 + p0;
  let min = Math.min(p0, p2);
  let max = Math.max(p0, p2);

  if (Math.abs(denom) > 1e-10) {
    const t = -(p1 - p0) / denom;
    if (t > 0 && t < 1) {
      const val = quadBezier(t, p0, p1, p2);
      min = Math.min(min, val);
      max = Math.max(max, val);
    }
  }
  return [min, max];
}

// Split SVG path into command segments: [{cmd: 'M', nums: [x, y]}, ...]
function tokenizePath(d: string): { cmd: string; nums: number[] }[] {
  const segments: { cmd: string; nums: number[] }[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    segments.push({ cmd: m[1], nums: extractNumbers(m[2]) });
  }
  return segments;
}

export function computeBBox(d: string): BBox {
  const segments = tokenizePath(d);
  if (segments.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  let curX = 0;
  let curY = 0;

  for (const seg of segments) {
    const { cmd, nums } = seg;
    const isRelative = cmd === cmd.toLowerCase();
    const c = cmd.toUpperCase();

    if (c === "Z") continue;

    if (c === "M" || c === "L") {
      for (let i = 0; i < nums.length - 1; i += 2) {
        const x = isRelative ? curX + nums[i] : nums[i];
        const y = isRelative ? curY + nums[i + 1] : nums[i + 1];
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
        curX = x;
        curY = y;
      }
    } else if (c === "H") {
      for (const n of nums) {
        const x = isRelative ? curX + n : n;
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        curX = x;
      }
    } else if (c === "V") {
      for (const n of nums) {
        const y = isRelative ? curY + n : n;
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
        curY = y;
      }
    } else if (c === "C") {
      for (let i = 0; i < nums.length - 5; i += 6) {
        const p0x = curX;
        const p0y = curY;
        const p1x = isRelative ? curX + nums[i] : nums[i];
        const p1y = isRelative ? curY + nums[i + 1] : nums[i + 1];
        const p2x = isRelative ? curX + nums[i + 2] : nums[i + 2];
        const p2y = isRelative ? curY + nums[i + 3] : nums[i + 3];
        const p3x = isRelative ? curX + nums[i + 4] : nums[i + 4];
        const p3y = isRelative ? curY + nums[i + 5] : nums[i + 5];

        const [xMin, xMax] = cubicBezierBounds(p0x, p1x, p2x, p3x);
        const [yMin, yMax] = cubicBezierBounds(p0y, p1y, p2y, p3y);
        bounds.minX = Math.min(bounds.minX, xMin);
        bounds.maxX = Math.max(bounds.maxX, xMax);
        bounds.minY = Math.min(bounds.minY, yMin);
        bounds.maxY = Math.max(bounds.maxY, yMax);

        curX = p3x;
        curY = p3y;
      }
    } else if (c === "S") {
      let prevCp2x = curX;
      let prevCp2y = curY;
      for (let i = 0; i < nums.length - 3; i += 4) {
        const p0x = curX;
        const p0y = curY;
        const p1x = 2 * curX - prevCp2x;
        const p1y = 2 * curY - prevCp2y;
        const p2x = isRelative ? curX + nums[i] : nums[i];
        const p2y = isRelative ? curY + nums[i + 1] : nums[i + 1];
        const p3x = isRelative ? curX + nums[i + 2] : nums[i + 2];
        const p3y = isRelative ? curY + nums[i + 3] : nums[i + 3];

        const [xMin, xMax] = cubicBezierBounds(p0x, p1x, p2x, p3x);
        const [yMin, yMax] = cubicBezierBounds(p0y, p1y, p2y, p3y);
        bounds.minX = Math.min(bounds.minX, xMin);
        bounds.maxX = Math.max(bounds.maxX, xMax);
        bounds.minY = Math.min(bounds.minY, yMin);
        bounds.maxY = Math.max(bounds.maxY, yMax);

        prevCp2x = p2x;
        prevCp2y = p2y;
        curX = p3x;
        curY = p3y;
      }
    } else if (c === "Q") {
      for (let i = 0; i < nums.length - 3; i += 4) {
        const p0x = curX;
        const p0y = curY;
        const p1x = isRelative ? curX + nums[i] : nums[i];
        const p1y = isRelative ? curY + nums[i + 1] : nums[i + 1];
        const p2x = isRelative ? curX + nums[i + 2] : nums[i + 2];
        const p2y = isRelative ? curY + nums[i + 3] : nums[i + 3];

        const [xMin, xMax] = quadBezierBounds(p0x, p1x, p2x);
        const [yMin, yMax] = quadBezierBounds(p0y, p1y, p2y);
        bounds.minX = Math.min(bounds.minX, xMin);
        bounds.maxX = Math.max(bounds.maxX, xMax);
        bounds.minY = Math.min(bounds.minY, yMin);
        bounds.maxY = Math.max(bounds.maxY, yMax);

        curX = p2x;
        curY = p2y;
      }
    } else if (c === "T") {
      let prevCpx = curX;
      let prevCpy = curY;
      for (let i = 0; i < nums.length - 1; i += 2) {
        const p0x = curX;
        const p0y = curY;
        const p1x = 2 * curX - prevCpx;
        const p1y = 2 * curY - prevCpy;
        const p2x = isRelative ? curX + nums[i] : nums[i];
        const p2y = isRelative ? curY + nums[i + 1] : nums[i + 1];

        const [xMin, xMax] = quadBezierBounds(p0x, p1x, p2x);
        const [yMin, yMax] = quadBezierBounds(p0y, p1y, p2y);
        bounds.minX = Math.min(bounds.minX, xMin);
        bounds.maxX = Math.max(bounds.maxX, xMax);
        bounds.minY = Math.min(bounds.minY, yMin);
        bounds.maxY = Math.max(bounds.maxY, yMax);

        prevCpx = p1x;
        prevCpy = p1y;
        curX = p2x;
        curY = p2y;
      }
    } else if (c === "A") {
      for (let i = 0; i < nums.length - 6; i += 7) {
        const rx = nums[i];
        const ry = nums[i + 1];
        const ex = isRelative ? curX + nums[i + 5] : nums[i + 5];
        const ey = isRelative ? curY + nums[i + 6] : nums[i + 6];

        // Approximate arc bbox using center +/- radii
        const midX = (curX + ex) / 2;
        const midY = (curY + ey) / 2;
        bounds.minX = Math.min(bounds.minX, midX - rx, curX, ex);
        bounds.minY = Math.min(bounds.minY, midY - ry, curY, ey);
        bounds.maxX = Math.max(bounds.maxX, midX + rx, curX, ex);
        bounds.maxY = Math.max(bounds.maxY, midY + ry, curY, ey);

        curX = ex;
        curY = ey;
      }
    }
  }

  return {
    x: Math.round(bounds.minX),
    y: Math.round(bounds.minY),
    w: Math.round(bounds.maxX - bounds.minX),
    h: Math.round(bounds.maxY - bounds.minY),
  };
}
