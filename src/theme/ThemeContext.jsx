import { createContext, useContext, useEffect, useState, useCallback } from "react";

/** The five themes we ship (id must match a block in themes.css). The first is the default. */
export const THEMES = [
  {
    id: "daylight",
    label: "Daylight",
    hint: "Our default — bright & amber",
    swatch: { rail: "#e7e9eb", sidebar: "#f4f5f7", content: "#ffffff" },
  },
  {
    id: "virtual-office",
    label: "Virtual Office",
    hint: "Charcoal & amber",
    swatch: { rail: "#0c0c0e", sidebar: "#141518", content: "#ffffff" },
  },
  {
    id: "aubergine",
    label: "Aubergine",
    hint: "Classic Slack",
    swatch: { rail: "#3a083c", sidebar: "#3f0e40", content: "#ffffff" },
  },
  {
    id: "nord",
    label: "Nord",
    hint: "Arctic blue-grey",
    swatch: { rail: "#272c36", sidebar: "#2e3440", content: "#2e3440" },
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    hint: "Warm retro",
    swatch: { rail: "#1d2021", sidebar: "#282828", content: "#282828" },
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
