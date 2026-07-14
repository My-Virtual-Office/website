import "./MeetingsModal.css";
import { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, Calendar, Clock, Bell, Users } from "lucide-react";
import { createEvent, getEvents, deleteEvent } from "../../../../api/calendar";
import { getMembers } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import { getCurrentUserId } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";

const REMINDER_OPTIONS = [
  { v: "", label: "No reminder" },
  { v: "5", label: "5 min before" },
  { v: "10", label: "10 min before" },
  { v: "30", label: "30 min before" },
  { v: "60", label: "1 hour before" },
];

/** Local datetime-local string (YYYY-MM-DDTHH:mm) for an offset in minutes from now. */
function localInput(minutesFromNow) {
  const d = new Date(Date.now() + minutesFromNow * 60000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

const fmt = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function MeetingsModal({ workspaceId, open, onClose }) {
  const { notify } = useDialogs();
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(localInput(5));
  const [end, setEnd] = useState(localInput(35));
  const [busy, setBusy] = useState(true);
  const [reminder, setReminder] = useState("10");
  const [people, setPeople] = useState([]); // [{userId, name, email}]
  const [attendeeIds, setAttendeeIds] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const me = getCurrentUserId();

  // Load workspace members (with emails) for the attendee picker.
  useEffect(() => {
    if (!open || !workspaceId) return;
    (async () => {
      try {
        const [desks, users] = await Promise.all([
          getMembers(workspaceId),
          getAllUsers().catch(() => []),
        ]);
        const byId = {};
        users.forEach((u) => {
          byId[u.id] = { name: `${u.firstName || ""} ${u.lastName || ""}`.trim(), email: u.email };
        });
        setPeople(
          (desks || [])
            .filter((d) => d.userId != null && d.userId !== me)
            .map((d) => ({
              userId: d.userId,
              name: byId[d.userId]?.name || d.fullName || `User ${d.userId}`,
              email: byId[d.userId]?.email || d.workEmail || "",
            })),
        );
      } catch {
        setPeople([]);
      }
    })();
  }, [open, workspaceId, me]);

  const toggleAttendee = (userId) =>
    setAttendeeIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      setEvents(await getEvents(workspaceId, from, to));
    } catch {
      /* calendar-service may still be starting */
    }
  }, [workspaceId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open) return null;

  const add = async () => {
    if (!title.trim()) return notify("Give the meeting a title", "warning");
    if (new Date(end) <= new Date(start)) return notify("End must be after start", "warning");
    setSaving(true);
    try {
      const attendees = people
        .filter((p) => attendeeIds.has(p.userId))
        .map((p) => ({ userId: p.userId, email: p.email || null }));
      await createEvent({
        workspaceId,
        title: title.trim(),
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        busy,
        reminderMinutes: reminder ? Number(reminder) : null,
        attendees,
      });
      setTitle("");
      setAttendeeIds(new Set());
      await load();
      notify(
        attendees.length
          ? `Meeting added — invited ${attendees.length} ${attendees.length === 1 ? "person" : "people"}`
          : "Meeting added — your status auto-updates during it",
        "success",
      );
    } catch (e) {
      notify(e?.response?.data?.message || "Could not create meeting", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteEvent(id);
      setEvents((ev) => ev.filter((e) => e.id !== id));
    } catch {
      notify("Could not delete", "error");
    }
  };

  return (
    <div className="meet-overlay" onClick={onClose}>
      <div className="meet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="meet-head">
          <span className="meet-title">
            <Calendar size={18} /> Meetings
          </span>
          <button className="meet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="meet-form">
          <input
            className="meet-input"
            placeholder="Meeting title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="meet-times">
            <label>
              Start
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              End
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <label className="meet-reminder">
            <span><Bell size={14} /> Reminder</span>
            <select value={reminder} onChange={(e) => setReminder(e.target.value)}>
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>{o.label}</option>
              ))}
            </select>
          </label>

          {people.length > 0 && (
            <div className="meet-attendees">
              <div className="meet-attendees-head">
                <Users size={14} /> Invite people{attendeeIds.size > 0 ? ` (${attendeeIds.size})` : ""}
                <span className="meet-attendees-hint">they get an email + reminder</span>
              </div>
              <div className="meet-attendees-list">
                {people.map((p) => (
                  <label key={p.userId} className={`meet-att ${attendeeIds.has(p.userId) ? "on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={attendeeIds.has(p.userId)}
                      onChange={() => toggleAttendee(p.userId)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="meet-busy">
            <input type="checkbox" checked={busy} onChange={(e) => setBusy(e.target.checked)} />
            Set me to “In a meeting” during this event
          </label>
          <button className="meet-add" onClick={add} disabled={saving}>
            <Plus size={16} /> Add meeting
          </button>
        </div>

        <div className="meet-list">
          <div className="meet-list-title">Upcoming</div>
          {events.length === 0 ? (
            <div className="meet-empty">No upcoming meetings</div>
          ) : (
            events
              .slice()
              .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
              .map((e) => (
                <div className="meet-row" key={e.id}>
                  <div className="meet-row-main">
                    <span className="meet-row-title">{e.title}</span>
                    <span className="meet-row-time">
                      <Clock size={12} /> {fmt(e.startTime)} – {fmt(e.endTime)}
                      {e.busy && <span className="meet-busy-chip">busy</span>}
                    </span>
                  </div>
                  <button className="meet-del" onClick={() => remove(e.id)} title="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
