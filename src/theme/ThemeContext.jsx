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
    swatch: { rail: "#141414", sidebar: "#1b1b1b", content: "#1e1e1e" },
  },
  {
    id: "clickup",
    label: "ClickUp",
    hint: "Purple + bright",
    swatch: { rail: "#201a3a", sidebar: "#2a2350", content: "#ffffff" },
  },
  {
    id: "nord",
    label: "Nord",
    hint: "Arctic frost",
    swatch: { rail: "#272c36", sidebar: "#2e3440", content: "#2e3440" },
  },
  {
    id: "dracula",
    label: "Dracula",
    hint: "Purple & cyan",
    swatch: { rail: "#21222c", sidebar: "#282a36", content: "#282a36" },
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
    swatch: { rail: "#181825", sidebar: "#1e1e2e", content: "#1e1e2e" },
  },
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    hint: "Neon blue night",
    swatch: { rail: "#16161e", sidebar: "#1a1b26", content: "#1a1b26" },
  },
  {
    id: "one-dark",
    label: "One Dark",
    hint: "Atom classic",
    swatch: { rail: "#21252b", sidebar: "#282c34", content: "#282c34" },
  },
  {
    id: "github-dark",
    label: "GitHub Dark",
    hint: "Clean & modern",
    swatch: { rail: "#010409", sidebar: "#0d1117", content: "#0d1117" },
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
