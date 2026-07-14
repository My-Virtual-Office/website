import { createContext, useContext, useEffect, useState, useCallback } from "react";

/** Available Slack-style themes (id must match a block in themes.css). */
export const THEMES = [
  {
    id: "aubergine",
    label: "Aubergine",
    hint: "Classic Slack",
    swatch: { rail: "#3a083c", sidebar: "#3f0e40", content: "#ffffff" },
  },
  {
    id: "light",
    label: "Light",
    hint: "Clean & bright",
    swatch: { rail: "#f8f8f8", sidebar: "#f4f4f4", content: "#ffffff" },
  },
  {
    id: "dark",
    label: "Dark",
    hint: "Easy on the eyes",
    swatch: { rail: "#121016", sidebar: "#19171d", content: "#1a1d21" },
  },
  {
    id: "obsidian",
    label: "Obsidian",
    hint: "Near-black + violet",
    swatch: { rail: "#0d0d12", sidebar: "#16161e", content: "#1a1a22" },
  },
  {
    id: "clickup",
    label: "ClickUp",
    hint: "Bright & purple",
    swatch: { rail: "#f7f6fd", sidebar: "#faf9ff", content: "#ffffff" },
  },
  {
    id: "nord",
    label: "Nord",
    hint: "Arctic blue",
    swatch: { rail: "#242933", sidebar: "#2e3440", content: "#2e3440" },
  },
  {
    id: "dracula",
    label: "Dracula",
    hint: "Purple & cyan",
    swatch: { rail: "#1e1f29", sidebar: "#21222c", content: "#282a36" },
  },
  {
    id: "rose-pine",
    label: "Rosé Pine",
    hint: "Muted rose",
    swatch: { rail: "#16141f", sidebar: "#1f1d2e", content: "#191724" },
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    hint: "Warm retro",
    swatch: { rail: "#1d2021", sidebar: "#282828", content: "#282828" },
  },
  {
    id: "catppuccin",
    label: "Catppuccin",
    hint: "Soft pastel",
    swatch: { rail: "#181825", sidebar: "#181825", content: "#1e1e2e" },
  },
];

const STORAGE_KEY = "vo-theme";
const DEFAULT_THEME = "aubergine";

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
