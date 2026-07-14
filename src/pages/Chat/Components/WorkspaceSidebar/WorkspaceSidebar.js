import "./WorkspaceSidebar.css";
import { Plus, Palette, Check } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Popover } from "@mui/material";
import { useTheme } from "../../../../theme/ThemeContext";

export default function WorkspaceSidebar({ workspaces = [], activeId, onSwitch }) {
  const { theme, setTheme, themes } = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  return (
    <div className="rail">
      <div className="rail-top">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            className={`rail-ws ${ws.id === activeId ? "active" : ""}`}
            onClick={() => onSwitch?.(ws)}
            title={ws.name}
          >
            {ws.logoUrl ? (
              <img src={ws.logoUrl} alt={ws.name} />
            ) : (
              <span>{(ws.name || "?").charAt(0).toUpperCase()}</span>
            )}
          </button>
        ))}
        <button
          className="rail-add"
          title="Add or join a workspace"
          onClick={() => navigate("/onboarding")}
        >
          <Plus size={22} />
        </button>
      </div>

      <button
        className={`rail-theme ${open ? "active" : ""}`}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        title="Themes"
      >
        <Palette size={20} />
      </button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              ml: 1.2,
              p: 0.75,
              width: 232,
              borderRadius: 2,
              bgcolor: "var(--panel-bg)",
              border: "1px solid var(--border)",
              boxShadow: "var(--overlay-shadow)",
            },
          },
        }}
      >
        <div className="theme-menu-title">Theme</div>
        <div className="theme-menu-list">
          {themes.map((t) => (
            <button
              key={t.id}
              className={`theme-menu-item ${t.id === theme ? "active" : ""}`}
              onClick={() => {
                setTheme(t.id);
                setAnchorEl(null);
              }}
            >
              <span className="theme-swatch">
                <span style={{ background: t.swatch.rail }} />
                <span style={{ background: t.swatch.sidebar }} />
                <span style={{ background: t.swatch.content }} />
              </span>
              <span className="theme-menu-labels">
                <span className="theme-menu-label">{t.label}</span>
                <span className="theme-menu-hint">{t.hint}</span>
              </span>
              {t.id === theme && <Check size={16} color="#1264a3" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}
