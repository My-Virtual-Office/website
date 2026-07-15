import "./ContactsDirectory.css";
import { useState, useEffect, useCallback } from "react";
import { Search, UserPlus, Users, Copy, Check, Mail, ChevronRight, ChevronDown } from "lucide-react";
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
  // "people" is the flat directory; "teams" groups the same people by their team.
  // Kept separate from `filter` because Teams is a different view, not a fourth role.
  const [view, setView] = useState("people");
  const [openTeams, setOpenTeams] = useState(() => new Set()); // team ids expanded
  const [q, setQ] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [loadError, setLoadError] = useState("");
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
      setLoadError("");
    } catch (e) {
      // Drop what we were showing. Keeping it meant that when this workspace's directory failed
      // (403), the PREVIOUS workspace's people stayed on screen — together with a stale isAdmin
      // that kept the Invite button visible. Inviting then hit the real workspace and came back
      // "not an active member", which reads as "invite is broken" rather than "you are not in
      // this workspace". Say that plainly instead of only logging it to the console.
      setMembers([]);
      setTeams([]);
      setIsAdmin(false);
      setLoadError(e?.response?.data?.message || "Could not load this workspace's people");
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

  const matchesQuery = (m) => {
    if (!q) return true;
    const hay = `${name(m)} ${email(m)} ${m.title || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  const rows = members.filter((m) => {
    if (filter !== "all") {
      const isAdminRole = m.role === "ADMIN" || m.role === "OWNER";
      if (filter === "ADMIN" ? !isAdminRole : m.role !== filter) return false;
    }
    return matchesQuery(m);
  });

  // Every team, plus the people who are in none — an unassigned pile is the thing
  // an admin most wants to see here, and hiding it would make the counts lie.
  const teamGroups = [
    ...teams.map((t) => ({
      key: String(t.id),
      name: t.name,
      description: t.description,
      people: members.filter((m) => m.teamId === t.id).filter(matchesQuery),
    })),
    {
      key: "none",
      name: "No team",
      description: "Not assigned to a team yet",
      people: members.filter((m) => !m.teamId).filter(matchesQuery),
    },
  ].filter((g) => {
    if (g.key === "none" && g.people.length === 0) return false; // nothing to nag about
    return q ? g.people.length > 0 : true; // while searching, only teams with a hit
  });

  const toggleTeam = (key) =>
    setOpenTeams((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
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

      {loadError && (
        <div className="contacts-error" role="alert">
          {loadError}
        </div>
      )}

      <div className="contacts-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={view === "people" && filter === f.key ? "active" : ""}
            onClick={() => { setView("people"); setFilter(f.key); }}
          >
            {f.label}
          </button>
        ))}
        <span className="contacts-filters-sep" />
        <button
          className={`contacts-teams-pill ${view === "teams" ? "active" : ""}`}
          onClick={() => setView("teams")}
          aria-pressed={view === "teams"}
        >
          <Users size={14} /> Teams
        </button>
      </div>

      {view === "teams" ? (
        <div className="contacts-table-wrap">
          <div className="teams-list">
            {teamGroups.map((g) => {
              const open = openTeams.has(g.key);
              return (
                <div className={`team-card ${open ? "open" : ""}`} key={g.key}>
                  <div className="team-row">
                    <span className={`team-icon ${g.key === "none" ? "muted" : ""}`}>
                      <Users size={15} />
                    </span>
                    <div className="team-meta">
                      <span className="team-name">{g.name}</span>
                      {g.description && <span className="team-desc">{g.description}</span>}
                    </div>
                    <span className="team-count">
                      {g.people.length} {g.people.length === 1 ? "person" : "people"}
                    </span>
                    <button
                      className="team-open"
                      onClick={() => toggleTeam(g.key)}
                      aria-expanded={open}
                    >
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      {open ? "Close" : "Open"}
                    </button>
                  </div>

                  {open && (
                    <div className="team-people">
                      {g.people.map((m) => (
                        <div className="team-person" key={m.id}>
                          <span className="c-avatar">
                            {m.personalImageUrl ? <img src={m.personalImageUrl} alt="" /> : initials(m)}
                          </span>
                          <div className="team-person-meta">
                            <span className="c-name">{name(m)}</span>
                            <span className="team-person-title">{m.title || "—"}</span>
                          </div>
                          <span className={`c-role ${(m.role || "").toLowerCase()}`}>{m.role}</span>
                          <span className="team-person-status">
                            <span className={`c-dot ${m.isOnline ? "online" : ""}`} />
                            {m.isOnline ? "Active" : "Away"}
                          </span>
                        </div>
                      ))}
                      {g.people.length === 0 && (
                        <div className="team-empty">No one in this team yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {teamGroups.length === 0 && (
              <div className="c-empty" style={{ padding: 24 }}>
                {q ? "No team has anyone matching." : "No teams yet."}
              </div>
            )}
          </div>
        </div>
      ) : (
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
      )}

      <div className="contacts-footer">
        {view === "teams"
          ? `Teams: ${teams.length} · People: ${members.length}`
          : `Total: ${rows.length}`}
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
