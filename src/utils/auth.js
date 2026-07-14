/**
 * Decodes the JWT stored in localStorage and returns the numeric user ID.
 * Returns null if no token exists or the token is malformed.
 */ export function getCurrentUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    // The numeric id lives in the "userId" claim; "sub" is the user's email
    // (see user-service JwtUtil). Fall back to sub only for legacy numeric-subject tokens.
    const raw = payload.userId != null ? payload.userId : payload.sub;
    const id = parseInt(raw, 10);
    return isNaN(id) ? null : id;
  } catch {
    const cachedId = localStorage.getItem("userId")
    return cachedId ? parseInt(cachedId, 10) : null 
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
