import { getCurrentUserId } from "../utils/auth";

async function fetchRoomTicket() {
  const response = await fetch("/api/rooms/ws-ticket", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "X-User-Id": String(getCurrentUserId()),
      "X-User-Role": "USER",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(errorText || "Failed to fetch room websocket ticket");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  if (!data.ticket) {
    throw new Error("Failed to fetch room websocket ticket.");
  }
  return data.ticket;
}

export function wsRoomUrl(ticket) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `ws://localhost:8086/ws/rooms?ticket=${ticket}`;
  }
  const wsProtocol =
    window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/ws/rooms?ticket=${ticket}`;
}

export { fetchRoomTicket };
