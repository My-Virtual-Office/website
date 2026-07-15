import "./MeetingsModal.css";
import { useState, useEffect, useCallback } from "react";
import {
  X, Plus, Trash2, Calendar, Clock, Bell, Users, ChevronLeft, ChevronRight, List, LayoutGrid, Check,
  Link2, AlignLeft, Repeat } from "lucide-react";
import { createEvent, updateEvent, getEvents, deleteEvent } from "../../../../api/calendar";
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

// Event colours. The first ("" = default) is the app blue used when no colour is
// set, so old events and quick-created ones keep the look they have now.
const EVENT_COLORS = [
  { v: "", hex: "#1164a3", label: "Default blue" },
  { v: "#7c3aed", hex: "#7c3aed", label: "Purple" },
  { v: "#0f9d58", hex: "#0f9d58", label: "Green" },
  { v: "#e8710a", hex: "#e8710a", label: "Orange" },
  { v: "#d93025", hex: "#d93025", label: "Red" },
  { v: "#00838f", hex: "#00838f", label: "Teal" },
  { v: "#616161", hex: "#616161", label: "Graphite" },
];
export const eventHex = (color) =>
  (EVENT_COLORS.find((c) => c.v === color) || EVENT_COLORS[0]).hex;

const WEEKDAYS = [
  { d: 0, label: "S" }, { d: 1, label: "M" }, { d: 2, label: "T" }, { d: 3, label: "W" },
  { d: 4, label: "T" }, { d: 5, label: "F" }, { d: 6, label: "S" },
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
  const [color, setColor] = useState(""); // "" = default blue
  const [description, setDescription] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  // Repeat is client-side expansion, not a live recurrence rule: picking "weekly"
  // creates N independent events up front (the same way the seed's own recurring
  // events are pre-expanded). Editing one occurrence later only edits that one —
  // simple, and avoids "this event / this and following / all" edit semantics.
  const [repeatOn, setRepeatOn] = useState(false);
  const [repeatDays, setRepeatDays] = useState(() => new Set());
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [reminder, setReminder] = useState("10");
  const [people, setPeople] = useState([]); // [{userId, name, email}]
  const [attendeeIds, setAttendeeIds] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("week"); // "week" | "list"
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [quickOpen, setQuickOpen] = useState(false); // Google-Calendar-style create popup
  const [editing, setEditing] = useState(null); // event being edited (null = creating)
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

  // Grid drag-create → prefill start/end and pop the Google-Calendar-style create window.
  const onPickSlot = (startDate, endDate) => {
    setEditing(null);
    setTitle("");
    setColor("");
    setDescription("");
    setMeetingLink("");
    setRepeatOn(false);
    setRepeatDays(new Set());
    setAttendeeIds(new Set());
    setStart(toLocalInput(startDate));
    setEnd(toLocalInput(endDate));
    setQuickOpen(true);
  };

  // Click an existing event → open the popup pre-filled to edit it.
  const openEdit = (ev) => {
    setEditing(ev);
    setTitle(ev.title || "");
    setStart(toLocalInput(new Date(ev.startTime)));
    setEnd(toLocalInput(new Date(ev.endTime)));
    setBusy(ev.busy !== false);
    setColor(ev.color || "");
    setDescription(ev.description || "");
    setMeetingLink(ev.meetingLink || "");
    setRepeatOn(false); // editing is always a single occurrence — never re-expand
    setReminder(ev.reminderMinutes != null ? String(ev.reminderMinutes) : "");
    setAttendeeIds(new Set(ev.attendeeUserIds || []));
    setQuickOpen(true);
  };
  const closeQuick = () => { setQuickOpen(false); setEditing(null); };
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

  // Every occurrence of a repeated meeting, as concrete {startTime, endTime} pairs.
  // Same weekday set each week, same clock time and duration as the form's start/end;
  // only occurrences on/after the original start are kept (no creating into the past
  // on week 0 for a weekday earlier in that week than the one you're creating from).
  const buildOccurrences = () => {
    const s0 = new Date(start);
    const e0 = new Date(end);
    const durationMs = e0.getTime() - s0.getTime();
    const weekStartOf = (d) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; };
    const base = weekStartOf(s0);
    const days = repeatDays.size ? [...repeatDays] : [s0.getDay()];
    const out = [];
    for (let w = 0; w < repeatWeeks; w++) {
      for (const d of days) {
        const occStart = new Date(base);
        occStart.setDate(occStart.getDate() + w * 7 + d);
        occStart.setHours(s0.getHours(), s0.getMinutes(), 0, 0);
        if (occStart.getTime() < s0.getTime()) continue; // don't create into the past
        out.push({ startTime: occStart.toISOString(), endTime: new Date(occStart.getTime() + durationMs).toISOString() });
      }
    }
    out.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    return out;
  };

  const add = async () => {
    if (!title.trim()) return notify("Give the meeting a title", "warning");
    if (new Date(end) <= new Date(start)) return notify("End must be after start", "warning");
    setSaving(true);
    try {
      const attendees = people
        .filter((p) => attendeeIds.has(p.userId))
        .map((p) => ({ userId: p.userId, email: p.email || null }));
      const common = {
        title: title.trim(),
        description: description.trim() || null,
        meetingLink: meetingLink.trim() || null,
        busy,
        color: color || null,
        reminderMinutes: reminder ? Number(reminder) : null,
        attendees,
      };

      if (editing) {
        await updateEvent(editing.id, {
          ...common,
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
        });
      } else if (repeatOn) {
        const occurrences = buildOccurrences();
        const results = await Promise.allSettled(
          occurrences.map((o) => createEvent({ workspaceId, ...common, ...o })),
        );
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          notify(`Created ${occurrences.length - failed}/${occurrences.length} occurrences — ${failed} failed`, "warning");
        } else {
          notify(`Created ${occurrences.length} occurrences`, "success");
        }
      } else {
        await createEvent({
          ...common,
          workspaceId,
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
        });
      }

      setTitle("");
      setColor("");
      setDescription("");
      setMeetingLink("");
      setRepeatOn(false);
      setRepeatDays(new Set());
      setAttendeeIds(new Set());
      setQuickOpen(false);
      setEditing(null);
      await load();
      if (!repeatOn || editing) {
        notify(
          editing
            ? "Meeting updated"
            : attendees.length
              ? `Meeting added — invited ${attendees.length} ${attendees.length === 1 ? "person" : "people"}`
              : "Meeting added — your status auto-updates during it",
          "success",
        );
      }
    } catch (e) {
      notify(e?.response?.data?.message || (editing ? "Could not update — owner or admin only" : "Could not create meeting"), "error");
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

          <label className="meet-field">
            <span><AlignLeft size={14} /> Description</span>
            <textarea
              className="meet-textarea"
              placeholder="What's this meeting for? (optional)"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="meet-field">
            <span><Link2 size={14} /> Meeting link</span>
            <input
              className="meet-input-sm"
              type="url"
              placeholder="https://meet.google.com/… (optional)"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </label>

          <label className="meet-reminder">
            <span><Bell size={14} /> Reminder</span>
            <select value={reminder} onChange={(e) => setReminder(e.target.value)}>
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>{o.label}</option>
              ))}
            </select>
          </label>

          {/* Repeat is only offered on create — editing always touches one occurrence. */}
          {!editing && (
            <div className="meet-repeat">
              <label className="meet-repeat-toggle">
                <input
                  type="checkbox"
                  checked={repeatOn}
                  onChange={(e) => {
                    setRepeatOn(e.target.checked);
                    if (e.target.checked && repeatDays.size === 0) {
                      setRepeatDays(new Set([new Date(start).getDay()]));
                    }
                  }}
                />
                <Repeat size={14} /> Repeat weekly
              </label>
              {repeatOn && (
                <div className="meet-repeat-body">
                  <div className="meet-repeat-days">
                    {WEEKDAYS.map((wd) => (
                      <button
                        key={wd.d}
                        type="button"
                        className={`meet-day ${repeatDays.has(wd.d) ? "on" : ""}`}
                        onClick={() =>
                          setRepeatDays((prev) => {
                            const next = new Set(prev);
                            if (next.has(wd.d)) next.delete(wd.d);
                            else next.add(wd.d);
                            return next;
                          })
                        }
                      >
                        {wd.label}
                      </button>
                    ))}
                  </div>
                  <label className="meet-repeat-weeks">
                    for
                    <input
                      type="number" min={1} max={26} value={repeatWeeks}
                      onChange={(e) => setRepeatWeeks(Math.max(1, Math.min(26, Number(e.target.value) || 1)))}
                    />
                    weeks
                  </label>
                </div>
              )}
            </div>
          )}

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

          <div className="meet-colors">
            <span className="meet-colors-label">Color</span>
            <div className="meet-colors-swatches">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.v || "default"}
                  type="button"
                  className={`meet-swatch ${color === c.v ? "active" : ""}`}
                  style={{ background: c.hex }}
                  onClick={() => setColor(c.v)}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={color === c.v}
                >
                  {color === c.v && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>

          <label className="meet-busy">
            <input type="checkbox" checked={busy} onChange={(e) => setBusy(e.target.checked)} />
            Set me to “In a meeting” during this event
          </label>
          <button className="meet-add" onClick={add} disabled={saving}>
            <Plus size={16} /> {editing ? "Save changes" : "Add meeting"}
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
              <span className="meet-row-color" style={{ background: eventHex(e.color) }} />
              <div className="meet-row-main">
                <span className="meet-row-title">{e.title}</span>
                <span className="meet-row-time">
                  <Clock size={12} /> {fmt(e.startTime)} – {fmt(e.endTime)}
                  {e.busy && <span className="meet-busy-chip">busy</span>}
                </span>
              </div>
              {e.meetingLink && (
                <a
                  className="meet-row-link"
                  href={e.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(ev) => ev.stopPropagation()}
                  title="Join meeting link"
                >
                  <Link2 size={14} />
                </a>
              )}
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
            <span className="meet-weekhint">Drag on the grid to create an event</span>
          </div>
          <WeekGrid
            weekStart={weekStart}
            events={events}
            onPick={onPickSlot}
            selected={selectedSlot}
            showSelected={quickOpen}
            onDelete={remove}
            onEventClick={openEdit}
          />
        </div>
      ) : (
        <div className="meet-listwrap">
          <div className="meet-listbar">
            <button className="meet-create" onClick={() => setQuickOpen(true)}>
              <Plus size={15} /> Create event
            </button>
          </div>
          {listPanel}
        </div>
      )}

      {/* Google-Calendar-style create window (drag on grid or "Create event") */}
      {quickOpen && (
        <div className="meet-quick-overlay" onClick={closeQuick}>
          <div className="meet-quick" onClick={(e) => e.stopPropagation()}>
            <div className="meet-quick-head">
              <span>{editing ? "Edit event" : "New event"}</span>
              <button className="meet-close" onClick={closeQuick} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {formPanel}
          </div>
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
