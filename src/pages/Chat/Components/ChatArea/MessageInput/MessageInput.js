import "./MessageInput.css";
import { Plus, Smile, SendHorizontal, X, Paperclip, Hash, AtSign, Clock } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useState, useRef, useEffect } from "react";
import { encryptFor } from "../../../../../utils/e2e";
import { useDialogs } from "../../../../../components/DialogProvider";
import { uploadAttachment, fileUrl, getChannels, scheduleMessage } from "../../../../../api/chat";
import { getMembers } from "../../../../../api/workspace";
import { getAllUsers } from "../../../../../api/user";

const isImage = (a) => (a.contentType || "").startsWith("image/");
const toHandle = (name) => (name || "").replace(/\s+/g, "");

/** Find a trailing @word / #word token immediately before the caret. */
function detectToken(value, caret) {
  const before = value.slice(0, caret);
  const m = before.match(/(?:^|\s)([@#])([\w-]*)$/);
  if (!m) return null;
  return { kind: m[1], query: m[2], tokenStart: caret - m[2].length - 1 };
}

export default function MessageInput({ activeChannel, workspaceId, stompClient, dmPartner, e2eKey }) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [members, setMembers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [recordedMentions, setRecordedMentions] = useState([]);
  const [menu, setMenu] = useState(null); // { kind, query, tokenStart, matches, index }
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const { notify } = useDialogs();

  const openSchedule = () => {
    if (!message.trim()) return notify("Type a message to schedule", "warning");
    const d = new Date(Date.now() + 60 * 60000); // default: 1 hour from now
    const pad = (n) => String(n).padStart(2, "0");
    setScheduleAt(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
        d.getMinutes(),
      )}`,
    );
    setShowSchedule(true);
  };

  const handleSchedule = async () => {
    if (!message.trim() || !activeChannel?.id) return notify("Type a message first", "warning");
    if (!scheduleAt) return notify("Pick a date & time", "warning");
    const iso = new Date(scheduleAt).toISOString();
    if (new Date(iso) <= new Date()) return notify("Pick a future time", "warning");
    try {
      await scheduleMessage(activeChannel.id, message, iso);
      setMessage("");
      setShowSchedule(false);
      notify(`Message scheduled for ${new Date(iso).toLocaleString()}`, "success");
    } catch {
      notify("Could not schedule message", "error");
    }
  };

  // Load workspace members + channels for @/# autocomplete.
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const [desks, users] = await Promise.all([
          getMembers(workspaceId),
          getAllUsers().catch(() => []),
        ]);
        if (cancelled) return;
        const nameById = {};
        users.forEach((u) => {
          nameById[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
        });
        const seen = new Set();
        const mem = [];
        for (const d of desks) {
          if (d.userId == null || seen.has(d.userId)) continue;
          seen.add(d.userId);
          // Same name precedence as ChatPage's resolver, so the inserted
          // @handle always maps back to a member (including yourself).
          const name = nameById[d.userId] || d.fullName || `User${d.userId}`;
          mem.push({ id: d.userId, name, handle: toHandle(name) });
        }
        setMembers(mem);
      } catch {
        /* members unavailable — @ autocomplete stays empty */
      }
      try {
        const chs = await getChannels(workspaceId);
        if (!cancelled) setChannels(chs.map((c) => ({ id: c.id, name: c.name })));
      } catch {
        /* channels unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const refreshMenu = (value, caret) => {
    const tok = detectToken(value, caret);
    if (!tok) return setMenu(null);
    const q = tok.query.toLowerCase();
    const pool = tok.kind === "@" ? members : channels;
    const matches = pool.filter((it) => it.name.toLowerCase().includes(q)).slice(0, 8);
    if (matches.length === 0) return setMenu(null);
    setMenu({ ...tok, matches, index: 0 });
  };

  const onChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    handleTyping();
    refreshMenu(value, e.target.selectionStart);
  };

  const selectItem = (item) => {
    if (!menu || !item) return;
    const caret = inputRef.current?.selectionStart ?? message.length;
    const insert = menu.kind === "@" ? `@${item.handle} ` : `#${item.name} `;
    const next = message.slice(0, menu.tokenStart) + insert + message.slice(caret);
    setMessage(next);
    if (menu.kind === "@") {
      setRecordedMentions((prev) =>
        prev.some((r) => r.id === item.id) ? prev : [...prev, { id: item.id, handle: item.handle }],
      );
    }
    const newCaret = menu.tokenStart + insert.length;
    setMenu(null);
    requestAnimationFrame(() => {
      const ta = inputRef.current;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(newCaret, newCaret);
      }
    });
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const f of files) {
        uploaded.push(await uploadAttachment(f));
      }
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch {
      notify("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (fileId) =>
    setAttachments((prev) => prev.filter((a) => a.fileId !== fileId));

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !activeChannel?.id) return;

    // Direct messages are end-to-end encrypted in the browser: the server only
    // ever stores `vo1:<iv>:<ciphertext>`. Channels stay plaintext on purpose —
    // search, history and the assistant need to read them.
    let outgoing = message;
    const isDm = activeChannel?.type === "DIRECT";
    if (isDm && e2eKey?.privateKey && dmPartner?.e2ePublicKey) {
      const sealed = await encryptFor(e2eKey.privateKey, dmPartner.e2ePublicKey, message);
      if (sealed) outgoing = sealed;
      else return notify("Couldn't encrypt this message — not sent.", "error");
    }

    if (stompClient && stompClient.connected) {
      // Only send mentions whose handle still appears in the final text.
      const mentions = recordedMentions
        .filter((r) => message.includes(`@${r.handle}`))
        .map((r) => r.id);
      stompClient.publish({
        destination: "/app/chat/send",
        body: JSON.stringify({
          channelId: activeChannel.id,
          content: outgoing,
          threadId: null,
          replyToId: null,
          mentions,
          attachments,
          clientMessageId: crypto.randomUUID(),
        }),
      });
      setMessage("");
      setAttachments([]);
      setRecordedMentions([]);
      setMenu(null);
    } else {
      console.warn("WebSocket not connected — message not sent");
      notify("Can't send message right now — reconnecting…", "warning");
    }
  };

  const handleTyping = () => {
    if (stompClient && stompClient.connected && activeChannel?.id) {
      stompClient.publish({
        destination: "/app/chat/typing",
        body: JSON.stringify({ channelId: activeChannel.id, typing: true }),
      });
    }
  };

  const handleKeyDown = (e) => {
    if (menu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        return setMenu((m) => ({ ...m, index: (m.index + 1) % m.matches.length }));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        return setMenu((m) => ({
          ...m,
          index: (m.index - 1 + m.matches.length) % m.matches.length,
        }));
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        return selectItem(menu.matches[menu.index]);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        return setMenu(null);
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  let placeholderText = "Message";
  if (activeChannel !== null && activeChannel.name !== undefined) {
    const prefix = activeChannel.type === "DIRECT" ? "Message " : "Message #";
    placeholderText = prefix + activeChannel.name;
  }

  return (
    <div className="message-input-container">
      <div className="message-input">
        {/* @mention / #channel autocomplete */}
        {menu && (
          <div className="mention-menu">
            {menu.matches.map((it, i) => (
              <button
                key={`${menu.kind}${it.id}`}
                className={`mention-item ${i === menu.index ? "active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectItem(it);
                }}
                onMouseEnter={() => setMenu((m) => ({ ...m, index: i }))}
              >
                {menu.kind === "@" ? <AtSign size={14} /> : <Hash size={14} />}
                <span className="mention-item-name">{it.name}</span>
                {menu.kind === "@" && <span className="mention-item-handle">@{it.handle}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Pending attachments */}
        {attachments.length > 0 && (
          <div className="pending-attachments">
            {attachments.map((a) => (
              <div className="pending-chip" key={a.fileId}>
                {isImage(a) ? (
                  <img src={fileUrl(a.fileId)} alt={a.name} />
                ) : (
                  <span className="pending-file"><Paperclip size={14} /> {a.name}</span>
                )}
                <button className="pending-remove" onClick={() => removeAttachment(a.fileId)} title="Remove">
                  <X size={12} />
                </button>
              </div>
            ))}
            {uploading && <span className="pending-uploading">Uploading…</span>}
          </div>
        )}

        <textarea
          ref={inputRef}
          type="text"
          placeholder={placeholderText}
          className="message-input-field"
          value={message}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setMenu(null), 120)}
        />

        <div className="input-icons">
          <div className="input-actions-left">
            <input
              type="file"
              ref={fileRef}
              multiple
              style={{ display: "none" }}
              onChange={handleFiles}
            />
            <button className="input-btn" aria-label="Add attachment" onClick={() => fileRef.current?.click()}>
              <Plus size={20} />
            </button>
            <button
              className="input-btn"
              aria-label="Add emoji"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={20} />
            </button>
          </div>

          <div className="send-cluster">
            <button
              className="input-btn schedule-btn"
              aria-label="Schedule send"
              title="Schedule send"
              onClick={openSchedule}
            >
              <Clock size={18} />
            </button>
            <button className="send-btn" onClick={handleSendMessage} disabled={uploading}>
              Send
              <SendHorizontal size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Rendered at container level so it isn't clipped by the input's overflow:hidden */}
      {showSchedule && (
        <div className="schedule-pop">
          <div className="schedule-pop-title">Schedule message</div>
          <input
            type="datetime-local"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
          />
          <div className="schedule-pop-actions">
            <button className="schedule-cancel" onClick={() => setShowSchedule(false)}>
              Cancel
            </button>
            <button className="schedule-confirm" onClick={handleSchedule}>
              Schedule
            </button>
          </div>
        </div>
      )}

      {showEmojiPicker && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}
    </div>
  );
}
