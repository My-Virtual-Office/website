import { Volume2, Mic, MicOff } from "lucide-react";
import "./VoiceChannels.css";

/** One voice channel row + its live roster — same markup VoiceChannels used to own. */
export default function VoiceChannelRow({ room, voice }) {
  const { active, connectingId, rosters, speakingUids, connect, disconnect, nameOf, myId } = voice;
  const roster = rosters[room.id] || [];
  const isActive = active?.id === room.id;
  const isConnecting = connectingId === room.id;
  const full = room.maxParticipants != null && roster.length >= room.maxParticipants && !isActive;

  return (
    <div className="voice-channel">
      <div
        className={`voice-channel-item ${isActive ? "active" : ""} ${full ? "full" : ""}`}
        onClick={() => (isActive ? disconnect() : connect(room))}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isActive) disconnect();
            else connect(room);
          }
        }}
        title={isActive ? "Disconnect" : full ? "Channel is full" : `Join ${room.name}`}
      >
        <Volume2 size={16} />
        <span className="voice-channel-name">{room.name}</span>
        {isConnecting && <span className="voice-hint">connecting…</span>}
        {!isConnecting && roster.length > 0 && (
          <span className="voice-count">
            {roster.length}
            {room.maxParticipants ? `/${room.maxParticipants}` : ""}
          </span>
        )}
      </div>

      {roster.length > 0 && (
        <div className="voice-members">
          {roster.map((p) => {
            const speaking = speakingUids?.includes(Number(p.userId));
            return (
              <div
                key={p.userId}
                className={`voice-member ${speaking ? "speaking" : ""}`}
                title={String(p.userId) === String(myId) ? "You" : nameOf(p.userId)}
              >
                <span className="voice-member-name">
                  {String(p.userId) === String(myId) ? "You" : nameOf(p.userId)}
                </span>
                {p.muted ? <MicOff size={12} className="voice-member-muted" /> : <Mic size={12} className="voice-member-mic" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
