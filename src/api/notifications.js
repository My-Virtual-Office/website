// getNotifications(page = 1)
// getUnreadCount()
// markNotificationRead(id)
// markAllNotificationsRead()
// deleteNotification(id)
// getNotificationTicket()
// notificationService.js

const BASE_URL = "/api/notifications";

// Dynamically generate headers on every execution call to ensure updated values
const getHeaders = () => {
  const userId = localStorage.getItem("userId") || "1"; // Fallback to a valid default if testing locally
  
  return {
    "Content-Type": "application/json",
    "X-User-Id": String(userId),
    "X-User-Role": "USER" 
  };
};

export async function getNotifications(page = 1, size = 20) {
  const response = await fetch(
    `${BASE_URL}?page=${page}&size=${size}`,
    {
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
}

export async function getUnreadCount() {
  const response = await fetch(
    `${BASE_URL}/unread-count`,
    {
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }

  return response.json();
}

export async function markNotificationRead(id) {
  const response = await fetch(
    `${BASE_URL}/${id}/read`,
    {
      method: "PATCH",
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }

  return true;
}

export async function markAllNotificationsRead() {
  const response = await fetch(
    `${BASE_URL}/read-all`,
    {
      method: "PATCH",
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }

  return response.json(); // returns { updated: number }
}

export async function deleteNotification(id) {
  const response = await fetch(
    `${BASE_URL}/${id}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    },
  );

  // Safely intercept standard REST 204 No Content responses
  if (!response.ok && response.status !== 204) {
    throw new Error("Failed to delete notification");
  }

  return true;
}

export async function getNotificationTicket() {
  const response = await fetch(
    `${BASE_URL}/ws-ticket`,
    {
      method: "POST",
      headers: getHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to retrieve websocket ticket");
  }

  return response.json(); // returns { ticket: "..." }
}