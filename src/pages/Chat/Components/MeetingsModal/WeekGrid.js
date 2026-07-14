import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

const START_HOUR = 7; // grid runs 07:00 → 22:00
const END_HOUR = 22;
const HOUR_PX = 44;
const SNAP_MIN = 15; // drag snaps to quarter-hours
const GRID_H = (END_HOUR - START_HOUR) * HOUR_PX;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Sunday 00:00 of the week containing `d`. */
export function startOfWeek(d) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Minutes-from-midnight → top px within the grid (clamped to the visible window).
const minutesToTop = (min) => (Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, min)) - START_HOUR * 60) / 60 * HOUR_PX;

/**
 * Google-Calendar-style week grid. Drag on a day column to pick a meeting's start→end;
 * existing events render as positioned blocks. `onPick(start, end)` fires on drag release.
 */
export default function WeekGrid({ weekStart, events, onPick, selected, onDelete }) {
  const [drag, setDrag] = useState(null); // { dayIdx, startMin, endMin }
  const colRefs = useRef([]);
  const now = new Date();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Pointer Y within a column → snapped minutes-from-midnight.
  const yToMinutes = (dayIdx, clientY) => {
    const el = colRefs.current[dayIdx];
    if (!el) return START_HOUR * 60;
    const rect = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(GRID_H, clientY - rect.top));
    const raw = START_HOUR * 60 + (y / HOUR_PX) * 60;
    return Math.round(raw / SNAP_MIN) * SNAP_MIN;
  };

  const onDown = (dayIdx, e) => {
    const m = yToMinutes(dayIdx, e.clientY);
    setDrag({ dayIdx, startMin: m, endMin: m + SNAP_MIN });
  };
  const onMove = (e) => {
    if (!drag) return;
    const m = yToMinutes(drag.dayIdx, e.clientY);
    setDrag((d) => ({ ...d, endMin: Math.max(d.startMin + SNAP_MIN, m) }));
  };
  const commit = () => {
    if (!drag) return;
    const base = days[drag.dayIdx];
    const start = new Date(base);
    start.setMinutes(drag.startMin, 0, 0);
    const end = new Date(base);
    end.setMinutes(drag.endMin, 0, 0);
    onPick(start, end);
    setDrag(null);
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Selection highlight comes from either the active drag or the committed `selected` slot.
  const selBlockFor = (dayIdx) => {
    if (drag && drag.dayIdx === dayIdx) {
      return { top: minutesToTop(drag.startMin), height: minutesToTop(drag.endMin) - minutesToTop(drag.startMin) };
    }
    if (selected && sameDay(new Date(selected.start), days[dayIdx])) {
      const s = new Date(selected.start);
      const e = new Date(selected.end);
      const sMin = s.getHours() * 60 + s.getMinutes();
      const eMin = e.getHours() * 60 + e.getMinutes();
      return { top: minutesToTop(sMin), height: Math.max(6, minutesToTop(eMin) - minutesToTop(sMin)) };
    }
    return null;
  };

  return (
    <div className="wk">
      <div className="wk-corner" />
      <div className="wk-headrow">
        {days.map((d, i) => (
          <div key={i} className={`wk-dayhead ${sameDay(d, now) ? "today" : ""}`}>
            <span className="wk-dow">{DAY_NAMES[i]}</span>
            <span className="wk-dnum">{d.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="wk-body" onMouseMove={onMove} onMouseUp={commit} onMouseLeave={() => drag && commit()}>
        <div className="wk-gutter" style={{ height: GRID_H }}>
          {hours.map((h) => (
            <div className="wk-hour" key={h} style={{ height: HOUR_PX }}>
              <span>{h % 12 === 0 ? 12 : h % 12}{h < 12 ? "am" : "pm"}</span>
            </div>
          ))}
        </div>

        {days.map((day, dayIdx) => {
          const sel = selBlockFor(dayIdx);
          const dayEvents = events.filter((ev) => sameDay(new Date(ev.startTime), day));
          return (
            <div
              key={dayIdx}
              className="wk-col"
              ref={(el) => (colRefs.current[dayIdx] = el)}
              style={{ height: GRID_H }}
              onMouseDown={(e) => onDown(dayIdx, e)}
            >
              {hours.map((h) => (
                <div className="wk-cell" key={h} style={{ height: HOUR_PX }} />
              ))}

              {sameDay(day, now) && now.getHours() >= START_HOUR && now.getHours() < END_HOUR && (
                <div className="wk-nowline" style={{ top: minutesToTop(now.getHours() * 60 + now.getMinutes()) }} />
              )}

              {sel && (
                <div className="wk-sel" style={{ top: sel.top, height: Math.max(6, sel.height) }} />
              )}

              {dayEvents.map((ev) => {
                const s = new Date(ev.startTime);
                const e = new Date(ev.endTime);
                const top = minutesToTop(s.getHours() * 60 + s.getMinutes());
                const height = Math.max(18, minutesToTop(e.getHours() * 60 + e.getMinutes()) - top);
                return (
                  <div
                    key={ev.id}
                    className={`wk-ev ${ev.busy ? "busy" : ""}`}
                    style={{ top, height }}
                    onMouseDown={(stop) => stop.stopPropagation()}
                    title={`${ev.title} · ${s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  >
                    <span className="wk-ev-t">{ev.title}</span>
                    <span className="wk-ev-time">
                      {s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {onDelete && (
                      <button className="wk-ev-del" onClick={() => onDelete(ev.id)} title="Delete">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
