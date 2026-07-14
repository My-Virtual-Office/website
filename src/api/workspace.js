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

/** Members (desks) of a workspace: [{id(deskId), userId, fullName, title, teamId, role, personalImageUrl, isOnline, ...}]. */
export async function getMembers(workspaceId) {
  const res = await axiosInstance.get(`/api/workspace/${workspaceId}/desks?page=0&size=100`);
  // DeskController returns a PageResponse; content holds the rows.
  return res.data?.content ?? res.data ?? [];
}

/** The caller's own desk in the workspace (carries their role). */
export async function getMyDesk(workspaceId) {
  const res = await axiosInstance.get(`/api/workspace/${workspaceId}/desks/me`);
  return res.data;
}

/** Set my presence status (ACTIVE | AWAY | DO_NOT_DISTURB | FOCUS_MODE | CUSTOM). */
export async function updateStatus(workspaceId, deskId, { status, statusEmoji, statusCustomText }) {
  const res = await axiosInstance.patch(
    `/api/workspace/${workspaceId}/desks/${deskId}/status`,
    { status, statusEmoji: statusEmoji || null, statusCustomText: statusCustomText || null },
  );
  return res.data;
}

/** Teams in a workspace. */
export async function getTeams(workspaceId) {
  const res = await axiosInstance.get(`/api/workspace/${workspaceId}/teams`);
  return res.data ?? [];
}

/** ADMIN: set a member's role / title / team (teamId 0 unassigns). */
export async function updateMembership(workspaceId, deskId, { role, title, teamId }) {
  const res = await axiosInstance.patch(
    `/api/workspace/${workspaceId}/desks/${deskId}/membership`,
    { role, title, teamId },
  );
  return res.data;
}

/** ADMIN team CRUD. */
export async function createTeam(workspaceId, { name, description }) {
  const res = await axiosInstance.post(`/api/workspace/${workspaceId}/teams`, { name, description });
  return res.data;
}
export async function updateTeam(workspaceId, teamId, { name, description }) {
  const res = await axiosInstance.put(`/api/workspace/${workspaceId}/teams/${teamId}`, { name, description });
  return res.data;
}
export async function deleteTeam(workspaceId, teamId) {
  await axiosInstance.delete(`/api/workspace/${workspaceId}/teams/${teamId}`);
}

/** ADMIN: invite someone by email with a role → returns an invitation with a token. */
export async function createInvitation(workspaceId, { email, role }) {
  const res = await axiosInstance.post(`/api/workspace/${workspaceId}/invitations`, { email, role });
  return res.data;
}

/** ADMIN: all invitations for a workspace (any status). */
export async function getInvitations(workspaceId) {
  const res = await axiosInstance.get(`/api/workspace/${workspaceId}/invitations`);
  return res.data ?? [];
}

/** ADMIN: revoke (deactivate) an invitation, invalidating its link. */
export async function revokeInvitation(workspaceId, invitationId) {
  await axiosInstance.delete(`/api/workspace/${workspaceId}/invitations/${invitationId}`);
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
