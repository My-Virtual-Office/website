import "./MessageInput.css";
import { Plus, Smile, SendHorizontal, X, Paperclip } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useState, useRef } from "react";
import { useDialogs } from "../../../../../components/DialogProvider";
import { uploadAttachment, fileUrl } from "../../../../../api/chat";

const isImage = (a) => (a.contentType || "").startsWith("image/");

export default function MessageInput({ activeChannel, stompClient }) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const { notify } = useDialogs();

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
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

  const handleSendMessage = () => {
    if ((!message.trim() && attachments.length === 0) || !activeChannel?.id) return;

    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: "/app/chat/send",
        body: JSON.stringify({
          channelId: activeChannel.id,
          content: message,
          threadId: null,
          replyToId: null,
          mentions: [],
          attachments,
          clientMessageId: crypto.randomUUID(),
        }),
      });
      setMessage("");
      setAttachments([]);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  let placeholderText = "Message";
  if (activeChannel !== null && activeChannel.name !== undefined) {
    placeholderText = "Message #" + activeChannel.name;
  }

  return (
    <div className="message-input-container">
      <div className="message-input">
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
          type="text"
          placeholder={placeholderText}
          className="message-input-field"
          value={message}
          onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
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

          <button className="send-btn" onClick={handleSendMessage} disabled={uploading}>
            Send
            <SendHorizontal size={15} />
          </button>
        </div>
      </div>

      {showEmojiPicker && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}
    </div>
  );
}
