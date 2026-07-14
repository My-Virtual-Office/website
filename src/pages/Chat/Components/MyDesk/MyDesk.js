import "./MyDesk.css";
import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Check, Trash2, StickyNote, Pencil, Eraser, ListTodo, Flag, Play, Pause, RotateCcw, Timer } from "lucide-react";
import { getMyTasks, createTask, updateTask, PRIORITY_COLOR } from "../../../../api/tasks";
import { getCurrentUserId } from "../../../../utils/auth";

const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const NOTE_COLORS = ["#fde68a", "#fca5a5", "#a7f3d0", "#bfdbfe", "#ddd6fe", "#fbcfe8"];
const load = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export default function MyDesk({ workspaceId }) {
  const me = getCurrentUserId();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const nsNotes = `vo-desk-notes-${workspaceId}-${me}`;
  const nsWb = `vo-desk-wb-${workspaceId}-${me}`;
  const [notes, setNotes] = useState(() => load(nsNotes, []));

  useEffect(() => setNotes(load(nsNotes, [])), [nsNotes]);
  useEffect(() => save(nsNotes, notes), [nsNotes, notes]);

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
    setNewTask("");
    try {
      await createTask({ workspaceId, title, assigneeUserId: me, dueDate: new Date(today + DAY / 2).toISOString() });
      reload();
    } catch { /* ignore */ }
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
        {/* Today's tasks */}
        <section className="desk-card desk-tasks">
          <div className="desk-card-head"><ListTodo size={17} /> Today's Tasks</div>
          <div className="desk-add">
            <input
              placeholder="Add a task for today…"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
            <button onClick={addTask}><Plus size={16} /></button>
          </div>
          <div className="desk-task-list">
            {focus.length === 0 && <div className="desk-empty">Nothing on your plate — add a task to get going.</div>}
            {focus.map((t) => (
              <div key={t.id} className={`desk-task ${t.status === "COMPLETE" ? "done" : ""}`}>
                <button className="desk-check" onClick={() => toggleDone(t)}>
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
        </section>

        {/* Break hub: focus timer + relaxing mini-games */}
        <BreakCard />

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
