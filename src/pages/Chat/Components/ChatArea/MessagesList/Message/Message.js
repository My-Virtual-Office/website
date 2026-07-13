import "./Message.css";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import { Pencil, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUserId, authHeaders } from "../../../../../../utils/auth";
import { useDialogs } from "../../../../../../components/DialogProvider";

export default function Message({ message, stompClient }) {
  // --- Message State ---

  const [isEditing, setIsEditing] = useState(false); // Editing mode state
  const [editedText, setEditedText] = useState(
    message.content || message.text || "",
  ); // Edited text state
  // App dialogs / toasts
  const { confirm, notify } = useDialogs();

  useEffect(() => {
    setEditedText(message.content || message.text || "");
  }, [message])
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
      // Use HTTP DELETE to delete the message
      const response = await fetch(`/api/chat/messages/${message.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) {
        notify("Failed to delete the message", "error");
      }
      // UI will update automatically when the DELETE_MESSAGE WebSocket event arrives!
    } catch (error) {
      console.error("Error:", error);
    }
  };


  // --- Render ---

  // System messages
  if (message.type === "system") {
    return (
      <div className="system-message">
        <div className="system-icon">
          <PersonAddAltOutlinedIcon></PersonAddAltOutlinedIcon>
        </div>
        <span className="system-text">
          <span className="system-user">{message.user}</span>
          <span className="system-action">{message.action}</span>
        </span>
      </div>
    );
  }

  if (!currentContent || currentContent.trim() === "") return null;
  // Show actions only for current user's messages
  const isMyMessage = message.senderId === getCurrentUserId();

  return (
    <div className="message">
      <div className="message-avatar">
        <img src={message.avatar || "/avatar1.jpg"} alt="User"></img>
      </div>

      <div className="message-content">
        {/* Message header */}
        <div className="message-header">
          <span className="message-user">
            {message.user || `User ${message.senderId || "1"}`}
          </span>
          <span className="message-time">
            {message.time ||
              (message.createdAt
                ? new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                : "")}
          </span>

          {/* Show actions if it's my message and not in edit mode */}
          {isMyMessage && !isEditing && (
            <div className="message-actions">
              <button
                className="msg-action-btn"
                onClick={() => setIsEditing(true)}
                title="Edit message"
              >
                <Pencil size={15} />
              </button>
              <button
                className="msg-action-btn danger"
                onClick={handleDelete}
                title="Delete message"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>

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
        ) : (
          <div className="message-text">{currentContent}</div>
        )}

        {/* Attachments */}
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
      </div>
    </div>
  );
}
