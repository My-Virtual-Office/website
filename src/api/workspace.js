import { getCurrentUserId } from "../utils/auth";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "X-User-Id": String(getCurrentUserId()),
    "X-User-Role": "USER",
  };
}

export async function fetchMyWorkspaces() {
  const response = await fetch("/api/workspace/mine", {
    method: "GET",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch workspaces");
  const data = await response.json();
  return data.content || data || [];
}

export async function createWorkspace({ name, slug }) {
  const response = await fetch("/api/workspace", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, slug }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to create workspace");
  }
  return response.json();
}
