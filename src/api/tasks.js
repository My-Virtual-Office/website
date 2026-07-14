import axiosInstance from "./axiosInstance";

/** Create a task. */
export async function createTask(body) {
  const res = await axiosInstance.post("/api/tasks", body);
  return res.data;
}

/** List tasks with optional filters (workspaceId required). q searches title+description. */
export async function getTasks(workspaceId, { spaceId, assigneeUserId, status, q } = {}) {
  const params = new URLSearchParams({ workspaceId });
  if (spaceId != null) params.set("spaceId", spaceId);
  if (assigneeUserId != null) params.set("assigneeUserId", assigneeUserId);
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const res = await axiosInstance.get(`/api/tasks?${params.toString()}`);
  return res.data ?? [];
}

// ─────────────────────────── Team Spaces ───────────────────────────

/** Team Spaces I can access in a workspace (auto-creates a shared "General" on first visit). */
export async function getSpaces(workspaceId) {
  const res = await axiosInstance.get(`/api/tasks/spaces?workspaceId=${workspaceId}`);
  return res.data ?? [];
}

/** Create a Team Space. memberUserIds = who else can access it (creator is always added). */
export async function createSpace({ workspaceId, name, memberUserIds }) {
  const res = await axiosInstance.post("/api/tasks/spaces", {
    workspaceId,
    name,
    memberUserIds: memberUserIds ?? [],
  });
  return res.data;
}

/** Rename a space and/or replace its member set. */
export async function updateSpace(id, { name, memberUserIds }) {
  const res = await axiosInstance.patch(`/api/tasks/spaces/${id}`, {
    name: name ?? null,
    memberUserIds: memberUserIds ?? null,
  });
  return res.data;
}

/** Delete a space and its tasks (creator only). */
export async function deleteSpace(id) {
  await axiosInstance.delete(`/api/tasks/spaces/${id}`);
}

/** Tasks assigned to me. */
export async function getMyTasks(workspaceId) {
  const res = await axiosInstance.get(`/api/tasks/mine?workspaceId=${workspaceId}`);
  return res.data ?? [];
}

/** Fetch a task by its per-workspace number (for @task-N chat mentions). */
export async function getTaskByNumber(workspaceId, taskNumber) {
  const res = await axiosInstance.get(`/api/tasks/by-number/${workspaceId}/${taskNumber}`);
  return res.data;
}

/** Partial update (status move, reassign, edit). */
export async function updateTask(id, patch) {
  const res = await axiosInstance.patch(`/api/tasks/${id}`, patch);
  return res.data;
}

export async function deleteTask(id) {
  await axiosInstance.delete(`/api/tasks/${id}`);
}

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETE"];
export const STATUS_LABEL = { TODO: "To do", IN_PROGRESS: "In progress", COMPLETE: "Complete" };
export const STATUS_COLOR = { TODO: "#9aa0a6", IN_PROGRESS: "#5b8def", COMPLETE: "#2bac76" };
export const PRIORITY_COLOR = { LOW: "#9aa0a6", NORMAL: "#5b8def", HIGH: "#e8a33d" };
