import "./ChatArea.css";
import ChatHeader from "./ChatHeader/ChatHeader";
import MessageInput from "./MessageInput/MessageInput";
import MessagesList from "./MessagesList/MessagesList";
export default function ChatArea({
  activeChannel,
  workspaceId,
  stompClient,
  sidebarOpen,
  membersOpen,
  onToggleSidebar,
  onToggleMembers,
  onChannelUpdated,
}) {
  return (
    <div className="chatArea">
      <ChatHeader
        activeChannel={activeChannel}
        workspaceId={workspaceId}
        sidebarOpen={sidebarOpen}
        membersOpen={membersOpen}
        onToggleSidebar={onToggleSidebar}
        onToggleMembers={onToggleMembers}
        onChannelUpdated={onChannelUpdated}
      />
      <MessagesList activeChannel={activeChannel} stompClient={stompClient} />
      <MessageInput activeChannel={activeChannel} stompClient={stompClient}></MessageInput>
    </div>
  );
}
