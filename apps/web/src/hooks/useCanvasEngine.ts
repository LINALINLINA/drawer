import { useRef, useCallback } from "react";
import { CanvasEngine } from "@drawer/canvas-engine";
import { useEditorStore } from "../stores/editor-store";

const templatesBase = `${import.meta.env.BASE_URL}templates`;

export function useCanvasEngine(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const engineRef = useRef<CanvasEngine | null>(null);
  const templateIdRef = useRef<string | null>(null);

  const destroyEngine = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    templateIdRef.current = null;
  }, []);

  const init = useCallback(
    (width: number, height: number) => {
      if (!containerRef.current) return;
      destroyEngine();
      engineRef.current = new CanvasEngine(containerRef.current, width, height);
    },
    [containerRef, destroyEngine],
  );

  const render = useCallback(() => {
    const engine = engineRef.current;
    const { canvasState, template } = useEditorStore.getState();
    if (!engine || !template) return;

    if (templateIdRef.current !== template.id) {
      // outlineImage 是相对路径，加 /templates/ 前缀变成可访问的 URL
      const outlineUrl = template.outlineImage
        ? `${templatesBase}/${template.outlineImage}`
        : undefined;
      engine.setTemplate(template.regions, outlineUrl);
      templateIdRef.current = template.id;
    }

    engine.render(canvasState);
  }, []);

  const hitTest = useCallback((clientX: number, clientY: number) => {
    const engine = engineRef.current;
    if (!engine) return null;
    const canvas = engine.getDrawCanvas();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return engine.hitTest(x, y);
  }, []);

  const exportPNG = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return null;
    return engine.exportPNG(2);
  }, []);

  const renderLiveStroke = useCallback(
    (
      points: { x: number; y: number }[],
      color: string,
      width: number,
      style: "solid" | "dashed" = "solid",
    ) => {
      engineRef.current?.renderLiveStroke(points, color, width, style);
    },
    [],
  );

  const clearDrawLayer = useCallback(() => {
    engineRef.current?.clearDrawLayer();
  }, []);

  const redrawDrawLayer = useCallback(() => {
    engineRef.current?.redrawDrawLayer();
  }, []);

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = engineRef.current?.getDrawCanvas();
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  return {
    init,
    render,
    hitTest,
    exportPNG,
    destroyEngine,
    renderLiveStroke,
    clearDrawLayer,
    redrawDrawLayer,
    getCanvasCoords,
  };
}
