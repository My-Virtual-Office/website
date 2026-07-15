import { Client } from "@stomp/stompjs";
// api/notifications exports wsTicket, not getWebSocketTicket — the old name resolved to
// undefined, so ensureClient() threw on the first call and live notifications never arrived.
import { wsTicket as getWebSocketTicket } from "../api/notifications";
import { getCurrentUserId } from "../utils/auth";

let client = null;
let starting = false;
const listeners = new Set();

// notifications-service registers its STOMP endpoint at `notifications.ws.endpoint`, which is
// /api/notifications/connect — NOT /ws/notifications, and not on port 8082 directly. The old URL
// opened a socket that failed its handshake, so every subscriber here (the notifications menu,
// and Focus Mode's held counter) sat silently receiving nothing. Go through the same proxied
// host the working bell in NotificationCenter uses, which also keeps this correct over LAN/HTTPS.
function wsNotificationsUrl(ticket) {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/api/notifications/connect?ticket=${ticket}`;
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
