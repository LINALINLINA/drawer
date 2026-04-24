import { useEditorStore } from "../stores/editor-store";
import { getPalettes, generateRandomPalette } from "@drawer/color-engine";

export default function ColorPalette() {
  const activeColor = useEditorStore((s) => s.activeColor);
  const setActiveColor = useEditorStore((s) => s.setActiveColor);
  const activePalette = useEditorStore((s) => s.activePalette);
  const setActivePalette = useEditorStore((s) => s.setActivePalette);

  const palettes = getPalettes();

  return (
    <div style={{ padding: "8px 16px" }}>
      <div
        style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}
      >
        {activePalette.colors.map((color, i) => (
          <div
            key={i}
            onClick={() => setActiveColor(color)}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: color,
              border:
                color === activeColor ? "3px solid #333" : "2px solid #ddd",
              cursor: "pointer",
              flexShrink: 0,
              transition: "border-color 0.15s",
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          overflowX: "auto",
        }}
      >
        {palettes.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePalette(p)}
            style={{
              padding: "4px 10px",
              border: "none",
              borderRadius: 12,
              fontSize: 12,
              background: p.id === activePalette.id ? "#333" : "#f0f0f0",
              color: p.id === activePalette.id ? "#fff" : "#333",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => {
            const colors = generateRandomPalette(5);
            setActivePalette({ id: "random", name: "随机", colors });
          }}
          style={{
            padding: "4px 10px",
            border: "none",
            borderRadius: 12,
            fontSize: 12,
            background: "#f0f0f0",
            cursor: "pointer",
          }}
        >
          🎲 随机
        </button>
      </div>
    </div>
  );
}
