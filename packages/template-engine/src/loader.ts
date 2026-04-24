import type { Template, Region } from "./types";
import { computeBBox } from "./bbox";

export type TemplateIndexEntry = {
  id: string;
  file: string;
};

// Ensure a region always has a valid bbox.
// If the existing bbox is invalid (missing or w/h <= 0), recompute from the SVG path.
function ensureBBox(region: Region): Region {
  if (region.bbox && region.bbox.w > 0 && region.bbox.h > 0) return region;
  return { ...region, bbox: computeBBox(region.path) };
}

/**
 * Load template index from a JSON file.
 * Returns an array of template entries, or an empty array on failure.
 */
export async function loadTemplateIndex(
  indexPath: string,
): Promise<TemplateIndexEntry[]> {
  try {
    const res = await fetch(indexPath);
    if (!res.ok) return [];
    const data = await res.json();
    return data.templates ?? [];
  } catch {
    console.error(
      "[template-engine] Failed to load template index:",
      indexPath,
    );
    return [];
  }
}

/**
 * Load a single template by file path.
 * Ensures all regions have valid bounding boxes.
 * Returns null on failure.
 */
export async function loadTemplate(filePath: string): Promise<Template | null> {
  try {
    const res = await fetch(filePath);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ...data,
      regions: (data.regions ?? []).map(ensureBBox),
      thumbnail: data.thumbnail ?? "",
    } as Template;
  } catch {
    console.error("[template-engine] Failed to load template:", filePath);
    return null;
  }
}
