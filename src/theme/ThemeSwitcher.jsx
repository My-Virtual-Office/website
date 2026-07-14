import { Box, Typography } from "@mui/material";
import { Check } from "lucide-react";
import { useTheme } from "./ThemeContext";

/** Theme picker with live preview swatches. Applies instantly on click. */
export default function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        Theme
      </Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        Choose how Virtual Office looks to you. Your choice is saved and applies instantly.
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        {themes.map((t) => {
          const active = t.id === theme;
          return (
            <Box
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => setTheme(t.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setTheme(t.id)}
              sx={{
                cursor: "pointer",
                borderRadius: 2,
                overflow: "hidden",
                outline: "none",
                border: active ? "2px solid #1264a3" : "2px solid #e2e2e2",
                boxShadow: active ? "0 0 0 3px rgba(18,100,163,0.15)" : "none",
                transition: "border-color .15s, box-shadow .15s",
                "&:hover": { borderColor: "#1264a3" },
              }}
            >
              {/* Mini app preview */}
              <Box sx={{ display: "flex", height: 74 }}>
                <Box sx={{ width: 14, bgcolor: t.swatch.rail }} />
                <Box sx={{ width: 44, bgcolor: t.swatch.sidebar }} />
                <Box
                  sx={{
                    flex: 1,
                    bgcolor: t.swatch.content,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.7,
                    p: 1.2,
                  }}
                >
                  <Box sx={{ height: 6, width: "72%", bgcolor: "rgba(128,128,128,.35)", borderRadius: 1 }} />
                  <Box sx={{ height: 6, width: "52%", bgcolor: "rgba(128,128,128,.25)", borderRadius: 1 }} />
                  <Box sx={{ height: 6, width: "62%", bgcolor: "rgba(128,128,128,.22)", borderRadius: 1 }} />
                </Box>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.5,
                  py: 1.2,
                  borderTop: "1px solid #eee",
                  bgcolor: "#fff",
                }}
              >
                <Box>
                  <Typography fontWeight={700} fontSize={14} color="#1d1c1d">
                    {t.label}
                  </Typography>
                  <Typography fontSize={12} color="#616061">
                    {t.hint}
                  </Typography>
                </Box>
                {active && <Check size={18} color="#1264a3" strokeWidth={3} />}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
