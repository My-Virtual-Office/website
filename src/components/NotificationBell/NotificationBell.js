import "./NotificationBell.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import LockResetIcon from "@mui/icons-material/LockReset";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationTicket,
} from "../../api/notifications";

// Maps backend NotificationType values to an icon + accent colour so each
// card is visually scannable. Falls back to a generic bell for unknown types.
const TYPE_META = {
  SIGNUP_SUCCESS: { Icon: PersonAddAltOutlinedIcon, color: "#0e865a" },
  LOGIN_SUCCESS: { Icon: LoginIcon, color: "#3b82f6" },
  OTP: { Icon: VpnKeyOutlinedIcon, color: "#d97706" },
  PASSWORD_RESET_SUCCESS: { Icon: LockResetIcon, color: "#8b5cf6" },
  TASK_ASSIGNED: { Icon: AssignmentOutlinedIcon, color: "#0ea5e9" },
};

function typeMeta(type) {
  return TYPE_META[type] || { Icon: NotificationsActiveOutlinedIcon, color: "#64748b" };
}

// Compact "time ago" formatting (e.g. "5m", "3h", "2d") with an absolute
// fallback for anything older than a week.
function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const stompRef = useRef(null);
  // Mirrors `open` so the once-mounted WebSocket effect can read the current
  // value without re-subscribing whenever the dropdown toggles.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const recomputeUnread = useCallback((list) => {
    setUnread(list.filter((n) => !n.read).length);
  }, []);

  // Load the inbox. The list endpoint also returns the authoritative
  // unreadCount, so we trust that over the locally derived value.
  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(1, 20);
      const list = data.items || [];
      setItems(list);
      setUnread(typeof data.unreadCount === "number" ? data.unreadCount : list.filter((n) => !n.read).length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Couldn't load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  // After the live stream drops and recovers there may be a gap during which
  // pushed events were missed. Re-sync from REST: reload the whole list if the
  // dropdown is open, otherwise just keep the unread badge accurate.
  const refreshAfterReconnect = useCallback(async () => {
    if (openRef.current) {
      loadInbox();
      return;
    }
    try {
      const data = await getUnreadCount();
      setUnread(data.unread || 0);
    } catch (err) {
      console.error("Failed to refresh unread count after reconnect:", err);
    }
  }, [loadInbox]);

  // Initial unread count so the badge is accurate before the dropdown is opened.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getUnreadCount();
        if (!cancelled) setUnread(data.unread || 0);
      } catch (err) {
        console.error("Failed to fetch unread count:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time stream: keep a live STOMP subscription to /user/queue/notifications
  // so pushed notifications appear instantly and bump the badge. The ws-ticket is
  // single-use (consumed atomically server-side), so we never reuse one — every
  // (re)connect fetches a fresh ticket. STOMP's own reconnect is disabled for the
  // same reason; we drive reconnection here with capped exponential backoff and
  // re-sync from REST on each successful reconnect so no event is missed.
  useEffect(() => {
    let cancelled = false;
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    let hasConnected = false;

    const MAX_RECONNECT_DELAY = 30000;

    // Back off 1s, 2s, 4s, 8s … capped at 30s, plus jitter to avoid a reconnect
    // storm. Each attempt re-runs connect(), which fetches a brand-new ticket.
    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      const base = Math.min(1000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
      const delay = base + Math.floor(Math.random() * 1000);
      reconnectAttempts += 1;
      console.warn(
        `Reconnecting notification stream in ${delay}ms (attempt ${reconnectAttempts})...`,
      );
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!cancelled) connect();
      }, delay);
    };

    const connect = async () => {
      try {
        // Tear down any prior client first. Detach its close handler so this
        // intentional teardown doesn't itself trigger another reconnect.
        if (stompRef.current) {
          const stale = stompRef.current;
          stompRef.current = null;
          stale.onWebSocketClose = () => {};
          stale.deactivate();
        }

        const { ticket } = await getNotificationTicket();
        if (cancelled) return;
        if (!ticket) {
          console.error("Notification ticket missing — will retry.");
          scheduleReconnect();
          return;
        }

        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.host;

        const client = new Client({
          brokerURL: `${wsProtocol}//${wsHost}/ws/notifications?ticket=${ticket}`,
          // Disabled on purpose: the built-in loop would replay the now-consumed
          // ticket. scheduleReconnect() reconnects with a fresh ticket instead.
          reconnectDelay: 0,
          onConnect: () => {
            const wasReconnect = hasConnected;
            hasConnected = true;
            reconnectAttempts = 0; // a healthy connection resets the backoff

            try {
              client.subscribe("/user/queue/notifications", (msg) => {
                try {
                  const event = JSON.parse(msg.body);
                  if (event.action === "NEW_NOTIFICATION" && event.payload) {
                    setItems((prev) => {
                      if (prev.some((n) => n.id === event.payload.id)) return prev;
                      return [event.payload, ...prev];
                    });
                    if (!event.payload.read) setUnread((c) => c + 1);
                  }
                } catch (e) {
                  console.error("Bad notification frame:", e);
                }
              });
            } catch (e) {
              console.error("Failed to subscribe to notification queue:", e);
            }

            // Only after a *re*connect: re-sync from REST to backfill anything
            // pushed while the socket was down.
            if (wasReconnect) refreshAfterReconnect();
          },
          onStompError: (frame) => {
            console.error("Notification broker error:", frame.headers["message"]);
          },
          onWebSocketError: (evt) => {
            console.error("Notification websocket error:", evt?.message || evt);
          },
          onWebSocketClose: () => {
            // Unexpected drop (not an intentional teardown) — recover with backoff.
            if (!cancelled) scheduleReconnect();
          },
        });

        stompRef.current = client;
        client.activate();
      } catch (err) {
        console.error("Notification websocket setup failed:", err);
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (stompRef.current) {
        stompRef.current.deactivate();
        stompRef.current = null;
      }
    };
  }, [refreshAfterReconnect]);

  // Close the dropdown when clicking outside it.
  useEffect(() => {
    if (!open) return undefined;
    const onClickAway = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadInbox();
  };

  const handleMarkRead = async (id) => {
    // Optimistic: flip locally, roll back on failure.
    const prev = items;
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - (prev.find((n) => n.id === id && !n.read) ? 1 : 0)));
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error("Failed to mark read:", err);
      setItems(prev);
      recomputeUnread(prev);
    }
  };

  const handleMarkAll = async () => {
    if (!items.some((n) => !n.read)) return;
    const prev = items;
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error("Failed to mark all read:", err);
      setItems(prev);
      recomputeUnread(prev);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const prev = items;
    const removed = prev.find((n) => n.id === id);
    setItems((list) => list.filter((n) => n.id !== id));
    if (removed && !removed.read) setUnread((c) => Math.max(0, c - 1));
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error("Failed to delete notification:", err);
      setItems(prev);
      recomputeUnread(prev);
    }
  };

  return (
    <div className="notif-bell" ref={containerRef}>
      <button
        type="button"
        className="header-btn notif-bell-btn"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
      >
        <NotificationsNoneOutlinedIcon />
        {unread > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown" role="menu">
          <div className="notif-dropdown-header">
            <span className="notif-title">
              Notifications
              {unread > 0 && <span className="notif-title-count">{unread} new</span>}
            </span>
            <div className="notif-header-actions">
              <button
                type="button"
                className="notif-text-btn"
                onClick={handleMarkAll}
                disabled={!items.some((n) => !n.read)}
                title="Mark all as read"
              >
                <DoneAllIcon fontSize="small" />
                <span>Mark all read</span>
              </button>
            </div>
          </div>

          <div className="notif-list">
            {loading && <div className="notif-state">Loading…</div>}

            {!loading && error && (
              <div className="notif-state notif-error">{error}</div>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="notif-empty">
                <NotificationsNoneOutlinedIcon />
                <p>You're all caught up</p>
                <span>New notifications will appear here.</span>
              </div>
            )}

            {!loading &&
              !error &&
              items.map((n) => {
                const { Icon, color } = typeMeta(n.type);
                return (
                  <div
                    key={n.id}
                    className={`notif-card ${n.read ? "read" : "unread"}`}
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                  >
                    <span
                      className="notif-card-icon"
                      style={{ backgroundColor: `${color}1a`, color }}
                    >
                      <Icon fontSize="small" />
                    </span>

                    <div className="notif-card-body">
                      <div className="notif-card-top">
                        <span className="notif-card-title">{n.title || "Notification"}</span>
                        <span className="notif-card-time">{timeAgo(n.createdAt)}</span>
                      </div>
                      {n.body && <p className="notif-card-text">{n.body}</p>}
                    </div>

                    <div className="notif-card-actions">
                      {!n.read && (
                        <button
                          type="button"
                          className="notif-icon-btn"
                          title="Mark as read"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(n.id);
                          }}
                        >
                          <CheckCircleOutlineIcon fontSize="small" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="notif-icon-btn notif-delete"
                        title="Delete"
                        onClick={(e) => handleDelete(n.id, e)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </button>
                    </div>

                    {!n.read && <span className="notif-unread-dot" aria-hidden="true" />}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Mobile backdrop so the sheet-style dropdown can be dismissed by tapping away */}
      {open && <div className="notif-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* Hidden close affordance for the mobile sheet */}
      {open && (
        <button
          type="button"
          className="notif-mobile-close"
          aria-label="Close notifications"
          onClick={() => setOpen(false)}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
