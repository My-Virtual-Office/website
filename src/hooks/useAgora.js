import { useCallback, useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

AgoraRTC.setLogLevel(2); // warn + error only; the SDK is very chatty at info level

/**
 * Voice-only Agora engine: microphone in, remote audio out. No camera, no screen share.
 *
 * The App ID is deliberately not baked in here — room-service returns it from
 * POST /api/rooms/{id}/join next to the channel name and a per-user token. The web client
 * has no build-time env plumbing (every call is same-origin /api/*), so the server is the
 * only place the Agora config needs to live.
 *
 * Talks only to Agora; membership/presence/roster are the caller's job (see VoiceContext).
 */
export default function useAgora({ onTokenWillExpire } = {}) {
  const clientRef = useRef(null);
  const micRef = useRef(null);

  const [remoteUids, setRemoteUids] = useState([]);
  const [micMuted, setMicMuted] = useState(false);
  const [speakingUids, setSpeakingUids] = useState([]);

  // Keep the newest callback reachable from listeners bound once on mount.
  const expireCb = useRef(onTokenWillExpire);
  useEffect(() => {
    expireCb.current = onTokenWillExpire;
  }, [onTokenWillExpire]);

  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    const handlePublished = async (user, mediaType) => {
      if (mediaType !== "audio") return; // a voice channel never subscribes to video
      await client.subscribe(user, mediaType);
      user.audioTrack?.play();
    };
    // user-joined/left fire for every remote in rtc mode, published or not, so they are a
    // truer "who is in the channel" signal than user-published.
    const handleJoined = (user) =>
      setRemoteUids((prev) => (prev.includes(user.uid) ? prev : [...prev, user.uid]));
    const handleLeft = (user) => setRemoteUids((prev) => prev.filter((u) => u !== user.uid));
    const handleExpire = () => expireCb.current?.();
    const handleVolume = (volumes) =>
      setSpeakingUids(volumes.filter((v) => v.level > 5).map((v) => v.uid));

    client.on("user-published", handlePublished);
    client.on("user-joined", handleJoined);
    client.on("user-left", handleLeft);
    client.on("token-privilege-will-expire", handleExpire);
    client.on("volume-indicator", handleVolume);
    client.enableAudioVolumeIndicator();

    return () => {
      client.removeAllListeners();
      micRef.current?.close();
      micRef.current = null;
      if (client.connectionState === "CONNECTED") client.leave().catch(() => {});
    };
  }, []);

  const join = useCallback(async ({ appId, channel, token, uid }) => {
    const client = clientRef.current;
    if (!client) return;
    // A blank token means the server has no App Certificate configured; Agora expects null.
    await client.join(appId, channel, token || null, uid);
    const mic = await AgoraRTC.createMicrophoneAudioTrack();
    micRef.current = mic;
    await client.publish([mic]);
    setMicMuted(false);
    setRemoteUids(client.remoteUsers.map((u) => u.uid));
  }, []);

  const leave = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    if (micRef.current) {
      await client.unpublish([micRef.current]).catch(() => {});
      micRef.current.close();
      micRef.current = null;
    }
    if (client.connectionState !== "DISCONNECTED") await client.leave();
    setRemoteUids([]);
    setSpeakingUids([]);
  }, []);

  /** setMuted, not setEnabled: it keeps the mic device open, so unmuting is instant. */
  const setMuted = useCallback(async (muted) => {
    const mic = micRef.current;
    if (!mic) return;
    await mic.setMuted(muted);
    setMicMuted(muted);
  }, []);

  const renewToken = useCallback(async (token) => {
    if (token) await clientRef.current?.renewToken(token);
  }, []);

  return { remoteUids, speakingUids, micMuted, join, leave, setMuted, renewToken };
}
