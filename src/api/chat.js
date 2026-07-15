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

/** Join a channel by id — backs the /chat/join/:channelId invite link. */
export async function joinChannel(channelId) {
  const res = await fetch(`/api/chat/channels/${channelId}/join`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (res.status === 400) throw new Error("Cannot join this channel");
  if (!res.ok) throw new Error("Failed to join channel");
}

/** Unread count + mention flag for a channel: { unreadCount, lastReadMessageId, mentioned }. */
export async function getUnread(channelId) {
  const res = await fetch(`/api/chat/channels/${channelId}/unread`, { headers: authHeaders() });
  if (!res.ok) throw res;
  return res.json();
}

/** Mark a channel read up to a message id. */
export async function markRead(channelId, lastReadMessageId) {
  const res = await fetch(`/api/chat/channels/${channelId}/read`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ lastReadMessageId }),
  });
  if (!res.ok) throw res;
}

/** Mark a channel unread starting at the given message. */
export async function markUnread(channelId, messageId) {
  const res = await fetch(`/api/chat/channels/${channelId}/mark-unread`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ lastReadMessageId: messageId }),
  });
  if (!res.ok) throw res;
}

/** Queue a message to be delivered to a channel at a future time (ISO instant). */
export async function scheduleMessage(channelId, content, scheduledAt) {
  const res = await fetch(`/api/chat/channels/${channelId}/scheduled`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ content, scheduledAt }),
  });
  if (!res.ok) throw res;
  return res.json();
}

/** Open (or create) a 1:1 direct-message channel with another user. */
export async function getOrCreateDm(targetUserId) {
  const res = await fetch(`/api/chat/dm`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ targetUserId }),
  });
  if (!res.ok) throw res;
  return res.json();
}

/** The caller's direct-message channels. */
export async function getDirectMessages() {
  const res = await fetch(`/api/chat/dm?page=1&limit=50`, { headers: authHeaders() });
  if (!res.ok) throw res;
  const d = await res.json();
  return d.content ?? d ?? [];
}

/** Channels in a workspace (for #channel mentions). */
export async function getChannels(workspaceId) {
  const res = await fetch(`/api/chat/channels?workspaceId=${workspaceId}&page=1&limit=100`, { headers: authHeaders() });
  if (!res.ok) throw res;
  const d = await res.json();
  return d.content ?? d ?? [];
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
