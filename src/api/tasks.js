import axiosInstance from "./axiosInstance";

/** Create a task. */
export async function createTask(body) {
  const res = await axiosInstance.post("/api/tasks", body);
  return res.data;
}

/** List tasks with optional filters (workspaceId required). q searches title+description. */
export async function getTasks(workspaceId, { assigneeUserId, status, q } = {}) {
  const params = new URLSearchParams({ workspaceId });
  if (assigneeUserId != null) params.set("assigneeUserId", assigneeUserId);
  if (status) params.set("status", status);
  if (q) params.set("q", q);
  const res = await axiosInstance.get(`/api/tasks?${params.toString()}`);
  return res.data ?? [];
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
