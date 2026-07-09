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
  onMessagesUpdated,
}) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (onMessagesUpdated) {
      onMessagesUpdated(messages);
    }
  }, [messages, onMessagesUpdated]);

  // Effect 1 : Core message loading
  //
  // Ordering matters here. To avoid a race condition we MUST subscribe to the
  // live WebSocket stream BEFORE requesting history. If we fetched first, any
  // message produced between the history response and the subscription becoming
  // active would be received by neither source and stay invisible until reload.
  useEffect(() => {
    // Do nothing if no active channel
    if (!activeChannel?.id) return;

    const channelId = activeChannel.id;
    let subscription = null;
    let isCancelled = false;

    // Merge two message lists into a single continuous timeline, deduplicating
    // by `id` so a message that appears in both the history API response and the
    // live WebSocket stream is only rendered once. Ordering is derived from the
    // message timestamp so history and live updates interleave correctly.
    const mergeMessages = (existing, incoming) => {
      const byId = new Map();
      [...existing, ...incoming].forEach((msg) => {
        if (msg && msg.id != null) byId.set(msg.id, msg);
      });
      return Array.from(byId.values()).sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      );
    };

    // Switching channels: drop the previous channel's messages so the merge
    // below never mixes timelines from two different channels.
    setMessages([]);

    // 1. Subscribe to real-time events FIRST, before any history is requested.
    if (stompClient && stompClient.connected) {
      subscription = stompClient.subscribe(
        `/topic/channel/${channelId}`,
        (messageOutput) => {
          // Parse the raw text body into a JS object
          const event = JSON.parse(messageOutput.body);
          console.log("WebSocket Event received on main channel:", event);
          if (event.action === "NEW_MESSAGE") {
            // Append new message, deduping in case history overlaps with it.
            if (event.payload.threadId) return;

            setMessages((prev) => mergeMessages(prev, [event.payload]));
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

    // 2. Fetch history AFTER the subscription is active, then merge it into
    //    whatever live messages may have already arrived (deduped by id).
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `/api/chat/channels/${channelId}/messages?page=1&limit=50`,
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
          const history = data.content ? [...data.content].reverse() : [];
          // Guard against a late response from a channel we've already left.
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

    // 3. Cleanup: Unsubscribe when changing channels or unmounting
    return () => {
      isCancelled = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [activeChannel, stompClient]);

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
        const displayName =
          (usersMap && usersMap[message.senderId]) ||
          `User ${message.senderId}`;

        // Render a date divider whenever the calendar day changes between messages,
        // using the message's own timestamp instead of the current system date.
        const currentLabel = getDateLabel(message.createdAt);
        const previousLabel =
          index > 0 ? getDateLabel(messages[index - 1].createdAt) : null;
        const showDivider = currentLabel && currentLabel !== previousLabel;

        return (
          <div key={message.id} id={`msg-${message.id}`}>
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
