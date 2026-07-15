import { authHeaders } from "../utils/auth";

// room-service (:8086) behind the gateway's /api/rooms/** route. Rooms are the backing
// object for voice channels: each one owns an Agora channel and a bound chat channel.

/** Read the {status,error,message} envelope GlobalExceptionHandler returns; fall back to status. */
async function fail(res, fallback) {
  let message = fallback;
  try {
    const body = await res.json();
    if (body?.message) message = body.message;
  } catch {
    /* non-JSON error body — keep the fallback */
  }
  const err = new Error(message);
  err.status = res.status;
  throw err;
}

/**
 * Voice channels in a workspace. scope=workspace lists all of them, not just the ones we have
 * already joined — a channel you cannot see is a channel you can never click into.
 */
export async function getRooms(workspaceId) {
  const res = await fetch(`/api/rooms?workspaceId=${workspaceId}&page=1&limit=50&scope=workspace`, {
    headers: authHeaders(),
  });
  if (!res.ok) await fail(res, "Failed to load voice channels");
  const data = await res.json();
  return data.content || [];
}

export async function createRoom({ workspaceId, name, maxParticipants }) {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ workspaceId, name, maxParticipants }),
  });
  if (!res.ok) await fail(res, "Failed to create voice channel");
  return res.json();
}

/**
 * Join: adds us to the room, mints a per-user Agora token, and returns the live roster.
 * Also returns agoraAppId, so the browser needs no build-time Agora config.
 * 409 = room is full.
 */
export async function joinRoom(roomId) {
  const res = await fetch(`/api/rooms/${roomId}/join`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    await fail(res, res.status === 409 ? "This voice channel is full" : "Failed to join voice channel");
  }
  return res.json();
}

export async function leaveRoom(roomId) {
  const res = await fetch(`/api/rooms/${roomId}/leave`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) await fail(res, "Failed to leave voice channel");
}

/** Live participants of one room (member-only — 403 for rooms you have not joined). */
export async function getParticipants(roomId) {
  const res = await fetch(`/api/rooms/${roomId}/participants`, { headers: authHeaders() });
  if (!res.ok) await fail(res, "Failed to load participants");
  return res.json();
}

/**
 * Occupancy of every voice room in the workspace: { roomId: [participant, ...] }.
 * One call for the whole sidebar — per-room /participants is member-gated, so polling it for
 * each channel would 403 on every channel we have not joined.
 */
export async function getWorkspacePresence(workspaceId) {
  const res = await fetch(`/api/rooms/presence?workspaceId=${workspaceId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) await fail(res, "Failed to load voice presence");
  return res.json();
}
