import "./InvitationsModal.css";
import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, Ban, Mail } from "lucide-react";
import { getInvitations, revokeInvitation } from "../../../../api/workspace";
import { useDialogs } from "../../../../components/DialogProvider";

const STATUS_STYLE = {
  PENDING: { label: "Pending", cls: "pending" },
  ACCEPTED: { label: "Accepted", cls: "accepted" },
  DECLINED: { label: "Revoked", cls: "declined" },
  EXPIRED: { label: "Expired", cls: "expired" },
};

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";

export default function InvitationsModal({ workspaceId, open, onClose }) {
  const { confirm, notify } = useDialogs();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const list = await getInvitations(workspaceId);
      setInvites(Array.isArray(list) ? list : []);
    } catch (e) {
      notify(e?.response?.data?.message || "Could not load invitations (admin only)", "error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, notify]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open) return null;

  const linkFor = (inv) => `${window.location.origin}/onboarding?token=${inv.token}`;

  const copy = async (inv) => {
    try {
      await navigator.clipboard.writeText(linkFor(inv));
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      notify("Couldn't copy", "error");
    }
  };

  const revoke = async (inv) => {
    const ok = await confirm({
      title: "Revoke invitation",
      message: `Deactivate the invite for ${inv.invitedEmail}? The link will stop working.`,
      confirmText: "Revoke",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await revokeInvitation(workspaceId, inv.id);
      notify("Invitation revoked", "success");
      load();
    } catch (e) {
      notify(e?.response?.data?.message || "Could not revoke", "error");
    }
  };

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inv-head">
          <span className="inv-title">
            <Mail size={18} /> Invitations
          </span>
          <button className="inv-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="inv-list">
          {loading ? (
            <div className="inv-empty">Loading…</div>
          ) : invites.length === 0 ? (
            <div className="inv-empty">No invitations yet. Use “Invite” to create one.</div>
          ) : (
            invites.map((inv) => {
              const st = STATUS_STYLE[inv.status] || STATUS_STYLE.PENDING;
              const pending = inv.status === "PENDING";
              return (
                <div className="inv-row" key={inv.id}>
                  <div className="inv-info">
                    <span className="inv-email">{inv.invitedEmail}</span>
                    <span className="inv-meta">
                      <span className={`inv-status ${st.cls}`}>{st.label}</span>
                      <span className="inv-role">{inv.role}</span>
                      {pending && <span className="inv-exp">expires {fmt(inv.expiresAt)}</span>}
                    </span>
                  </div>
                  {pending && (
                    <div className="inv-actions">
                      <button className="inv-btn" title="Copy invite link" onClick={() => copy(inv)}>
                        {copiedId === inv.id ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                      <button
                        className="inv-btn danger"
                        title="Revoke (deactivate link)"
                        onClick={() => revoke(inv)}
                      >
                        <Ban size={15} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
