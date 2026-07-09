import { getCurrentUserId } from "../utils/auth";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "X-User-Id": String(getCurrentUserId()),
    "X-User-Role": "USER",
  };
}

export async function fetchRooms(workspaceId) {
  const response = await fetch(
    `/api/chat/rooms?workspaceId=${workspaceId}&page=1&limit=20`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
  if (!response.ok) throw new Error("Failed to fetch rooms");
  const data = await response.json();
  return data.content || [];
}

export async function fetchChannels(workspaceId) {
  const response = await fetch(
    `/api/chat/channels?workspaceId=${workspaceId}&page=1&limit=20`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );
  if (!response.ok) throw new Error("Failed to fetch channels");
  const data = await response.json();
  return data.content || [];
}

export async function createRoom(name, workspaceId) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      workspaceId,
      members: [getCurrentUserId()],
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to create room");
  }
  return response.json();
}

export async function createChannel(name, workspaceId) {
  const response = await fetch("/api/chat/channels", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      workspaceId,
      members: [getCurrentUserId()],
    }),
  });
  if (response.status === 409) return null;
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to create channel");
  }
  return response.json();
}

export async function joinChannel(channelId) {
  const response = await fetch(`/api/chat/channels/${channelId}/join`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (response.status === 400) throw new Error("Cannot join this channel");
  if (!response.ok) throw new Error("Failed to join channel");
}

export async function fetchDMs() {
  const response = await fetch("/api/chat/dm?page=1&limit=20", {
    method: "GET",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch DMs");
  const data = await response.json();
  return data.content || [];
}
