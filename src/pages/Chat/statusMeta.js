// Slack-style presence statuses, matching the backend DeskStatus enum.
export const STATUS_META = {
  ACTIVE: { label: "Active", emoji: "🟢", color: "#2bac76" },
  AWAY: { label: "Away", emoji: "🌙", color: "#e8a33d" },
  DO_NOT_DISTURB: { label: "Do not disturb", emoji: "⛔", color: "#e01e5a" },
  FOCUS_MODE: { label: "Focused", emoji: "🎯", color: "#8b5cf6" },
  CUSTOM: { label: "Custom", emoji: "💬", color: "#9aa0a6" },
};

// Order shown in the picker (CUSTOM is entered via the free-text field).
export const STATUS_ORDER = ["ACTIVE", "AWAY", "DO_NOT_DISTURB", "FOCUS_MODE"];

export const statusColor = (s) => (STATUS_META[s] || STATUS_META.ACTIVE).color;
export const statusLabel = (s) => (STATUS_META[s] || STATUS_META.ACTIVE).label;

/** What to show next to a person: their custom text, else the status label. */
export function statusText(desk) {
  if (!desk) return "";
  if (desk.statusCustomText) return desk.statusCustomText;
  return statusLabel(desk.status);
}
