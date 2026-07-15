import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Client } from "@stomp/stompjs";
import useAgora from "../hooks/useAgora";
import { joinRoom, leaveRoom, getWorkspacePresence } from "../api/rooms";
import { fetchRoomTicket, wsRoomUrl } from "../ws/roomStompClient";
import { getCurrentUserId } from "../utils/auth";

const VoiceContext = createContext(null);

/** Voice-channel session state. Mounted above the router, so audio survives navigation. */
export const useVoice = () => useContext(VoiceContext);

// room-service drops a participant whose Redis "alive" key expires (room.presence
// .alive-ttl-seconds = 30) and the ONLY heartbeat it exposes is the STOMP /app/room/heartbeat
// message — there is no REST equivalent. Without this the roster would empty out mid-call
// even though Agora audio kept flowing.
const HEARTBEAT_MS = 10_000;
// Rosters for channels we are NOT in have no push feed, so poll. Comfortably inside the TTL.
const ROSTER_POLL_MS = 12_000;

/** Turn an Agora SDK error into something a user (or whoever configured the stack) can act on. */
function describe(e) {
  const code = e?.code;
  const msg = e?.message || "";
  if (code === "PERMISSION_DENIED" || e?.name === "NotAllowedError") {
    return "Microphone permission denied — allow mic access and try again.";
  }
  if (code === "DEVICE_NOT_FOUND") return "No microphone found.";
  // The App ID Agora was handed isn't a live project: the stack's AGORA_APP_ID is wrong,
  // empty or from a deleted project. Worth naming explicitly — the raw SDK text ("invalid
  // vendor key") sends people hunting in the wrong place.
  if (code === "CAN_NOT_GET_GATEWAY_SERVER" || /invalid vendor key|can not find appid/i.test(msg)) {
    return "Agora rejected this workspace's App ID. Check AGORA_APP_ID / AGORA_APP_CERTIFICATE in the server environment.";
  }
  if (code === "INVALID_TOKEN" || code === "TOKEN_EXPIRED") {
    return "The voice token was rejected — AGORA_APP_CERTIFICATE likely does not match the App ID.";
  }
  return msg || "Could not connect to the voice channel.";
}

