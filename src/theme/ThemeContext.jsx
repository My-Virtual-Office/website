import { createContext, useContext, useEffect, useState, useCallback } from "react";

/** The seven themes we ship (id must match a block in themes.css). The first is the default. */
export const THEMES = [
  {
    id: "daylight",
    label: "Daylight",
    hint: "Our default — bright & amber",
    swatch: { rail: "#3c2108", sidebar: "#f4f5f7", content: "#ffffff" },
  },
  {
    id: "meadow",
    label: "Meadow",
    hint: "Bright & green",
    swatch: { rail: "#083c1e", sidebar: "#eff6f1", content: "#ffffff" },
  },
  {
    id: "harbor",
    label: "Harbor",
    hint: "Bright & blue",
    swatch: { rail: "#08203c", sidebar: "#eff3f9", content: "#ffffff" },
  },
  {
    id: "lilac",
    label: "Lilac",
    hint: "Bright & violet",
    swatch: { rail: "#17083c", sidebar: "#f3f0f9", content: "#ffffff" },
  },
  {
    id: "blossom",
    label: "Blossom",
    hint: "Bright & rose",
    swatch: { rail: "#3c081b", sidebar: "#f9f0f4", content: "#ffffff" },
  },
  {
    id: "midnight",
    label: "Midnight",
    hint: "Dark & amber",
    swatch: { rail: "#1b0f04", sidebar: "#2a2622", content: "#2d2a28" },
  },
  {
    id: "obsidian",
    label: "Obsidian",
    hint: "Dark & violet",
    swatch: { rail: "#0b041b", sidebar: "#25222a", content: "#29282d" },
  },
];

const STORAGE_KEY = "vo-theme";
// Ours, and bright. Anyone with a stored theme keeps it; only new/unset users land here.
const DEFAULT_THEME = "daylight";

const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((id) => {
    if (!THEMES.some((t) => t.id === id)) return;
    setThemeState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
