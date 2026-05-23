import "./MessagesList.css";
import Message from "./Message/Message";
import { useState, useEffect } from "react";

export default function MessagesList({ activeChannel, stompClient }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Do nothing if no active channel
    if (!activeChannel?.id) return;

    // 1. Fetch historical messages from backend
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `/api/chat/channels/${activeChannel.id}/messages?page=1&limit=50`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": "1", // Hardcoded user ID for testing
              "X-User-Role": "USER",
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          const orderedMessages = data.content ? data.content.reverse() : [];
          setMessages(orderedMessages);
        } else {
          console.error("Failed to fetch messages from server");
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    // 2. Subscribe to real-time events for this channel
    let subscription = null;

    if (stompClient && stompClient.connected) {
      subscription = stompClient.subscribe(
        `/topic/channel/${activeChannel.id}`,
        (messageOutput) => {
          // Parse the raw text body into a JS object
          const event = JSON.parse(messageOutput.body);

          if (event.action === "NEW_MESSAGE") {
            // Safely append new message without mutating state
            setMessages((prev) => [...prev, event.payload]);
          } else if (event.action === "EDIT_MESSAGE") {
            // Update a specific message's text dynamically
            setMessages((prev) =>
              prev.map((msg) => (msg.id === event.payload.id ? event.payload : msg))
            );
          } else if (event.action === "DELETE_MESSAGE") {
            setMessages((prev) =>
              prev.filter((msg) => msg.id !== event.payload.messageId),
            );
          }
        },
      );
    }

    // 3. Cleanup: Unsubscribe when changing channels or unmounting
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [activeChannel, stompClient]);

  return (
    <div className="messages-list">
      <div className="date-divider">
        <span className="horizontal-divider"></span>
        <span className="date">TODAY</span>
        <span className="horizontal-divider"></span>
      </div>
      {messages.map((message) => (
        <Message key={message.id} message={message} stompClient={stompClient} />
      ))}
    </div>
  );
}