export function VoiceProvider({ children }) {
  const [active, setActive] = useState(null); // { id, name } of the connected channel
  const [connectingId, setConnectingId] = useState(null);
  const [error, setError] = useState(null);
  const [rosters, setRosters] = useState({}); // roomId -> ParticipantResponse[]
  const [watchedWorkspace, setWatchedWorkspace] = useState(null); // workspace whose rosters we poll

  const activeRef = useRef(null);
  const stompRef = useRef(null);
  const renewRef = useRef(null);

  const onTokenWillExpire = useCallback(() => renewRef.current?.(), []);
  const agora = useAgora({ onTokenWillExpire });

  const myId = getCurrentUserId();

  // Agora tokens last an hour. Re-calling /join is the renewal path: it is safe to repeat
  // (membership + presence are idempotent) and hands back a freshly minted token.
  useEffect(() => {
    renewRef.current = async () => {
      const room = activeRef.current;
      if (!room) return;
      try {
        const data = await joinRoom(room.id);
        await agora.renewToken(data.agoraToken);
      } catch (e) {
        console.error("Failed to renew Agora token", e);
      }
    };
  }, [agora]);

  const applyRoomEvent = useCallback((roomId, action, payload) => {
    setRosters((prev) => {
      const list = prev[roomId] || [];
      if (action === "PARTICIPANT_JOINED") {
        if (list.some((p) => String(p.userId) === String(payload.userId))) return prev;
        return { ...prev, [roomId]: [...list, payload] };
      }
      if (action === "PARTICIPANT_LEFT") {
        return { ...prev, [roomId]: list.filter((p) => String(p.userId) !== String(payload.userId)) };
      }
      if (action === "STATE_CHANGED") {
        return {
          ...prev,
          [roomId]: list.map((p) => (String(p.userId) === String(payload.userId) ? payload : p)),
        };
      }
      return prev;
    });
  }, []);

  const closeStomp = useCallback(() => {
    stompRef.current?.deactivate();
    stompRef.current = null;
  }, []);

  const openStomp = useCallback(
    (roomId) => {
      closeStomp();
      const client = new Client({
        reconnectDelay: 4000,
        // A ws-ticket is single-use, so bake a FRESH one on every (re)connect — a ticket
        // captured once is consumed by the first attempt and every retry then 401s.
        beforeConnect: async () => {
          const ticket = await fetchRoomTicket();
          client.brokerURL = wsRoomUrl(ticket);
        },
        onConnect: () => {
          client.subscribe(`/topic/room/${roomId}`, (frame) => {
            try {
              const { action, payload } = JSON.parse(frame.body);
              applyRoomEvent(roomId, action, payload);
            } catch {
              /* ignore malformed frame */
            }
          });
        },
      });
      client.brokerURL = wsRoomUrl(""); // seed so activate() enters its retry loop
      client.activate();
      stompRef.current = client;
    },
    [applyRoomEvent, closeStomp],
  );

  const disconnect = useCallback(async () => {
    const room = activeRef.current;
    activeRef.current = null;
    setActive(null);
    closeStomp();
    await agora.leave();
    if (!room) return;
    setRosters((prev) => ({
      ...prev,
      [room.id]: (prev[room.id] || []).filter((p) => String(p.userId) !== String(myId)),
    }));
    try {
      await leaveRoom(room.id);
    } catch (e) {
      console.error("Failed to leave room", e); // presence TTL will reap us anyway
    }
  }, [agora, closeStomp, myId]);

  const connect = useCallback(
    async (room) => {
      if (activeRef.current?.id === room.id || connectingId) return;
      setError(null);
      setConnectingId(room.id);
      try {
        if (activeRef.current) await disconnect(); // Discord-style: one channel at a time
        const data = await joinRoom(room.id);
        if (!data.agoraAppId) {
          throw new Error("Voice is not configured on the server (no Agora App ID).");
        }
        await agora.join({
          appId: data.agoraAppId,
          channel: data.agoraChannelName,
          token: data.agoraToken,
          uid: myId,
        });
        activeRef.current = { id: room.id, name: room.name };
        setActive({ id: room.id, name: room.name });
        setRosters((prev) => ({ ...prev, [room.id]: data.participants || [] }));
        openStomp(room.id);
      } catch (e) {
        // Roll the server-side join back so we do not hold a presence slot we never used.
        try {
          await leaveRoom(room.id);
        } catch {
          /* best effort */
        }
        await agora.leave().catch(() => {});
        console.error("Voice connect failed", e);
        setError(describe(e));
      } finally {
        setConnectingId(null);
      }
    },
    [agora, connectingId, disconnect, myId, openStomp],
  );

  const toggleMute = useCallback(async () => {
    const next = !agora.micMuted;
    await agora.setMuted(next);
    const client = stompRef.current;
    const room = activeRef.current;
    // Reflect mute to everyone else (drives STATE_CHANGED on /topic/room/{id}).
    if (client?.connected && room) {
      client.publish({
        destination: "/app/room/state",
        body: JSON.stringify({
          roomId: room.id,
          muted: next,
          cameraOn: false,
          screenSharing: false,
        }),
      });
    }
  }, [agora]);

  /** Workspace whose voice-channel rosters the UI wants kept fresh (the sidebar). */
  const watchWorkspace = useCallback((workspaceId) => {
    setWatchedWorkspace((prev) => (prev === workspaceId ? prev : workspaceId));
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => {
      const client = stompRef.current;
      if (client?.connected) {
        client.publish({
          destination: "/app/room/heartbeat",
          body: JSON.stringify({ roomId: active.id }),
        });
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!watchedWorkspace) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const presence = await getWorkspacePresence(watchedWorkspace);
        if (!cancelled) setRosters(presence);
      } catch (e) {
        console.error("Failed to poll voice presence", e); // keep the last known rosters
      }
    };
    poll();
    const id = setInterval(poll, ROSTER_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [watchedWorkspace]);

  // Closing the tab needs no explicit leave: the heartbeat stops, and room-service reaps the
  // presence entry when its "alive" key expires. (sendBeacon cannot help here — it can't set
  // an Authorization header and the gateway takes auth no other way.)

  const value = useMemo(
    () => ({
      active,
      connectingId,
      error,
      rosters,
      micMuted: agora.micMuted,
      speakingUids: agora.speakingUids,
      connect,
      disconnect,
      toggleMute,
      watchWorkspace,
      clearError: () => setError(null),
    }),
    [
      active,
      connectingId,
      error,
      rosters,
      agora.micMuted,
      agora.speakingUids,
      connect,
      disconnect,
      toggleMute,
      watchWorkspace,
    ],
  );

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}
