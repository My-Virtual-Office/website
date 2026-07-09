import "./ChatArea.css";
import ChatHeader from "./ChatHeader/ChatHeader";
import MessageInput from "./MessageInput/MessageInput";
import MessagesList from "./MessagesList/MessagesList";
import { useState } from "react";

export default function ChatArea({
  activeChannel,
  activeThread,
  stompClient,
  onOpenThread,
  usersMap,
  onToggleSidebar,
}) {
  const [channelMessages, setChannelMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <div className="chatArea">
      <ChatHeader
        activeChannel={activeChannel}
        onToggleSidebar={onToggleSidebar}
        channelMessages={channelMessages}
        // usersMap={usersMap}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      ></ChatHeader>
      <MessagesList
        activeChannel={activeChannel}
        stompClient={stompClient}
        onOpenThread={onOpenThread}
        activeThread={activeThread}
        usersMap={usersMap}
        onMessagesUpdated={setChannelMessages}
      />
      <MessageInput
        activeChannel={activeChannel}
        stompClient={stompClient}
      ></MessageInput>
    </div>
  );
}
