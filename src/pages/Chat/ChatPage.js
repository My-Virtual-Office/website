import "./ChatPage.css";

import WorkspaceSidebar from "./Components/WorkspaceSidebar/WorkspaceSidebar";
import Sidebar from "./Components/Sidebar/Sidebar";
import ChatArea from "./Components/ChatArea/ChatArea";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import MembersList from "./Components/MembersList/MembersList";
import ContactsDirectory from "./Components/ContactsDirectory/ContactsDirectory";
import ResizeHandle from "../../components/ResizeHandle";
import { authHeaders } from "../../utils/auth";
import { getMyWorkspaces } from "../../api/workspace";

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
  const [view, setView] = useState("chat"); // "chat" | "contacts"

  // Selecting a channel returns to the chat view.
  const selectChannel = (ch) => {
    setActiveChannel(ch);
    setView("chat");
  };
  // The user's active workspace id (membership lives here; required for channels).
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const workName = searchParams.get("work_name");

  // Pick the workspace named in ?work_name= (else the first); no workspace -> onboarding.
  useEffect(() => {
    let cancelled = false;
    getMyWorkspaces()
      .then((list) => {
        if (cancelled) return;
        if (!Array.isArray(list) || list.length === 0) {
          navigate("/onboarding");
          return;
        }
        setWorkspaces(list);
        // Prefer ?work_name, then the last workspace the user visited, then the first.
        const lastSlug = localStorage.getItem("vo-last-workspace");
        const active =
          list.find((w) => w.slug === workName) ||
          list.find((w) => w.slug === lastSlug) ||
          list[0];
        setWorkspaceId(active.id);
        try {
          localStorage.setItem("vo-last-workspace", active.slug);
        } catch {
          /* ignore */
        }
        if (active.slug !== workName) {
          setSearchParams({ work_name: active.slug }, { replace: true });
        }
      })
      .catch((err) => console.error("Failed to load workspaces:", err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Switch to another workspace: update state + URL, reset the open channel.
  const switchWorkspace = (ws) => {
    if (!ws || ws.id === workspaceId) return;
    setWorkspaceId(ws.id);
    setActiveChannel(null);
    try {
      localStorage.setItem("vo-last-workspace", ws.slug);
    } catch {
      /* ignore */
    }
    setSearchParams({ work_name: ws.slug });
  };

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
      <WorkspaceSidebar
        workspaces={workspaces}
        activeId={workspaceId}
        onSwitch={switchWorkspace}
      />

      {sidebarOpen && (
        <>
          <div className="side-panel" style={{ width: sidebarWidth }}>
            <Sidebar
              activeChannel={activeChannel}
              setActiveChannel={selectChannel}
              workspaceId={workspaceId}
              activeView={view}
              onOpenContacts={() => setView("contacts")}
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

      {view === "contacts" ? (
        <ContactsDirectory workspaceId={workspaceId} />
      ) : (
        <>
          <ChatArea
            activeChannel={activeChannel}
            workspaceId={workspaceId}
            stompClient={stompClient}
            sidebarOpen={sidebarOpen}
            membersOpen={membersOpen}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            onToggleMembers={() => setMembersOpen((o) => !o)}
            onChannelUpdated={(ch) =>
              setActiveChannel({ id: ch.id, name: ch.name })
            }
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
                <MembersList workspaceId={workspaceId} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
