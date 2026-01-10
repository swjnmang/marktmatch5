export type ThemeName = "light" | "dark" | "nature";

export interface Theme {
  name: ThemeName;
  label: string;
  bg: string;
  bgGradient: string;
  text: string;
  subtext: string;
  card: string;
  cardBorder: string;
  accent: string;
  accentLight: string;
}

export const themes: Record<ThemeName, Theme> = {
  light: {
    name: "light",
    label: "Hell (Standard)",
    bg: "bg-white",
    bgGradient: "bg-gradient-to-br from-sky-50 via-white to-blue-50",
    text: "text-slate-900",
    subtext: "text-slate-600",
    card: "bg-white",
    cardBorder: "ring-slate-200",
    accent: "text-sky-900",
    accentLight: "bg-sky-50",
  },
  dark: {
    name: "dark",
    label: "Dunkel",
    bg: "bg-slate-950",
    bgGradient: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
    text: "text-white",
    subtext: "text-slate-300",
    card: "bg-slate-900",
    cardBorder: "ring-slate-700",
    accent: "text-emerald-400",
    accentLight: "bg-emerald-950",
  },
  nature: {
    name: "nature",
    label: "Natur",
    bg: "bg-green-50",
    bgGradient: "bg-gradient-to-br from-green-50 via-white to-emerald-50",
    text: "text-green-900",
    subtext: "text-green-700",
    card: "bg-white",
    cardBorder: "ring-green-200",
    accent: "text-green-800",
    accentLight: "bg-green-50",
  },
};

export function getTheme(themeName?: string): Theme {
  const name = (themeName as ThemeName) || "light";
  return themes[name] || themes.light;
}
