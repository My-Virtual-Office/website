import { getCurrentUserId } from "../utils/auth";

async function fetchChatTicket() {
  const response = await fetch("/api/chat/ws-ticket", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "X-User-Id": String(getCurrentUserId()),
      "X-User-Role": "USER",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(errorText || "Failed to fetch websocket ticket");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  if (!data.ticket) {
    throw new Error("Failed to fetch websocket ticket.");
  }
  return data.ticket;
}

export function wsChatUrl(ticket) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `ws://localhost:8084/api/chat/connect?ticket=${ticket}`;
  }
  const wsProtocol =
    window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/api/chat/connect?ticket=${ticket}`;
}

export { fetchChatTicket };
