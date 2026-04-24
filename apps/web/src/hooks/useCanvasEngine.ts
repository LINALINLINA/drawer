import { useRef, useEffect, useCallback } from "react";
import { CanvasEngine } from "@drawer/canvas-engine";
import { useEditorStore } from "../stores/editor-store";

export function useCanvasEngine(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const engineRef = useRef<CanvasEngine | null>(null);

  const init = useCallback(
    (width: number, height: number) => {
      if (!containerRef.current) return;
      if (engineRef.current) engineRef.current.destroy();
      engineRef.current = new CanvasEngine(containerRef.current, width, height);
    },
    [containerRef],
  );

  const render = useCallback(() => {
    const engine = engineRef.current;
    const { canvasState, template } = useEditorStore.getState();
    if (!engine || !template) return;

    engine.setTemplate(template.regions);
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

  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  return { init, render, hitTest, exportPNG, engineRef };
}
