import "./MessageInput.css";
import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import SentimentSatisfiedAltOutlinedIcon from "@mui/icons-material/SentimentSatisfiedAltOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import EmojiPicker from "emoji-picker-react";
import { useState } from "react";
export default function MessageInput({ activeChannel, stompClient }) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

 const handleSendMessage = () => {
  if (!message.trim() || !activeChannel?.id) return;
  
  if (stompClient && stompClient.connected) {
    // Fix: Wrap custom fields inside a JSON-stringified body property
    stompClient.publish({
      destination: "/app/chat/send",
      body: JSON.stringify({
        channelId: activeChannel.id,
        content: message,
        threadId: null,
        replyToId: null,
        mentions: [],
        clientMessageId: crypto.randomUUID(),
      })
    });
    setMessage("");
  } else {
    console.warn("WebSocket not connected — message not sent");
    alert("can't send message right now");
  }
};
  // typing indicator:
  const handleTyping = () => {
    if (stompClient && stompClient.connected && activeChannel?.id) {
      stompClient.publish({
        destination: "/app/chat/typing",
        body: JSON.stringify({ channelId: activeChannel.id, typing: true }),
      });
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
          onChange={(e) => {setMessage(e.target.value); handleTyping();}}
          onKeyDown={handleKeyDown}
        />

        {/* Left Icons */}
        <div className="input-icons">
          <div className="input-actions-left">
            <button className="input-btn" aria-label="Add attachment">
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
