import "./ContactsDirectory.css";
import { useState, useEffect, useCallback } from "react";
import { Search, UserPlus, Users, Copy, Check, Mail } from "lucide-react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Button,
} from "@mui/material";
import { getMembers, getTeams, getMyDesk, createInvitation } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import InvitationsModal from "../InvitationsModal/InvitationsModal";
import { useDialogs } from "../../../../components/DialogProvider";

const FILTERS = [
  { key: "all", label: "All people" },
  { key: "ADMIN", label: "Admins" },
  { key: "MEMBER", label: "Members" },
  { key: "GUEST", label: "Guests" },
];
const INVITE_ROLES = ["MEMBER", "ADMIN", "GUEST"];

export default function ContactsDirectory({ workspaceId }) {
  const { notify } = useDialogs();
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState({});
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [invite, setInvite] = useState(null); // {email, role} | null
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [showInvites, setShowInvites] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [desks, teamList, myDesk] = await Promise.all([
        getMembers(workspaceId),
        getTeams(workspaceId),
        getMyDesk(workspaceId).catch(() => null),
      ]);
      setMembers(Array.isArray(desks) ? desks : []);
      setTeams(Array.isArray(teamList) ? teamList : []);
      setIsAdmin(myDesk?.role === "ADMIN" || myDesk?.role === "OWNER");
    } catch (e) {
      console.error("Failed to load contacts", e);
    }
    try {
      const us = await getAllUsers();
      const map = {};
      us.forEach((u) => {
        map[u.id] = { name: `${u.firstName || ""} ${u.lastName || ""}`.trim(), email: u.email };
      });
      setUsers(map);
    } catch {
      /* names best-effort */
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const name = (m) => users[m.userId]?.name || m.fullName || `User ${m.userId}`;
  const email = (m) => users[m.userId]?.email || m.workEmail || "—";
  const teamName = (id) => teams.find((t) => t.id === id)?.name || "—";
  const initials = (m) =>
    name(m).split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";

  const rows = members.filter((m) => {
    if (filter !== "all") {
      const isAdminRole = m.role === "ADMIN" || m.role === "OWNER";
      if (filter === "ADMIN" ? !isAdminRole : m.role !== filter) return false;
    }
    if (q) {
      const hay = `${name(m)} ${email(m)} ${m.title || ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const sendInvite = async () => {
    try {
      const res = await createInvitation(workspaceId, { email: invite.email, role: invite.role });
      const link = `${window.location.origin}/onboarding?token=${res.token}`;
      setInviteLink(link);
      setCopied(false);
      notify("Invitation created — share the link", "success");
    } catch (e) {
      notify(e?.response?.data?.message || "Could not create invitation (admin only)", "error");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="contacts">
      <div className="contacts-header">
        <div className="contacts-title">
          <Users size={18} /> People
        </div>
        <div className="contacts-tools">
          <div className="contacts-search">
            <Search size={15} />
            <input placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {isAdmin && (
            <>
              <button className="contacts-invite ghost" onClick={() => setShowInvites(true)}>
                <Mail size={15} /> Invitations
              </button>
              <button
                className="contacts-invite"
                onClick={() => { setInvite({ email: "", role: "MEMBER" }); setInviteLink(""); }}
              >
                <UserPlus size={15} /> Invite
              </button>
            </>
          )}
        </div>
      </div>

      <div className="contacts-filters">
        {FILTERS.map((f) => (
          <button key={f.key} className={filter === f.key ? "active" : ""} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="contacts-table-wrap">
        <table className="contacts-table">
          <thead>
            <tr>
              <th>PERSON</th>
              <th>TITLE</th>
              <th>TEAM</th>
              <th>ROLE</th>
              <th>CONTACT</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td className="c-person">
                  <span className="c-avatar">
                    {m.personalImageUrl ? <img src={m.personalImageUrl} alt="" /> : initials(m)}
                  </span>
                  <span className="c-name">{name(m)}</span>
                </td>
                <td>{m.title || "—"}</td>
                <td>{m.teamId ? teamName(m.teamId) : "—"}</td>
                <td>
                  <span className={`c-role ${(m.role || "").toLowerCase()}`}>{m.role}</span>
                </td>
                <td className="c-email">{email(m)}</td>
                <td>
                  <span className={`c-dot ${m.isOnline ? "online" : ""}`} />
                  {m.isOnline ? "Active" : "Away"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="c-empty">No people match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="contacts-footer">Total: {rows.length}</div>

      {/* Invite modal */}
      <Dialog open={!!invite} onClose={() => setInvite(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, width: 420 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Invite to workspace</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          {!inviteLink ? (
            <>
              <TextField autoFocus size="small" type="email" label="Email"
                placeholder="person@example.com"
                value={invite?.email || ""}
                onChange={(e) => setInvite((s) => ({ ...s, email: e.target.value }))} />
              <TextField select size="small" label="Role" value={invite?.role || "MEMBER"}
                onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))}>
                {INVITE_ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
            </>
          ) : (
            <div className="invite-result">
              <p>Share this link — they’ll join via <b>Onboarding → Join</b>:</p>
              <div className="invite-link">
                <input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
                <button onClick={copyLink} title="Copy">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInvite(null)} sx={{ textTransform: "none", color: "#64748b" }}>
            {inviteLink ? "Done" : "Cancel"}
          </Button>
          {!inviteLink && (
            <Button variant="contained" disableElevation disabled={!invite?.email?.trim()} onClick={sendInvite}
              sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#5048e5", "&:hover": { bgcolor: "#403bc4" } }}>
              Create invite
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <InvitationsModal
        workspaceId={workspaceId}
        open={showInvites}
        onClose={() => setShowInvites(false)}
      />
    </div>
  );
}
