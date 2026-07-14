import "./TasksBoard.css";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Plus, X, Trash2, Flag, CalendarDays, User, ChevronDown, ChevronRight,
  Users, Settings2, Layers,
} from "lucide-react";
import {
  createTask, getTasks, updateTask, deleteTask, getTaskByNumber,
  getSpaces, createSpace, updateSpace, deleteSpace,
  TASK_STATUSES, STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR,
} from "../../../../api/tasks";
import { getMembers } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import { getCurrentUserId } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const DAY = 86400000;

function bucketOf(task) {
  if (!task.dueDate) return "none";
  const due = startOfDay(task.dueDate).getTime();
  const today = startOfDay(new Date()).getTime();
  if (due < today && task.status !== "COMPLETE") return "overdue";
  if (due === today) return "today";
  if (due === today + DAY) return "tomorrow";
  return "later";
}
const DATE_GROUPS = [
  { key: "overdue", label: "Overdue", color: "#e01e5a" },
  { key: "today", label: "Today", color: "#2bac76" },
  { key: "tomorrow", label: "Tomorrow", color: "#5b8def" },
  { key: "later", label: "Upcoming", color: "#8b5cf6" },
  { key: "none", label: "No date", color: "#9aa0a6" },
];

// ClickUp-style relative due date shown on cards.
function relDue(iso) {
  if (!iso) return "";
  const d = startOfDay(iso).getTime();
  const today = startOfDay(new Date()).getTime();
  const diff = Math.round((d - today) / DAY);
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

export default function TasksBoard({ workspaceId, focus }) {
  const { confirm, notify } = useDialogs();
  const [spaces, setSpaces] = useState([]);
  const [activeSpace, setActiveSpace] = useState(null); // space id
  const [tasks, setTasks] = useState([]);
  const [board, setBoard] = useState("date"); // "date" | "assignee"
  const [q, setQ] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [members, setMembers] = useState([]); // [{userId, name}]
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [editing, setEditing] = useState(null); // task or {new:true, status, dueBucket}
  const [spaceModal, setSpaceModal] = useState(null); // {new:true} | space
  const me = getCurrentUserId();

  const nameOf = useCallback(
    (uid) => members.find((m) => m.userId === uid)?.name || (uid ? `User ${uid}` : "Unassigned"),
    [members],
  );

  // Workspace members (names) — for assignee dropdowns + the space member picker.
  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      try {
        const [desks, users] = await Promise.all([getMembers(workspaceId), getAllUsers().catch(() => [])]);
        const byId = {};
        users.forEach((u) => (byId[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim()));
        setMembers(
          (desks || []).filter((d) => d.userId != null).map((d) => ({
            userId: d.userId, name: byId[d.userId] || d.fullName || `User ${d.userId}`,
          })),
        );
      } catch { /* names best-effort */ }
    })();
  }, [workspaceId]);

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

  // When opened from a #<number> chat mention, jump to the task's space + highlight it.
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

  const move = async (task, status) => {
    if (task.status === status) return;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try { await updateTask(task.id, { status }); } catch { notify("Could not move task", "error"); loadTasks(); }
  };

  const remove = async (task) => {
    if (!(await confirm({ title: "Delete task", message: `Delete “${task.title}”?`, confirmText: "Delete", tone: "danger" }))) return;
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    try { await deleteTask(task.id); } catch { notify("Could not delete", "error"); loadTasks(); }
  };

  const toggleBand = (key) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Swimlanes: date buckets or assignees.
  const lanes = useMemo(() => {
    if (board === "assignee") {
      const ids = [...new Set(visible.map((t) => t.assigneeUserId ?? 0))];
      const known = members.map((m) => m.userId).filter((id) => ids.includes(id));
      const ordered = [...new Set([...known, ...ids])];
      return ordered.map((id) => ({
        key: `a${id}`, label: id ? nameOf(id) : "Unassigned", color: "#5b8def",
        match: (t) => (t.assigneeUserId ?? 0) === id,
      }));
    }
    return DATE_GROUPS.map((g) => ({ ...g, match: (t) => bucketOf(t) === g.key }));
  }, [board, visible, members, nameOf]);

  const totals = useMemo(() => {
    const m = { TODO: 0, IN_PROGRESS: 0, COMPLETE: 0 };
    visible.forEach((t) => { if (m[t.status] != null) m[t.status] += 1; });
    return m;
  }, [visible]);

  const activeSpaceObj = spaces.find((s) => s.id === activeSpace);

  const Card = ({ t }) => (
    <div
      className={`tb-card ${q && `#${t.taskNumber}` === q ? "focused" : ""}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/task", String(t.id))}
      onClick={() => setEditing(t)}
    >
      <div className="tb-card-title">{t.title}</div>
      <div className="tb-card-meta">
        {t.dueDate && (
          <span className={`tb-chip tb-due ${bucketOf(t) === "overdue" ? "overdue" : ""}`}>
            <CalendarDays size={11} /> {relDue(t.dueDate)}
          </span>
        )}
        {t.priority && t.priority !== "NORMAL" && (
          <span className="tb-chip tb-flag" style={{ color: PRIORITY_COLOR[t.priority] }}>
            <Flag size={11} /> {t.priority.toLowerCase()}
          </span>
        )}
        {t.assigneeUserId && (
          <span className="tb-chip tb-assignee" title={nameOf(t.assigneeUserId)}>
            {initials(nameOf(t.assigneeUserId))}
          </span>
        )}
        <span className="tb-num">#{t.taskNumber}</span>
      </div>
    </div>
  );

  return (
    <div className="tasks-board">
      {/* ── Spaces rail ── */}
      <aside className="tb-spaces">
        <div className="tb-spaces-head"><Layers size={15} /> Spaces</div>
        <div className="tb-spaces-list">
          {spaces.map((s) => (
            <button
              key={s.id}
              className={`tb-space ${s.id === activeSpace ? "active" : ""}`}
              onClick={() => setActiveSpace(s.id)}
            >
              <span className="tb-space-icon" style={{ background: spaceColor(s.id) }}>
                {s.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="tb-space-name">{s.name}</span>
              <span className="tb-space-count">{s.taskCount}</span>
              <span
                className="tb-space-cog"
                title="Space settings"
                onClick={(e) => { e.stopPropagation(); setSpaceModal(s); }}
              >
                <Settings2 size={13} />
              </span>
            </button>
          ))}
        </div>
        <button className="tb-space-new" onClick={() => setSpaceModal({ new: true })}>
          <Plus size={15} /> New Space
        </button>
      </aside>

      {/* ── Board ── */}
      <div className="tb-main">
        <div className="tb-head">
          <div className="tb-title">
            <span className="tb-space-icon lg" style={{ background: spaceColor(activeSpace) }}>
              {(activeSpaceObj?.name || "T").slice(0, 1).toUpperCase()}
            </span>
            {activeSpaceObj?.name || "Tasks"}
            {activeSpaceObj && (
              <span className="tb-title-members" title="Members with access">
                <Users size={13} /> {activeSpaceObj.memberUserIds?.length || 1}
              </span>
            )}
          </div>
          <div className="tb-tools">
            <div className="tb-search"><Search size={15} /><input placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <button className={`tb-toggle ${mineOnly ? "on" : ""}`} onClick={() => setMineOnly((v) => !v)}><User size={14} /> My tasks</button>
            <button className="tb-add" onClick={() => setEditing({ new: true, status: "TODO", spaceId: activeSpace })}><Plus size={15} /> Add task</button>
          </div>
        </div>

        <div className="tb-boardswitch">
          <button className={board === "date" ? "on" : ""} onClick={() => setBoard("date")}><CalendarDays size={14} /> Today · Tomorrow · Next</button>
          <button className={board === "assignee" ? "on" : ""} onClick={() => setBoard("assignee")}><User size={14} /> Tasks per person</button>
        </div>

        <div className="tb-grid">
          {/* Sticky status column headers */}
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
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            const id = Number(e.dataTransfer.getData("text/task"));
                            const t = tasks.find((x) => x.id === id);
                            if (t) move(t, status);
                          }}
                        >
                          {colTasks.map((t) => <Card key={t.id} t={t} />)}
                          {/* Add task only in the TO DO column (per spec). */}
                          {status === "TODO" && (
                            <button
                              className="tb-quickadd"
                              onClick={() =>
                                setEditing({
                                  new: true, status: "TODO", spaceId: activeSpace,
                                  dueBucket: board === "date" ? lane.key : undefined,
                                  assigneeUserId: board === "assignee" ? Number(lane.key.slice(1)) || null : undefined,
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
  const initialDue = isNew
    ? (task.dueBucket === "today" ? localDT(new Date())
      : task.dueBucket === "tomorrow" ? localDT(new Date(Date.now() + DAY)) : "")
    : localDT(task.dueDate);
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

function SpaceModal({ space, workspaceId, members, me, onClose, onSaved, onDeleted }) {
  const { confirm, notify } = useDialogs();
  const isNew = !!space.new;
  const [name, setName] = useState(isNew ? "" : space.name);
  const [picked, setPicked] = useState(() => new Set((space.memberUserIds || []).filter((id) => id !== me)));
  const [saving, setSaving] = useState(false);
  const isCreator = !isNew && space.createdBy === me;

  const toggle = (uid) => setPicked((prev) => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n; });

  const save = async () => {
    if (!name.trim()) return notify("Give the space a name", "warning");
    setSaving(true);
    try {
      const memberUserIds = [...picked];
      if (isNew) {
        const created = await createSpace({ workspaceId, name: name.trim(), memberUserIds });
        onSaved(created.id);
      } else {
        await updateSpace(space.id, { name: name.trim(), memberUserIds });
        onSaved(space.id);
      }
    } catch (e) {
      notify(e?.response?.data?.message || "Could not save space", "error");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: "Delete space", message: `Delete “${space.name}” and all its tasks?`, confirmText: "Delete", tone: "danger" }))) return;
    try { await deleteSpace(space.id); onDeleted(); }
    catch { notify("Could not delete space", "error"); }
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
          <div className="tb-members-hint">You always have access. Pick teammates to add.</div>
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
        </div>
        <div className="tb-modal-foot">
          {!isNew && isCreator && <button className="tb-del" onClick={remove}><Trash2 size={15} /> Delete</button>}
          <div className="tb-foot-right">
            <button className="tb-cancel" onClick={onClose}>Cancel</button>
            <button className="tb-save" onClick={save} disabled={saving}>{isNew ? "Create Space" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
