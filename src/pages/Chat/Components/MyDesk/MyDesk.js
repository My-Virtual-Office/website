import "./MyDesk.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Check, Trash2, StickyNote, Pencil, Eraser, ListTodo, Flag, Play, Pause, RotateCcw, Timer, X, GripVertical, Search, Settings2, CalendarDays, Clock, Target } from "lucide-react";
import {
  getMyTasks, createTask, updateTask, deleteTask,
  TASK_STATUSES, STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR,
} from "../../../../api/tasks";
import { getEvents } from "../../../../api/calendar";
import { getMembers } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import { getCurrentUserId } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";

const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const NOTE_COLORS = ["#fde68a", "#fca5a5", "#a7f3d0", "#bfdbfe", "#ddd6fe", "#fbcfe8"];
const load = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

// `onEnterFocus` is only passed by the normal view — inside focus mode the desk renders without it,
// so the button that enters focus never shows up in the mode it enters.
export default function MyDesk({ workspaceId, onEnterFocus }) {
  const { notify } = useDialogs();
  const me = getCurrentUserId();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const nsNotes = `vo-desk-notes-${workspaceId}-${me}`;
  const nsWb = `vo-desk-wb-${workspaceId}-${me}`;
  const nsOrder = `vo-desk-order-${workspaceId}-${me}`;
  const [notes, setNotes] = useState(() => load(nsNotes, []));
  const [editingTask, setEditingTask] = useState(null);
  const [members, setMembers] = useState([]);
  // My preferred task order (list of task ids); drag-and-drop persists it per user.
  const [orderIds, setOrderIds] = useState(() => load(nsOrder, []));
  const [dragOver, setDragOver] = useState(null); // status section currently hovered while dragging
  const dragId = useRef(null);

  useEffect(() => setNotes(load(nsNotes, [])), [nsNotes]);
  useEffect(() => save(nsNotes, notes), [nsNotes, notes]);
  useEffect(() => setOrderIds(load(nsOrder, [])), [nsOrder]);
  useEffect(() => save(nsOrder, orderIds), [nsOrder, orderIds]);

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

  // Quick create with just a title (assigned to me, due today) — used by the quick-add bar.
  const addTask = async (rawTitle) => {
    const title = (rawTitle ?? newTask).trim();
    if (!title) return;
    try {
      await createTask({ workspaceId, title, assigneeUserId: me, dueDate: new Date(today + DAY / 2).toISOString() });
      setNewTask("");
      reload();
    } catch (e) {
      notify(e?.response?.data?.message || "Could not add task", "error");
    }
  };

  // Sort a section by my saved order; tasks I've never dragged fall back to newest-first.
  const byOrder = (a, b) => {
    const ra = orderIds.indexOf(a.id), rb = orderIds.indexOf(b.id);
    if (ra === -1 && rb === -1) return (b.taskNumber || 0) - (a.taskNumber || 0);
    if (ra === -1) return 1;
    if (rb === -1) return -1;
    return ra - rb;
  };

  // Drop a dragged task before `beforeId` (or at the end of `targetStatus` when null),
  // moving it between sections changes its status — just like the Tasks board.
  const applyDrop = async (targetStatus, beforeId) => {
    const id = dragId.current;
    dragId.current = null;
    setDragOver(null);
    if (id == null || id === beforeId) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setOrderIds((prev) => {
      const ids = tasks.map((t) => t.id);
      const order = prev.filter((x) => ids.includes(x));
      ids.forEach((x) => { if (!order.includes(x)) order.push(x); });
      const from = order.indexOf(id);
      if (from !== -1) order.splice(from, 1);
      let to = beforeId == null ? order.length : order.indexOf(beforeId);
      if (to === -1) to = order.length;
      order.splice(to, 0, id);
      return order;
    });

    if (targetStatus && task.status !== targetStatus) {
      setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, status: targetStatus } : x)));
      try { await updateTask(id, { status: targetStatus }); } catch { reload(); }
    }
  };

  const addNote = () =>
    setNotes((n) => [...n, { id: Date.now(), text: "", color: NOTE_COLORS[n.length % NOTE_COLORS.length] }]);
  const editNote = (id, text) => setNotes((n) => n.map((x) => (x.id === id ? { ...x, text } : x)));
  const cycleColor = (id) =>
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, color: NOTE_COLORS[(NOTE_COLORS.indexOf(x.color) + 1) % NOTE_COLORS.length] } : x)));
  const delNote = (id) => setNotes((n) => n.filter((x) => x.id !== id));

  const doneCount = focus.filter((t) => t.status === "COMPLETE").length;

  // My first name (from the workspace member list) for the greeting header.
  const myFirstName = (
    members.find((m) => Number(m.userId) === Number(me))?.name || ""
  ).trim().split(/\s+/)[0] || "";

  return (
    <div className="desk">
      <div className="desk-head">
        <div>
          <h1>{myFirstName ? `Welcome back, ${myFirstName}` : "Welcome back"}</h1>
          <span className="desk-date">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </span>
        </div>
        <div className="desk-head-right">
          {onEnterFocus && (
            <button className="desk-focus-btn" onClick={onEnterFocus} title="Focus mode — this desk, full screen, notifications held">
              <Target size={15} /> Focus
            </button>
          )}
          <div className="desk-progress">
            <span>{doneCount}/{focus.length} done today</span>
            <div className="desk-bar"><div style={{ width: `${focus.length ? (doneCount / focus.length) * 100 : 0}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="desk-grid">
        <div className="desk-col">
          {/* My tasks — grouped by status; click a task for full details */}
          <section className="desk-card desk-tasks">
            <div className="desk-card-head">
              <ListTodo size={17} /> My Tasks <span className="desk-hcount">{tasks.length}</span>
            </div>
            <QuickAdd
              tasks={tasks}
              onPick={(t) => setEditingTask(t)}
              onQuickCreate={(title) => addTask(title)}
              onDetailedCreate={(title) => setEditingTask({ title, status: "TODO" })}
            />
            <div className="desk-sections">
              {tasks.length === 0 && <div className="desk-empty">Nothing on your plate — add a task to get going.</div>}
              {TASK_STATUSES.map((status) => {
                const list = tasks.filter((t) => t.status === status).sort(byOrder);
                if (list.length === 0) return null;
                return (
                  <div
                    key={status}
                    className={`desk-section ${dragOver === status ? "drag-over" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); if (dragId.current != null) setDragOver(status); }}
                    onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver((s) => (s === status ? null : s)); }}
                    onDrop={(e) => { e.preventDefault(); applyDrop(status, null); }}
                  >
                    <div className="desk-sec-head">
                      <span className="desk-sec-dot" style={{ background: STATUS_COLOR[status] }} />
                      {STATUS_LABEL[status]} <span className="desk-sec-count">{list.length}</span>
                    </div>
                    {list.map((t) => (
                      <div
                        key={t.id}
                        className={`desk-task clickable ${t.status === "COMPLETE" ? "done" : ""}`}
                        draggable
                        onDragStart={(e) => { dragId.current = t.id; e.dataTransfer.effectAllowed = "move"; }}
                        onDragEnd={() => { dragId.current = null; setDragOver(null); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); applyDrop(status, t.id); }}
                        onClick={() => setEditingTask(t)}
                      >
                        <span className="desk-grip" title="Drag to reorder"><GripVertical size={13} /></span>
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
          {/* Today's meetings pulled from the calendar */}
          <Agenda workspaceId={workspaceId} />

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
          workspaceId={workspaceId}
          me={me}
          onClose={() => setEditingTask(null)}
          onSaved={() => { setEditingTask(null); reload(); }}
          onDeleted={() => { setEditingTask(null); reload(); }}
        />
      )}
    </div>
  );
}

