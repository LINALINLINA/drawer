import { useEffect, useRef, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadTemplateIndex, loadTemplate } from "@drawer/template-engine";
import { useEditorStore, loadAllArtworks } from "../stores/editor-store";
import { useCanvasEngine } from "../hooks/useCanvasEngine";
import Toolbar from "../components/Toolbar";
import ColorPalette from "../components/ColorPalette";
import StampSelector from "../components/StampSelector";

const templatesBase = `${import.meta.env.BASE_URL}templates`;

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    init,
    render,
    hitTest,
    exportPNG,
    destroyEngine,
    renderLiveStroke,
    clearDrawLayer,
    redrawDrawLayer,
    getCanvasCoords,
  } = useCanvasEngine(containerRef);
  const [drawing, setDrawing] = useState(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const mountedRef = useRef(false);

  const template = useEditorStore((s) => s.template);
  const canvasState = useEditorStore((s) => s.canvasState);
  const activeTool = useEditorStore((s) => s.activeTool);
  const activeColor = useEditorStore((s) => s.activeColor);
  const strokeSettings = useEditorStore((s) => s.strokeSettings);
  const fillRegion = useEditorStore((s) => s.fillRegion);
  const removeStamp = useEditorStore((s) => s.removeStamp);
  const saveArtwork = useEditorStore((s) => s.saveArtwork);
  const undo = useEditorStore((s) => s.undo);
  const addStroke = useEditorStore((s) => s.addStroke);
  const addStamp = useEditorStore((s) => s.addStamp);
  const selectedStamp = useEditorStore((s) => s.selectedStamp);

  useEffect(() => {
    if (!id) return;
    mountedRef.current = true;

    const loadAndRender = async () => {
      try {
        const entries = await loadTemplateIndex(`${templatesBase}/index.json`);
        if (!mountedRef.current) return;
        const entry = entries.find((e) => e.id === id);
        if (!entry) return;
        const t = await loadTemplate(`${templatesBase}/${entry.file}`);
        if (!mountedRef.current || !t || !containerRef.current) return;

        init(400, 400);
        useEditorStore.getState().setTemplate(t);
        // 若有已保存的作品状态则恢复填色
        const saved = loadAllArtworks().find((a) => a.templateId === t.id);
        if (saved) useEditorStore.getState().loadArtwork(saved);
        render();
      } catch (err) {
        console.error("[Editor] Failed to load template:", err);
      }
    };

    loadAndRender();

    return () => {
      mountedRef.current = false;
      destroyEngine();
    };
  }, [id, init, render, destroyEngine]);

  useEffect(() => {
    if (!mountedRef.current) return;
    render();
  }, [canvasState, render]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (activeTool === "stamp" && selectedStamp) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        if (coords) {
          addStamp({
            id: crypto.randomUUID(),
            type: selectedStamp.type,
            value: selectedStamp.value,
            style: selectedStamp.style,
            x: coords.x,
            y: coords.y,
            scale: 1,
            rotate: 0,
          });
        }
        return;
      }

      const result = hitTest(e.clientX, e.clientY);

      if (activeTool === "fill" && result?.type === "region") {
        fillRegion(result.id, activeColor);
      } else if (activeTool === "eraser") {
        if (result?.type === "stamp") removeStamp(result.id);
      } else if (activeTool === "brush") {
        setDrawing(true);
        const canvas = containerRef.current?.querySelector(
          "canvas:last-child",
        ) as HTMLCanvasElement | null;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const pt = {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
        currentStrokeRef.current = [pt];
        renderLiveStroke(
          [pt],
          strokeSettings.color,
          strokeSettings.width,
          strokeSettings.style,
        );
      }
    },
    [
      activeTool,
      activeColor,
      selectedStamp,
      fillRegion,
      addStamp,
      removeStamp,
      hitTest,
      strokeSettings,
      renderLiveStroke,
      getCanvasCoords,
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
      const pt = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
      currentStrokeRef.current.push(pt);

      clearDrawLayer();
      redrawDrawLayer();
      renderLiveStroke(
        currentStrokeRef.current,
        strokeSettings.color,
        strokeSettings.width,
        strokeSettings.style,
      );
    },
    [
      drawing,
      activeTool,
      strokeSettings,
      clearDrawLayer,
      redrawDrawLayer,
      renderLiveStroke,
    ],
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

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        undo();
      }
    },
    [undo],
  );

  /** 生成缩略图 base64 并保存作品（不下载） */
  const handleSave = useCallback(async () => {
    const blob = await exportPNG();
    let thumbnail: string | undefined;
    if (blob) {
      // 将 blob 转为 base64 缩略图（约 200×200）
      thumbnail = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
    saveArtwork(thumbnail);
  }, [exportPNG, saveArtwork]);

  const handleExport = useCallback(async () => {
    const blob = await exportPNG();
    if (!blob) return;
    // 同步保存（带缩略图）
    const thumbnail = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    saveArtwork(thumbnail);
    // 下载文件
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template?.name ?? "artwork"}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportPNG, saveArtwork, template]);

  const showColorPalette = activeTool === "fill" || activeTool === "brush";
  const showStampSelector = activeTool === "stamp";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "#fffbf5",
      }}
    >
      {/* 手绘风格 Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px 8px",
        }}
      >
        <button
          onClick={async () => {
            await handleSave();
            navigate("/");
          }}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: "4px",
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 19l-7-7 7-7"
              stroke="#3a322a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div style={{ position: "relative" }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 16,
              color: "#3a322a",
              letterSpacing: 0.5,
            }}
          >
            {template?.name ?? "加载中..."}
          </span>
          <svg
            style={{
              position: "absolute",
              bottom: -3,
              left: -4,
              width: "calc(100% + 8px)",
              height: 6,
            }}
            viewBox="0 0 120 6"
            preserveAspectRatio="none"
          >
            <path
              d="M2 4Q30 1 60 4T118 2"
              stroke="#e8785a"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <button
          onClick={handleExport}
          style={{
            border: "2px solid #3a322a",
            borderRadius: "8px 3px 8px 3px",
            background: "#f7c948",
            color: "#3a322a",
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
        >
          导出
        </button>
      </header>

      {/* 画布区域 */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 8,
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: "100%",
            maxWidth: 400,
            aspectRatio: "1",
            borderRadius: "12px 4px 12px 4px",
            border: "2.5px solid #5a4a3a",
            boxShadow: "4px 4px 0 rgba(90,74,58,0.08)",
            overflow: "hidden",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
        />
      </main>

      {showColorPalette && <ColorPalette />}
      {showStampSelector && <StampSelector />}
      <Toolbar />
    </div>
  );
}
