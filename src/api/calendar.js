import axiosInstance from "./axiosInstance";

/** Create a calendar event (drives auto-status + optional reminders/attendees). */
export async function createEvent({
  workspaceId,
  title,
  description,
  startTime,
  endTime,
  busy,
  reminderMinutes,
  attendees,
}) {
  const res = await axiosInstance.post("/api/calendar/events", {
    workspaceId,
    title,
    description: description || null,
    startTime,
    endTime,
    busy: busy !== false,
    reminderMinutes: reminderMinutes ?? null,
    attendees: attendees ?? [],
  });
  return res.data;
}

/** List my events in a workspace between two ISO instants. */
export async function getEvents(workspaceId, from, to) {
  const params = new URLSearchParams({ workspaceId });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await axiosInstance.get(`/api/calendar/events?${params.toString()}`);
  return res.data ?? [];
}

/** My currently-active event, or null. */
export async function getCurrentEvent(workspaceId) {
  const res = await axiosInstance.get(`/api/calendar/events/current?workspaceId=${workspaceId}`);
  return res.status === 204 ? null : res.data;
}

/** Delete one of my events. */
export async function deleteEvent(id) {
  await axiosInstance.delete(`/api/calendar/events/${id}`);
}
