import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { useVoice } from "../../../../voice/VoiceContext";
import "./VoiceBar.css";

/**
 * "Connected to X" strip above the profile row — the always-visible proof you are live
 * plus the two controls that matter: mute and disconnect.
 */
export default function VoiceBar() {
  const { active, micMuted, toggleMute, disconnect, error, clearError } = useVoice();

  if (error) {
    return (
      <div className="voice-bar voice-bar-error" role="alert">
        <span className="voice-bar-error-text">{error}</span>
        <button onClick={clearError} title="Dismiss">
          ✕
        </button>
      </div>
    );
  }

  if (!active) return null;

  return (
    <div className="voice-bar">
      <div className="voice-bar-status">
        <Volume2 size={14} className="voice-bar-icon" />
        <div className="voice-bar-text">
          <span className="voice-bar-state">Voice connected</span>
          <span className="voice-bar-room">{active.name}</span>
        </div>
      </div>
      <div className="voice-bar-actions">
        <button
          className={`voice-bar-btn ${micMuted ? "muted" : ""}`}
          onClick={toggleMute}
          title={micMuted ? "Unmute" : "Mute"}
          aria-pressed={micMuted}
        >
          {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button className="voice-bar-btn hangup" onClick={disconnect} title="Disconnect">
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}
