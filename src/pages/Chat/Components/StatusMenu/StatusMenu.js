import "./StatusMenu.css";
import { useState, useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { STATUS_META, STATUS_ORDER } from "../../statusMeta";

/**
 * Slack-style status picker popover.
 *   desk    — current desk (status/statusEmoji/statusCustomText)
 *   onSave  — (status, emoji, text) => Promise
 *   onClose — dismiss
 */
export default function StatusMenu({ desk, onSave, onClose }) {
  const [customText, setCustomText] = useState(desk?.statusCustomText || "");
  const [emoji, setEmoji] = useState(desk?.statusEmoji || "");
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);

  const pick = async (status) => {
    setSaving(true);
    try {
      await onSave(status, status === "CUSTOM" ? emoji : "", status === "CUSTOM" ? customText : "");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const saveCustom = async () => {
    if (!customText.trim()) return;
    await pick("CUSTOM");
  };

  const clearStatus = () => pick("ACTIVE");

  return (
    <div className="status-menu" ref={ref}>
      <div className="status-menu-head">Set a status</div>

      {/* Custom status text */}
      <div className="status-custom-row">
        <input
          className="status-emoji-input"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
          placeholder="😀"
          aria-label="Status emoji"
        />
        <input
          className="status-text-input"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && saveCustom()}
          placeholder="What's your status?"
          maxLength={120}
        />
        {customText && (
          <button className="status-clear" onClick={() => setCustomText("")} aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>
      {customText.trim() && (
        <button className="status-save-custom" onClick={saveCustom} disabled={saving}>
          <Check size={14} /> Set custom status
        </button>
      )}

      <div className="status-menu-divider" />

      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s];
        const active = desk?.status === s && !desk?.statusCustomText;
        return (
          <button key={s} className={`status-option ${active ? "active" : ""}`} onClick={() => pick(s)} disabled={saving}>
            <span className="status-dot-lg" style={{ background: meta.color }} />
            <span className="status-option-label">{meta.label}</span>
            {active && <Check size={15} className="status-check" />}
          </button>
        );
      })}

      {(desk?.statusCustomText || desk?.status !== "ACTIVE") && (
        <>
          <div className="status-menu-divider" />
          <button className="status-option clear-row" onClick={clearStatus} disabled={saving}>
            <X size={15} /> Clear status
          </button>
        </>
      )}
    </div>
  );
}
