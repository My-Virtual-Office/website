import "./WorkspaceSidebar.css";
import PolylineIcon from "@mui/icons-material/Polyline";
import AddIcon from "@mui/icons-material/Add";
export default function WorkspaceSidebar() {
  const workspaces = [
    { id: 1, name: "ws1", img: "/ws.jpg" },
    { id: 2, name: "ws2", img: "/ws.jpg" },
  ];
  return (
    <div className="container">
      <div className="workspace">
        <div className="workspace-items">
          <i>
            <PolylineIcon />
          </i>
          <hr></hr>
          {workspaces.map((ws) => {
            return (
              <img
                src={ws.img}
                key={ws.id}
                alt={ws.name}
                className="workspace-img"
              ></img>
            );
          })}
        </div>

        <button>
          <AddIcon></AddIcon>
        </button>
      </div>
    </div>
  );
}
