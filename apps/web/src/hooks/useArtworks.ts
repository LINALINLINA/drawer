import { useState, useEffect, useCallback } from "react";
import type { Artwork } from "../stores/types";

function readArtworksFromStorage(): Artwork[] {
  try {
    const raw = localStorage.getItem("drawer_artworks");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useArtworks() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);

  const reload = useCallback(() => {
    setArtworks(readArtworksFromStorage());
  }, []);

  useEffect(() => {
    reload();
    const handler = () => reload();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [reload]);

  const remove = useCallback((id: string) => {
    const updated = readArtworksFromStorage().filter((a) => a.id !== id);
    localStorage.setItem("drawer_artworks", JSON.stringify(updated));
    setArtworks(updated);
  }, []);

  return { artworks, remove, reload };
}
