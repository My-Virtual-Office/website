import "./MessagesList.css";
import Message from "./Message/Message";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { authHeaders } from "../../../../../utils/auth";
import { getUnread, markRead, getChannelThreads, getThreadMessages } from "../../../../../api/chat";

const initials = (name) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

// Slack-style intro shown at the top of a DM: avatar, name, and a nudge to view the profile.
function DmIntro({ partner, channelName, onViewProfile }) {
  const name = partner?.name || channelName || "this person";
  return (
    <div className="dm-intro">
      <div className="dm-intro-av">
        {partner?.avatar ? <img src={partner.avatar} alt={name} /> : <span>{initials(name)}</span>}
        {partner?.online != null && <span className={`dm-intro-dot ${partner.online ? "on" : ""}`} />}
      </div>
      <div className="dm-intro-name">
        {name}
        {partner?.online && <span className="dm-intro-presence" />}
      </div>
      {partner?.title && <div className="dm-intro-title">{partner.title}</div>}
      <div className="dm-intro-text">
        This conversation is just between <b>@{name}</b> and you. Check out their profile to learn more about them.
      </div>
      {onViewProfile && (
        <button className="dm-intro-btn" onClick={onViewProfile}>View Profile</button>
      )}
    </div>
  );
}

const sameDay = (a, b) => a.toDateString() === b.toDateString();
const dayLabel = (d) => {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
};

export default function MessagesList({ activeChannel, stompClient, dmPartner, onViewProfile, onOpenThread }) {
  const [messages, setMessages] = useState([]);
  // Id of the first unread message — where the "New" divider is drawn.
  const [firstUnreadId, setFirstUnreadId] = useState(null);
  // Map of rootMessageId -> { threadId, count, repliers } so a root message can
  // show a "N replies" indicator that opens its thread.
  const [threadMap, setThreadMap] = useState({});

  // Fetch the channel's threads and their reply counts (the thread list DTO has
  // no count, so we read each thread's replies). Keyed by root message id.
  const loadThreads = useCallback(async (channelId) => {
    if (!channelId) return;
    try {
      const threads = await getChannelThreads(channelId);
      const entries = await Promise.all(
        (threads || []).map(async (t) => {
          try {
            const replies = await getThreadMessages(t.id);
            const list = Array.isArray(replies) ? replies : [];
            const repliers = [...new Set(list.map((r) => r.senderId))];
            return [String(t.rootMessageId), { threadId: t.id, count: list.length, repliers }];
          } catch {
            return null;
          }
        }),
      );
      const map = {};
      entries.forEach((e) => { if (e && e[1].count > 0) map[e[0]] = e[1]; });
      setThreadMap(map);
    } catch {
      /* best-effort — indicators just won't show */
    }
  }, []);

  // Keep the latest loadThreads reachable from the live subscription without
  // forcing it to re-subscribe.
  const loadThreadsRef = useRef(loadThreads);
  loadThreadsRef.current = loadThreads;

  useEffect(() => {
    if (!activeChannel?.id) return;
    setFirstUnreadId(null);
    setThreadMap({});
    loadThreadsRef.current(activeChannel.id);

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

    setMessages([]);

    if (stompClient && stompClient.connected) {
      subscription = stompClient.subscribe(
        `/topic/channel/${channelId}`,
        (messageOutput) => {
          const event = JSON.parse(messageOutput.body);
          if (event.action === "NEW_MESSAGE") {
            // Thread replies live in the thread panel, never in the public channel
            // feed — but a reply changes a root message's "N replies" indicator.
            if (event.payload?.threadId) {
              loadThreadsRef.current(activeChannel.id);
              return;
            }
            // Safely append new message without mutating state
            setMessages((prev) => [...prev, event.payload]);
          } else if (event.action === "THREAD_DELETED") {
            loadThreadsRef.current(activeChannel.id);
          } else if (
            event.action === "EDIT_MESSAGE" ||
            event.action === "REACTION" ||
            event.action === "PIN"
          ) {
            // Replace the message with the updated payload (edit / reactions / pin)
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

  const firstUnreadIndex = firstUnreadId
    ? messages.findIndex((m) => m.id === firstUnreadId)
    : -1;

  // Keep the view pinned to the newest message (e.g. right after you send one).
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="messages-list">
      {activeChannel?.type === "DIRECT" && (
        <DmIntro partner={dmPartner} channelName={activeChannel?.name} onViewProfile={onViewProfile} />
      )}
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
              thread={threadMap[String(message.id)]}
            />
          </Fragment>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
