import { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Button, Select, FormControl, InputLabel, Checkbox, ListItemText,
  Box, Chip,
} from "@mui/material";
import { getMembers, getTeams } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import { getCurrentUserId, authHeaders } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";

const ACCENT = "#5048e5";

export default function CreateChannelModal({ workspaceId, open, onClose, onCreated }) {
  const { notify } = useDialogs();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [access, setAccess] = useState("everyone"); // everyone | teams | people
  const [selTeams, setSelTeams] = useState([]);
  const [selPeople, setSelPeople] = useState([]);
  const [mods, setMods] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !workspaceId) return;
    getMembers(workspaceId).then((d) => setMembers(Array.isArray(d) ? d : [])).catch(() => {});
    getTeams(workspaceId).then((d) => setTeams(Array.isArray(d) ? d : [])).catch(() => {});
    getAllUsers()
      .then((us) => {
        const m = {};
        us.forEach((u) => { m[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim(); });
        setNames(m);
      })
      .catch(() => {});
  }, [open, workspaceId]);

  const nameOf = (id) => names[id] || `User ${id}`;

  // The userIds that will belong to the channel, given the current access choice.
  const resolvedMembers = useMemo(() => {
    const me = getCurrentUserId();
    let ids = [];
    if (access === "everyone") ids = members.map((m) => m.userId);
    else if (access === "teams") ids = members.filter((m) => selTeams.includes(m.teamId)).map((m) => m.userId);
    else ids = [...selPeople];
    return [...new Set([...ids, me])].filter((x) => x != null);
  }, [access, members, selTeams, selPeople]);

  const reset = () => {
    setName(""); setDescription(""); setAccess("everyone");
    setSelTeams([]); setSelPeople([]); setMods([]);
  };

  const create = async () => {
    if (!name.trim() || !workspaceId) return;
    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        workspaceId,
        members: resolvedMembers,
        description: description.trim() || undefined,
        visibility: access === "everyone" ? "PUBLIC" : "PRIVATE",
        allowedTeamIds: access === "teams" ? selTeams : undefined,
        moderatorIds: mods.filter((id) => resolvedMembers.includes(id)),
      };
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const ch = await res.json();
        onCreated?.(ch);
        reset();
        onClose();
      } else if (res.status === 409) {
        notify("A channel with that name already exists", "warning");
      } else {
        notify("Failed to create the channel", "error");
      }
    } catch (e) {
      notify("Connection error", "error");
    } finally {
      setBusy(false);
    }
  };

  const multiProps = {
    multiple: true,
    MenuProps: { PaperProps: { style: { maxHeight: 260 } } },
  };

  return (
    <Dialog open={open} onClose={onClose}
      slotProps={{ paper: { sx: { borderRadius: 3, width: 460 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Create a channel</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        <TextField autoFocus size="small" label="Channel name" placeholder="e.g. marketing"
          value={name} onChange={(e) => setName(e.target.value)} />
        <TextField size="small" label="Description (optional)"
          value={description} onChange={(e) => setDescription(e.target.value)} />

        <TextField select size="small" label="Who has access?" value={access}
          onChange={(e) => setAccess(e.target.value)}>
          <MenuItem value="everyone">Everyone in the workspace</MenuItem>
          <MenuItem value="teams">Specific teams</MenuItem>
          <MenuItem value="people">Specific people</MenuItem>
        </TextField>

        {access === "teams" && (
          <FormControl size="small" fullWidth>
            <InputLabel>Teams</InputLabel>
            <Select {...multiProps} value={selTeams} label="Teams"
              onChange={(e) => setSelTeams(e.target.value)}
              renderValue={(sel) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {sel.map((id) => <Chip key={id} size="small" label={teams.find((t) => t.id === id)?.name || id} />)}
                </Box>
              )}>
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  <Checkbox checked={selTeams.includes(t.id)} />
                  <ListItemText primary={t.name} />
                </MenuItem>
              ))}
              {teams.length === 0 && <MenuItem disabled>No teams yet</MenuItem>}
            </Select>
          </FormControl>
        )}

        {access === "people" && (
          <FormControl size="small" fullWidth>
            <InputLabel>People</InputLabel>
            <Select {...multiProps} value={selPeople} label="People"
              onChange={(e) => setSelPeople(e.target.value)}
              renderValue={(sel) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {sel.map((id) => <Chip key={id} size="small" label={nameOf(id)} />)}
                </Box>
              )}>
              {members.map((m) => (
                <MenuItem key={m.userId} value={m.userId}>
                  <Checkbox checked={selPeople.includes(m.userId)} />
                  <ListItemText primary={nameOf(m.userId)} secondary={m.title || undefined} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl size="small" fullWidth>
          <InputLabel>Moderators (optional)</InputLabel>
          <Select {...multiProps} value={mods} label="Moderators (optional)"
            onChange={(e) => setMods(e.target.value)}
            renderValue={(sel) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {sel.map((id) => <Chip key={id} size="small" label={nameOf(id)} />)}
              </Box>
            )}>
            {resolvedMembers.map((id) => (
              <MenuItem key={id} value={id}>
                <Checkbox checked={mods.includes(id)} />
                <ListItemText primary={nameOf(id)} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ fontSize: 12, color: "#64748b" }}>
          {access === "everyone"
            ? "Public — everyone in the workspace can join."
            : `Private — ${resolvedMembers.length} member(s) will have access.`}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", color: "#64748b" }}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={busy || !name.trim()} onClick={create}
          sx={{ textTransform: "none", borderRadius: 2, bgcolor: ACCENT, "&:hover": { bgcolor: "#403bc4" } }}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
