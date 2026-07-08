import "./ChatArea.css";
import ChatHeader from "./ChatHeader/ChatHeader";
import MessageInput from "./MessageInput/MessageInput";
import MessagesList from "./MessagesList/MessagesList";
import RoomCallBar from "./RoomCallBar/RoomCallBar";
import VideoGrid from "./VideoGrid/VideoGrid";
import useAgora from "../../../../hooks/useAgora";
import { useState, useCallback } from "react";

export default function ChatArea({ activeChannel, activeThread, stompClient, roomStompClient, roomParticipants, onOpenThread, usersMap, onToggleSidebar, workspaceId }) {
  const agora = useAgora();
  const [messages, setMessages] = useState([]);
  const [scrollToMessageId, setScrollToMessageId] = useState(null);

  const isRoom = activeChannel?.type === "ROOM";

  const handleMessagesChange = useCallback((msgs) => {
    setMessages(msgs);
  }, []);

  const handleSearchSelect = useCallback((messageId) => {
    setScrollToMessageId(messageId);
  }, []);

  const handleScrollComplete = useCallback(() => {
    setScrollToMessageId(null);
  }, []);

  return (
    <div className="chatArea">
      <ChatHeader
        activeChannel={activeChannel}
        onToggleSidebar={onToggleSidebar}
        workspaceId={workspaceId}
        messages={messages}
        usersMap={usersMap}
        onSearchSelect={handleSearchSelect}
      />
      {isRoom && agora.inCall && (
        <VideoGrid
          remoteUsers={agora.remoteUsers}
          localVideoTrack={agora.localVideoTrack}
          usersMap={usersMap}
        />
      )}
      <MessagesList
        activeChannel={activeChannel}
        stompClient={stompClient}
        onOpenThread={onOpenThread}
        activeThread={activeThread}
        usersMap={usersMap}
        onMessagesChange={handleMessagesChange}
        scrollToMessageId={scrollToMessageId}
        onScrollComplete={handleScrollComplete}
      />
      {isRoom && (
        <RoomCallBar
          roomId={activeChannel.id}
          workspaceId={workspaceId}
          roomStompClient={roomStompClient}
          roomParticipants={roomParticipants}
          inCall={agora.inCall}
          micMuted={agora.micMuted}
          cameraOff={agora.cameraOff}
          joinChannel={agora.joinChannel}
          leaveChannel={agora.leaveChannel}
          toggleMic={agora.toggleMic}
          toggleCamera={agora.toggleCamera}
        />
      )}
      <MessageInput activeChannel={activeChannel} stompClient={stompClient}></MessageInput>
    </div>
  );
}
