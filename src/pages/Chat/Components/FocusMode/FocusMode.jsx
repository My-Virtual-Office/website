import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Target, Bot, Gamepad2, X, AtSign, Clock } from "lucide-react";
import MyDesk from "../MyDesk/MyDesk";
import AiAssistant from "../AiAssistant/AiAssistant";
import { subscribeToNotifications } from "../../../../ws/notificationsStompClient";
import { getMyDesk, updateStatus } from "../../../../api/workspace";
import "./FocusMode.css";

/**
 * Focus Mode — one surface, one job: don't interrupt.
 *
 * The case for it in one number: a mistimed notification costs ~23 minutes of regained focus
 * (Gloria Mark, UC Irvine), not the five seconds it takes to read. So this suppresses *delivery*
 * while leaving *capture* alone — the rules Slack's focus mode and Teams' quiet hours share:
 * hold the noise, tell other people you are heads-down, and keep exactly one escape hatch open.
 *
 * Three decisions worth defending:
 *
 *  - The toolbar never hides. Nielsen Norman's warning about zen mode is that hiding tools makes
 *    people hunt for them and think about the interface instead of the work — the opposite of
 *    focus. Ask AI / Virtual Office / Exit stay on screen.
 *  - Only MENTION breaks through (the analogue of Slack's VIPs). A mode with no way to reach
 *    someone is a mode nobody dares turn on.
 *  - Held notifications are counted, never dropped. The count stays visible so you know noise
 *    exists without being pulled into it, and it is reported on exit.
 */
export default function FocusMode({ workspaceId, channels, members, unread, onExit, onOpenOffice }) {
  const [held, setHeld] = useState([]);       // everything that is NOT a mention: counted, not shown
  const [mentions, setMentions] = useState([]); // the one thing allowed to interrupt
  const [askOpen, setAskOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const prevStatus = useRef(null);

  // Tell everyone else. Without this the mode is indistinguishable from ignoring people —
  // Teams' rule: colleagues see DND so they don't expect a reply.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const desk = await getMyDesk(workspaceId);
        if (cancelled || !desk?.id) return;
        prevStatus.current = { id: desk.id, status: desk.status, emoji: desk.statusEmoji, text: desk.statusCustomText };
        await updateStatus(workspaceId, desk.id, { status: "FOCUS_MODE", statusEmoji: "🎯", statusCustomText: "" });
      } catch {
        /* presence is best-effort — never block entering focus on a failed status write */
      }
    })();
    return () => {
      cancelled = true;
      // Restore exactly what was there before, not a guess at "Active".
      const p = prevStatus.current;
      if (p?.id) {
        updateStatus(workspaceId, p.id, {
          status: p.status || "ACTIVE",
          statusEmoji: p.emoji || "",
          statusCustomText: p.text || "",
        }).catch(() => {});
      }
    };
  }, [workspaceId]);

  // The gate. Suppression is presentation-only: notifications-service still stores everything,
  // so the bell is intact the moment you leave.
  useEffect(
    () =>
      subscribeToNotifications((data) => {
        if (data?.action !== "NEW_NOTIFICATION" || !data.payload) return;
        const n = data.payload;
        if (n.type === "MENTION") setMentions((m) => [n, ...m].slice(0, 4));
        else setHeld((h) => [n, ...h]);
      }),
    [],
  );

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = useMemo(() => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsed]);

  // 90 min is the practical ceiling for one sustained block — mark it rather than enforce it.
  const longSession = elapsed >= 90 * 60;

  const exit = useCallback(() => onExit?.(held.length), [onExit, held.length]);

  // Esc leaves. A mode you cannot get out of by reflex is a trap.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (askOpen) setAskOpen(false);
        else exit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [askOpen, exit]);

  return (
    <div className="focus-root" role="region" aria-label="Focus mode">
      <div className="focus-bar">
        <div className="focus-id">
          <Target size={16} />
          <span className="focus-title">Focus</span>
          <span className={`focus-clock ${longSession ? "long" : ""}`} title={longSession ? "Past 90 minutes — a break is due" : "Time in focus"}>
            <Clock size={13} /> {clock}
          </span>
        </div>

        <div className="focus-actions">
          {/* Held ≠ hidden: you can see noise exists without being pulled into it. */}
          <span className="focus-held" title="Held until you leave — nothing is lost">
            {held.length} held
          </span>
          <button className={`focus-btn ${askOpen ? "on" : ""}`} onClick={() => setAskOpen((o) => !o)}>
            <Bot size={15} /> Ask AI
          </button>
          <button className="focus-btn" onClick={onOpenOffice}>
            <Gamepad2 size={15} /> Virtual Office
          </button>
          <button className="focus-btn exit" onClick={exit}>
            <X size={15} /> Exit focus
          </button>
        </div>
      </div>

      {/* A mention is the only thing worth ~23 minutes. Banner, not toast: no sound, no
          auto-dismiss — it waits for you rather than flashing past. */}
      {mentions.length > 0 && (
        <div className="focus-mentions">
          {mentions.map((m) => (
            <div key={m.id} className="focus-mention" role="alert">
              <AtSign size={15} />
              <div className="focus-mention-text">
                <b>{m.title || "You were mentioned"}</b>
                <span>{m.body}</span>
              </div>
              <button
                className="focus-mention-x"
                onClick={() => setMentions((list) => list.filter((x) => x.id !== m.id))}
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="focus-stage">
        <MyDesk workspaceId={workspaceId} />
      </div>

      {askOpen && (
        <div className="focus-ask">
          <AiAssistant workspaceId={workspaceId} channels={channels} members={members} unread={unread} />
        </div>
      )}
    </div>
  );
}
