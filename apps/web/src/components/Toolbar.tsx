import { useEditorStore } from "../stores/editor-store";
import type { EditorTool } from "@drawer/canvas-engine";

const tools: { key: EditorTool; label: string; icon: string }[] = [
  { key: "fill", label: "填色", icon: "🎨" },
  { key: "brush", label: "画笔", icon: "✏️" },
  { key: "eraser", label: "橡皮", icon: "🧹" },
  { key: "stamp", label: "印章", icon: "⭐" },
];

export default function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const historyIndex = useEditorStore((s) => s.historyIndex);
  const history = useEditorStore((s) => s.history);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex + 2 <= history.length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        {tools.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTool(t.key)}
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: 8,
              background: activeTool === t.key ? "#1976D2" : "#f0f0f0",
              color: activeTool === t.key ? "#fff" : "#333",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <span style={{ marginRight: 4 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={undo}
          disabled={!canUndo}
          style={{
            padding: "8px 12px",
            border: "none",
            borderRadius: 8,
            background: canUndo ? "#f0f0f0" : "#eee",
            cursor: canUndo ? "pointer" : "not-allowed",
            opacity: canUndo ? 1 : 0.4,
            fontSize: 16,
          }}
        >
          ↩️
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          style={{
            padding: "8px 12px",
            border: "none",
            borderRadius: 8,
            background: canRedo ? "#f0f0f0" : "#eee",
            cursor: canRedo ? "pointer" : "not-allowed",
            opacity: canRedo ? 1 : 0.4,
            fontSize: 16,
          }}
        >
          ↪️
        </button>
      </div>
    </div>
  );
}
