import "./MessageInput.css";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SentimentSatisfiedAltOutlinedIcon from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import EmojiPicker from "emoji-picker-react";
import { useState } from "react";
export default function MessageInput({ activeChannel }) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async () => {
    // Do nothing if input is empty
    if (!message.trim() || !activeChannel || !activeChannel.id) return;
    try {
      // Send POST request to create message
      const response = await fetch(`/api/chat/channels/${activeChannel.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": "1", // Temporary hardcoded user ID
          "X-User-Role": "USER"
        },
        body: JSON.stringify({
          content: message
          // threadId and clientMessageId are optional, omitting for now
        })
      });
      // Clear input field on success
      if (response.ok) {
        setMessage("");
      } else {
        console.error("Failed to send message");
      }
    } catch (error) {
      console.error("Connection error:", error);
    }
  };
  // Send message on Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent new line
      handleSendMessage(); 
    }
  };
let placeholderText = "Message";
  if (activeChannel !== null) {
    if (activeChannel.name !== undefined) {
      placeholderText = "Message #" + activeChannel.name;
    }
  }
  return (
    <div className="message-input-container">
      <div className="message-input">
        {/* Input Field */}
        <textarea
          type="text"
          placeholder={placeholderText}
          className="message-input-field"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* Left Icons */}
        <div className="input-icons">
          <div className="input-actions-left">
            <button className="input-btn" aria-label="Add attachment" >
              <AddCircleOutlineOutlinedIcon />
            </button>
            <button
              className="input-btn"
              aria-label="Add emoji"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <SentimentSatisfiedAltOutlinedIcon />
            </button>
          </div>

          {/* Send Button */}
          <button className="send-btn" onClick={handleSendMessage}>
            Send
            <SendOutlinedIcon />
          </button>
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}
    </div>
  );
}
