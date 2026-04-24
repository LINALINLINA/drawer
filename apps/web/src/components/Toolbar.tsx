import type { ReactNode } from "react";
import { useEditorStore } from "../stores/editor-store";
import type { EditorTool } from "@drawer/canvas-engine";

const BRUSH_SIZES = [1, 3, 6, 10, 16] as const;

const tools: { key: EditorTool; label: string }[] = [
  { key: "fill", label: "填色" },
  { key: "brush", label: "画笔" },
  { key: "eraser", label: "橡皮" },
  { key: "stamp", label: "印章" },
];

const toolIcons: Record<EditorTool, ReactNode> = {
  fill: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h5.5z"
        fill="currentColor"
        stroke="#3a322a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  ),
  brush: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 20l2-6L16 4l4 4L10 18z"
        fill="currentColor"
        stroke="#3a322a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M4 20l2-6 2 2z"
        fill="#f7c948"
        stroke="#3a322a"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  ),
  eraser: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 13l-6-6-9 9 3 3h6l6-6z"
        fill="#f7c948"
        stroke="#3a322a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M6 22h12"
        stroke="#3a322a"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  stamp: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="14"
        width="18"
        height="6"
        rx="1"
        fill="currentColor"
        stroke="#3a322a"
        strokeWidth="1.2"
      />
      <path
        d="M12 4v10M8 8l4-4 4 4"
        stroke="#3a322a"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const strokeWidth = useEditorStore((s) => s.strokeSettings.width);
  const setStrokeSettings = useEditorStore((s) => s.setStrokeSettings);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const history = useEditorStore((s) => s.history);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex + 2 <= history.length;

  return (
    <div style={{ background: "#fffbf5", borderTop: "2px dashed #d8c8b8" }}>
      {/* 画笔粗细选择器 */}
      {activeTool === "brush" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "6px 16px 2px",
          }}
        >
          {BRUSH_SIZES.map((size) => {
            const active = strokeWidth === size;
            return (
              <button
                key={size}
                onClick={() => setStrokeSettings({ width: size })}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: active ? "2.5px solid #3a322a" : "2px dashed #c8b8a8",
                  background: active ? "#3a322a" : "#fffbf5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  padding: 0,
                }}
              >
                <div
                  style={{
                    width: Math.min(size * 1.5, 20),
                    height: Math.min(size * 1.5, 20),
                    borderRadius: "50%",
                    background: active ? "#f7c948" : "#5a4a3a",
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {tools.map((t) => {
            const active = activeTool === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTool(t.key)}
                style={{
                  padding: "8px 12px",
                  border: `2px solid ${active ? "#3a322a" : "#c8b8a8"}`,
                  borderRadius: "12px 4px 12px 4px",
                  background: active ? "#3a322a" : "#fffbf5",
                  color: active ? "#fff" : "#5a4a3a",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  minHeight: 44,
                  transition:
                    "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  transform: active ? "scale(1.05)" : "scale(1)",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {toolIcons[t.key]}
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              width: 40,
              height: 40,
              border: `2px solid ${canUndo ? "#c8b8a8" : "#e8e0d8"}`,
              borderRadius: "8px 4px 8px 4px",
              background: "#fffbf5",
              cursor: canUndo ? "pointer" : "not-allowed",
              opacity: canUndo ? 1 : 0.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 14l-5-5 5-5M4 9h11a5 5 0 010 10h-1"
                stroke="#3a322a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            style={{
              width: 40,
              height: 40,
              border: `2px solid ${canRedo ? "#c8b8a8" : "#e8e0d8"}`,
              borderRadius: "8px 4px 8px 4px",
              background: "#fffbf5",
              cursor: canRedo ? "pointer" : "not-allowed",
              opacity: canRedo ? 1 : 0.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h1"
                stroke="#3a322a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
