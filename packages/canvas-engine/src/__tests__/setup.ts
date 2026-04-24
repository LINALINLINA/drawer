/**
 * Vitest setup: polyfills for happy-dom test environment.
 *
 * - Path2D: happy-dom doesn't provide it -> use @napi-rs/canvas Path2D
 * - OffscreenCanvas: happy-dom doesn't provide it -> polyfill backed by @napi-rs/canvas
 * - HTMLCanvasElement.prototype.getContext('2d'): happy-dom returns null ->
 *   return a real @napi-rs/canvas context so CanvasEngine doesn't crash on construction
 */
import { createCanvas, Path2D as NapiPath2D } from "@napi-rs/canvas";

// Inject Path2D into global scope
if (typeof globalThis.Path2D === "undefined") {
  (globalThis as Record<string, unknown>).Path2D = NapiPath2D;
}

// Polyfill OffscreenCanvas: returns a real napi-rs canvas wrapped in a proxy
// that adds convertToBlob. The underlying napi canvas ensures drawImage compatibility.
if (typeof globalThis.OffscreenCanvas === "undefined") {
  (globalThis as Record<string, unknown>).OffscreenCanvas =
    class PolyfillOffscreenCanvas {
      private _native: ReturnType<typeof createCanvas>;

      constructor(width: number, height: number) {
        this._native = createCanvas(width, height);
      }

      get width() {
        return this._native.width;
      }
      set width(val: number) {
        this._native.width = val;
      }
      get height() {
        return this._native.height;
      }
      set height(val: number) {
        this._native.height = val;
      }

      getContext(contextId: "2d") {
        return this._native.getContext(contextId);
      }

      convertToBlob(_opts?: { type: string }): Promise<Blob> {
        return Promise.resolve(new Blob([], { type: "image/png" }));
      }
    };
}

// Mock HTMLCanvasElement.prototype.getContext so CanvasEngine can call it
// without getting null from happy-dom. Returns a real @napi-rs/canvas context.
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
  ...args: unknown[]
) {
  if (contextId === "2d") {
    const width = (this as HTMLCanvasElement).width || 300;
    const height = (this as HTMLCanvasElement).height || 150;
    return createCanvas(width, height).getContext("2d", ...args);
  }
  return originalGetContext.call(this, contextId, ...args);
};
