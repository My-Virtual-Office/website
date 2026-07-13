import "./WorkspaceSidebar.css";
import { Hexagon, Plus, Palette, Check } from "lucide-react";
import { useState } from "react";
import { Popover } from "@mui/material";
import { useTheme } from "../../../../theme/ThemeContext";

export default function WorkspaceSidebar() {
  const { theme, setTheme, themes } = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const workspaces = [
    { id: 1, name: "ws1", img: "/ws.jpg" },
    { id: 2, name: "ws2", img: "/ws.jpg" },
  ];

  return (
    <div className="rail">
      <div className="rail-top">
        <button className="rail-workspace" title="Virtual Office">
          <Hexagon size={26} strokeWidth={2.2} />
        </button>
        <div className="rail-divider" />
        {workspaces.map((ws) => (
          <img src={ws.img} key={ws.id} alt={ws.name} className="rail-img" />
        ))}
        <button className="rail-add" title="Add a workspace">
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
      </Popover>
    </div>
  );
}
