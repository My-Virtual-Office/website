import { useCallback, useEffect, useMemo, useState } from "react";
import { getRooms, createRoom } from "../../../../api/rooms";
import { useVoice } from "../../../../voice/VoiceContext";
import { useDialogs } from "../../../../components/DialogProvider";
import { getCurrentUserId } from "../../../../utils/auth";

// Data + actions for voice rooms, extracted out of VoiceChannels.jsx so
// ChannelGroups can lay rooms out inside categories (Discord-style) instead of
// a permanently separate "VOICE" section. Connection state itself still lives
// in VoiceContext, above the router — this hook is just the room list + wiring.
export default function useVoiceChannels(workspaceId, members = []) {
  const [rooms, setRooms] = useState([]);
  const { active, connectingId, rosters, speakingUids, connect, disconnect, watchWorkspace } = useVoice();
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

  useEffect(() => { load(); }, [load]);
  useEffect(() => { watchWorkspace(workspaceId); }, [workspaceId, watchWorkspace]);

  const handleCreate = async () => {
    const name = await prompt({
      title: "New voice channel",
      message: "Everyone in the workspace can join it.",
      placeholder: "e.g. Standup",
      confirmText: "Create",
    });
    if (!name) return null;
    try {
      const room = await createRoom({ workspaceId, name });
      await load();
      return room;
    } catch (e) {
      notify(e.message || "Could not create the voice channel", "error");
      return null;
    }
  };

  return { rooms, active, connectingId, rosters, speakingUids, connect, disconnect, nameOf, myId, handleCreate };
}
