import "./CommandPalette.css";
import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Hash, User, ListTodo, CalendarDays, Users, Gamepad2, CornerDownLeft } from "lucide-react";
import { getTasks } from "../../../../api/tasks";

/**
 * Ctrl/Cmd+K command palette. Jumps to channels, people, tasks, and quick actions.
 * Props: open, onClose, channels [{id,name}], members [{userId,name}], actions {...callbacks}.
 */
export default function CommandPalette({ open, onClose, workspaceId, channels = [], members = [], actions = {} }) {
  const [q, setQ] = useState("");
  const [tasks, setTasks] = useState([]);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    if (workspaceId) getTasks(workspaceId, {}).then(setTasks).catch(() => setTasks([]));
  }, [open, workspaceId]);

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = [];
    // Quick actions
    const acts = [
      { icon: <ListTodo size={15} />, label: "Go to Tasks", run: actions.openTasks },
      { icon: <Users size={15} />, label: "Go to People", run: actions.openPeople },
      { icon: <CalendarDays size={15} />, label: "Open Meetings", run: actions.openMeetings },
      { icon: <Gamepad2 size={15} />, label: "Enter Virtual Office", run: actions.openOffice },
    ].filter((a) => a.run && (!s || a.label.toLowerCase().includes(s)));
    acts.forEach((a) => list.push({ ...a, kind: "Action" }));

    channels
      .filter((c) => !s || c.name.toLowerCase().includes(s))
      .slice(0, 8)
      .forEach((c) => list.push({ kind: "Channel", icon: <Hash size={15} />, label: c.name, run: () => actions.openChannel?.(c) }));

    members
      .filter((m) => !s || m.name.toLowerCase().includes(s))
      .slice(0, 8)
      .forEach((m) => list.push({ kind: "Person", icon: <User size={15} />, label: m.name, run: () => actions.openPerson?.(m) }));

    tasks
      .filter((t) => !s || `${t.title} #${t.taskNumber}`.toLowerCase().includes(s))
      .slice(0, 8)
      .forEach((t) => list.push({ kind: "Task", icon: <ListTodo size={15} />, label: `#${t.taskNumber} ${t.title}`, run: () => actions.openTask?.(t.taskNumber) }));

    return list;
  }, [q, channels, members, tasks, actions]);

  useEffect(() => { setIdx(0); }, [q]);

  if (!open) return null;

  const choose = (it) => { it?.run?.(); onClose(); };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % Math.max(1, items.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i - 1 + items.length) % Math.max(1, items.length)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(items[idx]); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-search">
          <Search size={17} />
          <input
            ref={inputRef}
            placeholder="Jump to a channel, person, task, or action…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
          />
          <kbd className="cmdk-kbd">esc</kbd>
        </div>
        <div className="cmdk-list">
          {items.length === 0 && <div className="cmdk-empty">No matches</div>}
          {items.map((it, i) => (
            <button
              key={`${it.kind}-${it.label}-${i}`}
              className={`cmdk-item ${i === idx ? "active" : ""}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => choose(it)}
            >
              <span className="cmdk-icon">{it.icon}</span>
              <span className="cmdk-label">{it.label}</span>
              <span className="cmdk-kind">{it.kind}</span>
              {i === idx && <CornerDownLeft size={13} className="cmdk-enter" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
