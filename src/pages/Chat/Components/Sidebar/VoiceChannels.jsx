import { useCallback, useEffect, useMemo, useState } from "react";
import { Volume2, Plus, Mic, MicOff } from "lucide-react";
import { getRooms, createRoom } from "../../../../api/rooms";
import { useVoice } from "../../../../voice/VoiceContext";
import { useDialogs } from "../../../../components/DialogProvider";
import { getCurrentUserId } from "../../../../utils/auth";
import "./VoiceChannels.css";

/**
 * Discord-style voice channels: click one to connect, and everyone in it is listed
 * underneath. Connecting is independent of which text channel is open — the session
 * lives in VoiceContext, above the router.
 */
export default function VoiceChannels({ workspaceId, members = [] }) {
  const [rooms, setRooms] = useState([]);
  const { active, connectingId, rosters, speakingUids, connect, disconnect, watchWorkspace } =
    useVoice();
  const { notify, prompt } = useDialogs();
  const myId = getCurrentUserId();

  const nameOf = useMemo(() => {
    const byId = new Map(members.map((m) => [String(m.userId), m]));
    return (userId) => byId.get(String(userId))?.name || `User ${userId}`;
  }, [members]);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setRooms(await getRooms(workspaceId));
    } catch (e) {
      console.error("Failed to load voice channels", e);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the roster of every channel fresh, not just the one we are in.
  useEffect(() => {
    watchWorkspace(workspaceId);
  }, [workspaceId, watchWorkspace]);

  const handleCreate = async () => {
    const name = await prompt({
      title: "New voice channel",
      message: "Everyone in the workspace can join it.",
      placeholder: "e.g. Standup",
      confirmText: "Create",
    });
    if (!name) return;
    try {
      await createRoom({ workspaceId, name });
      await load();
    } catch (e) {
      notify(e.message || "Could not create the voice channel", "error");
    }
  };

  if (!workspaceId) return null;

  return (
    <div className="voice-section">
      <div className="voice-header">
        <span>VOICE</span>
        <button onClick={handleCreate} title="Create voice channel">
          <Plus size={16} />
        </button>
      </div>

      <div className="voice-list">
        {rooms.length === 0 && <div className="voice-empty">No voice channels yet</div>}

        {rooms.map((room) => {
          const roster = rosters[room.id] || [];
          const isActive = active?.id === room.id;
          const isConnecting = connectingId === room.id;
          const full =
            room.maxParticipants != null && roster.length >= room.maxParticipants && !isActive;

          return (
            <div key={room.id} className="voice-channel">
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
                        {p.muted ? (
                          <MicOff size={12} className="voice-member-muted" />
                        ) : (
                          <Mic size={12} className="voice-member-mic" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
