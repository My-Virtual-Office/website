import "./MyDesk.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Check, Trash2, StickyNote, Pencil, Eraser, ListTodo, Flag, Play, Pause, RotateCcw, Timer, X } from "lucide-react";
import {
  getMyTasks, createTask, updateTask, deleteTask,
  TASK_STATUSES, STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR,
} from "../../../../api/tasks";
import { getMembers } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import { getCurrentUserId } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";

const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const NOTE_COLORS = ["#fde68a", "#fca5a5", "#a7f3d0", "#bfdbfe", "#ddd6fe", "#fbcfe8"];
const load = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export default function MyDesk({ workspaceId }) {
  const { notify } = useDialogs();
  const me = getCurrentUserId();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const nsNotes = `vo-desk-notes-${workspaceId}-${me}`;
  const nsWb = `vo-desk-wb-${workspaceId}-${me}`;
  const [notes, setNotes] = useState(() => load(nsNotes, []));
  const [editingTask, setEditingTask] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => setNotes(load(nsNotes, [])), [nsNotes]);
  useEffect(() => save(nsNotes, notes), [nsNotes, notes]);

  // Workspace members for the task detail's assignee dropdown.
  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      try {
        const [desks, users] = await Promise.all([getMembers(workspaceId), getAllUsers().catch(() => [])]);
        const byId = {};
        users.forEach((u) => (byId[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim()));
        setMembers((desks || []).filter((d) => d.userId != null).map((d) => ({
          userId: d.userId, name: byId[d.userId] || d.fullName || `User ${d.userId}`,
        })));
      } catch { /* best-effort */ }
    })();
  }, [workspaceId]);

  const reload = useCallback(async () => {
    if (!workspaceId) return;
    try { setTasks(await getMyTasks(workspaceId)); } catch { /* starting */ }
  }, [workspaceId]);
  useEffect(() => { reload(); }, [reload]);

  const today = startOfDay(new Date()).getTime();
  const isToday = (t) => t.dueDate && startOfDay(t.dueDate).getTime() === today;
  const overdue = (t) => t.dueDate && startOfDay(t.dueDate).getTime() < today && t.status !== "COMPLETE";
  // Today's focus list: due today, overdue, or in-progress; completed sink to the bottom.
  const focus = tasks
    .filter((t) => isToday(t) || overdue(t) || t.status === "IN_PROGRESS" || t.status !== "COMPLETE")
    .sort((a, b) => (a.status === "COMPLETE") - (b.status === "COMPLETE") || (overdue(b) - overdue(a)));

  const toggleDone = async (t) => {
    const status = t.status === "COMPLETE" ? "TODO" : "COMPLETE";
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, status } : x)));
    try { await updateTask(t.id, { status }); } catch { reload(); }
  };

  const addTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    try {
      await createTask({ workspaceId, title, assigneeUserId: me, dueDate: new Date(today + DAY / 2).toISOString() });
      setNewTask("");
      reload();
    } catch (e) {
      notify(e?.response?.data?.message || "Could not add task", "error");
    }
  };

  const addNote = () =>
    setNotes((n) => [...n, { id: Date.now(), text: "", color: NOTE_COLORS[n.length % NOTE_COLORS.length] }]);
  const editNote = (id, text) => setNotes((n) => n.map((x) => (x.id === id ? { ...x, text } : x)));
  const cycleColor = (id) =>
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, color: NOTE_COLORS[(NOTE_COLORS.indexOf(x.color) + 1) % NOTE_COLORS.length] } : x)));
  const delNote = (id) => setNotes((n) => n.filter((x) => x.id !== id));

  const doneCount = focus.filter((t) => t.status === "COMPLETE").length;

  return (
    <div className="desk">
      <div className="desk-head">
        <div>
          <h1>My Desk</h1>
          <span className="desk-date">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </span>
        </div>
        <div className="desk-progress">
          <span>{doneCount}/{focus.length} done today</span>
          <div className="desk-bar"><div style={{ width: `${focus.length ? (doneCount / focus.length) * 100 : 0}%` }} /></div>
        </div>
      </div>

      <div className="desk-grid">
        <div className="desk-col">
          {/* My tasks — grouped by status; click a task for full details */}
          <section className="desk-card desk-tasks">
            <div className="desk-card-head">
              <ListTodo size={17} /> My Tasks <span className="desk-hcount">{tasks.length}</span>
            </div>
            <div className="desk-add">
              <input
                placeholder="Add a task for today…"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <button onClick={addTask}><Plus size={16} /></button>
            </div>
            <div className="desk-sections">
              {tasks.length === 0 && <div className="desk-empty">Nothing on your plate — add a task to get going.</div>}
              {TASK_STATUSES.map((status) => {
                const list = tasks.filter((t) => t.status === status);
                if (list.length === 0) return null;
                return (
                  <div key={status} className="desk-section">
                    <div className="desk-sec-head">
                      <span className="desk-sec-dot" style={{ background: STATUS_COLOR[status] }} />
                      {STATUS_LABEL[status]} <span className="desk-sec-count">{list.length}</span>
                    </div>
                    {list.map((t) => (
                      <div key={t.id} className={`desk-task clickable ${t.status === "COMPLETE" ? "done" : ""}`} onClick={() => setEditingTask(t)}>
                        <button className="desk-check" onClick={(e) => { e.stopPropagation(); toggleDone(t); }}>
                          {t.status === "COMPLETE" ? <Check size={14} /> : null}
                        </button>
                        <span className="desk-task-title">{t.title}</span>
                        {t.priority && t.priority !== "NORMAL" && (
                          <span className="desk-flag" style={{ color: PRIORITY_COLOR[t.priority] }}><Flag size={12} /></span>
                        )}
                        {overdue(t) && <span className="desk-od">overdue</span>}
                        <span className="desk-num">#{t.taskNumber}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Break hub: focus timer + relaxing mini-games */}
          <BreakCard />
        </div>

        <div className="desk-col">
          {/* Whiteboard */}
          <Whiteboard storeKey={nsWb} />

          {/* Sticky notes */}
          <section className="desk-card desk-notes">
            <div className="desk-card-head">
              <StickyNote size={17} /> Sticky Notes
              <button className="desk-note-add" onClick={addNote}><Plus size={15} /> Note</button>
            </div>
            <div className="desk-note-wall">
              {notes.length === 0 && <div className="desk-empty">Pin a reminder to your desk.</div>}
              {notes.map((n) => (
                <div key={n.id} className="sticky" style={{ background: n.color }}>
                  <div className="sticky-bar">
                    <button title="Change color" onClick={() => cycleColor(n.id)} className="sticky-color" />
                    <button title="Remove" onClick={() => delNote(n.id)} className="sticky-del"><Trash2 size={13} /></button>
                  </div>
                  <textarea
                    value={n.text}
                    placeholder="Write a note…"
                    onChange={(e) => editNote(n.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {editingTask && (
        <TaskDetail
          task={editingTask}
          members={members}
          onClose={() => setEditingTask(null)}
          onSaved={() => { setEditingTask(null); reload(); }}
          onDeleted={() => { setEditingTask(null); reload(); }}
        />
      )}
    </div>
  );
}

// A small freehand whiteboard saved to localStorage as a data URL.
function Whiteboard({ storeKey }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const saved = localStorage.getItem(storeKey);
    if (saved) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = saved;
    }
  }, [storeKey]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: (cx / r.width) * canvasRef.current.width, y: (cy / r.height) * canvasRef.current.height };
  };
  const start = (e) => { drawing.current = true; last.current = pos(e); };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const p = pos(e);
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    try { localStorage.setItem(storeKey, canvasRef.current.toDataURL("image/png")); } catch { /* quota */ }
  };
  const clear = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    try { localStorage.removeItem(storeKey); } catch { /* ignore */ }
  };

  return (
    <section className="desk-card desk-wb">
      <div className="desk-card-head">
        <Pencil size={17} /> Whiteboard
        <button className="desk-wb-clear" onClick={clear}><Eraser size={14} /> Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={360}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
    </section>
  );
}

// Break hub: a focus timer + a couple of relaxing mini-games.
function BreakCard() {
  const [tab, setTab] = useState("focus");
  return (
    <section className="desk-card desk-play">
      <div className="desk-card-head">
        <Timer size={17} /> Take a Break
        <div className="play-tabs">
          <button className={tab === "focus" ? "on" : ""} onClick={() => setTab("focus")}>Focus</button>
          <button className={tab === "memory" ? "on" : ""} onClick={() => setTab("memory")}>Memory</button>
          <button className={tab === "breathe" ? "on" : ""} onClick={() => setTab("breathe")}>Breathe</button>
        </div>
      </div>
      {tab === "focus" && <FocusTimer />}
      {tab === "memory" && <MemoryGame />}
      {tab === "breathe" && <Breathe />}
    </section>
  );
}

const PRESETS = [{ m: 25, l: "Focus" }, { m: 5, l: "Short" }, { m: 15, l: "Long" }];
function FocusTimer() {
  const [total, setTotal] = useState(25 * 60);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft((s) => { if (s <= 1) { setRunning(false); return 0; } return s - 1; }), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mmss = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const pct = total ? 1 - left / total : 0;
  const setPreset = (m) => { setRunning(false); setTotal(m * 60); setLeft(m * 60); };
  return (
    <div className="focus">
      <div className="focus-ring" style={{ background: `conic-gradient(#5b8def ${pct * 360}deg, var(--hover-bg) 0)` }}>
        <div className="focus-inner"><span className="focus-time">{mmss}</span></div>
      </div>
      <div className="focus-presets">
        {PRESETS.map((p) => (
          <button key={p.m} className={total === p.m * 60 ? "on" : ""} onClick={() => setPreset(p.m)}>{p.l}</button>
        ))}
      </div>
      <div className="focus-ctrl">
        <button className="focus-go" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause size={15} /> : <Play size={15} />} {running ? "Pause" : "Start"}
        </button>
        <button className="focus-reset" onClick={() => { setRunning(false); setLeft(total); }}><RotateCcw size={15} /></button>
      </div>
    </div>
  );
}

const MEM_EMOJIS = ["🌸", "🍀", "🌊", "🔥", "⭐", "🍉", "🎈", "🦋"];
function MemoryGame() {
  const [deck, setDeck] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(() => new Set());
  const [moves, setMoves] = useState(0);
  const shuffle = () => {
    const d = [...MEM_EMOJIS, ...MEM_EMOJIS].map((e, i) => ({ id: i, e })).sort(() => Math.random() - 0.5);
    setDeck(d); setFlipped([]); setMatched(new Set()); setMoves(0);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { shuffle(); }, []);
  const flip = (i) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.has(deck[i].e)) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (deck[a].e === deck[b].e) { setMatched((s) => new Set(s).add(deck[a].e)); setTimeout(() => setFlipped([]), 320); }
      else setTimeout(() => setFlipped([]), 720);
    }
  };
  const won = matched.size === MEM_EMOJIS.length && deck.length > 0;
  return (
    <div className="memory">
      <div className="memory-grid">
        {deck.map((c, i) => {
          const open = flipped.includes(i) || matched.has(c.e);
          return (
            <button key={c.id} className={`mcard ${open ? "open" : ""}`} onClick={() => flip(i)}>
              <span>{open ? c.e : "?"}</span>
            </button>
          );
        })}
      </div>
      <div className="memory-foot">
        <span>{won ? "🎉 Solved!" : `Moves: ${moves}`}</span>
        <button onClick={shuffle}>New game</button>
      </div>
    </div>
  );
}

function Breathe() {
  return (
    <div className="breathe">
      <div className="breathe-bubble"><span>breathe</span></div>
      <div className="breathe-hint">In as the circle grows, out as it shrinks.</div>
    </div>
  );
}

// Full task detail — view + update everything (status, priority, assignee, due), or delete.
function TaskDetail({ task, members, onClose, onSaved, onDeleted }) {
  const { confirm, notify } = useDialogs();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority || "NORMAL");
  const [assignee, setAssignee] = useState(task.assigneeUserId ?? "");
  const p = (n) => String(n).padStart(2, "0");
  const toLocal = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const [due, setDue] = useState(task.dueDate ? toLocal(task.dueDate) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return notify("Give the task a title", "warning");
    setSaving(true);
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description || null,
        status,
        priority,
        assigneeUserId: assignee === "" ? null : Number(assignee),
        dueDate: due ? new Date(due).toISOString() : null,
      });
      onSaved();
    } catch (e) {
      notify(e?.response?.data?.message || "Could not save task", "error");
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!(await confirm({ title: "Delete task", message: `Delete “${task.title}”?`, confirmText: "Delete", tone: "danger" }))) return;
    try { await deleteTask(task.id); onDeleted(); } catch { notify("Could not delete", "error"); }
  };

  return (
    <div className="desk-overlay" onClick={onClose}>
      <div className="desk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="desk-modal-head">
          <span>Task #{task.taskNumber}</span>
          <button className="desk-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="desk-modal-body">
          <input className="desk-minput desk-mtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
          <textarea className="desk-minput desk-mdesc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description…" />
          <div className="desk-mfields">
            <label>Status
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label>Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {["LOW", "NORMAL", "HIGH"].map((pr) => <option key={pr} value={pr}>{pr[0] + pr.slice(1).toLowerCase()}</option>)}
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
          </div>
        </div>
        <div className="desk-modal-foot">
          <button className="desk-mdel" onClick={remove}><Trash2 size={15} /> Delete</button>
          <div className="desk-mfoot-right">
            <button className="desk-mcancel" onClick={onClose}>Cancel</button>
            <button className="desk-msave" onClick={save} disabled={saving}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
