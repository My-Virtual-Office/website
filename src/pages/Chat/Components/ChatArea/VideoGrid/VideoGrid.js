import "./VideoGrid.css";
import { useEffect, useRef } from "react";

export default function VideoGrid({ remoteUsers, localVideoTrack, usersMap }) {
  const localVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localVideoTrack.current) {
      localVideoTrack.current.play(localVideoRef.current);
    }
  }, [localVideoTrack]);

  return (
    <div className="video-grid">
      <div className="video-grid-inner">
        <div className="video-container local-video">
          <div ref={localVideoRef} className="video-player" />
          <span className="video-label">You</span>
        </div>
        {remoteUsers.map((user) => (
          <RemoteVideo key={user.uid} user={user} usersMap={usersMap} />
        ))}
      </div>
    </div>
  );
}

function RemoteVideo({ user, usersMap }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && user.videoTrack) {
      user.videoTrack.play(videoRef.current);
    }
  }, [user.videoTrack]);

  return (
    <div className="video-container remote-video">
      <div ref={videoRef} className="video-player" />
      <span className="video-label">
        {usersMap?.[user.uid] || `User ${user.uid}`}
      </span>
    </div>
  );
}
