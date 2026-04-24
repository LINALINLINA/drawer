import type { Palette } from "./types";

const PRESET_PALETTES: Palette[] = [
  {
    id: "sunset",
    name: "日落",
    colors: ["#FF6B6B", "#FFA07A", "#FFD700", "#FF8C00", "#C0392B"],
  },
  {
    id: "ocean",
    name: "海洋",
    colors: ["#0077B6", "#00B4D8", "#90E0EF", "#CAF0F8", "#023E8A"],
  },
  {
    id: "forest",
    name: "森林",
    colors: ["#2D6A4F", "#40916C", "#52B788", "#74C69D", "#B7E4C7"],
  },
  {
    id: "candy",
    name: "糖果",
    colors: ["#FF69B4", "#FFB6C1", "#DDA0DD", "#87CEEB", "#FFDAB9"],
  },
  {
    id: "earth",
    name: "大地",
    colors: ["#8B4513", "#D2691E", "#DEB887", "#F5DEB3", "#A0522D"],
  },
  {
    id: "pastel",
    name: "马卡龙",
    colors: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#E8BAFF"],
  },
];

export function getPalettes(): Palette[] {
  return PRESET_PALETTES;
}

export function getPaletteById(id: string): Palette | null {
  return PRESET_PALETTES.find((p) => p.id === id) ?? null;
}
