import { useState } from "react";
import { useEditorStore } from "../stores/editor-store";
import type { StampStyle } from "@drawer/canvas-engine";

const STYLES: { key: StampStyle; label: string }[] = [
  { key: "chinese-square", label: "朱红方印" },
  { key: "chinese-circle", label: "朱红圆印" },
  { key: "chinese-border", label: "朱文方印" },
  { key: "simple", label: "简约印" },
];

function carvedNoise(i: number, n: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function generateCarvedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  roughness: number,
): string {
  const ptsPerSide = 8;
  const d: string[] = [];

  for (let i = 0; i <= ptsPerSide; i++) {
    const t = i / ptsPerSide;
    const n =
      carvedNoise(0, ptsPerSide) * roughness * (1 - Math.abs(t - 0.5) * 0.5);
    d.push(
      `${i === 0 ? "M" : "L"}${(x + w * t).toFixed(1)},${(y + n).toFixed(1)}`,
    );
  }
  for (let i = 1; i <= ptsPerSide; i++) {
    const t = i / ptsPerSide;
    const n =
      carvedNoise(1, ptsPerSide) * roughness * (1 - Math.abs(t - 0.5) * 0.5);
    d.push(`L${(x + w + n).toFixed(1)},${(y + h * t).toFixed(1)}`);
  }
  for (let i = 1; i <= ptsPerSide; i++) {
    const t = i / ptsPerSide;
    const n =
      carvedNoise(2, ptsPerSide) * roughness * (1 - Math.abs(t - 0.5) * 0.5);
    d.push(`L${(x + w * (1 - t)).toFixed(1)},${(y + h + n).toFixed(1)}`);
  }
  for (let i = 1; i < ptsPerSide; i++) {
    const t = i / ptsPerSide;
    const n =
      carvedNoise(3, ptsPerSide) * roughness * (1 - Math.abs(t - 0.5) * 0.5);
    d.push(`L${(x + n).toFixed(1)},${(y + h * (1 - t)).toFixed(1)}`);
  }
  d.push("Z");
  return d.join(" ");
}

function generateCarvedCirclePath(
  cx: number,
  cy: number,
  r: number,
  roughness: number,
): string {
  const segments = 36;
  const pts = Array.from({ length: segments }, (_, i) => {
    const angle = (i / segments) * Math.PI * 2;
    const n = carvedNoise(i, segments) * roughness;
    return `${(cx + (r + n) * Math.cos(angle)).toFixed(1)},${(cy + (r + n) * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");
  return pts;
}

function StampPreview({
  text,
  style,
  size,
}: {
  text: string;
  style: StampStyle;
  size: number;
}) {
  const roughness = size * 0.04;
  const half = size / 2;
  const len = text.length;
  const fontSize = len <= 1 ? 14 : len <= 2 ? 11 : 9;

  if (style === "chinese-square") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={generateCarvedRectPath(0, 0, size, size, roughness)}
          fill="#C41A1A"
        />
        <text
          x={half}
          y={half}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FAEBD7"
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="'SimSun','STSong',serif"
        >
          {text || "印"}
        </text>
      </svg>
    );
  }

  if (style === "chinese-circle") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon
          points={generateCarvedCirclePath(half, half, half - 1, roughness)}
          fill="#C41A1A"
        />
        <text
          x={half}
          y={half}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FAEBD7"
          fontSize={len > 1 ? fontSize * 0.8 : fontSize}
          fontWeight="bold"
          fontFamily="'SimSun','STSong',serif"
        >
          {text || "印"}
        </text>
      </svg>
    );
  }

  if (style === "chinese-border") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path
          d={generateCarvedRectPath(0, 0, size, size, roughness)}
          fill="rgba(196,26,26,0.06)"
          stroke="#C41A1A"
          strokeWidth="1.5"
        />
        <text
          x={half}
          y={half}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#C41A1A"
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="'SimSun','STSong',serif"
        >
          {text || "印"}
        </text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <text
        x={half}
        y={half}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#C41A1A"
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="'SimSun','STSong',serif"
      >
        {text || "印"}
      </text>
    </svg>
  );
}

export default function StampSelector() {
  const [text, setText] = useState("");
  const [activeStyle, setActiveStyle] = useState<StampStyle>("chinese-square");
  const selectedStamp = useEditorStore((s) => s.selectedStamp);
  const setSelectedStamp = useEditorStore((s) => s.setSelectedStamp);

  const handleTextChange = (val: string) => {
    const trimmed = Array.from(val).slice(0, 4).join("");
    setText(trimmed);
    if (trimmed) {
      setSelectedStamp({ type: "custom", value: trimmed, style: activeStyle });
    } else {
      setSelectedStamp(null);
    }
  };

  const handleStyleChange = (style: StampStyle) => {
    setActiveStyle(style);
    if (text) {
      setSelectedStamp({ type: "custom", value: text, style });
    }
  };

  const hasStamp = !!selectedStamp?.value;

  return (
    <div
      style={{
        padding: "8px 12px",
        background: "#fffbf5",
        borderTop: "2px dashed #d8c8b8",
      }}
    >
      {/* 文字输入 */}
      <div style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="输入印章文字（最多4字）"
          maxLength={4}
          style={{
            width: "100%",
            padding: "8px 12px",
            border: "2px solid #c8b8a8",
            borderRadius: "8px 3px 8px 3px",
            fontSize: 15,
            fontFamily: "'SimSun','STSong','Noto Serif CJK SC',serif",
            color: "#3a322a",
            background: "#fff",
            outline: "none",
            boxSizing: "border-box",
            WebkitTapHighlightColor: "transparent",
          }}
        />
      </div>

      {/* 样式选择 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {STYLES.map((s) => {
          const active = activeStyle === s.key && hasStamp;
          return (
            <button
              key={s.key}
              onClick={() => handleStyleChange(s.key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "6px 8px",
                border: `2px solid ${active ? "#3a322a" : "#d8c8b8"}`,
                borderRadius: "8px 3px 8px 3px",
                background: active ? "#3a322a" : "#fffbf5",
                cursor: "pointer",
                transition: "all 0.2s",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <StampPreview text={text || "印"} style={s.key} size={40} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: active ? "#fff" : "#5a4a3a",
                }}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 提示 */}
      {!text && (
        <p
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "#8a7a6a",
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          输入文字后点击画布放置印章
        </p>
      )}
    </div>
  );
}
