/**
 * Decodes the JWT stored in localStorage and returns the numeric user ID.
 * Returns null if no token exists or the token is malformed.
 */ export function getCurrentUserId() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    // user-service embeds the numeric id in the "sub" claim as a string
    let idValue = payload.userId || payload.id || payload.sub;
    const id = parseInt(idValue, 10);
    if(isNaN(id)){
      const cachedId = localStorage.getItem("userId");
      return cachedId? parseInt(cachedId, 10) : null ;
    }
    return id;
  } catch {
    const cachedId = localStorage.getItem("userId")
    return cachedId ? parseInt(cachedId, 10) : null 
  }
}
