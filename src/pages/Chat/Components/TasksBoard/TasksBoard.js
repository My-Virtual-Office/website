import "./TasksBoard.css";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search, Plus, X, Trash2, Flag, CalendarDays, User, ChevronDown, ChevronRight,
  Users, Settings2, Layers, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import {
  createTask, getTasks, updateTask, deleteTask, getTaskByNumber,
  getSpaces, createSpace, updateSpace, deleteSpace,
  TASK_STATUSES, STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR,
} from "../../../../api/tasks";
import { getMembers, getMyDesk, getTeams } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import { getCurrentUserId } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const DAY = 86400000;
const dayKey = (d) => startOfDay(d).getTime();
const todayKey = () => startOfDay(new Date()).getTime();

// A day band's label: Today / Tomorrow / weekday / dated.
function dayLabel(ms) {
  const diff = Math.round((ms - todayKey()) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const d = new Date(ms);
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function dayColor(ms) {
  const diff = Math.round((ms - todayKey()) / DAY);
  if (diff < 0) return "#9aa0a6";
  if (diff === 0) return "#2bac76";
  if (diff === 1) return "#5b8def";
  return "#8b5cf6";
}
// Card's relative due chip.
function relDue(iso) {
  if (!iso) return "";
  const diff = Math.round((dayKey(iso) - todayKey()) / DAY);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${-diff} days ago`;
  if (diff > 0 && diff < 7) return new Date(iso).toLocaleDateString(undefined, { weekday: "short" });
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
const localDT = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
// Noon on a given day (stable due time when rescheduling by drag/quick-add).
const noonISO = (ms) => new Date(ms + 12 * 3600000).toISOString();

const persist = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export default function TasksBoard({ workspaceId, focus }) {
  const { confirm, notify } = useDialogs();
  const [spaces, setSpaces] = useState([]);
  const [activeSpace, setActiveSpace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [board, setBoard] = useState("date"); // "date" | "assignee"
  const [q, setQ] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [spaceModal, setSpaceModal] = useState(null);
  const [daysAhead, setDaysAhead] = useState(10); // infinite scroll horizon (grows on scroll)
  const [railOpen, setRailOpen] = useState(() => persist("vo-tb-rail-open", true));
  const [railW, setRailW] = useState(() => persist("vo-tb-rail-w", 232));
  const [isAdmin, setIsAdmin] = useState(false); // only admins/owners can create spaces
  const gridRef = useRef(null);
  const me = getCurrentUserId();

  useEffect(() => save("vo-tb-rail-open", railOpen), [railOpen]);
  useEffect(() => save("vo-tb-rail-w", railW), [railW]);

  const nameOf = useCallback(
    (uid) => members.find((m) => m.userId === uid)?.name || (uid ? `User ${uid}` : "Unassigned"),
    [members],
  );

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      try {
        const [desks, users, myDesk, teamList] = await Promise.all([
          getMembers(workspaceId),
          getAllUsers().catch(() => []),
          getMyDesk(workspaceId).catch(() => null),
          getTeams(workspaceId).catch(() => []),
        ]);
        const byId = {};
        users.forEach((u) => (byId[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim()));
        const role = myDesk?.role || (desks || []).find((d) => String(d.userId) === String(me))?.role;
        setIsAdmin(["ADMIN", "OWNER"].includes(role));
        setTeams(Array.isArray(teamList) ? teamList : []);
        setMembers(
          (desks || []).filter((d) => d.userId != null).map((d) => ({
            userId: d.userId, name: byId[d.userId] || d.fullName || `User ${d.userId}`, teamId: d.teamId,
          })),
        );
      } catch { /* names best-effort */ }
    })();
  }, [workspaceId, me]);

  const loadSpaces = useCallback(async () => {
    if (!workspaceId) return [];
    try {
      const s = await getSpaces(workspaceId);
      setSpaces(s);
      setActiveSpace((cur) => (cur && s.some((x) => x.id === cur) ? cur : s[0]?.id ?? null));
      return s;
    } catch { return []; }
  }, [workspaceId]);

  useEffect(() => { loadSpaces(); }, [loadSpaces]);

  const loadTasks = useCallback(async () => {
    if (!workspaceId || !activeSpace) { setTasks([]); return; }
    try { setTasks(await getTasks(workspaceId, { spaceId: activeSpace })); } catch { /* starting */ }
  }, [workspaceId, activeSpace]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    if (!focus?.n || !workspaceId) return;
    (async () => {
      try {
        const t = await getTaskByNumber(workspaceId, focus.n);
        if (t?.spaceId) setActiveSpace(t.spaceId);
        setQ(`#${focus.n}`);
      } catch { setQ(`#${focus.n}`); }
    })();
  }, [focus, workspaceId]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tasks.filter((t) => {
      if (mineOnly && t.assigneeUserId !== me) return false;
      if (s && !`${t.title} ${t.description || ""} #${t.taskNumber}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [tasks, q, mineOnly, me]);

  // Patch a task (status and/or dueDate) with optimistic update.
  const patchTask = async (task, patch) => {
    const changed = Object.keys(patch).some((k) => task[k] !== patch[k]);
    if (!changed) return;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...patch } : t)));
    try { await updateTask(task.id, patch); } catch { notify("Could not update task", "error"); loadTasks(); }
  };

  const remove = async (task) => {
    if (!(await confirm({ title: "Delete task", message: `Delete “${task.title}”?`, confirmText: "Delete", tone: "danger" }))) return;
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    try { await deleteTask(task.id); } catch { notify("Could not delete", "error"); loadTasks(); }
  };

  const toggleBand = (key) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Swimlanes: infinite day bands (date view) or assignees.
  const lanes = useMemo(() => {
    if (board === "assignee") {
      const ids = [...new Set(visible.map((t) => t.assigneeUserId ?? 0))];
      const known = members.map((m) => m.userId).filter((id) => ids.includes(id));
      const ordered = [...new Set([...known, ...ids])];
      return ordered.map((id) => ({
        key: `a${id}`, label: id ? nameOf(id) : "Unassigned", color: "#5b8def", dropDue: undefined,
        assigneeUserId: id || null,
        match: (t) => (t.assigneeUserId ?? 0) === id,
      }));
    }
    const today = todayKey();
    const overdue = {
      key: "overdue", label: "Overdue", color: "#e01e5a", dropDue: undefined,
      match: (t) => t.dueDate && dayKey(t.dueDate) < today && t.status !== "COMPLETE",
    };
    // Day set: a rolling window (today..+daysAhead) plus any day that actually has a (non-overdue) task.
    const daySet = new Set();
    for (let i = 0; i <= daysAhead; i++) daySet.add(today + i * DAY);
    visible.forEach((t) => {
      if (!t.dueDate) return;
      const k = dayKey(t.dueDate);
      const isOverdue = k < today && t.status !== "COMPLETE";
      if (!isOverdue) daySet.add(k);
    });
    const dayLanes = [...daySet].sort((a, b) => a - b).map((k) => ({
      key: `d${k}`, label: dayLabel(k), color: dayColor(k), dropDue: noonISO(k),
      match: (t) => t.dueDate && dayKey(t.dueDate) === k && !(dayKey(t.dueDate) < today && t.status !== "COMPLETE"),
    }));
    const none = { key: "none", label: "No date", color: "#9aa0a6", dropDue: null, match: (t) => !t.dueDate };
    return [overdue, ...dayLanes, none];
  }, [board, visible, members, nameOf, daysAhead]);

  // Grow the horizon as the user scrolls toward the bottom (infinite scroll).
  const onScroll = (e) => {
    const el = e.currentTarget;
    if (board === "date" && el.scrollTop + el.clientHeight >= el.scrollHeight - 320 && daysAhead < 400) {
      setDaysAhead((d) => d + 10);
    }
  };

  const totals = useMemo(() => {
    const m = { TODO: 0, IN_PROGRESS: 0, COMPLETE: 0 };
    visible.forEach((t) => { if (m[t.status] != null) m[t.status] += 1; });
    return m;
  }, [visible]);

  // Rail resize (drag the divider).
  const onRailHandleDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = railW;
    const move = (ev) => setRailW(Math.max(180, Math.min(380, startW + (ev.clientX - startX))));
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  const activeSpaceObj = spaces.find((s) => s.id === activeSpace);

  const Card = ({ t }) => (
    <div
      className={`tb-card ${q && `#${t.taskNumber}` === q ? "focused" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/task", String(t.id));
      }}
      onClick={() => setEditing(t)}
    >
      <div className="tb-card-title">{t.title}</div>
      <div className="tb-card-meta">
        {t.dueDate && (
          <span className={`tb-chip tb-due ${dayKey(t.dueDate) < todayKey() && t.status !== "COMPLETE" ? "overdue" : ""}`}>
            <CalendarDays size={11} /> {relDue(t.dueDate)}
          </span>
        )}
        {t.priority && t.priority !== "NORMAL" && (
          <span className="tb-chip tb-flag" style={{ color: PRIORITY_COLOR[t.priority] }}>
            <Flag size={11} /> {t.priority.toLowerCase()}
          </span>
        )}
        {t.assigneeUserId && (
          <span className="tb-chip tb-assignee" title={nameOf(t.assigneeUserId)}>{initials(nameOf(t.assigneeUserId))}</span>
        )}
        <span className="tb-num">#{t.taskNumber}</span>
      </div>
    </div>
  );

  return (
    <div className="tasks-board">
      {/* ── Spaces rail (resizable + collapsible) ── */}
      {railOpen ? (
        <>
          <aside className="tb-spaces" style={{ width: railW }}>
            <div className="tb-spaces-head">
              <span><Layers size={15} /> Spaces</span>
              <div className="tb-spaces-head-btns">
                {isAdmin && (
                  <button className="tb-rail-toggle" title="New Space" onClick={() => setSpaceModal({ new: true })}>
                    <Plus size={16} />
                  </button>
                )}
                <button className="tb-rail-toggle" title="Hide spaces" onClick={() => setRailOpen(false)}>
                  <PanelLeftClose size={16} />
                </button>
              </div>
            </div>
            <div className="tb-spaces-list">
              {spaces.map((s) => (
                <button key={s.id} className={`tb-space ${s.id === activeSpace ? "active" : ""}`} onClick={() => setActiveSpace(s.id)}>
                  <span className="tb-space-icon" style={{ background: spaceColor(s.id) }}>{s.name.slice(0, 1).toUpperCase()}</span>
                  <span className="tb-space-name">{s.name}</span>
                  <span className="tb-space-count">{s.taskCount}</span>
                  <span className="tb-space-cog" title="Space settings" onClick={(e) => { e.stopPropagation(); setSpaceModal(s); }}>
                    <Settings2 size={13} />
                  </span>
                </button>
              ))}
            </div>
            {isAdmin && (
              <button className="tb-space-new" onClick={() => setSpaceModal({ new: true })}>
                <Plus size={15} /> New Space
              </button>
            )}
          </aside>
          <div className="tb-rail-resize" onMouseDown={onRailHandleDown} title="Drag to resize" />
        </>
      ) : (
        <button className="tb-rail-reopen" title="Show spaces" onClick={() => setRailOpen(true)}>
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* ── Board ── */}
      <div className="tb-main">
        <div className="tb-head">
          <div className="tb-title">
            <span className="tb-space-icon lg" style={{ background: spaceColor(activeSpace) }}>
              {(activeSpaceObj?.name || "T").slice(0, 1).toUpperCase()}
            </span>
            {activeSpaceObj?.name || "Tasks"}
            {activeSpaceObj && (
              <button
                className="tb-title-members"
                title="See who has access"
                onClick={() => setSpaceModal(activeSpaceObj)}
              >
                <Users size={13} /> {activeSpaceObj.memberUserIds?.length || 1}
              </button>
            )}
          </div>
          <div className="tb-tools">
            <div className="tb-search"><Search size={15} /><input placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <button className={`tb-toggle ${mineOnly ? "on" : ""}`} onClick={() => setMineOnly((v) => !v)}><User size={14} /> My tasks</button>
            <button className="tb-add" onClick={() => setEditing({ new: true, status: "TODO", spaceId: activeSpace })}><Plus size={15} /> Add task</button>
          </div>
        </div>

        <div className="tb-boardswitch">
          <button className={board === "date" ? "on" : ""} onClick={() => setBoard("date")}><CalendarDays size={14} /> By day</button>
          <button className={board === "assignee" ? "on" : ""} onClick={() => setBoard("assignee")}><User size={14} /> Tasks per person</button>
        </div>

        <div className="tb-grid" ref={gridRef} onScroll={onScroll}>
          <div className="tb-statusrow">
            {TASK_STATUSES.map((status) => (
              <div className="tb-statushead" key={status}>
                <span className="tb-dot" style={{ background: STATUS_COLOR[status] }} />
                {STATUS_LABEL[status]}
                <span className="tb-status-count">{totals[status]}</span>
              </div>
            ))}
          </div>

          {lanes.length === 0 && <div className="tb-empty">No tasks yet. Add one to get started.</div>}

          {lanes.map((lane) => {
            const laneTasks = visible.filter(lane.match);
            if (board === "assignee" && laneTasks.length === 0) return null;
            const isCollapsed = collapsed.has(lane.key);
            return (
              <div className="tb-band" key={lane.key}>
                <button className="tb-band-head" style={{ color: lane.color }} onClick={() => toggleBand(lane.key)}>
                  {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  <span className="tb-band-label">{lane.label}</span>
                  <span className="tb-band-count">{laneTasks.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="tb-cols">
                    {TASK_STATUSES.map((status) => {
                      const colTasks = laneTasks.filter((t) => t.status === status);
                      return (
                        <div
                          className="tb-col"
                          key={status}
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drop"); }}
                          onDragLeave={(e) => e.currentTarget.classList.remove("drop")}
                          onDrop={(e) => {
                            e.currentTarget.classList.remove("drop");
                            const id = Number(e.dataTransfer.getData("text/task"));
                            const t = tasks.find((x) => x.id === id);
                            if (!t) return;
                            const patch = { status };
                            // Dropping into a day/assignee band reschedules / reassigns too.
                            if (lane.dropDue !== undefined) patch.dueDate = lane.dropDue;
                            if (board === "assignee") patch.assigneeUserId = lane.assigneeUserId;
                            patchTask(t, patch);
                          }}
                        >
                          {colTasks.map((t) => <Card key={t.id} t={t} />)}
                          {status === "TODO" && (
                            <button
                              className="tb-quickadd"
                              onClick={() =>
                                setEditing({
                                  new: true, status: "TODO", spaceId: activeSpace,
                                  dueDatePrefill: board === "date" ? lane.dropDue : undefined,
                                  assigneeUserId: board === "assignee" ? lane.assigneeUserId : undefined,
                                })
                              }
                            >
                              <Plus size={13} /> Add Task
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {editing && (
        <TaskModal
          task={editing}
          workspaceId={workspaceId}
          spaceId={activeSpace}
          members={members}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadTasks(); loadSpaces(); }}
          onDelete={editing.new ? null : () => { remove(editing); setEditing(null); }}
        />
      )}

      {spaceModal && (
        <SpaceModal
          space={spaceModal}
          teams={teams}
          workspaceId={workspaceId}
          members={members}
          me={me}
          onClose={() => setSpaceModal(null)}
          onSaved={async (createdId) => {
            setSpaceModal(null);
            const s = await loadSpaces();
            if (createdId && s.some((x) => x.id === createdId)) setActiveSpace(createdId);
          }}
          onDeleted={async () => { setSpaceModal(null); await loadSpaces(); }}
        />
      )}
    </div>
  );
}

const initials = (name) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

const SPACE_COLORS = ["#5b8def", "#2bac76", "#e8a33d", "#8b5cf6", "#e01e5a", "#0ea5e9", "#f2762e"];
const spaceColor = (id) => SPACE_COLORS[Math.abs(Number(id) || 0) % SPACE_COLORS.length];

function TaskModal({ task, workspaceId, spaceId, members, onClose, onSaved, onDelete }) {
  const { notify } = useDialogs();
  const isNew = !!task.new;
  const [title, setTitle] = useState(isNew ? "" : task.title);
  const [description, setDescription] = useState(isNew ? "" : task.description || "");
  const [status, setStatus] = useState(task.status || "TODO");
  const [priority, setPriority] = useState(isNew ? "NORMAL" : task.priority || "NORMAL");
  const [assignee, setAssignee] = useState(isNew ? (task.assigneeUserId ?? "") : task.assigneeUserId ?? "");
  const [reminder, setReminder] = useState(isNew ? "" : (task.reminderMinutes ?? "") + "");
  const initialDue = isNew ? (task.dueDatePrefill ? localDT(task.dueDatePrefill) : "") : localDT(task.dueDate);
  const [due, setDue] = useState(initialDue);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return notify("Give the task a title", "warning");
    setSaving(true);
    const body = {
      title: title.trim(),
      description: description || null,
      status,
      priority,
      dueDate: due ? new Date(due).toISOString() : null,
      assigneeUserId: assignee === "" ? null : Number(assignee),
      reminderMinutes: reminder ? Number(reminder) : null,
    };
    try {
      if (isNew) await createTask({ workspaceId, spaceId: task.spaceId ?? spaceId, ...body });
      else await updateTask(task.id, body);
      onSaved();
    } catch (e) {
      notify(e?.response?.data?.message || "Could not save task", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tb-overlay" onClick={onClose}>
      <div className="tb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tb-modal-head">
          <span>{isNew ? "New task" : `Task #${task.taskNumber}`}</span>
          <button className="tb-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="tb-modal-body">
          <input className="tb-input tb-title-input" placeholder="Task title" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
          <textarea className="tb-input tb-desc" placeholder="Add a description…" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="tb-fields">
            <label>Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {["LOW", "NORMAL", "HIGH"].map((p) => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}
              </select>
            </label>
            <label>Assignee
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            </label>
            <label>Due
              <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            <label>Reminder
              <select value={reminder} onChange={(e) => setReminder(e.target.value)}>
                <option value="">None</option>
                <option value="10">10 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
            </label>
          </div>
        </div>
        <div className="tb-modal-foot">
          {onDelete && <button className="tb-del" onClick={onDelete}><Trash2 size={15} /> Delete</button>}
          <div className="tb-foot-right">
            <button className="tb-cancel" onClick={onClose}>Cancel</button>
            <button className="tb-save" onClick={save} disabled={saving}>{isNew ? "Create task" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpaceModal({ space, teams = [], workspaceId, members, me, onClose, onSaved, onDeleted }) {
  const { confirm, notify } = useDialogs();
  const isNew = !!space.new;
  const [name, setName] = useState(isNew ? "" : space.name);
  const [picked, setPicked] = useState(() => new Set((space.memberUserIds || []).filter((id) => id !== me)));
  const [mode, setMode] = useState("people"); // "people" | "teams"
  const [saving, setSaving] = useState(false);
  const isCreator = !isNew && space.createdBy === me;

  const toggle = (uid) => setPicked((prev) => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });

  // Members of a team (excluding me, who always has access).
  const teamMemberIds = (teamId) =>
    members.filter((m) => m.teamId === teamId && m.userId !== me).map((m) => m.userId);
  const teamFullyPicked = (teamId) => {
    const ids = teamMemberIds(teamId);
    return ids.length > 0 && ids.every((id) => picked.has(id));
  };
  const toggleTeam = (teamId) =>
    setPicked((prev) => {
      const n = new Set(prev);
      const ids = teamMemberIds(teamId);
      const all = ids.every((id) => n.has(id));
      ids.forEach((id) => (all ? n.delete(id) : n.add(id)));
      return n;
    });

  const submit = async () => {
    if (!name.trim()) return notify("Give the space a name", "warning");
    setSaving(true);
    try {
      const memberUserIds = [...picked];
      if (isNew) { const created = await createSpace({ workspaceId, name: name.trim(), memberUserIds }); onSaved(created.id); }
      else { await updateSpace(space.id, { name: name.trim(), memberUserIds }); onSaved(space.id); }
    } catch (e) {
      notify(e?.response?.data?.message || "Could not save space", "error");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: "Delete space", message: `Delete “${space.name}” and all its tasks?`, confirmText: "Delete", tone: "danger" }))) return;
    try { await deleteSpace(space.id); onDeleted(); } catch { notify("Could not delete space", "error"); }
  };

  return (
    <div className="tb-overlay" onClick={onClose}>
      <div className="tb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tb-modal-head">
          <span>{isNew ? "New Team Space" : "Space settings"}</span>
          <button className="tb-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="tb-modal-body">
          <input className="tb-input tb-title-input" placeholder="Space name (e.g. Engineering)" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
          <div className="tb-members-head"><Users size={14} /> Who can access this space</div>
          <div className="tb-members-hint">
            You always have access. Add people, or a whole team ({picked.size} added).
          </div>
          <div className="tb-access-tabs">
            <button className={mode === "people" ? "on" : ""} onClick={() => setMode("people")}>
              <User size={13} /> People
            </button>
            <button className={mode === "teams" ? "on" : ""} onClick={() => setMode("teams")}>
              <Layers size={13} /> Teams
            </button>
          </div>
          {mode === "people" ? (
            <div className="tb-members">
              {members.filter((m) => m.userId !== me).map((m) => (
                <label key={m.userId} className={`tb-member ${picked.has(m.userId) ? "on" : ""}`}>
                  <input type="checkbox" checked={picked.has(m.userId)} onChange={() => toggle(m.userId)} />
                  <span className="tb-member-av">{initials(m.name)}</span>
                  {m.name}
                </label>
              ))}
              {members.filter((m) => m.userId !== me).length === 0 && (
                <div className="tb-members-empty">No other members in this workspace yet.</div>
              )}
            </div>
          ) : (
            <div className="tb-members">
              {teams.map((t) => {
                const count = teamMemberIds(t.id).length;
                return (
                  <label key={t.id} className={`tb-member ${teamFullyPicked(t.id) ? "on" : ""}`}>
                    <input type="checkbox" checked={teamFullyPicked(t.id)} onChange={() => toggleTeam(t.id)} />
                    <span className="tb-member-av"><Layers size={13} /></span>
                    {t.name} <span className="tb-team-count">{count}</span>
                  </label>
                );
              })}
              {teams.length === 0 && <div className="tb-members-empty">No teams in this workspace yet.</div>}
            </div>
          )}
        </div>
        <div className="tb-modal-foot">
          {!isNew && isCreator && <button className="tb-del" onClick={remove}><Trash2 size={15} /> Delete</button>}
          <div className="tb-foot-right">
            <button className="tb-cancel" onClick={onClose}>Cancel</button>
            <button className="tb-save" onClick={submit} disabled={saving}>{isNew ? "Create Space" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
