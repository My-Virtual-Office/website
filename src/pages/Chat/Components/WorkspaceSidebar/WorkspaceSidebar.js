import "./WorkspaceSidebar.css";
import PolylineIcon from "@mui/icons-material/Polyline";
import AddIcon from "@mui/icons-material/Add";
import { useState, useEffect } from "react";
import { fetchMyWorkspaces, createWorkspace } from "../../../../api/workspace";
import CreateWorkspaceModal from "./CreateWorkspaceModal";

export default function WorkspaceSidebar({ activeWorkspace, setActiveWorkspace }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        let data = await fetchMyWorkspaces();
        if (data.length === 0) {
          const newWs = await createWorkspace({ name: "Virtual Office", slug: "virtual-office", defaultTimezone: "Africa/Cairo" });
          data = [newWs];
          setWorkspaces(data);
        } else {
          setWorkspaces(data);
        }
        if (data.length > 0 && !activeWorkspace) {
          setActiveWorkspace(data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch workspaces:", err);
      }
    };
    loadWorkspaces();
  }, []);

  const handleRefresh = async () => {
    try {
      const data = await fetchMyWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      console.error("Failed to refresh workspaces:", err);
    }
  };

  return (
    <div className="container">
      <div className="workspace">
        <div className="workspace-items">
          <i>
            <PolylineIcon />
          </i>
          <hr />
          {workspaces.map((ws) => (
            <img
              src={ws.img || "/ws.jpg"}
              key={ws.id}
              alt={ws.name}
              className={`workspace-img ${activeWorkspace?.id === ws.id ? "active" : ""}`}
              onClick={() => setActiveWorkspace(ws)}
            />
          ))}
        </div>

        <button onClick={() => setIsModalOpen(true)}>
          <AddIcon />
        </button>
      </div>

      {isModalOpen && (
        <CreateWorkspaceModal
          onClose={() => setIsModalOpen(false)}
          onCreated={(newWs) => {
            setWorkspaces((prev) => [...prev, newWs]);
            setActiveWorkspace(newWs);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
