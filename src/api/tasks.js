// Task assignment API. Mirrors the header-based auth used by the chat and
// notifications services: the gateway sets X-User-Id after validating the JWT,
// and the tasks-service trusts it. Assigning a task triggers a TASK_ASSIGNED
// notification for the assignee (produced by the tasks-service, delivered by
// the notifications-service over WebSocket).

const BASE_URL = "/api/tasks";

const getHeaders = () => {
  const userId = localStorage.getItem("userId") || "1";
  return {
    "Content-Type": "application/json",
    "X-User-Id": String(userId),
    "X-User-Role": "USER",
  };
};

// Assigns a task to a user. `assigneeUserId` and `title` are required; the rest
// enrich the resulting notification. Undefined fields are dropped so the body
// stays clean.
export async function assignTask({
  title,
  description,
  assigneeUserId,
  workspaceId,
  dueAt,
  assignedByName,
}) {
  const payload = { title, assigneeUserId };
  if (description) payload.description = description;
  if (workspaceId != null) payload.workspaceId = workspaceId;
  if (dueAt) payload.dueAt = dueAt;
  if (assignedByName) payload.assignedByName = assignedByName;

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Failed to assign task";
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      /* response had no JSON body — keep the default message */
    }
    throw new Error(message);
  }

  return res.json();
}
