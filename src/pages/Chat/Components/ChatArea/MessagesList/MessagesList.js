import "./MessagesList.css";
import Message from "./Message/Message";
import { useState, useEffect, Fragment } from "react";
import { authHeaders } from "../../../../../utils/auth";
import { getUnread, markRead } from "../../../../../api/chat";

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
  // Id of the first unread message — where the "New" divider is drawn.
  const [firstUnreadId, setFirstUnreadId] = useState(null);

  useEffect(() => {
    // Do nothing if no active channel
    if (!activeChannel?.id) return;
    setFirstUnreadId(null);

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

          // Find the unread boundary from the read cursor BEFORE marking read,
          // then persist the channel as read (clears the sidebar badge).
          try {
            const u = await getUnread(activeChannel.id);
            let firstId = null;
            if (u.unreadCount > 0 && orderedMessages.length) {
              const firstUnread = u.lastReadMessageId
                ? orderedMessages.find((m) => m.id > u.lastReadMessageId)
                : orderedMessages[0];
              firstId = firstUnread ? firstUnread.id : null;
            }
            setFirstUnreadId(firstId);
            const latest = orderedMessages[orderedMessages.length - 1];
            if (latest?.id) markRead(activeChannel.id, latest.id).catch(() => {});
          } catch {
            setFirstUnreadId(null);
          }
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

  const firstUnreadIndex = firstUnreadId
    ? messages.findIndex((m) => m.id === firstUnreadId)
    : -1;

  return (
    <div className="messages-list">
      {messages.map((message, i) => {
        const cur = new Date(message.createdAt || Date.now());
        const prev = messages[i - 1];
        const prevDate = prev ? new Date(prev.createdAt || Date.now()) : null;
        const newDay = !prev || !sameDay(cur, prevDate);
        const isUnread = firstUnreadIndex >= 0 && i >= firstUnreadIndex;
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
            {i === firstUnreadIndex && (
              <div className="unread-divider">
                <span className="unread-line" />
                <span className="unread-label">New</span>
              </div>
            )}
            <Message
              message={message}
              stompClient={stompClient}
              grouped={grouped}
              onOpenThread={onOpenThread}
              unread={isUnread}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
