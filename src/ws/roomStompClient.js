import { authHeaders } from "../utils/auth";

// Same-origin: nginx proxies /ws/rooms to room-service (the gateway only routes /api/rooms/**).
// Dialling :8086 directly would work over plain http, but an https:// page cannot open a ws://
// socket and :8086 terminates no TLS — so the direct route breaks exactly when the app is served
// over HTTPS, which is the only way phones on the LAN can reach a microphone at all.
const ROOM_WS_ORIGIN =
  process.env.REACT_APP_ROOM_WS_URL ||
  `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;

/**
 * Browsers cannot set headers on a WebSocket upgrade, so room-service authenticates the
 * handshake with a single-use ticket (60s TTL) minted over authenticated REST.
 */
export async function fetchRoomTicket() {
  const res = await fetch("/api/rooms/ws-ticket", {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = new Error("Failed to fetch room websocket ticket");
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  if (!data.ticket) throw new Error("Room websocket ticket was empty");
  return data.ticket;
}

export function wsRoomUrl(ticket) {
  return `${ROOM_WS_ORIGIN}/ws/rooms?ticket=${ticket}`;
}
