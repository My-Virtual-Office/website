import { authHeaders } from "../utils/auth";

/** Inbox page: { items, unreadCount } (tolerant of items/content naming). */
export async function getInbox() {
  const res = await fetch(`/api/notifications?page=0&size=30`, { headers: authHeaders() });
  if (!res.ok) throw res;
  const d = await res.json();
  return { items: d.items ?? d.content ?? [], unreadCount: d.unreadCount ?? 0 };
}

export async function getUnreadCount() {
  const res = await fetch(`/api/notifications/unread-count`, { headers: authHeaders() });
  if (!res.ok) return 0;
  const d = await res.json();
  return d.unread ?? 0;
}

export async function markAllRead() {
  await fetch(`/api/notifications/read-all`, { method: "PATCH", headers: authHeaders() });
}

export async function deleteNotification(id) {
  await fetch(`/api/notifications/${id}`, { method: "DELETE", headers: authHeaders() });
}

/** Short-lived ticket for the notifications WebSocket handshake. */
export async function wsTicket() {
  const res = await fetch(`/api/notifications/ws-ticket`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw res;
  const d = await res.json();
  return d.ticket;
}
