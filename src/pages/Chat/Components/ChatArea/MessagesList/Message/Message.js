import "./Message.css";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import {
  Pencil,
  Trash2,
  SmilePlus,
  MessageSquare,
  Paperclip,
  Download,
  Pin,
  MoreVertical,
  Circle,
  Link2,
  ChevronRight,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useState, useEffect, useRef } from "react";
import { getCurrentUserId, authHeaders } from "../../../../../../utils/auth";
import { toggleReaction, fileUrl, pinMessage, unpinMessage } from "../../../../../../api/chat";
import { useDialogs } from "../../../../../../components/DialogProvider";
import { useMentions } from "../../../../mentionContext";

// Frequent emojis for Slack-style 1-click reactions on hover.
const QUICK_EMOJIS = ["👍", "✅", "😂", "❤️", "🎉"];

/** Highlight @mention, #channel, and #<number> (task) tokens, making them clickable. */
function renderContent(text, onMention, onChannel, onTask) {
  if (!text) return null;
  const parts = [];
  const regex = /(^|[\s(])([@#][\w-]+)/g;
  let last = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const token = m[2];
    const start = m.index + m[1].length; // skip the leading boundary char
    if (start > last) parts.push(text.slice(last, start));
    const isUser = token[0] === "@";
    const isTask = token[0] === "#" && /^\d+$/.test(token.slice(1));
    let className = "mention";
    let handler = onMention;
    if (isTask) {
      className = "mention-task";
      handler = onTask;
    } else if (!isUser) {
      className = "mention-channel";
      handler = onChannel;
    }
    parts.push(
      <span
        key={start}
        className={className}
        role={handler ? "button" : undefined}
        tabIndex={handler ? 0 : undefined}
        onClick={handler ? () => handler(token.slice(1)) : undefined}
      >
        {token}
      </span>,
    );
    last = start + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Message({ message, stompClient, grouped, onOpenThread, unread, thread }) {
  const { onMention, onChannel, onMarkUnread, onTask } = useMentions();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  // --- Message State ---

  const [isEditing, setIsEditing] = useState(false); // Editing mode state
  const [editedText, setEditedText] = useState(
    message.content || message.text || "",
  ); // Edited text state
  // App dialogs / toasts
  const { confirm, notify } = useDialogs();
  // Emoji reaction picker
  const [showPicker, setShowPicker] = useState(false);

  const handleReact = async (emoji) => {
    setShowPicker(false);
    try {
      await toggleReaction(message.id, emoji); // WS REACTION event updates the UI
    } catch {
      notify("Could not react", "error");
    }
  };

  const handlePin = async () => {
    try {
      if (message.pinned) await unpinMessage(message.id);
      else await pinMessage(message.id); // WS PIN event updates the UI
    } catch {
      notify("Could not pin", "error");
    }
  };

  const handleMarkUnread = () => {
    setShowMenu(false);
    if (onMarkUnread) onMarkUnread(message.channelId, message.id);
    notify("Marked as unread", "success");
  };

  const handleCopyLink = async () => {
    setShowMenu(false);
    const base = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    try {
      await navigator.clipboard.writeText(`${base}#msg-${message.id}`);
      notify("Link copied", "success");
    } catch {
      notify("Couldn't copy link", "error");
    }
  };

  // Close the actions menu on an outside click, and flag the body so other rows'
  // hover toolbars are suppressed while this menu is open (prevents overlap).
  useEffect(() => {
    if (!showMenu) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.body.classList.add("msg-menu-active");
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.body.classList.remove("msg-menu-active");
    };
  }, [showMenu]);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  useEffect(() => {
    setEditedText(message.content || message.text || "");
  }, [message]);
  const currentContent = message.content || message.text || "";
  // Handle editing message
  const handleEditSubmit = async () => {
    if (!editedText.trim() || editedText === currentContent) {
      setIsEditing(false);
      return;
    }

    try {
      // Use HTTP PUT to edit the message
      const response = await fetch(`/api/chat/messages/${message.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ content: editedText }),
      });

      if (response.ok) {
        setIsEditing(false); // Close edit box on success
        // UI will update automatically when the EDIT_MESSAGE WebSocket event arrives!
      } else {
        notify("Edit failed", "error");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Handle deleting message
  const handleDelete = async () => {
    const confirmDelete = await confirm({
      title: "Delete message",
      message: "Are you sure you want to delete this message?",
      confirmText: "Delete",
      tone: "danger",
    });
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/chat/messages/${message.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) {
        notify("Failed to delete the message", "error");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // --- Render ---

  // System messages (backend sends type "SYSTEM"; legacy dummy data used "system").
  if (message.type === "SYSTEM" || message.type === "system") {
    const text =
      message.content ||
      `${message.user || ""} ${message.action || ""}`.trim();
    return (
      <div className="system-message">
        <PersonAddAltOutlinedIcon className="system-icon-inline" fontSize="small" />
        <span className="system-line">{text}</span>
      </div>
    );
  }

  const hasAttachments = message.attachments && message.attachments.length > 0;
  if ((!currentContent || currentContent.trim() === "") && !hasAttachments) return null;
  // Show actions only for current user's messages
  const isMyMessage = message.senderId === getCurrentUserId();
  const timeStr =
    message.time ||
    (message.createdAt
      ? new Date(message.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "");

  return (
    <div
      id={`msg-${message.id}`}
      className={`message ${grouped ? "grouped" : ""} ${showMenu ? "menu-open" : ""} ${unread ? "unread" : ""}`}
    >
      <div className="message-avatar">
        {grouped ? (
          <span className="grouped-time">{timeStr}</span>
        ) : (
          <img src={message.avatar || "/avatar1.jpg"} alt="User" />
        )}
      </div>

      <div className="message-content">
        {message.pinned && (
          <div className="pinned-label"><Pin size={11} /> Pinned</div>
        )}
        {/* Message header (hidden for grouped follow-up messages) */}
        {!grouped && (
          <div className="message-header">
            <span className="message-user">
              {message.user || `User ${message.senderId || "1"}`}
            </span>
            <span className="message-time">{timeStr}</span>
          </div>
        )}

        {/* Message content */}
        {isEditing ? (
          <div className="edit-mode-box">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              autoFocus
            />
            {/* Save and cancel buttons */}
            <div className="edit-actions">
              <button className="edit-save" onClick={handleEditSubmit}>
                Save
              </button>
              <button
                className="edit-cancel"
                onClick={() => {
                  setIsEditing(false);
                  setEditedText(currentContent);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : currentContent ? (
          <div className="message-text">{renderContent(currentContent, onMention, onChannel, onTask)}</div>
        ) : null}

        {/* Uploaded attachments */}
        {hasAttachments && (
          <div className="msg-attachments">
            {message.attachments.map((a) =>
              (a.contentType || "").startsWith("image/") ? (
                <a key={a.fileId} className="msg-image" href={fileUrl(a.fileId)} target="_blank" rel="noreferrer">
                  <img src={fileUrl(a.fileId)} alt={a.name} />
                </a>
              ) : (
                <a
                  key={a.fileId}
                  className="msg-file"
                  href={fileUrl(a.fileId)}
                  target="_blank"
                  rel="noreferrer"
                  download={a.name}
                >
                  <span className="msg-file-icon"><Paperclip size={16} /></span>
                  <span className="msg-file-name">{a.name}</span>
                  <Download size={15} className="msg-file-dl" />
                </a>
              ),
            )}
          </div>
        )}

        {/* Legacy demo attachment */}
        {message.attachment && (
          <div className="message-attachment">
            <div className="attachment-icon">
              <PictureAsPdfOutlinedIcon></PictureAsPdfOutlinedIcon>
            </div>
            <div className="attachment-info">
              <span className="attachment-name">{message.attachment.name}</span>
              <span className="attachment-size">
                {message.attachment.size} • PDF
              </span>
            </div>
            <button className="attachment-download" aria-label="Download">
              <FileDownloadOutlinedIcon></FileDownloadOutlinedIcon>
            </button>
          </div>
        )}

        {/* Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="reactions">
            {Object.entries(message.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                className={`reaction-pill ${users.includes(getCurrentUserId()) ? "mine" : ""}`}
                onClick={() => handleReact(emoji)}
              >
                <span>{emoji}</span>
                <span className="reaction-count">{users.length}</span>
              </button>
            ))}
            <button
              className="reaction-add-inline"
              onClick={() => setShowPicker((s) => !s)}
              title="Add reaction"
            >
              <SmilePlus size={14} />
            </button>
          </div>
        )}

        {/* Thread indicator — shown on a root message that has replies */}
        {thread && thread.count > 0 && onOpenThread && (
          <button
            className="thread-indicator"
            onClick={() => onOpenThread(message)}
            title="View thread"
          >
            <span className="thread-indicator-avatars">
              {thread.repliers.slice(0, 3).map((uid, i) => (
                <img key={uid ?? i} src="/avatar1.jpg" alt="" />
              ))}
            </span>
            <span className="thread-indicator-count">
              {thread.count} {thread.count === 1 ? "reply" : "replies"}
            </span>
            <ChevronRight size={15} className="thread-indicator-chevron" />
          </button>
        )}
      </div>

      {/* Hover action toolbar (floats top-right; works for grouped rows too) */}
      {!isEditing && (
        <div className="message-actions">
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em}
              className="msg-action-btn quick-emoji"
              onClick={() => handleReact(em)}
              title={`React ${em}`}
            >
              {em}
            </button>
          ))}
          <button className="msg-action-btn" onClick={() => setShowPicker((s) => !s)} title="More reactions">
            <SmilePlus size={15} />
          </button>
          {onOpenThread && (
            <button className="msg-action-btn" onClick={() => onOpenThread(message)} title="Reply in thread">
              <MessageSquare size={15} />
            </button>
          )}
          <button
            className={`msg-action-btn ${message.pinned ? "pinned" : ""}`}
            onClick={handlePin}
            title={message.pinned ? "Unpin" : "Pin to channel"}
          >
            <Pin size={15} />
          </button>
          {isMyMessage && (
            <>
              <button className="msg-action-btn" onClick={() => setIsEditing(true)} title="Edit message">
                <Pencil size={15} />
              </button>
              <button className="msg-action-btn danger" onClick={handleDelete} title="Delete message">
                <Trash2 size={15} />
              </button>
            </>
          )}

          {/* More actions (Slack-style ⋮ menu) */}
          <div className="msg-menu-wrap" ref={menuRef}>
            <button
              className="msg-action-btn"
              onClick={() => setShowMenu((s) => !s)}
              title="More actions"
            >
              <MoreVertical size={15} />
            </button>
            {showMenu && (
              <div className="msg-menu">
                <button className="msg-menu-item" onClick={handleMarkUnread}>
                  <Circle size={15} /> Mark unread
                </button>
                <button className="msg-menu-item" onClick={handleCopyLink}>
                  <Link2 size={15} /> Copy link
                </button>
                <button
                  className="msg-menu-item"
                  onClick={() => {
                    setShowMenu(false);
                    handlePin();
                  }}
                >
                  <Pin size={15} /> {message.pinned ? "Unpin from channel" : "Pin to channel"}
                </button>
                {isMyMessage && (
                  <>
                    <div className="msg-menu-sep" />
                    <button
                      className="msg-menu-item"
                      onClick={() => {
                        setShowMenu(false);
                        setIsEditing(true);
                      }}
                    >
                      <Pencil size={15} /> Edit message
                    </button>
                    <button
                      className="msg-menu-item danger"
                      onClick={() => {
                        setShowMenu(false);
                        handleDelete();
                      }}
                    >
                      <Trash2 size={15} /> Delete message
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showPicker && (
        <div className="reaction-picker">
          <EmojiPicker
            onEmojiClick={(e) => handleReact(e.emoji)}
            height={340}
            width={300}
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
    </div>
  );
}
