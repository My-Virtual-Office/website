import "./TasksBoard.css";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Plus, X, Trash2, Flag, CalendarDays, User, ListTodo } from "lucide-react";
import {
  createTask, getTasks, updateTask, deleteTask,
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
const fmtDue = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
const localDT = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function TasksBoard({ workspaceId, focus }) {
  const { confirm, notify } = useDialogs();
  const [tasks, setTasks] = useState([]);
  const [board, setBoard] = useState("date"); // "date" | "assignee"
  const [q, setQ] = useState("");

  // When opened from a #<number> chat mention, focus that task.
  useEffect(() => {
    if (focus?.n) setQ(`#${focus.n}`);
  }, [focus]);
  const [mineOnly, setMineOnly] = useState(false);
  const [members, setMembers] = useState([]); // [{userId, name}]
  const [editing, setEditing] = useState(null); // task or {new:true, status, dueBucket}
  const me = getCurrentUserId();

  const nameOf = useCallback(
    (uid) => members.find((m) => m.userId === uid)?.name || (uid ? `User ${uid}` : "Unassigned"),
    [members],
  );

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setTasks(await getTasks(workspaceId, {}));
    } catch {
      /* tasks-service may still be starting */
    }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

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
    try { await updateTask(task.id, { status }); } catch { notify("Could not move task", "error"); load(); }
  };

  const remove = async (task) => {
    if (!(await confirm({ title: "Delete task", message: `Delete “${task.title}”?`, confirmText: "Delete", tone: "danger" }))) return;
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    try { await deleteTask(task.id); } catch { notify("Could not delete", "error"); load(); }
  };

  // Swimlanes: either date buckets or assignees.
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

  const Card = ({ t }) => (
    <div
      className="tb-card"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/task", String(t.id))}
      onClick={() => setEditing(t)}
    >
      <div className="tb-card-title">{t.title}</div>
      <div className="tb-card-meta">
        <span className="tb-num">#{t.taskNumber}</span>
        {t.priority && t.priority !== "NORMAL" && (
          <span className="tb-flag" style={{ color: PRIORITY_COLOR[t.priority] }}><Flag size={11} /> {t.priority.toLowerCase()}</span>
        )}
        {t.dueDate && <span className="tb-due"><CalendarDays size={11} /> {fmtDue(t.dueDate)}</span>}
        {t.assigneeUserId && <span className="tb-assignee">{nameOf(t.assigneeUserId)}</span>}
      </div>
    </div>
  );

  return (
    <div className="tasks-board">
      <div className="tb-head">
        <div className="tb-title"><ListTodo size={18} /> Tasks</div>
        <div className="tb-tools">
          <div className="tb-search"><Search size={15} /><input placeholder="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <button className={`tb-toggle ${mineOnly ? "on" : ""}`} onClick={() => setMineOnly((v) => !v)}><User size={14} /> My tasks</button>
          <button className="tb-add" onClick={() => setEditing({ new: true, status: "TODO" })}><Plus size={15} /> Add task</button>
        </div>
      </div>

      <div className="tb-boardswitch">
        <button className={board === "date" ? "on" : ""} onClick={() => setBoard("date")}><CalendarDays size={14} /> Today · Tomorrow · Next</button>
        <button className={board === "assignee" ? "on" : ""} onClick={() => setBoard("assignee")}><User size={14} /> Tasks per person</button>
      </div>

      <div className="tb-scroll">
        {lanes.length === 0 && <div className="tb-empty">No tasks yet. Add one to get started.</div>}
        {lanes.map((lane) => {
          const laneTasks = visible.filter(lane.match);
          if (board === "assignee" && laneTasks.length === 0) return null;
          return (
            <div className="tb-lane" key={lane.key}>
              <div className="tb-lane-head" style={{ color: lane.color }}>
                {lane.label} <span className="tb-lane-count">{laneTasks.length}</span>
              </div>
              <div className="tb-cols">
                {TASK_STATUSES.map((status) => (
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
                    <div className="tb-col-head">
                      <span className="tb-dot" style={{ background: STATUS_COLOR[status] }} />
                      {STATUS_LABEL[status]}
                      <span className="tb-col-count">{laneTasks.filter((t) => t.status === status).length}</span>
                    </div>
                    {laneTasks.filter((t) => t.status === status).map((t) => <Card key={t.id} t={t} />)}
                    <button
                      className="tb-quickadd"
                      onClick={() =>
                        setEditing({
                          new: true, status,
                          dueBucket: board === "date" ? lane.key : undefined,
                          assigneeUserId: board === "assignee" ? Number(lane.key.slice(1)) || null : undefined,
                        })
                      }
                    >
                      <Plus size={13} /> Add task
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <TaskModal
          task={editing}
          workspaceId={workspaceId}
          members={members}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          onDelete={editing.new ? null : () => { remove(editing); setEditing(null); }}
        />
      )}
    </div>
  );
}

function TaskModal({ task, workspaceId, members, onClose, onSaved, onDelete }) {
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
      if (isNew) await createTask({ workspaceId, ...body });
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
