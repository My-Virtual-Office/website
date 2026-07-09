import "./MessagesList.css";
import Message from "./Message/Message";
import { useState, useEffect, useRef } from "react";
import { getCurrentUserId } from "../../../../../utils/auth";

export default function MessagesList({
  activeChannel,
  stompClient,
  onOpenThread,
  activeThread,
  usersMap,
  onMessagesChange,
  scrollToMessageId,
  onScrollComplete,
}) {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});

  // Notify parent whenever messages change
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  // Scroll to a specific message when requested (from search)
  useEffect(() => {
    if (!scrollToMessageId) return;
    const el = messageRefs.current[scrollToMessageId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-flash");
      setTimeout(() => el.classList.remove("highlight-flash"), 2000);
      if (onScrollComplete) onScrollComplete();
    }
  }, [scrollToMessageId, onScrollComplete]);

  // Effect 1 : Core message loading
  //
  // Ordering matters here. To avoid a race condition we MUST subscribe to the
  // live WebSocket stream BEFORE requesting history. If we fetched first, any
  // message produced between the history response and the subscription becoming
  // active would be received by neither source and stay invisible until reload.
  useEffect(() => {
    if (!activeChannel?.id) return;

    const channelId = activeChannel.id;
    let subscription = null;
    let isCancelled = false;

    const mergeMessages = (existing, incoming) => {
      const byId = new Map();
      [...existing, ...incoming].forEach((msg) => {
        if (msg && msg.id != null) byId.set(msg.id, msg);
      });
      return Array.from(byId.values()).sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      );
    };

    setMessages([]);

    if (stompClient && stompClient.connected) {
      subscription = stompClient.subscribe(
        `/topic/channel/${channelId}`,
        (messageOutput) => {
          const event = JSON.parse(messageOutput.body);
          if (event.action === "NEW_MESSAGE") {
            if (event.payload.threadId) return;
            setMessages((prev) => mergeMessages(prev, [event.payload]));
          } else if (event.action === "EDIT_MESSAGE") {
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

    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `/api/chat/channels/${channelId}/messages?page=1&limit=50`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "X-User-Id": String(getCurrentUserId()),
              "X-User-Role": "USER",
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          const history = data.content ? [...data.content].reverse() : [];
          if (!isCancelled) {
            setMessages((prev) => mergeMessages(prev, history));
          }
        } else {
          console.error("Failed to fetch messages from server");
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    return () => {
      isCancelled = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [activeChannel, stompClient]);

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
        const displayName =
          (usersMap && usersMap[message.senderId]) ||
          `User ${message.senderId}`;

        const currentLabel = getDateLabel(message.createdAt);
        const previousLabel =
          index > 0 ? getDateLabel(messages[index - 1].createdAt) : null;
        const showDivider = currentLabel && currentLabel !== previousLabel;

        return (
          <div
            key={message.id}
            id={`msg-${message.id}`}
            ref={(el) => { messageRefs.current[message.id] = el; }}
          >
            {showDivider && (
              <div className="date-divider">
                <span className="horizontal-divider"></span>
                <span className="date">{currentLabel}</span>
                <span className="horizontal-divider"></span>
              </div>
            )}
            <Message
              message={{ ...message, senderName: displayName }}
              stompClient={stompClient}
              onOpenThread={onOpenThread}
            />
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
