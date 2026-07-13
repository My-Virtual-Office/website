import { authHeaders } from "../utils/auth";

/** Fetch one channel (must be a member). */
export async function getChannel(channelId) {
  const res = await fetch(`/api/chat/channels/${channelId}`, { headers: authHeaders() });
  if (!res.ok) throw res;
  return res.json();
}

/** Toggle the caller's emoji reaction on a message. */
export async function toggleReaction(messageId, emoji) {
  const res = await fetch(
    `/api/chat/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
    { method: "POST", headers: authHeaders() },
  );
  if (!res.ok) throw res;
  return res.json();
}

/** Update channel settings (creator or moderator). Partial body. */
export async function updateChannel(channelId, body) {
  const res = await fetch(`/api/chat/channels/${channelId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw res;
  return res.json();
}
