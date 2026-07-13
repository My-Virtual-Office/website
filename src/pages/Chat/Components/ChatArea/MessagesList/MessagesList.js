import "./MessagesList.css";
import Message from "./Message/Message";
import { useState, useEffect, Fragment } from "react";
import { authHeaders } from "../../../../../utils/auth";

const sameDay = (a, b) => a.toDateString() === b.toDateString();
const dayLabel = (d) => {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
};

export default function MessagesList({ activeChannel, stompClient, onOpenThread }) {
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
            headers: authHeaders(),
          },
        );
        if (response.ok) {
          const data = await response.json();
          const orderedMessages = data.content ? [...data.content].reverse() : [];
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
          } else if (
            event.action === "EDIT_MESSAGE" ||
            event.action === "REACTION" ||
            event.action === "PIN"
          ) {
            // Replace the message with the updated payload (edit / reactions / pin)
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
      {messages.map((message, i) => {
        const cur = new Date(message.createdAt || Date.now());
        const prev = messages[i - 1];
        const prevDate = prev ? new Date(prev.createdAt || Date.now()) : null;
        const newDay = !prev || !sameDay(cur, prevDate);
        // Collapse consecutive messages from the same author within 5 minutes on the same day.
        const grouped =
          !newDay &&
          !!prev &&
          prev.senderId === message.senderId &&
          message.type !== "SYSTEM" &&
          prev.type !== "SYSTEM" &&
          cur - prevDate < 5 * 60 * 1000;
        return (
          <Fragment key={message.id}>
            {newDay && (
              <div className="date-divider">
                <span className="horizontal-divider" />
                <span className="date">{dayLabel(cur)}</span>
                <span className="horizontal-divider" />
              </div>
            )}
            <Message
              message={message}
              stompClient={stompClient}
              grouped={grouped}
              onOpenThread={onOpenThread}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
