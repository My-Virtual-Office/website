import "./ChatPage.css";

import WorkspaceSidebar from "./Components/WorkspaceSidebar/WorkspaceSidebar";
import Sidebar from "./Components/Sidebar/Sidebar";
import ChatArea from "./Components/ChatArea/ChatArea";
import ThreadArea from "./Components/ChatArea/Threads/ThreadArea";
import { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { fetchChatTicket, wsChatUrl } from "../../ws/chatStompClient";
import { fetchRoomTicket, wsRoomUrl } from "../../ws/roomStompClient";
import MembersList from "./Components/MembersList/MembersList";
import { getCurrentUserId } from "../../utils/auth";
import { getCurrentUser, getAllUsers } from "../../api/user";
import { useNavigate, useLocation } from "react-router-dom";

export default function ChatPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const joinChannelId = location.state?.joinChannelId || null;
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [roomStompClient, setRoomStompClient] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
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

  const [roomParticipants, setRoomParticipants] = useState([]);

  const stompClientRef = useRef(null);
  const roomStompClientRef = useRef(null);
  const roomSubRef = useRef(null);

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

    const connectWebSocket = async () => {
      try {
        if (!localStorage.getItem("token")) {
          navigate("/login", { replace: true });
          return;
        }

        if (stompClientRef.current) {
          const stale = stompClientRef.current;
          stompClientRef.current = null;
          stale.onWebSocketClose = () => {};
          stale.deactivate();
        }

        const ticket = await fetchChatTicket();
        console.log("Fetched ticket:", ticket);

        client = new Client({
          brokerURL: wsChatUrl(ticket),
          reconnectDelay: 5000,
          beforeConnect: async () => {
            const freshTicket = await fetchChatTicket();
            client.brokerURL = wsChatUrl(freshTicket);
          },
          onConnect: () => {
            console.log("Connected to STOMP!");
            setStompClient(client);
            stompClientRef.current = client;

            client.subscribe("/user/queue/errors", (msg) => {
              console.error("STOMP Error:", JSON.parse(msg.body));
            });
          },
          onStompError: (frame) => {
            console.error("Broker reported error: " + frame.headers["message"]);
            console.error("Additional details: " + frame.body);
          },
          onWebSocketError: (event) => {
            console.error("Chat WebSocket error:", event);
          },
          onWebSocketClose: () => {
            console.warn("WebSocket stream closed down. Clearing application state...");
            setStompClient(null);
            stompClientRef.current = null;
          },
        });

        client.activate();
      } catch (err) {
        console.error("Failed to connect to websocket", err);
        if (err.status === 401 || err.status === 400) {
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          navigate("/login", { replace: true });
        }
      }
    };

    connectWebSocket();

    return () => {
      if (client) {
        client.deactivate();
        stompClientRef.current = null;
      }
    };
  }, [loadingUser, navigate]);

  useEffect(() => {
    if (loadingUser) return;

    let roomClient;

    const connectRoomWebSocket = async () => {
      try {
        if (roomStompClientRef.current) {
          const stale = roomStompClientRef.current;
          roomStompClientRef.current = null;
          stale.onWebSocketClose = () => {};
          stale.deactivate();
        }

        const ticket = await fetchRoomTicket();

        roomClient = new Client({
          brokerURL: wsRoomUrl(ticket),
          reconnectDelay: 5000,
          beforeConnect: async () => {
            const freshTicket = await fetchRoomTicket();
            roomClient.brokerURL = wsRoomUrl(freshTicket);
          },
          onConnect: () => {
            console.log("Connected to room STOMP!");
            setRoomStompClient(roomClient);
            roomStompClientRef.current = roomClient;
          },
          onStompError: (frame) => {
            console.error("Room STOMP error: " + frame.headers["message"]);
          },
          onWebSocketError: (event) => {
            console.error("Room WebSocket error:", event);
          },
          onWebSocketClose: () => {
            console.warn("Room WebSocket closed");
            setRoomStompClient(null);
            roomStompClientRef.current = null;
          },
        });

        roomClient.activate();
      } catch (err) {
        console.error("Failed to connect to room websocket", err);
      }
    };

    connectRoomWebSocket();

    return () => {
      if (roomClient) {
        roomClient.deactivate();
        roomStompClientRef.current = null;
      }
    };
  }, [loadingUser]);

  useEffect(() => {
    if (!roomStompClient?.connected || activeChannel?.type !== "ROOM") {
      if (roomSubRef.current) {
        roomSubRef.current.unsubscribe();
        roomSubRef.current = null;
      }
      setRoomParticipants([]);
      return;
    }

    const roomId = activeChannel.id;

    if (roomSubRef.current) {
      roomSubRef.current.unsubscribe();
    }

    roomSubRef.current = roomStompClient.subscribe(`/topic/room/${roomId}`, (message) => {
      try {
        const event = JSON.parse(message.body);
        const { action, payload } = event;

        if (action === "PARTICIPANT_JOINED") {
          setRoomParticipants((prev) => {
            if (!prev.find((p) => p.userId === payload.userId)) {
              return [...prev, { userId: payload.userId, joinedAt: new Date() }];
            }
            return prev;
          });
        } else if (action === "PARTICIPANT_LEFT") {
          setRoomParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));
        } else if (action === "STATE_CHANGED") {
          setRoomParticipants(payload.participants || []);
        }
      } catch (err) {
        console.error("Failed to parse room event:", err);
      }
    });

    return () => {
      if (roomSubRef.current) {
        roomSubRef.current.unsubscribe();
        roomSubRef.current = null;
      }
    };
  }, [roomStompClient, activeChannel]);

  useEffect(() => {
    console.log("activeThread state just changed to:", activeThread);
  }, [activeThread]);

  const handleOpenThread = async (clickedMessage) => {
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
          return;
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
        else if (res.status === 409) {
          const listRes = await fetch(`/api/chat/channels/${clickedMessage.channelId}/threads?page=1&limit=50`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": String(getCurrentUserId()),
              "X-User-Role": "USER",
            },
          });
          if (listRes.ok) {
            const data = await listRes.json();
            const threadList = data.content || data;
            const existingThread = threadList.find(t => t.rootMessageId === clickedMessage.id);
            if (existingThread) {
              setActiveThread(existingThread);
              setIsThreadOpen(true);
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
      <div className="hidden md:flex shrink-0">
        <WorkspaceSidebar
          activeWorkspace={activeWorkspace}
          setActiveWorkspace={setActiveWorkspace}
        />
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 left-0 z-40 h-full shrink-0 transform transition-transform duration-300 ease-in-out md:static md:z-auto md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          activeChannel={activeChannel}
          setActiveChannel={(channel) => {
            setActiveChannel(channel);
            setIsSidebarOpen(false);
          }}
          workspaceId={activeWorkspace?.id}
          activeWorkspace={activeWorkspace}
          joinChannelId={joinChannelId}
        />
      </div>

      <ChatArea
        activeChannel={activeChannel}
        stompClient={stompClient}
        roomStompClient={roomStompClient}
        roomParticipants={roomParticipants}
        onOpenThread={handleOpenThread}
        activeThread={activeThread}
        usersMap={usersMap}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        workspaceId={activeWorkspace?.id}
      />

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

      <div className="hidden xl:flex shrink-0">
        <MembersList activeChannel={activeChannel} usersMap={usersMap} />
      </div>
    </div>
  );
}
