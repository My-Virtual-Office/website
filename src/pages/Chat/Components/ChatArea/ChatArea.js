import "./ChatArea.css";
import ChatHeader from "./ChatHeader/ChatHeader";
import MessageInput from "./MessageInput/MessageInput";
import MessagesList from "./MessagesList/MessagesList";
export default function ChatArea({ activeChannel, activeThread, stompClient, onOpenThread }) {
  return (
    <div className="chatArea">
      <ChatHeader activeChannel={activeChannel}></ChatHeader>
      <MessagesList activeChannel={activeChannel} stompClient={stompClient} onOpenThread={onOpenThread} activeThread={activeThread}/>
      <MessageInput activeChannel={activeChannel} stompClient={stompClient}></MessageInput>
    </div>
  );
}
