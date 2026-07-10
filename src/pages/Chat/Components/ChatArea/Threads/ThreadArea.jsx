import { useState, useEffect, useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";
import Message from "../MessagesList/Message/Message";
import { getCurrentUserId } from "../../../../../utils/auth"
import "./ThreadArea.css";

export default function ThreadArea({ activeChannel, activeThread, stompClient, onClose, usersMap }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when a new reply arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- 1. Fetch History Logs & Listen Live ---
  useEffect(() => {
    if (!activeThread?.id) return;

    const fetchThreadHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/chat/threads/${activeThread.id}/messages?page=1&limit=50`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "X-User-Id": String(getCurrentUserId()),
            "X-User-Role": "USER",
          },
        });
        if (res.ok) {
          const data = await res.json();
          // The backend sends newest first; reverse it to draw top-to-bottom sequentially
          const sequentialLogs = data.content ? [...data.content].reverse() : [];
          setMessages(sequentialLogs);
        }
      } catch (err) {
        console.error("Failed to pull thread messages history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreadHistory();

    // Connect to real-time STOMP topic pipeline
    let threadSub = null;
    if (stompClient && stompClient.connected) {
      threadSub = stompClient.subscribe(`/topic/thread/${activeThread.id}`, (frame) => {
        const event = JSON.parse(frame.body);

        switch (event.action) {
          case "NEW_MESSAGE":
            // Deduplicate incoming items by matching IDs
            setMessages((prev) => {
              if (prev.some((m) => m.id === event.payload.id)) return prev;
              return [...prev, event.payload];
            });
            break;

          case "EDIT_MESSAGE":
            setMessages((prev) =>
              prev.map((m) => (m.id === event.payload.id ? event.payload : m))
            );
            break;

          case "DELETE_MESSAGE":
            // Server soft-deletes: filters out or lets message handle its own 'deleted: true'
            setMessages((prev) =>
              prev.map((m) =>
                m.id === event.payload.messageId ? { ...m, content: null, deleted: true } : m
              )
            );
            break;

          default:
            break;
        }
      });
    }

    return () => {
      if (threadSub) threadSub.unsubscribe();
    };
  }, [activeThread.id, stompClient]);

  // --- 2. Send Reply Action ---
  const handleSendReply = (e) => {
    e.preventDefault();
    console.log("Current activeThread state inside handleSendReply:", activeThread);
    if (!replyText.trim() || !stompClient || !stompClient.connected) return;

    stompClient.publish({
      destination: "/app/chat/send",
      body: JSON.stringify({
        channelId: activeChannel.id,
        content: replyText,
        threadId: activeThread.id, // 🌟 Critical field to bind it to this thread container!
        replyToId: null,
        mentions: [],
        clientMessageId: crypto.randomUUID(),
      }),
    });

    setReplyText("");
  };

  return (
    <div className="threadArea">
      {/* Thread Sub-Header Header */}
      <div className="thread-header">
        <div className="thread-header-title">
          <h3>{activeThread.name || "Thread Discussion"}</h3>
          <span>in #{activeChannel?.name}</span>
        </div>
        <button onClick={onClose} className="thread-close-btn" aria-label="Close thread">
          <CloseIcon fontSize="small" />
        </button>
      </div>

      {/* Replies Conversation Area */}
      <div className="thread-messages-scroll-zone">
        {isLoading ? (
          <div className="thread-loading">Loading thread data...</div>
        ) : messages.length === 0 ? (
          <div className="thread-empty">No replies yet. Start the conversation!</div>
        ) : (
          messages.map((msg) => {
            const displayName = (usersMap && usersMap[msg.senderId]) || `User ${msg.senderId}`;
            return (
              <Message key={msg.id} message={{ ...msg, senderName: displayName }} stompClient={stompClient} />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Dedicated Thread Input Box Form */}
      <form onSubmit={handleSendReply} className="thread-input-form">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply in thread..."
        />
        <button type="submit" disabled={!replyText.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}