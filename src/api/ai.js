import axiosInstance from "./axiosInstance";

/**
 * Ask the workspace assistant. `messages` is the running conversation
 * ([{role:"user"|"assistant", content}]) — the service keeps no state, so send
 * the recent turns each time.
 *
 * Resolves to { reply, toolsUsed }. Throws an Error whose message is already
 * user-facing (the service returns actionable text for quota/key problems).
 */
export async function askAi(workspaceId, messages) {
  try {
    const res = await axiosInstance.post("/api/ai/chat", { workspaceId, messages });
    return { reply: res.data?.reply ?? "", toolsUsed: res.data?.toolsUsed ?? [] };
  } catch (e) {
    const data = e?.response?.data;
    throw new Error(data?.error || data?.detail || "The assistant is unavailable right now.");
  }
}
