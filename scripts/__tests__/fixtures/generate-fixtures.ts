import { createCanvas } from "@napi-rs/canvas";
import { writeFileSync, mkdirSync } from "node:fs";

mkdirSync("scripts/__tests__/fixtures", { recursive: true });

// 简单闭合方块：黑底，白色正方形框，内部为可填充区域
const canvas = createCanvas(40, 40);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "black";
ctx.fillRect(0, 0, 40, 40);
ctx.strokeStyle = "white";
ctx.lineWidth = 2;
ctx.strokeRect(10, 10, 20, 20);

writeFileSync(
  "scripts/__tests__/fixtures/simple-box.png",
  Buffer.from(canvas.toBuffer("image/png")),
);
console.log("fixtures generated");
