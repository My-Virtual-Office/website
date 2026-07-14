import "./MeetingsModal.css";
import { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Trash2, Calendar, Clock, Bell, Users, ChevronLeft, ChevronRight, List, LayoutGrid,
} from "lucide-react";
import { createEvent, getEvents, deleteEvent } from "../../../../api/calendar";
import { getMembers } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import { getCurrentUserId } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";
import WeekGrid, { startOfWeek } from "./WeekGrid";

const REMINDER_OPTIONS = [
  { v: "", label: "No reminder" },
  { v: "5", label: "5 min before" },
  { v: "10", label: "10 min before" },
  { v: "30", label: "30 min before" },
  { v: "60", label: "1 hour before" },
];

const pad2 = (n) => String(n).padStart(2, "0");

/** A Date → datetime-local string (YYYY-MM-DDTHH:mm). */
function toLocalInput(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}`;
}

/** Local datetime-local string for an offset in minutes from now. */
function localInput(minutesFromNow) {
  return toLocalInput(new Date(Date.now() + minutesFromNow * 60000));
}

const weekLabel = (ws) => {
  const end = new Date(ws);
  end.setDate(end.getDate() + 6);
  const opt = { month: "short", day: "numeric" };
  return `${ws.toLocaleDateString(undefined, opt)} – ${end.toLocaleDateString(undefined, opt)}`;
};

const fmt = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function MeetingsModal({ workspaceId, open, onClose, inline = false }) {
  const { notify } = useDialogs();
  const shown = inline || open; // inline mode is always "open"
  const [events, setEvents] = useState([]);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(localInput(5));
  const [end, setEnd] = useState(localInput(35));
  const [busy, setBusy] = useState(true);
  const [reminder, setReminder] = useState("10");
  const [people, setPeople] = useState([]); // [{userId, name, email}]
  const [attendeeIds, setAttendeeIds] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("week"); // "week" | "list"
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [showForm, setShowForm] = useState(false); // List view: toggled by "Create event"
  const me = getCurrentUserId();

  // Load workspace members (with emails) for the attendee picker.
  useEffect(() => {
    if ((!inline && !open) || !workspaceId) return;
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
  }, [inline, open, workspaceId, me]);

  const toggleAttendee = (userId) =>
    setAttendeeIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      // Cover both the visible week and the 30-day "upcoming" list in one fetch.
      const from = new Date(Math.min(weekStart.getTime() - 7 * 864e5, Date.now()));
      const to = new Date(Math.max(weekStart.getTime() + 14 * 864e5, Date.now() + 30 * 864e5));
      setEvents(await getEvents(workspaceId, from.toISOString(), to.toISOString()));
    } catch {
      /* calendar-service may still be starting */
    }
  }, [workspaceId, weekStart]);

  useEffect(() => {
    if (shown) load();
  }, [inline, open, shown, load]);

  // Grid drag-create → prefill the form's start/end with the picked slot.
  const onPickSlot = (startDate, endDate) => {
    setStart(toLocalInput(startDate));
    setEnd(toLocalInput(endDate));
  };
  const shiftWeek = (days) =>
    setWeekStart((ws) => {
      const n = new Date(ws);
      n.setDate(n.getDate() + days);
      return n;
    });

  if (!shown) return null;

  // The grid highlights whatever slot the form currently describes.
  const selectedSlot = (() => {
    const s = new Date(start);
    const e = new Date(end);
    return isNaN(s) || isNaN(e) ? null : { start: s, end: e };
  })();

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

  const formPanel = (
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
  );

  const listPanel = (
    <div className="meet-list">
      <div className="meet-list-title">Upcoming</div>
      {events.filter((e) => new Date(e.endTime) >= new Date()).length === 0 ? (
        <div className="meet-empty">No upcoming meetings</div>
      ) : (
        events
          .filter((e) => new Date(e.endTime) >= new Date())
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
  );

  const content = (
    <>
      <div className="meet-head">
        <span className="meet-title">
          <Calendar size={18} /> Meetings
        </span>
        <div className="meet-viewtoggle">
          <button className={view === "week" ? "on" : ""} onClick={() => setView("week")}>
            <LayoutGrid size={14} /> Week
          </button>
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
            <List size={14} /> List
          </button>
        </div>
        {!inline && (
          <button className="meet-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}
      </div>

      {view === "week" ? (
        <div className="meet-weekwrap">
          <div className="meet-weekmain">
            <div className="meet-weeknav">
              <button onClick={() => shiftWeek(-7)} title="Previous week">
                <ChevronLeft size={16} />
              </button>
              <button className="today" onClick={() => setWeekStart(startOfWeek(new Date()))}>
                Today
              </button>
              <button onClick={() => shiftWeek(7)} title="Next week">
                <ChevronRight size={16} />
              </button>
              <span className="meet-weeklabel">{weekLabel(weekStart)}</span>
              <span className="meet-weekhint">Drag on the grid to pick a time</span>
            </div>
            <WeekGrid
              weekStart={weekStart}
              events={events}
              onPick={onPickSlot}
              selected={selectedSlot}
              onDelete={remove}
            />
          </div>
          <div className="meet-side">{formPanel}</div>
        </div>
      ) : (
        <div className="meet-listwrap">
          <div className="meet-listbar">
            <button className="meet-create" onClick={() => setShowForm((s) => !s)}>
              {showForm ? <X size={15} /> : <Plus size={15} />} {showForm ? "Close" : "Create event"}
            </button>
          </div>
          {showForm && formPanel}
          {listPanel}
        </div>
      )}
    </>
  );

  if (inline) {
    return <div className="meet-page">{content}</div>;
  }
  return (
    <div className="meet-overlay" onClick={onClose}>
      <div className={`meet-modal ${view === "week" ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}
