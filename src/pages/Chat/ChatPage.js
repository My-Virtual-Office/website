import "./ChatPage.css";

import WorkspaceSidebar from "./Components/WorkspaceSidebar/WorkspaceSidebar";
import Sidebar from "./Components/Sidebar/Sidebar";
import ChatArea from "./Components/ChatArea/ChatArea";
import { useState, useEffect } from "react";
import { Client } from "@stomp/stompjs";
import MembersList from "./Components/MembersList/MembersList";
import ResizeHandle from "../../components/ResizeHandle";
import { authHeaders } from "../../utils/auth";
import { resolveWorkspace } from "../../api/workspace";

/** useState that persists to localStorage under `key`. */
function usePersistentState(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s !== null ? JSON.parse(s) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      /* ignore */
    }
  }, [key, val]);
  return [val, setVal];
}

export default function ChatPage() {
  const [activeChannel, setActiveChannel] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  // The user's active workspace id (membership lives here; required for channels).
  const [workspaceId, setWorkspaceId] = useState(null);

  // Resolve (or auto-create) the user's workspace so channel operations authorize.
  useEffect(() => {
    let cancelled = false;
    resolveWorkspace()
      .then((ws) => {
        if (!cancelled && ws?.id != null) setWorkspaceId(ws.id);
      })
      .catch((err) => console.error("Failed to resolve workspace:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Collapsible + resizable side panels (persisted).
  const [sidebarOpen, setSidebarOpen] = usePersistentState("vo-sidebar-open", true);
  const [membersOpen, setMembersOpen] = usePersistentState("vo-members-open", true);
  const [sidebarWidth, setSidebarWidth] = usePersistentState("vo-sidebar-w", 260);
  const [membersWidth, setMembersWidth] = usePersistentState("vo-members-w", 240);

  useEffect(() => {
    let client; // 1. Local variable holds the reference

    const connectWebSocket = async () => {
      try {
        const ticketRes = await fetch("/api/chat/ws-ticket", {
          method: "POST",
          headers: authHeaders(),
        });
        if (!ticketRes.ok) {
          const errorText = await ticketRes.text();
          console.error("Failed to fetch websocket ticket. Server returned:", errorText);
          return;
        }
        const data = await ticketRes.json();
        const ticket = data.ticket;
        console.log("Fetched ticket:", ticket);
        if (!ticket) {
          console.error("Failed to fetch websocket ticket.");
          return;
        }

        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.host;
        client = new Client({
          brokerURL: `${wsProtocol}//${wsHost}/api/chat/connect?ticket=${ticket}`,
          onConnect: () => {
            console.log("Connected to STOMP!");
            setStompClient(client);

            client.subscribe('/user/queue/errors', (msg) => {
              console.error("STOMP Error:", JSON.parse(msg.body));
            });
          },
          onStompError: (frame) => {
            console.error("Broker reported error: " + frame.headers['message']);
            console.error("Additional details: " + frame.body);
          },
        });
        client.activate();
      } catch (err) {
        console.error("Failed to connect to websocket", err);
      }
    };

    connectWebSocket();

    // 2. Cleanup function looks at the local block scope variable 'client'
    return () => {
      if (client) client.deactivate();
    };
  }, []); // 3. The array safely stays empty!

  return (
    <div className="chatPage">
      <WorkspaceSidebar />

      {sidebarOpen && (
        <>
          <div className="side-panel" style={{ width: sidebarWidth }}>
            <Sidebar
              activeChannel={activeChannel}
              setActiveChannel={setActiveChannel}
              workspaceId={workspaceId}
            />
          </div>
          <ResizeHandle
            width={sidebarWidth}
            setWidth={setSidebarWidth}
            min={200}
            max={420}
            direction={1}
          />
        </>
      )}

      <ChatArea
        activeChannel={activeChannel}
        stompClient={stompClient}
        sidebarOpen={sidebarOpen}
        membersOpen={membersOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onToggleMembers={() => setMembersOpen((o) => !o)}
      />

      {membersOpen && (
        <>
          <ResizeHandle
            width={membersWidth}
            setWidth={setMembersWidth}
            min={180}
            max={400}
            direction={-1}
          />
          <div className="side-panel" style={{ width: membersWidth }}>
            <MembersList />
          </div>
        </>
      )}
    </div>
  );
}
