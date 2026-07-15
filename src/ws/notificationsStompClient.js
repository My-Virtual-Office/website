import { Client } from "@stomp/stompjs";
// api/notifications exports wsTicket, not getWebSocketTicket — the old name resolved to
// undefined, so ensureClient() threw on the first call and live notifications never arrived.
import { wsTicket as getWebSocketTicket } from "../api/notifications";
import { getCurrentUserId } from "../utils/auth";

let client = null;
let starting = false;
const listeners = new Set();

function wsNotificationsUrl(ticket) {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `ws://localhost:8082/ws/notifications?ticket=${ticket}`;
  }
  const wsProtocol =
    window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/ws/notifications?ticket=${ticket}`;
}

function dispatchMessage(message) {
  let data;
  try {
    data = JSON.parse(message.body);
  } catch {
    return;
  }
  listeners.forEach((listener) => listener(data));
}

async function ensureClient() {
  if (client?.active) return client;
  if (starting) return client;

  const userId = getCurrentUserId();
  if (!userId) return null;

  starting = true;
  try {
    const firstTicket = await getWebSocketTicket();

    if (!client) {
      client = new Client({
        brokerURL: wsNotificationsUrl(firstTicket),
        reconnectDelay: 5000,
        beforeConnect: async () => {
          const freshTicket = await getWebSocketTicket();
          client.brokerURL = wsNotificationsUrl(freshTicket);
        },
        onConnect: () => {
          client.subscribe("/user/queue/notifications", dispatchMessage);
        },
        onStompError: (frame) => {
          console.error("STOMP Error:", frame.headers["message"]);
        },
        onWebSocketError: (event) => {
          console.error("Notifications WebSocket error:", event);
        },
      });
    }

    if (!client.active) {
      client.activate();
    }

    return client;
  } finally {
    starting = false;
  }
}

export function subscribeToNotifications(listener) {
  listeners.add(listener);
  ensureClient();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && client) {
      client.deactivate();
      client = null;
    }
  };
}
