import "./ChatArea.css";
import ChatHeader from "./ChatHeader/ChatHeader";
import MessageInput from "./MessageInput/MessageInput";
import MessagesList from "./MessagesList/MessagesList";
export default function ChatArea({ activeChannel, activeThread, stompClient, onOpenThread, usersMap, onToggleSidebar }) {
  return (
    <div className="chatArea">
      <ChatHeader activeChannel={activeChannel} onToggleSidebar={onToggleSidebar}></ChatHeader>
      <MessagesList activeChannel={activeChannel} stompClient={stompClient} onOpenThread={onOpenThread} activeThread={activeThread} usersMap={usersMap}/>
      <MessageInput activeChannel={activeChannel} stompClient={stompClient}></MessageInput>
    </div>
  );
}
