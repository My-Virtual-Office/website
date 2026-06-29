import "./ChatPage.css";

import WorkspaceSidebar from "./Components/WorkspaceSidebar/WorkspaceSidebar";
import Sidebar from "./Components/Sidebar/Sidebar";
import ChatArea from "./Components/ChatArea/ChatArea";
import ThreadArea from "./Components/ChatArea/Threads/ThreadArea";
import { useState, useEffect } from "react";
import { Client } from "@stomp/stompjs";
import MembersList from "./Components/MembersList/MembersList";
import { getCurrentUserId } from "../../utils/auth";
import { getCurrentUser, getAllUsers } from "../../api/user";
import { useNavigate } from "react-router-dom";

export default function ChatPage() {
  const navigate = useNavigate();
  const [activeChannel, setActiveChannel] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  // Controls the channels drawer on mobile (below the `md` breakpoint).
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [usersMap, setUsersMap] = useState({
    1: "Ahmed Aly",
    2: "Roqaia Ebrahim",
    3: "Sara Mostafa",
    4: "Co-founder Admin",
    5: "Youssef Mohamed",
    6: "Nour Hassan",
    7: "Mariam Ali",
  });

  useEffect(() => {
    const initUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const user = await getCurrentUser();
        if (user && user.id) {
          localStorage.setItem("userId", String(user.id));
          setUsersMap((prev) => ({
            ...prev,
            [user.id]: `${user.firstName} ${user.lastName}`,
          }));
        }

        // Populate the shared user map with the real workspace users so that
        // member names (and message authors) reflect actual profiles and stay
        // in sync with backend changes instead of the static mock seed.
        try {
          const allUsers = await getAllUsers();
          if (Array.isArray(allUsers)) {
            setUsersMap((prev) => {
              const next = { ...prev };
              allUsers.forEach((u) => {
                if (u && u.id != null) {
                  next[u.id] = `${u.firstName} ${u.lastName}`.trim();
                }
              });
              return next;
            });
          }
        } catch (usersErr) {
          console.error("Failed to fetch workspace users:", usersErr);
        }
      } catch (err) {
        console.error("Failed to fetch current user profile:", err);
        navigate("/login", { replace: true });
      } finally {
        setLoadingUser(false);
      }
    };
    initUser();
  }, [navigate]);

  useEffect(() => {
    if (loadingUser) return;

    let client;
    let isCancelled = false;

    const connectWebSocket = async () => {
      try {
        if (!localStorage.getItem("token")) {
          navigate("/login", { replace: true });
          return;
        }

        const ticketRes = await fetch("/api/chat/ws-ticket", {
          method: "POST",
          headers: {
            "X-User-Id": String(getCurrentUserId()),
            "X-User-Role": "USER",
          },
        });

        if (!ticketRes.ok) {
          const errorText = await ticketRes.text();
          console.error(
            "Failed to fetch websocket ticket. Server returned:",
            errorText,
          );
          if (ticketRes.status === 401 || ticketRes.status === 400) {
            localStorage.removeItem("token");
            localStorage.removeItem("userId");
            navigate("/login", { replace: true });
          }
          return;
        }

        const data = await ticketRes.json();
        const ticket = data.ticket;
        console.log("Fetched ticket:", ticket);
        if (!ticket) {
          console.error("Failed to fetch websocket ticket.");
          return;
        }

        const wsProtocol =
          window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.host;
        client = new Client({
          brokerURL: `${wsProtocol}//${wsHost}/api/chat/connect?ticket=${ticket}`,
          onConnect: () => {
            console.log("Connected to STOMP!");
            setStompClient(client);

            client.subscribe("/user/queue/errors", (msg) => {
              console.error("STOMP Error:", JSON.parse(msg.body));
            });
          },
          onStompError: (frame) => {
            console.error("Broker reported error: " + frame.headers["message"]);
            console.error("Additional details: " + frame.body);
          },
        });

        // The effect may have been cleaned up while we were awaiting the
        // ticket fetch. If so, don't activate an orphaned client that would
        // reconnect forever.
        if (isCancelled) return;

        client.activate();
      } catch (err) {
        console.error("Failed to connect to websocket", err);
      }
    };

    connectWebSocket();

    return () => {
      isCancelled = true;
      if (client) client.deactivate();
    };
  }, [loadingUser, navigate]);

  useEffect(() => {
    console.log("activeThread state just changed to:", activeThread);
  }, [activeThread]);
  const handleOpenThread = async (clickedMessage) => {
    // Scenario A: If message has a thread ID, look up its metadata immediately
    if (clickedMessage.threadId) {
      try {
        const res = await fetch(
          `/api/chat/threads/${clickedMessage.threadId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": String(getCurrentUserId()),
              "X-User-Role": "USER",
            },
          },
        );
        if (res.ok) {
          const threadData = await res.json();
          setActiveThread(threadData);
          setIsThreadOpen(true);
          return; // Exit out safely
        }
      } catch (err) {
        console.error("Error fetching existing thread metadata:", err);
        return;
      }
    } else {
      try {
        const res = await fetch(
          `/api/chat/channels/${clickedMessage.channelId}/threads`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": String(getCurrentUserId()),
              "X-User-Role": "USER",
            },
            body: JSON.stringify({
              rootMessageId: clickedMessage.id,
              name: `Thread Discussion`,
            }),
          },
        );

        if (res.status === 201) {
          const threadData = await res.json();
          setActiveThread(threadData);
          setIsThreadOpen(true);
        }
        else if(res.status === 409) { // thread already exists
          const listRes = await fetch (`/api/chat/channels/${clickedMessage.channelId}/threads?page=1&limit=50`, {
            method: "GET",
            headers : {
              "Content-Type" : "application/json",
              "X-User-Id" : String(getCurrentUserId()),
              "X-User-Role" : "USER",
            },
          });
          if(listRes.ok){
            const data = await listRes.json();
            const threadList = data.content || data;
            const existingThread = threadList.find(t => t.rootMessageId === clickedMessage.id);
            if(existingThread){
              setActiveThread(existingThread)
              setIsThreadOpen(true)
            }
            else {
              console.error("Conflict reported, but could not locate matching rootMessageId in thread logs.");
            }
          }
        }
        else {
          console.warn(
            "Failed to initialize thread container endpoint context",
          );
        }
      } catch (err) {
        console.error(
          "Error creating/initializing thread database tracking object:",
          err,
        );
      }
    }
    
  };

  if (loadingUser) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
          fontSize: "16px",
          color: "#64748b",
        }}
      >
        Loading chat workspace...
      </div>
    );
  }

  
  return (
    <div className="chatPage relative flex w-screen h-screen overflow-hidden">
      {/* Workspace icon rail — tablet and up */}
      <div className="hidden md:flex shrink-0">
        <WorkspaceSidebar />
      </div>

     
      {/* Backdrop for the mobile channels drawer */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Channels sidebar — slide-in drawer on mobile, static column on md+ */}
      <div
        className={`fixed top-0 left-0 z-40 h-full shrink-0 transform transition-transform duration-300 ease-in-out md:static md:z-auto md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          activeChannel={activeChannel}
          setActiveChannel={(channel) => {
            setActiveChannel(channel);
            // Auto-dismiss the drawer once a channel is picked on mobile.
            setIsSidebarOpen(false);
          }}
        />
      </div>

      {/* Main chat space — always absorbs the remaining width */}
      <ChatArea
        activeChannel={activeChannel}
        stompClient={stompClient}
        onOpenThread={handleOpenThread}
        activeThread={activeThread}
        usersMap={usersMap}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />

      
      {/* Thread panel — full-screen overlay on mobile/tablet, docked column on lg+ */}
      {isThreadOpen && activeThread && (
        <div className="fixed inset-0 z-50 w-full shrink-0 lg:static lg:inset-auto lg:z-auto lg:w-[400px]">
          <ThreadArea
            activeChannel={activeChannel}
            activeThread={activeThread}
            stompClient={stompClient}
            onClose={() => {
              setIsThreadOpen(false);
              setActiveThread(null);
            }}
            usersMap={usersMap}
          />
        </div>
      )}

      {/* Members list — ultra-wide screens only */}
      <div className="hidden xl:flex shrink-0">
        <MembersList />
      </div>
    </div>
  );
}
