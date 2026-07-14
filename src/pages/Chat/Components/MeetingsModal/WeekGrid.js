import { useRef, useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

const START_HOUR = 6; // grid runs 06:00 → 23:00 (auto-scrolls to the morning)
const END_HOUR = 23;
const HOUR_PX = 48; // Google Calendar uses ~48px per hour
const SNAP_MIN = 15; // drag snaps to quarter-hours
const GRID_H = (END_HOUR - START_HOUR) * HOUR_PX;

const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Sunday 00:00 of the week containing `d`. */
export function startOfWeek(d) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const minutesToTop = (min) =>
  ((Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, min)) - START_HOUR * 60) / 60) * HOUR_PX;

const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
// minutes-from-midnight → "9:00 AM"
const fmtMin = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

// Google-Calendar side-by-side packing: overlapping events split the column width.
function layoutColumns(dayEvents) {
  const sorted = [...dayEvents].sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime) || new Date(a.endTime) - new Date(b.endTime),
  );
  const placement = new Map(); // id -> { col, cols }
  let cluster = [];
  let clusterEnd = 0;
  const flush = () => {
    const colEnds = [];
    cluster.forEach((ev) => {
      const s = new Date(ev.startTime).getTime();
      let col = colEnds.findIndex((end) => s >= end);
      if (col === -1) { col = colEnds.length; colEnds.push(0); }
      colEnds[col] = new Date(ev.endTime).getTime();
      placement.set(ev.id, { col });
    });
    cluster.forEach((ev) => (placement.get(ev.id).cols = colEnds.length));
    cluster = [];
    clusterEnd = 0;
  };
  sorted.forEach((ev) => {
    const s = new Date(ev.startTime).getTime();
    const e = new Date(ev.endTime).getTime();
    if (cluster.length && s >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, e);
  });
  flush();
  return placement;
}

/**
 * Google-Calendar-style week grid. Drag on a day column to pick a meeting's start→end;
 * existing events render as positioned, side-by-side blocks. `onPick(start, end)` fires on release.
 */
export default function WeekGrid({ weekStart, events, onPick, selected, onDelete, onEventClick }) {
  const [drag, setDrag] = useState(null); // { dayIdx, startMin, endMin }
  const colRefs = useRef([]);
  const bodyRef = useRef(null);
  const now = new Date();

  // Auto-scroll to the morning on first render, like Google Calendar.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = Math.max(0, (8 - START_HOUR) * HOUR_PX - 12);
  }, []);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

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
    setDrag({ dayIdx, startMin: m, endMin: m + 2 * SNAP_MIN });
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

  // Active drag or the committed slot → a highlighted block (with its time range).
  const selBlockFor = (dayIdx) => {
    if (drag && drag.dayIdx === dayIdx) {
      return {
        top: minutesToTop(drag.startMin),
        height: minutesToTop(drag.endMin) - minutesToTop(drag.startMin),
        label: `${fmtMin(drag.startMin)} – ${fmtMin(drag.endMin)}`,
      };
    }
    if (selected && sameDay(new Date(selected.start), days[dayIdx])) {
      const s = new Date(selected.start);
      const e = new Date(selected.end);
      const sMin = s.getHours() * 60 + s.getMinutes();
      const eMin = e.getHours() * 60 + e.getMinutes();
      return {
        top: minutesToTop(sMin),
        height: Math.max(6, minutesToTop(eMin) - minutesToTop(sMin)),
        label: `${fmtMin(sMin)} – ${fmtMin(eMin)}`,
      };
    }
    return null;
  };

  return (
    <div className="wk">
      <div className="wk-corner" />
      <div className="wk-headrow">
        {days.map((d, i) => {
          const isToday = sameDay(d, now);
          return (
            <div key={i} className={`wk-dayhead ${isToday ? "today" : ""}`}>
              <span className="wk-dow">{DAY_NAMES[i]}</span>
              <span className="wk-dnum">{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      <div className="wk-body" ref={bodyRef} onMouseMove={onMove} onMouseUp={commit} onMouseLeave={() => drag && commit()}>
        <div className="wk-gutter" style={{ height: GRID_H }}>
          {hours.map((h) => (
            <div className="wk-hour" key={h} style={{ height: HOUR_PX }}>
              <span>{hourLabel(h)}</span>
            </div>
          ))}
        </div>

        {days.map((day, dayIdx) => {
          const sel = selBlockFor(dayIdx);
          const dayEvents = events.filter((ev) => sameDay(new Date(ev.startTime), day));
          const cols = layoutColumns(dayEvents);
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
                <div className="wk-sel" style={{ top: sel.top, height: Math.max(14, sel.height) }}>
                  <span className="wk-sel-label">{sel.label}</span>
                </div>
              )}

              {dayEvents.map((ev) => {
                const s = new Date(ev.startTime);
                const e = new Date(ev.endTime);
                const top = minutesToTop(s.getHours() * 60 + s.getMinutes());
                const height = Math.max(20, minutesToTop(e.getHours() * 60 + e.getMinutes()) - top);
                const { col = 0, cols: n = 1 } = cols.get(ev.id) || {};
                const width = `calc((100% - 6px) / ${n})`;
                const left = `calc(3px + (100% - 6px) * ${col} / ${n})`;
                const compact = height < 40;
                return (
                  <div
                    key={ev.id}
                    className={`wk-ev ${ev.busy ? "busy" : "free"} ${compact ? "compact" : ""}`}
                    style={{ top, height, left, width }}
                    onMouseDown={(stop) => stop.stopPropagation()}
                    onClick={() => onEventClick?.(ev)}
                    title={`${ev.title} · ${s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — click to edit`}
                  >
                    <span className="wk-ev-t">{ev.title}</span>
                    <span className="wk-ev-time">
                      {s.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
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
