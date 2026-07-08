import { useState, useRef, useCallback, useEffect } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = "5db80389fc284a3a8c166979882f118d";

export default function useAgora() {
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);

  const [inCall, setInCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);

  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    const handleUserPublished = async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "video") {
        setRemoteUsers((prev) => {
          if (!prev.find((u) => u.uid === user.uid)) {
            return [...prev, user];
          }
          return prev;
        });
      }
      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
    };

    const handleUserUnpublished = (user, mediaType) => {
      if (mediaType === "video") {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      }
    };

    const handleUserLeft = (user) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);

    return () => {
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);
      localAudioTrackRef.current?.close();
      localVideoTrackRef.current?.close();
      client.removeAllListeners();
    };
  }, []);

  const joinChannel = useCallback(async (channelName, token, userId) => {
    const client = clientRef.current;
    if (!client) return;

    await client.join(APP_ID, channelName, token, userId);

    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const videoTrack = await AgoraRTC.createCameraVideoTrack();

    localAudioTrackRef.current = audioTrack;
    localVideoTrackRef.current = videoTrack;

    await client.publish([audioTrack, videoTrack]);

    setInCall(true);
    setMicMuted(false);
    setCameraOff(false);
  }, []);

  const leaveChannel = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    localAudioTrackRef.current?.close();
    localVideoTrackRef.current?.close();
    localAudioTrackRef.current = null;
    localVideoTrackRef.current = null;

    await client.leave();
    setInCall(false);
    setRemoteUsers([]);
  }, []);

  const toggleMic = useCallback(() => {
    const track = localAudioTrackRef.current;
    if (track) {
      track.setEnabled(track.enabled ? false : true);
      setMicMuted((prev) => !prev);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localVideoTrackRef.current;
    if (track) {
      track.setEnabled(track.enabled ? false : true);
      setCameraOff((prev) => !prev);
    }
  }, []);

  return {
    inCall,
    micMuted,
    cameraOff,
    remoteUsers,
    localVideoTrack: localVideoTrackRef,
    localAudioTrack: localAudioTrackRef,
    joinChannel,
    leaveChannel,
    toggleMic,
    toggleCamera,
  };
}
