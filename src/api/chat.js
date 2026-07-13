import { authHeaders } from "../utils/auth";

/** Upload a file to GridFS; returns { fileId, name, contentType, size }. */
export async function uploadAttachment(file) {
  const form = new FormData();
  form.append("file", file);
  const token = localStorage.getItem("token");
  const res = await fetch("/api/chat/attachments", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {}, // no Content-Type — browser sets multipart boundary
    body: form,
  });
  if (!res.ok) throw res;
  return res.json();
}

/** Public download/inline URL for an attachment. */
export const fileUrl = (fileId) => `/api/chat/files/${fileId}`;

/** Fetch one channel (must be a member). */
export async function getChannel(channelId) {
  const res = await fetch(`/api/chat/channels/${channelId}`, { headers: authHeaders() });
  if (!res.ok) throw res;
  return res.json();
}

/** Threads in a channel. */
export async function getChannelThreads(channelId) {
  const res = await fetch(`/api/chat/channels/${channelId}/threads?page=1&limit=100`, { headers: authHeaders() });
  if (!res.ok) throw res;
  const d = await res.json();
  return d.content ?? d ?? [];
}

/** Create a thread rooted at a message. */
export async function createThread(channelId, rootMessageId, name) {
  const res = await fetch(`/api/chat/channels/${channelId}/threads`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ rootMessageId, name }),
  });
  if (!res.ok) throw res;
  return res.json();
}

/** Replies in a thread (returned newest-first). */
export async function getThreadMessages(threadId) {
  const res = await fetch(`/api/chat/threads/${threadId}/messages?page=1&limit=50`, { headers: authHeaders() });
  if (!res.ok) throw res;
  const d = await res.json();
  return d.content ?? d ?? [];
}

/** Pin a message. */
export async function pinMessage(messageId) {
  const res = await fetch(`/api/chat/messages/${messageId}/pin`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw res;
  return res.json();
}
/** Unpin a message. */
export async function unpinMessage(messageId) {
  const res = await fetch(`/api/chat/messages/${messageId}/pin`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw res;
  return res.json();
}
/** Pinned messages in a channel. */
export async function getPins(channelId) {
  const res = await fetch(`/api/chat/channels/${channelId}/pins`, { headers: authHeaders() });
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
