import "./ThreadPanel.css";
import { useState, useEffect, useRef } from "react";
import { X, SendHorizontal } from "lucide-react";
import Message from "../ChatArea/MessagesList/Message/Message";
import { getThreadMessages } from "../../../../api/chat";

export default function ThreadPanel({ thread, stompClient, onClose }) {
  const { threadId, rootMessage, channelId } = thread || {};
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // Load replies + subscribe to live thread events.
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;

    getThreadMessages(threadId)
      .then((list) => {
        if (!cancelled) setReplies(Array.isArray(list) ? [...list].reverse() : []);
      })
      .catch((e) => console.error("Failed to load thread replies", e));

    let sub = null;
    if (stompClient && stompClient.connected) {
      sub = stompClient.subscribe(`/topic/thread/${threadId}`, (out) => {
        const event = JSON.parse(out.body);
        if (event.action === "NEW_MESSAGE") {
          setReplies((prev) =>
            prev.some((m) => m.id === event.payload.id) ? prev : [...prev, event.payload],
          );
        } else if (event.action === "EDIT_MESSAGE" || event.action === "REACTION") {
          setReplies((prev) => prev.map((m) => (m.id === event.payload.id ? event.payload : m)));
        } else if (event.action === "DELETE_MESSAGE") {
          setReplies((prev) => prev.filter((m) => m.id !== event.payload.messageId));
        }
      });
    }
    return () => {
      cancelled = true;
      if (sub) sub.unsubscribe();
    };
  }, [threadId, stompClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [replies.length]);

  const send = () => {
    const content = text.trim();
    if (!content || !stompClient?.connected) return;
    stompClient.publish({
      destination: "/app/chat/send",
      body: JSON.stringify({
        channelId,
        content,
        threadId,
        clientMessageId: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      }),
    });
    setText("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="thread-panel">
      <div className="thread-header">
        <span className="thread-title">Thread</span>
        <button className="thread-close" onClick={onClose} title="Close thread">
          <X size={18} />
        </button>
      </div>

      <div className="thread-body">
        {rootMessage && (
          <div className="thread-root">
            <Message message={rootMessage} stompClient={stompClient} />
          </div>
        )}
        <div className="thread-divider">
          <span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
        </div>
        {replies.map((m) => (
          <Message key={m.id} message={m} stompClient={stompClient} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="thread-composer">
        <textarea
          placeholder="Reply…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
        />
        <button className="thread-send" onClick={send} disabled={!text.trim()}>
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
