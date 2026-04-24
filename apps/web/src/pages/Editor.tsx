import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadTemplateIndex, loadTemplate } from "@drawer/template-engine";
import { useEditorStore } from "../stores/editor-store";
import { useCanvasEngine } from "../hooks/useCanvasEngine";
import Toolbar from "../components/Toolbar";
import ColorPalette from "../components/ColorPalette";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { init, render, hitTest, exportPNG } = useCanvasEngine(containerRef);
  const [drawing, setDrawing] = useState(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);

  const template = useEditorStore((s) => s.template);
  const activeTool = useEditorStore((s) => s.activeTool);
  const activeColor = useEditorStore((s) => s.activeColor);
  const strokeSettings = useEditorStore((s) => s.strokeSettings);
  const canvasState = useEditorStore((s) => s.canvasState);
  const fillRegion = useEditorStore((s) => s.fillRegion);
  const addStroke = useEditorStore((s) => s.addStroke);
  const removeStroke = useEditorStore((s) => s.removeStroke);
  const removeStamp = useEditorStore((s) => s.removeStamp);
  const saveArtwork = useEditorStore((s) => s.saveArtwork);
  const undo = useEditorStore((s) => s.undo);
  const addStamp = useEditorStore((s) => s.addStamp);
  const selectedStamp = useEditorStore((s) => s.selectedStamp);

  // Load template
  useEffect(() => {
    if (!id) return;
    loadTemplateIndex("/templates/index.json").then((entries) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) {
        console.error("Template not found:", id);
        return;
      }
      loadTemplate(`/templates/${entry.file}`).then((t) => {
        if (t) {
          useEditorStore.getState().setTemplate(t);
        }
      });
    });
  }, [id]);

  // Init canvas and render on template change
  useEffect(() => {
    if (!template) return;
    init(400, 400);
  }, [template, init]);

  // Re-render on canvasState change
  useEffect(() => {
    render();
  }, [canvasState, render]);

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const result = hitTest(e.clientX, e.clientY);
      if (!result) return;

      if (activeTool === "fill" && result.type === "region") {
        fillRegion(result.id, activeColor);
      } else if (activeTool === "eraser") {
        if (result.type === "stamp") removeStamp(result.id);
      } else if (activeTool === "stamp" && result.type === "region") {
        if (selectedStamp) {
          addStamp({
            id: crypto.randomUUID(),
            type: selectedStamp.type,
            value: selectedStamp.value,
            x: e.nativeEvent.offsetX ?? e.clientX,
            y: e.nativeEvent.offsetY ?? e.clientY,
            scale: 1,
            rotate: 0,
          });
        }
      } else if (activeTool === "brush") {
        setDrawing(true);
        const canvas = containerRef.current?.querySelector(
          "canvas:last-child",
        ) as HTMLCanvasElement | null;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        currentStrokeRef.current = [
          {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
          },
        ];
      }
    },
    [
      activeTool,
      activeColor,
      selectedStamp,
      fillRegion,
      addStroke,
      removeStroke,
      removeStamp,
      addStamp,
      hitTest,
    ],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drawing || activeTool !== "brush") return;
      const canvas = containerRef.current?.querySelector(
        "canvas:last-child",
      ) as HTMLCanvasElement | null;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      currentStrokeRef.current.push({
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      });
    },
    [drawing, activeTool],
  );

  const handlePointerUp = useCallback(() => {
    if (!drawing || activeTool !== "brush") return;
    setDrawing(false);
    if (currentStrokeRef.current.length >= 2) {
      addStroke({
        id: crypto.randomUUID(),
        points: currentStrokeRef.current,
        color: strokeSettings.color,
        width: strokeSettings.width,
        style: strokeSettings.style,
      });
    }
    currentStrokeRef.current = [];
  }, [drawing, activeTool, addStroke, strokeSettings]);

  // Two-finger touch undo
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        undo();
      }
    },
    [undo],
  );

  // Export handler
  const handleExport = useCallback(async () => {
    saveArtwork();
    const blob = await exportPNG();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template?.name ?? "artwork"}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportPNG, saveArtwork, template]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid #eee",
          background: "#fff",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          ← 返回
        </button>
        <span style={{ fontWeight: 600 }}>{template?.name ?? "加载中..."}</span>
        <button
          onClick={handleExport}
          style={{
            border: "none",
            background: "#1976D2",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          💾 导出
        </button>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          overflow: "hidden",
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: "100%",
            maxWidth: 400,
            aspectRatio: "1",
            background: "#fff",
            borderRadius: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
        />
      </main>

      <ColorPalette />
      <Toolbar />
    </div>
  );
}
