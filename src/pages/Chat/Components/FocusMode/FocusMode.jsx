import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Target, Bot, Gamepad2, X, AtSign, Clock, ChevronDown } from "lucide-react";
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
/**
 * Session lengths. 90 is the practical ceiling for one sustained block, so it is the longest
 * timed option rather than an arbitrary big number. `null` = open-ended: some work does not fit
 * a box, and forcing a countdown on it would be its own distraction.
 */
const DURATIONS = [
  { min: 30, label: "30 min" },
  { min: 60, label: "60 min" },
  { min: 90, label: "90 min" },
  { min: null, label: "Until I exit" },
];
const DURATION_KEY = "vo-focus-duration";

// Snooze options for a single mention — short, because a mention is the one thing
// that was already judged worth breaking Focus Mode for. "Remind me" defers it a
// few minutes, it doesn't file it away.
const SNOOZE_OPTIONS = [
  { min: 5, label: "5 min" },
  { min: 15, label: "15 min" },
  { min: 30, label: "30 min" },
  { min: 60, label: "1 hour" },
];

/** Total unread messages across every conversation. `unread` is { [id]: { count, mention } }. */
const unreadTotal = (unread) =>
  Object.values(unread || {}).reduce((sum, u) => sum + (u?.count || 0), 0);

export default function FocusMode({ workspaceId, channels, members, unread, onExit, onOpenOffice }) {
  const [notes, setNotes] = useState([]);       // non-mention notifications: counted, not shown
  const [mentions, setMentions] = useState([]); // the one thing allowed to interrupt
  const [shownChannels, setShownChannels] = useState([]); // channelIds we surfaced a mention for
  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [snoozeMenuFor, setSnoozeMenuFor] = useState(null); // mention id whose snooze menu is open
  const snoozeTimers = useRef([]);
  const [askOpen, setAskOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [durationMin, setDurationMin] = useState(() => {
    try {
      const raw = localStorage.getItem(DURATION_KEY);
      return raw === null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [pickerOpen, setPickerOpen] = useState(false);
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
        if (n.type === "MENTION") {
          setMentions((m) => [n, ...m].slice(0, 4)); // display is capped…
          // …the accounting is not. The publisher's fields (channelId, refType, messageId) ride
          // in `data`, not on the notification root — reading n.channelId gets you undefined.
          setShownChannels((c) => [...c, n.data?.channelId]);
          setMentionsOpen(true); // a mention is the one thing allowed to interrupt — surface it
        } else setNotes((h) => [n, ...h]);
      }),
    [],
  );

  // Cancel any pending "remind me" timers on unmount — a background setState
  // after the component is gone is a leak, not a feature.
  useEffect(() => () => snoozeTimers.current.forEach(clearTimeout), []);

  const dismissMention = (id) => setMentions((list) => list.filter((x) => x.id !== id));

  // "Remind me in Xm": the mention leaves the list now and comes back as if it
  // just arrived, after the delay. It's the same interruption, deferred — not
  // filed away and forgotten, which is what a plain dismiss would do.
  const snoozeMention = (mention, minutes) => {
    dismissMention(mention.id);
    setSnoozeMenuFor(null);
    const t = setTimeout(() => {
      setMentions((m) => [mention, ...m].slice(0, 4));
      setMentionsOpen(true);
    }, minutes * 60000);
    snoozeTimers.current.push(t);
  };

  // What "held" actually means. In-app notifications only exist for MENTION, TASK_ASSIGNED and
  // TASK_REMINDER — and mentions are shown, not held — so counting notifications alone left the
  // chip reading "0 held" through a session where plenty was piling up. Ordinary chat messages
  // raise no notification at all; they only move the unread counts, which ChatPage keeps live
  // even while this is on screen. So count the messages that arrived since focus started, and
  // add the notifications we suppressed.
  const unreadAtStart = useRef(null);
  const nowUnread = unreadTotal(unread);
  if (unreadAtStart.current === null) unreadAtStart.current = nowUnread;
  // Clamps at 0: reading elsewhere (a second tab) could otherwise drive this negative.
  const newUnread = Math.max(0, nowUnread - unreadAtStart.current);

  // A mention arrives twice: once as the banner we showed you, and again inside the unread count
  // for its channel. Counting it as "held" would be a lie — you saw it. Discount one message per
  // mention, but only for channels that actually carry unread (a mention in the channel you are
  // looking at is already read, so there is nothing there to discount).
  const alreadySeen = shownChannels.filter((id) => (unread?.[id]?.count || 0) > 0).length;
  const newMessages = Math.max(0, newUnread - alreadySeen);
  const heldCount = newMessages + notes.length;

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // Counts DOWN against a chosen length, UP when open-ended. A countdown is a commitment you can
  // see; a stopwatch is just a fact.
  const remaining = durationMin == null ? null : Math.max(0, durationMin * 60 - elapsed);

  const clock = useMemo(() => {
    const secs = remaining == null ? elapsed : remaining;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsed, remaining]);

  // Open-ended sessions get a nudge at the 90-minute mark instead of a countdown.
  const longSession = durationMin == null && elapsed >= 90 * 60;
  const almostDone = remaining != null && remaining <= 60;

  const exit = useCallback((auto = false) => onExit?.(heldCount, auto), [onExit, heldCount]);

  // The session ends itself. Slack lets you set a length; the point of setting one is not having
  // to decide again later, when you are the least able to.
  useEffect(() => {
    if (remaining === 0) exit(true);
  }, [remaining, exit]);

  const pickDuration = (min) => {
    setDurationMin(min);
    setPickerOpen(false);
    try {
      localStorage.setItem(DURATION_KEY, JSON.stringify(min));
    } catch {
      /* a remembered preference is a nicety, not a requirement */
    }
    // Choosing a length restarts the block — otherwise picking "30 min" 40 minutes in would
    // end the session instantly.
    startedAt.current = Date.now();
    setElapsed(0);
  };

  // Esc leaves. A mode you cannot get out of by reflex is a trap. It unwinds one layer at a time,
  // so Esc on an open menu closes the menu rather than ending the session by surprise.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (pickerOpen) setPickerOpen(false);
      else if (snoozeMenuFor) setSnoozeMenuFor(null);
      else if (mentionsOpen) setMentionsOpen(false);
      else if (askOpen) setAskOpen(false);
      else exit(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [askOpen, pickerOpen, mentionsOpen, snoozeMenuFor, exit]);

  // Click anywhere else to dismiss the duration menu.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e) => {
      if (!e.target.closest(".focus-duration")) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen]);

  // Same pattern for the mentions panel and its per-item snooze submenu.
  useEffect(() => {
    if (!mentionsOpen) return;
    const onDoc = (e) => {
      if (!e.target.closest(".focus-mentions-wrap")) { setMentionsOpen(false); setSnoozeMenuFor(null); }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [mentionsOpen]);

  return (
    <div className="focus-root" role="region" aria-label="Focus mode">
      <div className="focus-bar">
        <div className="focus-id">
          {/* Exit sits first, top-left: the way out of a mode should be the most findable thing
              in it, not tucked behind the controls you entered it to avoid. */}
          <button className="focus-btn exit" onClick={() => exit(false)} title="Leave focus mode (Esc)">
            <X size={15} /> Exit focus
          </button>

          <span className="focus-sep" aria-hidden="true" />

          <Target size={16} className="focus-mark" />
          <span className="focus-title">Focus</span>

          {/* The clock is the duration control — the obvious place to ask "how long?". */}
          <div className="focus-duration">
            <button
              className={`focus-clock ${longSession ? "long" : ""} ${almostDone ? "soon" : ""}`}
              onClick={() => setPickerOpen((o) => !o)}
              title={durationMin == null ? "Open-ended — click to set a length" : `${durationMin} min session — click to change`}
              aria-haspopup="menu"
              aria-expanded={pickerOpen}
            >
              <Clock size={13} /> {clock}
              <ChevronDown size={12} />
            </button>

            {pickerOpen && (
              <div className="focus-menu" role="menu">
                {DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    role="menuitem"
                    className={`focus-menu-item ${d.min === durationMin ? "on" : ""}`}
                    onClick={() => pickDuration(d.min)}
                  >
                    {d.label}
                  </button>
                ))}
                <div className="focus-menu-note">90 min is about as long as one block holds.</div>
              </div>
            )}
          </div>
        </div>

        <div className="focus-actions">
          {/* Everything else that came in while heads-down — still visible, just quiet.
              Reported again on exit; see the docstring above for why it's counted this way. */}
          <span
            className={`focus-quiet ${heldCount > 0 ? "some" : ""}`}
            title={
              heldCount === 0
                ? "Nothing else has come in since you started"
                : `${newMessages} message${newMessages === 1 ? "" : "s"} and ${notes.length} notification${
                    notes.length === 1 ? "" : "s"
                  } — held until you leave, nothing is lost`
            }
          >
            {heldCount} held
          </span>

          {/* Mentions are the one thing allowed to interrupt — this button is that
              interruption's home. Badge count, opens to the list, each one can be
              answered, dismissed, or deferred a few minutes with "Remind me". */}
          <div className="focus-mentions-wrap">
            <button
              className={`focus-btn focus-mentions-btn ${mentions.length ? "has" : ""} ${mentionsOpen ? "on" : ""}`}
              onClick={() => setMentionsOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={mentionsOpen}
            >
              <AtSign size={15} /> Mentions
              {mentions.length > 0 && <span className="focus-mentions-badge">{mentions.length}</span>}
            </button>

            {mentionsOpen && (
              <div className="focus-mentions-panel" role="menu">
                {mentions.length === 0 ? (
                  <div className="focus-mentions-empty">No mentions waiting.</div>
                ) : (
                  mentions.map((m) => (
                    <div key={m.id} className="focus-mention" role="alert">
                      <AtSign size={15} />
                      <div className="focus-mention-text">
                        <b>{m.title || "You were mentioned"}</b>
                        <span>{m.body}</span>
                      </div>
                      <div className="focus-mention-actions">
                        <div className="focus-snooze">
                          <button
                            className="focus-mention-snooze"
                            onClick={() => setSnoozeMenuFor((id) => (id === m.id ? null : m.id))}
                            title="Remind me later"
                            aria-haspopup="menu"
                            aria-expanded={snoozeMenuFor === m.id}
                          >
                            <Clock size={13} />
                          </button>
                          {snoozeMenuFor === m.id && (
                            <div className="focus-snooze-menu" role="menu">
                              {SNOOZE_OPTIONS.map((o) => (
                                <button key={o.min} role="menuitem" onClick={() => snoozeMention(m, o.min)}>
                                  Remind in {o.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          className="focus-mention-x"
                          onClick={() => dismissMention(m.id)}
                          aria-label="Dismiss"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button className={`focus-btn ${askOpen ? "on" : ""}`} onClick={() => setAskOpen((o) => !o)}>
            <Bot size={15} /> Ask AI
          </button>
          <button className="focus-btn" onClick={onOpenOffice}>
            <Gamepad2 size={15} /> Virtual Office
          </button>
        </div>
      </div>

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