// Today's agenda — my calendar events for the current day, from the calendar
// service. Highlights the meeting happening now and the next one coming up.
function Agenda({ workspaceId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!workspaceId) return;
    let alive = true;
    (async () => {
      const start = startOfDay(new Date());
      const from = start.toISOString();
      const to = new Date(start.getTime() + DAY - 1).toISOString();
      try {
        const evs = await getEvents(workspaceId, from, to);
        if (alive) setEvents((evs || []).slice().sort((a, b) => new Date(a.startTime) - new Date(b.startTime)));
      } catch { if (alive) setEvents([]); }
      finally { if (alive) setLoading(false); }
    })();
    // Tick every minute so "Now"/"Next" stay accurate without a reload.
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => { alive = false; clearInterval(id); };
  }, [workspaceId]);

  const fmt = (iso) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const stateOf = (e) => {
    const s = new Date(e.startTime).getTime(), en = new Date(e.endTime).getTime();
    if (now >= s && now <= en) return "now";
    if (en < now) return "past";
    return "up";
  };
  const nextIdx = events.findIndex((e) => new Date(e.startTime).getTime() > now);

  return (
    <section className="desk-card desk-agenda">
      <div className="desk-card-head">
        <CalendarDays size={17} /> Today’s Agenda
        {events.length > 0 && <span className="desk-hcount">{events.length}</span>}
      </div>
      <div className="agenda-list">
        {loading && <div className="desk-empty">Loading your day…</div>}
        {!loading && events.length === 0 && (
          <div className="desk-empty">No meetings today — enjoy the focus time.</div>
        )}
        {!loading && events.map((e, i) => {
          const st = stateOf(e);
          return (
            <div key={e.id} className={`agenda-item ${st}`}>
              <div className="agenda-time">
                <span className="agenda-start">{fmt(e.startTime)}</span>
                <span className="agenda-end">{fmt(e.endTime)}</span>
              </div>
              <span className="agenda-rail"><span className="agenda-dot" /></span>
              <div className="agenda-body">
                <div className="agenda-title">{e.title}</div>
                {e.description && <div className="agenda-desc">{e.description}</div>}
              </div>
              {st === "now" && <span className="agenda-pill now"><Clock size={11} /> Now</span>}
              {st === "up" && i === nextIdx && <span className="agenda-pill next">Next</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Smart task bar: type to search your existing tasks, or create a new one —
// quickly (Enter / +) or with full details (priority, due, description).
function QuickAdd({ tasks, onPick, onQuickCreate, onDetailedCreate }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const query = q.trim().toLowerCase();
  const matches = query
    ? tasks.filter((t) =>
        (t.title || "").toLowerCase().includes(query) ||
        (t.description || "").toLowerCase().includes(query) ||
        String(t.taskNumber) === query.replace(/^#/, ""),
      ).slice(0, 6)
    : [];

  const quickCreate = () => {
    const title = q.trim();
    if (!title) return;
    onQuickCreate(title);
    setQ(""); setOpen(false);
  };
  const detailedCreate = () => { onDetailedCreate(q.trim()); setQ(""); setOpen(false); };
  const pick = (t) => { onPick(t); setQ(""); setOpen(false); };

  return (
    <div className="desk-add qa" ref={boxRef}>
      <div className="qa-input">
        <Search size={15} className="qa-search-ic" />
        <input
          placeholder="Search a task or add a new one…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") quickCreate();
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        <button className="qa-add-btn" onClick={quickCreate} title="Add task"><Plus size={16} /></button>
      </div>
      {open && query && (
        <div className="qa-menu">
          {matches.length > 0 && (
            <>
              <div className="qa-label">Existing tasks</div>
              {matches.map((t) => (
                <button key={t.id} className="qa-item" onClick={() => pick(t)}>
                  <span className="qa-dot" style={{ background: STATUS_COLOR[t.status] }} />
                  <span className="qa-item-title">{t.title}</span>
                  <span className="qa-item-num">#{t.taskNumber}</span>
                </button>
              ))}
            </>
          )}
          <div className="qa-label">Create</div>
          <button className="qa-item qa-create" onClick={quickCreate}>
            <Plus size={15} /> <span className="qa-item-title">Add “{q.trim()}”</span>
            <span className="qa-kbd">↵</span>
          </button>
          <button className="qa-item qa-create" onClick={detailedCreate}>
            <Settings2 size={15} /> <span className="qa-item-title">New task with details…</span>
          </button>
        </div>
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

// Full task detail — create a new task, or view + update everything
// (title, description, status, priority, assignee, due), or delete.
function TaskDetail({ task, members, workspaceId, me, onClose, onSaved, onDeleted }) {
  const { confirm, notify } = useDialogs();
  const isNew = !task.id;
  const [title, setTitle] = useState(task.title || "");
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status || "TODO");
  const [priority, setPriority] = useState(task.priority || "NORMAL");
  const [assignee, setAssignee] = useState(task.assigneeUserId ?? (isNew ? me ?? "" : ""));
  const p = (n) => String(n).padStart(2, "0");
  const toLocal = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  const [due, setDue] = useState(task.dueDate ? toLocal(task.dueDate) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return notify("Give the task a title", "warning");
    setSaving(true);
    const body = {
      title: title.trim(),
      description: description || null,
      status,
      priority,
      assigneeUserId: assignee === "" ? null : Number(assignee),
      dueDate: due ? new Date(due).toISOString() : null,
    };
    try {
      if (isNew) await createTask({ workspaceId, ...body });
      else await updateTask(task.id, body);
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
          <span>{isNew ? "New task" : `Task #${task.taskNumber}`}</span>
          <button className="desk-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="desk-modal-body">
          <input className="desk-minput desk-mtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" autoFocus />
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
          {!isNew ? (
            <button className="desk-mdel" onClick={remove}><Trash2 size={15} /> Delete</button>
          ) : <span />}
          <div className="desk-mfoot-right">
            <button className="desk-mcancel" onClick={onClose}>Cancel</button>
            <button className="desk-msave" onClick={save} disabled={saving}>{isNew ? "Create" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
