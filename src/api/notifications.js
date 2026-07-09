import { getCurrentUserId } from "../utils/auth";

// Base notifications path based on the backend endpoints
const API_BASE = "/api/notifications";

// Helper function to prepare request headers
const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "X-User-Id": String(getCurrentUserId()),
});

// 1. Fetch notifications list (supports pagination)
export const fetchNotifications = async (page = 1, size = 20) => {
  const response = await fetch(`${API_BASE}?page=${page}&size=${size}`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
};

// 2. Fetch unread notifications count for the badge
export const fetchUnreadCount = async () => {
  const response = await fetch(`${API_BASE}/unread-count`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch unread count");
  return response.json();
};

// 3. Mark a single notification as read when clicked
export const markNotificationAsRead = async (id) => {
  const response = await fetch(`${API_BASE}/${id}/read`, {
    method: "PATCH",
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to mark as read");
  return response;
};

// 4. Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
  const response = await fetch(`${API_BASE}/read-all`, {
    method: "PATCH",
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to mark all as read");
  return response;
};

// 5. Delete a specific notification
export const deleteNotification = async (id) => {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete notification");
  return response;
};

// 6. Fetch WebSocket ticket for real-time connection
export const getWebSocketTicket = async () => {
  const response = await fetch(`${API_BASE}/ws-ticket`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to get WS ticket");

  const data = await response.json();
  return data.ticket;
};
