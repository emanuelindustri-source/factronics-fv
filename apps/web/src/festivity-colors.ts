// F&V (by Factronics) — paletas de festividades (PWA).
// Deben coincidir con packages/shared-fixtures/theme/palettes.json y con Android.
import type { FestivityId } from "./festivities";

export interface FestivityColors {
  accent: string;
  onAccent: string;
  accentSoft: string;
  onAccentSoft: string;
}

export type ThemeVariant = "light" | "dark";

export const FESTIVITY_COLORS: Record<
  Exclude<FestivityId, "none">,
  Record<ThemeVariant, FestivityColors>
> = {
  christmas: {
    light: { accent: "#B3261E", onAccent: "#FFFFFF", accentSoft: "#FFDAD6", onAccentSoft: "#410002" },
    dark: { accent: "#FFB4AB", onAccent: "#0B2237", accentSoft: "#5C1A17", onAccentSoft: "#FFDAD6" }
  },
  epiphany: {
    light: { accent: "#8A5A00", onAccent: "#FFFFFF", accentSoft: "#FFE8B3", onAccentSoft: "#3D2A00" },
    dark: { accent: "#FFD166", onAccent: "#0B2237", accentSoft: "#5A4300", onAccentSoft: "#FFE8B3" }
  },
  valentine: {
    light: { accent: "#AD1457", onAccent: "#FFFFFF", accentSoft: "#FFD9E2", onAccentSoft: "#3E001D" },
    dark: { accent: "#FFB1C8", onAccent: "#0B2237", accentSoft: "#6B0030", onAccentSoft: "#FFD9E2" }
  },
  carnival: {
    light: { accent: "#6A1B9A", onAccent: "#FFFFFF", accentSoft: "#F3D9FF", onAccentSoft: "#2A0A3D" },
    dark: { accent: "#E7B9FF", onAccent: "#0B2237", accentSoft: "#4A1A6B", onAccentSoft: "#F3D9FF" }
  },
  mothersDay: {
    light: { accent: "#A3115C", onAccent: "#FFFFFF", accentSoft: "#FFD9E2", onAccentSoft: "#3E001D" },
    dark: { accent: "#FFB1C8", onAccent: "#0B2237", accentSoft: "#6B0030", onAccentSoft: "#FFD9E2" }
  },
  fathersDay: {
    light: { accent: "#0D47A1", onAccent: "#FFFFFF", accentSoft: "#D6E3FF", onAccentSoft: "#001B3F" },
    dark: { accent: "#A8C7FA", onAccent: "#0B2237", accentSoft: "#00306B", onAccentSoft: "#D6E3FF" }
  },
  childrensDay: {
    light: { accent: "#B54708", onAccent: "#FFFFFF", accentSoft: "#FFDCC2", onAccentSoft: "#3A1A00" },
    dark: { accent: "#FFB77A", onAccent: "#0B2237", accentSoft: "#6B2A00", onAccentSoft: "#FFDCC2" }
  },
  halloween: {
    light: { accent: "#B45309", onAccent: "#FFFFFF", accentSoft: "#FFDDB8", onAccentSoft: "#3A1A00" },
    dark: { accent: "#FFB86B", onAccent: "#0B2237", accentSoft: "#6B3300", onAccentSoft: "#FFDDB8" }
  },
  independence: {
    light: { accent: "#F2C200", onAccent: "#0B2237", accentSoft: "#FFF1B8", onAccentSoft: "#3A2F00" },
    dark: { accent: "#F2C200", onAccent: "#0B2237", accentSoft: "#5A4A00", onAccentSoft: "#FFF1B8" }
  }
};

export function isFestivityWithColors(
  id: FestivityId
): id is Exclude<FestivityId, "none"> {
  return id !== "none" && id in FESTIVITY_COLORS;
}

export function festivityColors(id: FestivityId, variant: ThemeVariant): FestivityColors | null {
  return isFestivityWithColors(id) ? FESTIVITY_COLORS[id][variant] : null;
}

export function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
