import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  Button, Select, FormControl, InputLabel, Checkbox, ListItemText,
  Box, Chip,
} from "@mui/material";
import { getMembers, getTeams } from "../../../../api/workspace";
import { getAllUsers } from "../../../../api/user";
import { getChannel, updateChannel } from "../../../../api/chat";
import { useDialogs } from "../../../../components/DialogProvider";

const ACCENT = "#5048e5";

export default function ChannelSettingsModal({ channelId, workspaceId, open, onClose, onUpdated }) {
  const { notify } = useDialogs();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [allowedTeamIds, setAllowedTeamIds] = useState([]);
  const [moderatorIds, setModeratorIds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [names, setNames] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !channelId) return;
    getChannel(channelId)
      .then((ch) => {
        setName(ch.name || "");
        setDescription(ch.description || "");
        setVisibility(ch.visibility || "PUBLIC");
        setAllowedTeamIds(ch.allowedTeamIds || []);
        setModeratorIds(ch.moderatorIds || []);
      })
      .catch(() => notify("Could not load channel", "error"));
    if (workspaceId) {
      getTeams(workspaceId).then((d) => setTeams(Array.isArray(d) ? d : [])).catch(() => {});
      getMembers(workspaceId).then((d) => setMembers(Array.isArray(d) ? d : [])).catch(() => {});
    }
    getAllUsers()
      .then((us) => {
        const m = {};
        us.forEach((u) => { m[u.id] = `${u.firstName || ""} ${u.lastName || ""}`.trim(); });
        setNames(m);
      })
      .catch(() => {});
  }, [open, channelId, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameOf = (id) => names[id] || `User ${id}`;

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const ch = await updateChannel(channelId, {
        name: name.trim(),
        description: description.trim(),
        visibility,
        allowedTeamIds,
        moderatorIds,
      });
      onUpdated?.(ch);
      notify("Channel updated", "success");
      onClose();
    } catch (e) {
      notify(e?.status === 403 ? "Only the creator or a moderator can edit this channel" : "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const multiProps = { multiple: true, MenuProps: { PaperProps: { style: { maxHeight: 260 } } } };

  return (
    <Dialog open={open} onClose={onClose} slotProps={{ paper: { sx: { borderRadius: 3, width: 460 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Channel settings</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
        <TextField autoFocus size="small" label="Channel name" value={name}
          onChange={(e) => setName(e.target.value)} />
        <TextField size="small" label="Description" multiline minRows={2} value={description}
          onChange={(e) => setDescription(e.target.value)} />

        <TextField select size="small" label="Visibility" value={visibility}
          onChange={(e) => setVisibility(e.target.value)}>
          <MenuItem value="PUBLIC">Public — anyone in the workspace</MenuItem>
          <MenuItem value="PRIVATE">Private — members &amp; allowed teams only</MenuItem>
        </TextField>

        <FormControl size="small" fullWidth>
          <InputLabel>Teams with access</InputLabel>
          <Select {...multiProps} value={allowedTeamIds} label="Teams with access"
            onChange={(e) => setAllowedTeamIds(e.target.value)}
            renderValue={(sel) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {sel.map((id) => <Chip key={id} size="small" label={teams.find((t) => t.id === id)?.name || id} />)}
              </Box>
            )}>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Checkbox checked={allowedTeamIds.includes(t.id)} />
                <ListItemText primary={t.name} />
              </MenuItem>
            ))}
            {teams.length === 0 && <MenuItem disabled>No teams yet</MenuItem>}
          </Select>
        </FormControl>

        <FormControl size="small" fullWidth>
          <InputLabel>Moderators</InputLabel>
          <Select {...multiProps} value={moderatorIds} label="Moderators"
            onChange={(e) => setModeratorIds(e.target.value)}
            renderValue={(sel) => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {sel.map((id) => <Chip key={id} size="small" label={nameOf(id)} />)}
              </Box>
            )}>
            {members.map((m) => (
              <MenuItem key={m.userId} value={m.userId}>
                <Checkbox checked={moderatorIds.includes(m.userId)} />
                <ListItemText primary={nameOf(m.userId)} secondary={m.title || undefined} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none", color: "#64748b" }}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={busy || !name.trim()} onClick={save}
          sx={{ textTransform: "none", borderRadius: 2, bgcolor: ACCENT, "&:hover": { bgcolor: "#403bc4" } }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
