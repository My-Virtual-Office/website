import "./ChatPage.css";

import WorkspaceSidebar from "./Components/WorkspaceSidebar/WorkspaceSidebar";
import Sidebar from "./Components/Sidebar/Sidebar";
import ChatArea from "./Components/ChatArea/ChatArea";
import { useState, useEffect } from "react";
import { Client } from "@stomp/stompjs";
import MembersList from "./Components/MembersList/MembersList";
import { getCurrentUserId } from "../../utils/auth";
import { getCurrentUser } from "../../api/user";
import { useNavigate } from "react-router-dom"; // 🌟 Import useNavigate

export default function ChatPage() {
  const navigate = useNavigate(); // 🌟 Define navigate hook
  const [activeChannel, setActiveChannel] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      // 🌟 PROACTIVE CHECK 1: If there is no token right at the start, don't even try to fetch a profile
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const user = await getCurrentUser();
        if (user && user.id) {
          localStorage.setItem("userId", String(user.id));
        }
      } catch (err) {
        console.error("Failed to fetch current user profile:", err);
        // If the user profile request fails (e.g. 401 token invalid/expired), throw them out
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
        // 🌟 PROACTIVE CHECK 2: Double check token existence right before starting the WebSocket ticket pipeline
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
          // If the handshake fails because of an authentication error, clean up
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
        client.activate();
      } catch (err) {
        console.error("Failed to connect to websocket", err);
      }
    };

    connectWebSocket();

    return () => {
      if (client) client.deactivate();
    };
  }, [loadingUser, navigate]);

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
    <div className="chatPage">
      <WorkspaceSidebar></WorkspaceSidebar>
      <Sidebar
        activeChannel={activeChannel}
        setActiveChannel={setActiveChannel}
      />
      <ChatArea activeChannel={activeChannel} stompClient={stompClient} />
      <MembersList></MembersList>
    </div>
  );
}
