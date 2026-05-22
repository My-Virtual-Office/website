import "./ChatPage.css";

import WorkspaceSidebar from "./Components/WorkspaceSidebar/WorkspaceSidebar";
import Sidebar from "./Components/Sidebar/Sidebar";
import ChatArea from "./Components/ChatArea/ChatArea";
import { useState, useEffect } from "react";
import { Client } from "@stomp/stompjs";
import MembersList from "./Components/MembersList/MembersList";

export default function ChatPage() {
  const [activeChannel, setActiveChannel] = useState(null);
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    let client; // 1. Local variable holds the reference

    const connectWebSocket = async () => {
      try {
        const ticketRes = await fetch("/api/chat/ws-ticket", {
          method: "POST",
          headers: { "X-User-Id": "1", "X-User-Role": "USER" }
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

        client = new Client({
          brokerURL: `ws://localhost:8084/api/chat/connect?ticket=${ticket}`,
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
