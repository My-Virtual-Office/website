import "./WorkspaceSidebar.css";
import { Hexagon, Plus, Palette } from "lucide-react";
import { useTheme } from "../../../../theme/ThemeContext";

export default function WorkspaceSidebar() {
  const { theme, setTheme, themes } = useTheme();
  const workspaces = [
    { id: 1, name: "ws1", img: "/ws.jpg" },
    { id: 2, name: "ws2", img: "/ws.jpg" },
  ];

  const cycleTheme = () => {
    const idx = themes.findIndex((t) => t.id === theme);
    setTheme(themes[(idx + 1) % themes.length].id);
  };

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
        className="rail-theme"
        onClick={cycleTheme}
        title={`Theme: ${theme} — click to switch`}
      >
        <Palette size={20} />
      </button>
    </div>
  );
}
