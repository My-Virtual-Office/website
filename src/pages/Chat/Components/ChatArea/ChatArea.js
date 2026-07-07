import "./ChatArea.css";
import ChatHeader from "./ChatHeader/ChatHeader";
import MessageInput from "./MessageInput/MessageInput";
import MessagesList from "./MessagesList/MessagesList";
import RoomCallBar from "./RoomCallBar/RoomCallBar";
import VideoGrid from "./VideoGrid/VideoGrid";
import useAgora from "../../../../hooks/useAgora";

export default function ChatArea({ activeChannel, activeThread, stompClient, roomStompClient, roomParticipants, onOpenThread, usersMap, onToggleSidebar, workspaceId }) {
  const agora = useAgora();

  const isRoom = activeChannel?.type === "ROOM";

  return (
    <div className="chatArea">
      <ChatHeader activeChannel={activeChannel} onToggleSidebar={onToggleSidebar}></ChatHeader>
      {isRoom && agora.inCall && (
        <VideoGrid
          remoteUsers={agora.remoteUsers}
          localVideoTrack={agora.localVideoTrack}
          usersMap={usersMap}
        />
      )}
      <MessagesList activeChannel={activeChannel} stompClient={stompClient} onOpenThread={onOpenThread} activeThread={activeThread} usersMap={usersMap}/>
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
