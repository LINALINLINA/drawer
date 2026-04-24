import { useEditorStore } from "../stores/editor-store";
import { getPalettes, generateRandomPalette } from "@drawer/color-engine";

export default function ColorPalette() {
  const activeColor = useEditorStore((s) => s.activeColor);
  const setActiveColor = useEditorStore((s) => s.setActiveColor);
  const activePalette = useEditorStore((s) => s.activePalette);
  const setActivePalette = useEditorStore((s) => s.setActivePalette);

  const palettes = getPalettes();

  return (
    <div style={{ padding: "8px 16px", background: "#fffbf5" }}>
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 8,
          scrollbarWidth: "none",
          justifyContent: "center",
        }}
      >
        {activePalette.colors.map((color, i) => (
          <button
            key={i}
            onClick={() => setActiveColor(color)}
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: color,
              border: `2.5px solid ${color === activeColor ? "#3a322a" : "#d8c8b8"}`,
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.2s",
              transform: color === activeColor ? "scale(1.15)" : "scale(1)",
              boxShadow:
                color === activeColor
                  ? "2px 2px 0 rgba(58,50,42,0.15)"
                  : "none",
              padding: 0,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {palettes.map((p) => {
          const active = p.id === activePalette.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePalette(p)}
              style={{
                padding: "4px 10px",
                border: `1.5px solid ${active ? "#3a322a" : "#d8c8b8"}`,
                borderRadius: "10px 3px 10px 3px",
                fontSize: 12,
                fontWeight: 600,
                background: active ? "#3a322a" : "#fffbf5",
                color: active ? "#fff" : "#5a4a3a",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              {p.name}
            </button>
          );
        })}
        <button
          onClick={() => {
            const colors = generateRandomPalette(5);
            setActivePalette({ id: "random", name: "随机", colors });
          }}
          style={{
            padding: "4px 10px",
            border: "1.5px dashed #c8b8a8",
            borderRadius: "10px 3px 10px 3px",
            fontSize: 12,
            fontWeight: 600,
            background: "#fffbf5",
            color: "#5a4a3a",
            cursor: "pointer",
            transition: "all 0.2s",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          随机
        </button>
      </div>
    </div>
  );
}
