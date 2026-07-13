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

/** Accept a workspace invitation by token → creates a MEMBER desk for the caller. */
export async function acceptInvite(token) {
  const res = await axiosInstance.post(
    `/api/invitations/accept?token=${encodeURIComponent(token)}`,
  );
  return res.data;
}

/** Build a URL-safe slug from a workspace name (3-40 chars, [a-z0-9-], alnum ends). */
export function slugify(name) {
  let s = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (s.length < 3) s = `${s || "office"}-${Date.now().toString(36)}`.slice(0, 40);
  return s.replace(/^-+|-+$/g, "");
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
