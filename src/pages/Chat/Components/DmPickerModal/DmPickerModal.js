import "./DmPickerModal.css";
import { useState, useEffect, useMemo } from "react";
import { X, Search } from "lucide-react";
import { getMembers } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import { getOrCreateDm } from "../../../../api/chat";
import { getCurrentUserId } from "../../../../utils/auth";
import { statusColor } from "../../statusMeta";
import { useDialogs } from "../../../../components/DialogProvider";

export default function DmPickerModal({ workspaceId, open, onClose, onOpenDm }) {
  const { notify } = useDialogs();
  const [people, setPeople] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const me = getCurrentUserId();

  useEffect(() => {
    if (!open || !workspaceId) return;
    setQ("");
    (async () => {
      try {
        const [desks, users] = await Promise.all([
          getMembers(workspaceId),
          getAllUsers().catch(() => []),
        ]);
        const nameById = {};
        users.forEach((u) => {
          nameById[u.id] = {
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
            email: u.email,
          };
        });
        const list = (desks || [])
          .filter((d) => d.userId != null && d.userId !== me)
          .map((d) => ({
            userId: d.userId,
            name: nameById[d.userId]?.name || d.fullName || `User ${d.userId}`,
            email: nameById[d.userId]?.email || d.workEmail || "",
            title: d.title || "",
            avatar: d.personalImageUrl || "",
            status: d.status,
            online: d.isOnline,
          }));
        setPeople(list);
      } catch {
        setPeople([]);
      }
    })();
  }, [open, workspaceId, me]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return people;
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.email.toLowerCase().includes(s) ||
        p.title.toLowerCase().includes(s),
    );
  }, [people, q]);

  if (!open) return null;

  const pick = async (p) => {
    setBusy(true);
    try {
      const dm = await getOrCreateDm(p.userId);
      onOpenDm({ id: dm.id, name: p.name, type: "DIRECT" });
      onClose();
    } catch {
      notify("Could not open the conversation", "error");
    } finally {
      setBusy(false);
    }
  };

  const initials = (name) =>
    name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="dmp-overlay" onClick={onClose}>
      <div className="dmp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dmp-head">
          <span className="dmp-title">New direct message</span>
          <button className="dmp-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="dmp-search">
          <Search size={16} />
          <input
            autoFocus
            placeholder="Search people by name, title, or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="dmp-list">
          {filtered.length === 0 ? (
            <div className="dmp-empty">No people match “{q}”.</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.userId}
                className="dmp-row"
                disabled={busy}
                onClick={() => pick(p)}
              >
                <span className="dmp-avatar">
                  {p.avatar ? <img src={p.avatar} alt="" /> : initials(p.name)}
                  {p.online != null && (
                    <span
                      className="dmp-dot"
                      style={{ background: p.online ? statusColor(p.status) : "var(--content-muted)" }}
                    />
                  )}
                </span>
                <span className="dmp-info">
                  <span className="dmp-name">{p.name}</span>
                  <span className="dmp-sub">{p.title || p.email || ""}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
