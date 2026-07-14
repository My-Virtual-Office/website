import "./NotificationCenter.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, X, Calendar, CheckCheck } from "lucide-react";
import { Client } from "@stomp/stompjs";
import { getInbox, markAllRead, wsTicket } from "../../../../api/notifications";

const iconFor = (type) => {
  if (type === "MEETING_REMINDER") return <Calendar size={16} />;
  return <Bell size={16} />;
};
const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
};

export default function NotificationCenter({ inline = false }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const panelRef = useRef(null);
  const toastId = useRef(1);

  const pushToast = useCallback((n) => {
    const id = toastId.current++;
    setToasts((t) => [...t, { id, ...n }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  // Initial inbox.
  useEffect(() => {
    getInbox()
      .then(({ items, unreadCount }) => {
        setItems(items);
        setUnread(unreadCount);
      })
      .catch(() => {});
  }, []);

  // Live WebSocket.
  useEffect(() => {
    let client;
    let cancelled = false;
    (async () => {
      try {
        const ticket = await wsTicket();
        if (cancelled || !ticket) return;
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        client = new Client({
          brokerURL: `${wsProtocol}//${window.location.host}/api/notifications/connect?ticket=${ticket}`,
          reconnectDelay: 4000,
          onConnect: () => {
            client.subscribe("/user/queue/notifications", (msg) => {
              try {
                const n = JSON.parse(msg.body);
                setItems((prev) => [n, ...prev].slice(0, 50));
                setUnread((u) => u + 1);
                pushToast(n);
              } catch {
                /* ignore malformed */
              }
            });
          },
        });
        client.activate();
      } catch {
        /* notifications WS unavailable */
      }
    })();
    return () => {
      cancelled = true;
      if (client) client.deactivate();
    };
  }, [pushToast]);

  // Close panel on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      markAllRead().catch(() => {});
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  return (
    <div className={`notif-center ${inline ? "inline" : ""}`} ref={panelRef}>
      <button className="notif-bell" onClick={toggle} title="Notifications" aria-label="Notifications">
        <Bell size={18} />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <span>Notifications</span>
            {items.length > 0 && (
              <button
                className="notif-clear"
                title="Mark all read"
                onClick={() => {
                  markAllRead().catch(() => {});
                  setUnread(0);
                  setItems((prev) => prev.map((n) => ({ ...n, read: true })));
                }}
              >
                <CheckCheck size={15} />
              </button>
            )}
          </div>
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">You're all caught up.</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`notif-item ${n.read ? "" : "unread"}`}>
                  <span className="notif-icon">{iconFor(n.type)}</span>
                  <div className="notif-body">
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-text">{n.body}</span>
                    <span className="notif-time">{timeAgo(n.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Live pop-up toasts */}
      <div className="notif-toasts">
        {toasts.map((t) => (
          <div key={t.id} className="notif-toast">
            <span className="notif-toast-icon">{iconFor(t.type)}</span>
            <div className="notif-toast-body">
              <span className="notif-toast-title">{t.title}</span>
              <span className="notif-toast-text">{t.body}</span>
            </div>
            <button
              className="notif-toast-close"
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
