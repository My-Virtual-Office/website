import "./Message.css";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
// Import edit and delete icons
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined"
import { useState, useEffect } from "react";
import { getCurrentUserId } from "../../../../../../utils/auth";

export default function Message({ message, stompClient, onOpenThread }) {
  // --- Message State ---

  const [isEditing, setIsEditing] = useState(false); // Editing mode state
  const [editedText, setEditedText] = useState(
    message.content || message.text || "",
  ); // Edited text state

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
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": String(getCurrentUserId()),
          "X-User-Role": "USER",
        },
        body: JSON.stringify({ content: editedText }),
      });

      if (response.ok) {
        setIsEditing(false); // Close edit box on success
        // UI will update automatically when the EDIT_MESSAGE WebSocket event arrives!
      } else {
        alert("Edit failed");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Handle deleting message
  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this message?",
    );
    if (!confirmDelete) return;

    try {
      // Use HTTP DELETE to delete the message
      const response = await fetch(`/api/chat/messages/${message.id}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": String(getCurrentUserId()),
          "X-User-Role": "USER",
        },
      });

      if (!response.ok) {
        alert("Failed to delete the message!");
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
        <div
          className="message-header"
          style={{ display: "flex", alignItems: "center" }}
        >
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
            <div
              className="message-actions"
              style={{ marginLeft: "12px", display: "flex", gap: "8px" , alignItems: "center"}}
            >
              {!message.threadId && onOpenThread && !isEditing && (
                <button onClick={() => onOpenThread(message)}
                 title="Reply in thread"
                 style={
                  {
                    background: "none",
                    border: "none",
                    cursor:"pointer",
                    color: "#94a3b8",
                    padding: 0,
                    display:"flex",
                    alignItems: "center"
                  }
                 }
                 >
                  <ChatBubbleOutlineOutlinedIcon fontSize="small" />
                 </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                title="Edit Message"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 0,
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </button>

              <button
                onClick={handleDelete}
                title="Delete Message"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#f87171",
                  padding: 0,
                }}
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </button>
            </div>
          )}
        </div>

        {/* Message content */}
        {isEditing ? (
          <div className="edit-mode-box" style={{ marginTop: "4px" }}>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              style={{
                width: "100%",
                minHeight: "40px",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
            {/* Save and cancel buttons */}
            <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
              <button
                onClick={handleEditSubmit}
                style={{
                  padding: "4px 12px",
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedText(currentContent);
                }}
                style={{
                  padding: "4px 12px",
                  background: "#e2e8f0",
                  color: "#475569",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
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
