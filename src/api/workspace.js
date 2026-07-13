import axiosInstance from "./axiosInstance";

/** All workspaces the current user has a desk (membership) in. */
export async function getMyWorkspaces() {
  const res = await axiosInstance.get("/api/workspace/mine");
  return res.data;
}

/** Create a workspace. The creator gets an active OWNER desk automatically. */
export async function createWorkspace({ name, slug, defaultTimezone }) {
  const res = await axiosInstance.post("/api/workspace", {
    name,
    slug,
    defaultTimezone,
  });
  return res.data;
}

/**
 * Resolve the user's active workspace, creating a default one if they have none.
 * Membership (a Desk) is required for chat channel operations, so every chat user
 * needs at least one workspace.
 */
export async function resolveWorkspace() {
  const list = await getMyWorkspaces();
  if (Array.isArray(list) && list.length > 0) return list[0];

  // Auto-create a first workspace. Slug must be 3-40 chars, [a-z0-9-], start/end alnum.
  const slug = `office-${Date.now().toString(36)}`.slice(0, 40);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return createWorkspace({ name: "My Workspace", slug, defaultTimezone: tz });
}
