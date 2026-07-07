import "./RoomCallBar.css";
import { getCurrentUserId } from "../../../../../utils/auth";

export default function RoomCallBar({
  roomId,
  workspaceId,
  roomStompClient,
  roomParticipants,
  inCall,
  micMuted,
  cameraOff,
  joinChannel,
  leaveChannel,
  toggleMic,
  toggleCamera,
}) {
  const resolveRoomId = async (channelId) => {
    if (!workspaceId) return channelId;
    try {
      const res = await fetch(`/api/rooms?workspaceId=${workspaceId}&page=1&limit=50`, {
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": String(getCurrentUserId()),
          "X-User-Role": "USER",
        },
      });
      if (!res.ok) return channelId;
      const data = await res.json();
      const rooms = data.content || [];
      const match = rooms.find((r) => r.channelId === channelId);
      return match ? match.id : channelId;
    } catch {
      return channelId;
    }
  };

  const handleJoin = async () => {
    try {
      const actualRoomId = await resolveRoomId(roomId);
      const response = await fetch(`/api/rooms/${actualRoomId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": String(getCurrentUserId()),
          "X-User-Role": "USER",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to join room call");
      }

      const data = await response.json();
      const { agoraChannelName, agoraToken } = data;

      await joinChannel(agoraChannelName, agoraToken, getCurrentUserId());

      if (roomStompClient?.connected) {
        roomStompClient.publish({
          destination: "/app/room/state",
          body: JSON.stringify({
            action: "PARTICIPANT_JOINED",
            roomId,
            payload: { userId: getCurrentUserId() },
          }),
        });
      }
    } catch (err) {
      console.error("Failed to join room call:", err);
    }
  };

  const handleLeave = async () => {
    await leaveChannel();

    if (roomStompClient?.connected) {
      roomStompClient.publish({
        destination: "/app/room/state",
        body: JSON.stringify({
          action: "PARTICIPANT_LEFT",
          roomId,
          payload: { userId: getCurrentUserId() },
        }),
      });
    }
  };

  return (
    <div className="room-call-bar">
      <div className="participant-count">
        {roomParticipants?.length || 0} in call
      </div>
      {!inCall ? (
        <button className="call-btn join-btn" onClick={handleJoin}>
          Join Call
        </button>
      ) : (
        <div className="call-controls">
          <button
            className={`call-btn ${micMuted ? "muted" : ""}`}
            onClick={toggleMic}
            title={micMuted ? "Unmute" : "Mute"}
          >
            {micMuted ? "Unmute" : "Mute"}
          </button>
          <button
            className={`call-btn ${cameraOff ? "cam-off" : ""}`}
            onClick={toggleCamera}
            title={cameraOff ? "Turn On Camera" : "Turn Off Camera"}
          >
            {cameraOff ? "Cam On" : "Cam Off"}
          </button>
          <button className="call-btn end-call-btn" onClick={handleLeave}>
            End Call
          </button>
        </div>
      )}
    </div>
  );
}
