import "./MembersList.css";
import { useState, useEffect, useCallback } from "react";
import {
  UserPlus, Users, Hash, MoreVertical, Plus, Pencil, Trash2, Copy, Check,
} from "lucide-react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Button,
} from "@mui/material";
import {
  getMembers, getMyDesk, getTeams, updateMembership,
  createTeam, updateTeam, deleteTeam, createInvitation,
} from "../../../../api/workspace";
import { statusColor, statusText } from "../../statusMeta";
import { getAllUsers } from "../../../../api/user";
import { useDialogs } from "../../../../components/DialogProvider";

const INVITE_ROLES = ["MEMBER", "ADMIN", "GUEST"];

// OWNER is intentionally not assignable here — ownership transfer is a separate flow.
const ROLES = ["GUEST", "MEMBER", "ADMIN"];

export default function MembersList({ workspaceId }) {
  const { confirm, notify } = useDialogs();
  const [tab, setTab] = useState("people");
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nameById, setNameById] = useState({});
  const [myRole, setMyRole] = useState(null);
  const isAdmin = myRole === "ADMIN" || myRole === "OWNER";

  const [manage, setManage] = useState(null); // {desk, role, title, teamId}
  const [teamModal, setTeamModal] = useState(null); // {id?, name, description}
  const [invite, setInvite] = useState(null); // {email, role} | null
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const sendInvite = async () => {
    try {
      const res = await createInvitation(workspaceId, { email: invite.email, role: invite.role });
      setInviteLink(`${window.location.origin}/onboarding?token=${res.token}`);
      setCopied(false);
      notify("Invitation created — share the link", "success");
    } catch (e) {
      notify(e?.response?.data?.message || "Could not create invitation (admin only)", "error");
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

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
      setMyRole(myDesk?.role ?? null);
    } catch (e) {
      console.error("Failed to load members/teams", e);
    }
    try {
      const users = await getAllUsers();
      const map = {};
      users.forEach((u) => {
        map[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim();
      });
      setNameById(map);
    } catch {
      /* names are best-effort */
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = (m) => nameById[m.userId] || m.fullName || `User ${m.userId}`;
  const teamName = (id) => teams.find((t) => t.id === id)?.name;
  const initials = (m) =>
    displayName(m).split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "?";

  const saveMember = async () => {
    try {
      await updateMembership(workspaceId, manage.desk.id, {
        role: manage.role,
        title: manage.title,
        teamId: Number(manage.teamId), // 0 = unassign
      });
      setManage(null);
      notify("Member updated", "success");
      load();
    } catch (e) {
      notify(e?.response?.data?.message || "Update failed (admin only)", "error");
    }
  };

  const saveTeam = async () => {
    try {
      if (teamModal.id) {
        await updateTeam(workspaceId, teamModal.id, teamModal);
      } else {
        await createTeam(workspaceId, teamModal);
      }
      setTeamModal(null);
      load();
    } catch (e) {
      notify(e?.response?.data?.message || "Could not save team", "error");
    }
  };

  const removeTeam = async (t) => {
    const ok = await confirm({
      title: "Delete team",
      message: `Delete "${t.name}"? Members will be unassigned.`,
      confirmText: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteTeam(workspaceId, t.id);
      load();
    } catch {
      notify("Could not delete team", "error");
    }
  };

  const PersonRow = ({ m }) => (
    <div className="person-card">
      <div className="person-avatar">
        {m.personalImageUrl ? (
          <img src={m.personalImageUrl} alt="" />
        ) : (
          <span>{initials(m)}</span>
        )}
        <span
          className={`presence ${m.isOnline ? "online" : ""}`}
          style={m.isOnline ? { background: statusColor(m.status) } : undefined}
        />
      </div>
      <div className="person-info">
        <div className="person-name">
          <span className="person-name-text">{displayName(m)}</span>
          {(m.role === "OWNER" || m.role === "ADMIN") && (
            <span className={`role-badge ${m.role.toLowerCase()}`}>{m.role}</span>
          )}
        </div>
        <div className="person-meta">
          <span className="person-title">
            {m.statusEmoji ? `${m.statusEmoji} ` : ""}
            {m.statusCustomText || m.title || "No title"}
          </span>
          {teamName(m.teamId) && (
            <span className="team-chip"><Hash size={11} />{teamName(m.teamId)}</span>
          )}
        </div>
        {(m.isOnline || (m.status && m.status !== "ACTIVE")) && (
          <div className="person-presence-line">
            {m.isOnline && <span className="in-office">● In office</span>}
            {m.status && m.status !== "ACTIVE" && (
              <span className="status-word" style={{ color: statusColor(m.status) }}>
                {statusText({ status: m.status })}
              </span>
            )}
          </div>
        )}
      </div>
      {isAdmin && (
        <button
          className="person-menu"
          title="Manage"
          onClick={() =>
            setManage({ desk: m, role: m.role, title: m.title || "", teamId: m.teamId || 0 })
          }
        >
          <MoreVertical size={16} />
        </button>
      )}
    </div>
  );

  return (
    <div className="members-list-container">
      <div className="members-list">
        <div className="members-header">
          <h3>People</h3>
          <span className="members-count">{members.length}</span>
        </div>

        <div className="people-tabs">
          <button className={tab === "people" ? "active" : ""} onClick={() => setTab("people")}>
            <Users size={15} /> People
          </button>
          <button className={tab === "teams" ? "active" : ""} onClick={() => setTab("teams")}>
            <Hash size={15} /> Teams
          </button>
        </div>

        <div className="members-content">
          {tab === "people" && members.map((m) => <PersonRow key={m.id} m={m} />)}

          {tab === "teams" && (
            <>
              {isAdmin && (
                <button className="new-team-btn" onClick={() => setTeamModal({ name: "", description: "" })}>
                  <Plus size={14} /> New team
                </button>
              )}
              {teams.map((t) => (
                <div className="team-section" key={t.id}>
                  <div className="team-header">
                    <span className="team-title"><Users size={13} /> {t.name}</span>
                    {isAdmin && (
                      <span className="team-actions">
                        <button title="Rename" onClick={() => setTeamModal({ id: t.id, name: t.name, description: t.description || "" })}>
                          <Pencil size={13} />
                        </button>
                        <button title="Delete" onClick={() => removeTeam(t)}>
                          <Trash2 size={13} />
                        </button>
                      </span>
                    )}
                  </div>
                  {members.filter((m) => m.teamId === t.id).map((m) => <PersonRow key={m.id} m={m} />)}
                  {members.filter((m) => m.teamId === t.id).length === 0 && (
                    <div className="team-empty">No members yet</div>
                  )}
                </div>
              ))}
              <div className="team-section">
                <div className="team-header"><span className="team-title">Unassigned</span></div>
                {members.filter((m) => !m.teamId).map((m) => <PersonRow key={m.id} m={m} />)}
              </div>
            </>
          )}
        </div>

        <div className="invite-section">
          <button
            className="invite-btn"
            onClick={() => { setInvite({ email: "", role: "MEMBER" }); setInviteLink(""); }}
          >
            <UserPlus size={17} />
            <span>Invite Member</span>
          </button>
        </div>
      </div>

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
                <button onClick={copyInviteLink} title="Copy">
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

      {/* Manage member (admin) */}
      <Dialog open={!!manage} onClose={() => setManage(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, width: 360 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Manage {manage && displayName(manage.desk)}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField select size="small" label="Role" value={manage?.role || "MEMBER"}
            disabled={manage?.desk?.role === "OWNER"}
            helperText={manage?.desk?.role === "OWNER" ? "The owner's role can't be changed here." : ""}
            onChange={(e) => setManage((s) => ({ ...s, role: e.target.value }))}>
            {[...new Set([manage?.role, ...ROLES])].filter(Boolean).map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="Title" placeholder="e.g. Software Engineer"
            value={manage?.title || ""}
            onChange={(e) => setManage((s) => ({ ...s, title: e.target.value }))} />
          <TextField select size="small" label="Team" value={manage?.teamId ?? 0}
            onChange={(e) => setManage((s) => ({ ...s, teamId: e.target.value }))}>
            <MenuItem value={0}>Unassigned</MenuItem>
            {teams.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setManage(null)} sx={{ textTransform: "none", color: "#64748b" }}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={saveMember}
            sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#5048e5", "&:hover": { bgcolor: "#403bc4" } }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Team create/rename (admin) */}
      <Dialog open={!!teamModal} onClose={() => setTeamModal(null)}
        slotProps={{ paper: { sx: { borderRadius: 3, width: 360 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{teamModal?.id ? "Rename team" : "New team"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <TextField autoFocus size="small" label="Team name" placeholder="e.g. Backend"
            value={teamModal?.name || ""}
            onChange={(e) => setTeamModal((s) => ({ ...s, name: e.target.value }))} />
          <TextField size="small" label="Description (optional)"
            value={teamModal?.description || ""}
            onChange={(e) => setTeamModal((s) => ({ ...s, description: e.target.value }))} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTeamModal(null)} sx={{ textTransform: "none", color: "#64748b" }}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={!teamModal?.name?.trim()} onClick={saveTeam}
            sx={{ textTransform: "none", borderRadius: 2, bgcolor: "#5048e5", "&:hover": { bgcolor: "#403bc4" } }}>
            {teamModal?.id ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
