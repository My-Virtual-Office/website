/**
 * Decodes the JWT stored in localStorage and returns the numeric user ID.
 * Returns null if no token exists or the token is malformed.
 */
export function getCurrentUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    // user-service embeds the numeric id in the "sub" claim as a string
    const id = parseInt(payload.sub, 10);
    return isNaN(id) ? null : id;
  } catch {
    return null;
  }
}

/**
 * Standard headers for authenticated backend calls made with fetch().
 * Includes the JWT bearer token (required by the API gateway) plus the
 * identity headers the chat-service expects. Pass `extra` to add/override.
 */
export function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  const userId = getCurrentUserId();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId != null
      ? { "X-User-Id": String(userId), "X-User-Role": "USER" }
      : {}),
    ...extra,
  };
}
