import "./MessagesList.css";
import Message from "./Message/Message";
import { useState, useEffect } from "react";
import { getCurrentUserId } from "../../../../../utils/auth";

export default function MessagesList({
  activeChannel,
  stompClient,
  onOpenThread,
  activeThread,
  usersMap,
}) {
  const [messages, setMessages] = useState([]);

  // cache object to map raw user ids to real names.
  const [userCache, setUserCache] = useState({});

  // Effect 1 : Core message loading
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
              "X-User-Id": String(getCurrentUserId()),
              "X-User-Role": "USER",
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          const orderedMessages = data.content
            ? [...data.content].reverse()
            : [];
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
          console.log("WebSocket Event received on main channel:", event);
          if (event.action === "NEW_MESSAGE") {
            // Safely append new message without mutating state
            if (event.payload.threadId) return;

            setMessages((prev) => [...prev, event.payload]);
          } else if (event.action === "EDIT_MESSAGE") {
            // Update a specific message's text dynamically
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === event.payload.id ? event.payload : msg,
              ),
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

  // Effect 2 : Watch messages to dynamically fetch missing usernames
  useEffect(() => {
    if (messages.length === 0) return;
    const senderIds = messages.map((m) => m.senderId).filter(Boolean);
    const uniqueMissingIds = [...new Set(senderIds)].filter(
      (id) => !userCache[id],
    );
    if (uniqueMissingIds.length === 0) return;

    uniqueMissingIds.forEach(async (id) => {
      try {
        // 1. Make the live network request to your user service backend
        const res = await fetch(`/api/users/${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": String(getCurrentUserId()),
            "X-User-Role": "USER",
          },
        });

        let resolvedName = `User #${id}`;

        if (res.ok) {
          const userData = await res.json();
          resolvedName = userData.username || userData.name || `User #${id}`;
        } else {
          console.warn(`Profile route returned status ${res.status} for User ID ${id}. Using fallback.`);
          
        }

        // 3. Hydrate the local cache state with the real data
        setUserCache((prev) => ({
          ...prev,
          [id]: { username: resolvedName }
        }));

      } catch (err) {
        console.error(`Network error resolving profile data for User ID ${id}:`, err);
        setUserCache((prev) => ({
          ...prev,
          [id]: { username: Number(id) === getCurrentUserId() ? "You" : `User #${id}` }
        }));
      }
    });
  }, [messages, userCache]);

  // Build a human-friendly divider label from a message's actual timestamp.
  // Returns "Today", "Yesterday", or a full calendar date (e.g. "June 15, 2026").
  const getDateLabel = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    const startOfDay = (d) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const today = startOfDay(new Date());
    const messageDay = startOfDay(date);
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((today - messageDay) / dayMs);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="messages-list">
      {messages.map((message, index) => {
        const displayName = (usersMap && usersMap[message.senderId]) || userCache[message.senderId]?.username || `User ${message.senderId}`;

        // Render a date divider whenever the calendar day changes between messages,
        // using the message's own timestamp instead of the current system date.
        const currentLabel = getDateLabel(message.createdAt);
        const previousLabel =
          index > 0 ? getDateLabel(messages[index - 1].createdAt) : null;
        const showDivider = currentLabel && currentLabel !== previousLabel;

        return (
          <div key={message.id}>
            {showDivider && (
              <div className="date-divider">
                <span className="horizontal-divider"></span>
                <span className="date">{currentLabel}</span>
                <span className="horizontal-divider"></span>
              </div>
            )}
            <Message
              // Pass the username downstream inside the message prop object directly
              message={{ ...message, senderName: displayName }}
              stompClient={stompClient}
              onOpenThread={onOpenThread}
            />
          </div>
        );
      })}
    </div>
  );
}