import { useState, useEffect, useMemo, useRef } from "react";
import {
  Hash, Plus, ChevronDown, ChevronRight, MoreVertical, Pin, PinOff, FolderPlus,
  Lock, Volume2, VolumeX, Link2, Link2Off,
} from "lucide-react";
import {
  Menu, MenuItem, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Select, FormControl, InputLabel, Checkbox, ListItemText, Box, Chip,
} from "@mui/material";
import { updateChannel } from "../../../../api/chat";
import { getTeams } from "../../../../api/workspace";
import { useDialogs } from "../../../../components/DialogProvider";
import useVoiceChannels from "./useVoiceChannels";
import VoiceChannelRow from "./VoiceChannelRow";
import "./ChannelGroups.css";

// Discord-style channel organisation, kept per-user per-workspace in localStorage.
// Categories group BOTH text channels and voice rooms — two different backend
// resources (chat-service channels vs room-service rooms) presented as one list,
// which is what "not separated" meant. Pinning/categorising is a personal
// sidebar preference and stays client-side; category PERMISSIONS are real and
// go through the same per-channel visibility/allowedTeamIds the channel settings
// modal already uses (voice rooms have no such concept here, so permission only
// touches text channels in the category).
//
// The DEFAULT layout mirrors the seeded demo (seed/seed-data.json →
// channelCategories / roomCategories) so a fresh workspace opens organised.

const FALLBACK = { id: "default", name: "Channels" };
const PINNED_KEY = "__pinned__";

// Keep in sync with seed/seed-data.json.
const DEFAULT_CATS = [
  { id: "company", name: "Company-wide", chNames: ["announcements", "general", "random", "wins", "help"], roomNames: ["Daily Standup", "Coffee Lounge", "Focus Room"] },
  { id: "engineering", name: "Engineering", chNames: ["engineering", "backend-platform", "frontend", "devops", "developer-experience", "bugs", "incident-response"], roomNames: ["Backend Pairing Room", "Frontend Pairing Room", "Testing Lab", "Incident War Room"] },
  { id: "product", name: "Product & Design", chNames: ["product", "design-review", "data-insights", "customer-voice"], roomNames: ["Product Planning Room", "Design Review Room"] },
  { id: "gtm", name: "Go-to-Market", chNames: ["sales", "customer-onboarding", "revenue-operations"], roomNames: ["Customer Demo Room"] },
  { id: "projects", name: "Releases & Projects", chNames: ["release-2-9", "calendar-sync", "enterprise-security"], roomNames: [] },
  { id: "people", name: "People & Leadership", chNames: ["people-ops", "hiring-panel", "leadership-private"], roomNames: ["Leadership Room"] },
];
const DEFAULT_CH_BY_NAME = new Map();
const DEFAULT_ROOM_BY_NAME = new Map();
DEFAULT_CATS.forEach((c) => {
  c.chNames.forEach((n) => DEFAULT_CH_BY_NAME.set(n, c.id));
  c.roomNames.forEach((n) => DEFAULT_ROOM_BY_NAME.set(n, c.id));
});

const emptyOrg = () => ({
  userCats: [], assign: {}, pinned: [], collapsed: {}, catPerm: {}, unsynced: {}, showVoice: true,
});

function loadOrg(workspaceId) {
  if (!workspaceId) return emptyOrg();
  try {
    const o = JSON.parse(localStorage.getItem(`chan-org:${workspaceId}`) || "null");
    if (!o) return emptyOrg();
    return {
      userCats: o.userCats || [],
      assign: o.assign || {},
      pinned: o.pinned || [],
      collapsed: o.collapsed || {},
      catPerm: o.catPerm || {},
      unsynced: o.unsynced || {}, // channelId -> true means "does not follow category permission"
      showVoice: o.showVoice !== false,
    };
  } catch {
    return emptyOrg();
  }
}

let uid = 0;
const newId = () => `cat-${Date.now().toString(36)}-${uid++}`;
// A stable key across the merged list — channel ids and room ids can collide.
const itemKey = (item) => `${item.kind}:${item.id}`;

export default function ChannelGroups({ channels, activeChannel, unread, members, onSelect, onCreateChannel }) {
  const workspaceId = channels[0]?.workspaceId ?? null;
  const { notify } = useDialogs();
  const voice = useVoiceChannels(workspaceId, members);

  const [org, setOrg] = useState(() => loadOrg(workspaceId));
  const [menu, setMenu] = useState(null); // { anchor, item }
  const [catDialog, setCatDialog] = useState(null); // { mode: "new"|"rename", id?, name, forItemKey? }
  const [permDialog, setPermDialog] = useState(null); // { catId, visibility, allowedTeamIds }
  const [teams, setTeams] = useState([]);
  const loadedFor = useRef(workspaceId);

  useEffect(() => {
    if (loadedFor.current !== workspaceId) {
      loadedFor.current = workspaceId;
      setOrg(loadOrg(workspaceId));
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    try {
      localStorage.setItem(`chan-org:${workspaceId}`, JSON.stringify(org));
    } catch {
      /* quota / private mode — sidebar still works, it just won't remember */
    }
  }, [org, workspaceId]);

  useEffect(() => {
    if (workspaceId) getTeams(workspaceId).then((d) => setTeams(Array.isArray(d) ? d : [])).catch(() => {});
  }, [workspaceId]);

  // The merged, taggable list: real channels + voice rooms, one item shape.
  const items = useMemo(() => {
    const chItems = channels.map((ch) => ({ kind: "channel", id: ch.id, name: ch.name, data: ch }));
    const roomItems = voice.rooms.map((r) => ({ kind: "room", id: r.id, name: r.name, data: r }));
    return [...chItems, ...roomItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, voice.rooms]);

  const allCats = useMemo(
    () => [...DEFAULT_CATS.map((c) => ({ id: c.id, name: c.name })), ...org.userCats, FALLBACK],
    [org.userCats],
  );
  const catExists = (id) => allCats.some((c) => c.id === id);
  const defaultCatFor = (item) =>
    (item.kind === "channel" ? DEFAULT_CH_BY_NAME.get(item.name) : DEFAULT_ROOM_BY_NAME.get(item.name)) || FALLBACK.id;
  const catOf = (item) => {
    const k = itemKey(item);
    return org.assign[k] && catExists(org.assign[k]) ? org.assign[k] : defaultCatFor(item);
  };
  const isPinned = (item) => org.pinned.includes(itemKey(item));
  const isSynced = (item) => item.kind === "channel" && !org.unsynced[item.id];

  const groups = useMemo(() => {
    const byCat = new Map(allCats.map((c) => [c.id, []]));
    items.forEach((it) => {
      if (it.kind === "room" && !org.showVoice) return; // the hide-voice toggle
      const cid = catOf(it);
      (byCat.get(cid) || byCat.get(FALLBACK.id)).push(it);
    });
    return allCats.map((c) => ({ ...c, items: byCat.get(c.id) || [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, org, allCats]);

  const pinnedItems = useMemo(
    () => org.pinned.map((k) => items.find((it) => itemKey(it) === k)).filter(Boolean),
    [items, org.pinned],
  );

  const toggleCollapse = (key) => setOrg((o) => ({ ...o, collapsed: { ...o.collapsed, [key]: !o.collapsed[key] } }));
  const toggleShowVoice = () => setOrg((o) => ({ ...o, showVoice: !o.showVoice }));
  const togglePin = (item) => {
    const k = itemKey(item);
    setOrg((o) => ({ ...o, pinned: o.pinned.includes(k) ? o.pinned.filter((x) => x !== k) : [...o.pinned, k] }));
  };
  const moveTo = (item, catId) => setOrg((o) => ({ ...o, assign: { ...o.assign, [itemKey(item)]: catId } }));
  const toggleSync = (item) => {
    if (item.kind !== "channel") return;
    setOrg((o) => {
      const unsynced = { ...o.unsynced };
      if (unsynced[item.id]) delete unsynced[item.id];
      else unsynced[item.id] = true;
      return { ...o, unsynced };
    });
    // Re-syncing immediately picks up whatever the category already enforces —
    // "sync" should mean "matches now", not "will match on the next edit".
    const catId = catOf(item);
    const perm = org.catPerm[catId];
    if (perm && org.unsynced[item.id]) {
      updateChannel(item.id, { visibility: perm.visibility, allowedTeamIds: perm.allowedTeamIds })
        .catch(() => notify("Could not apply category permissions to this channel", "error"));
    }
  };

  const submitCatDialog = () => {
    const name = (catDialog?.name || "").trim();
    if (!name) return;
    if (catDialog.mode === "rename") {
      const id = catDialog.id;
      setOrg((o) => {
        const inUser = o.userCats.some((c) => c.id === id);
        return {
          ...o,
          userCats: inUser ? o.userCats.map((c) => (c.id === id ? { ...c, name } : c)) : [...o.userCats, { id, name }],
        };
      });
    } else {
      const id = newId();
      setOrg((o) => ({ ...o, userCats: [...o.userCats, { id, name }] }));
      if (catDialog.forItem) moveTo(catDialog.forItem, id);
    }
    setCatDialog(null);
    setMenu(null);
  };

  const deleteCategory = (catId) => {
    if (DEFAULT_CATS.some((c) => c.id === catId) || catId === FALLBACK.id) return;
    setOrg((o) => {
      const assign = { ...o.assign };
      Object.keys(assign).forEach((k) => { if (assign[k] === catId) delete assign[k]; });
      const catPerm = { ...o.catPerm };
      delete catPerm[catId];
      return { ...o, userCats: o.userCats.filter((c) => c.id !== catId), assign, catPerm };
    });
  };

  const displayName = (cat) => org.userCats.find((c) => c.id === cat.id)?.name || cat.name;

  const openPermDialog = (catId) => {
    const perm = org.catPerm[catId] || { visibility: "PUBLIC", allowedTeamIds: [] };
    setPermDialog({ catId, visibility: perm.visibility, allowedTeamIds: perm.allowedTeamIds });
  };

  const savePermDialog = async () => {
    const { catId, visibility, allowedTeamIds } = permDialog;
    setOrg((o) => ({ ...o, catPerm: { ...o.catPerm, [catId]: { visibility, allowedTeamIds } } }));
    // Push to every synced channel in this category. Rooms have no such concept
    // here, so only real chat channels are touched.
    const targets = (groups.find((g) => g.id === catId)?.items || [])
      .filter((it) => it.kind === "channel" && isSynced(it));
    setPermDialog(null);
    if (targets.length === 0) return;
    const results = await Promise.allSettled(
      targets.map((it) => updateChannel(it.id, { visibility, allowedTeamIds })),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      notify(`Applied to ${targets.length - failed}/${targets.length} channels — ${failed} failed (creator/moderator only)`, "warning");
    } else {
      notify(`Permission applied to ${targets.length} channel${targets.length === 1 ? "" : "s"}`, "success");
    }
  };

  const row = (item, { inPinned = false } = {}) => {
    if (item.kind === "room") {
      return (
        <div key={`${inPinned ? "p-" : ""}room-${item.id}`} className="cg-room-wrap">
          <VoiceChannelRow room={item.data} voice={voice} />
          <button
            className="cg-more cg-more-room"
            onClick={(e) => { e.stopPropagation(); setMenu({ anchor: e.currentTarget, item }); }}
            aria-label="Voice channel options"
          >
            <MoreVertical size={15} />
          </button>
        </div>
      );
    }
    const channel = item.data;
    const isActive = activeChannel !== null && activeChannel.id === channel.id;
    const u = unread[channel.id];
    const showBadge = !isActive && u && u.count > 0;
    return (
      <div
        key={`${inPinned ? "p-" : ""}${channel.id}`}
        className={`channel-item ${isActive ? "active" : ""} ${showBadge ? "unread" : ""}`}
        onClick={() => onSelect(channel)}
      >
        <span className="cg-hash">{inPinned ? <Pin size={14} /> : <Hash size={16} />}</span>
        <span className="channel-name">{channel.name}</span>
        {showBadge && <span className={`unread-badge ${u.mention ? "mention" : ""}`}>{u.count > 99 ? "99+" : u.count}</span>}
        <button
          className="cg-more"
          onClick={(e) => { e.stopPropagation(); setMenu({ anchor: e.currentTarget, item }); }}
          aria-label="Channel options"
        >
          <MoreVertical size={15} />
        </button>
      </div>
    );
  };

  return (
    <div className="channels-section">
      <div className="channels-header">
        <span>CHANNELS</span>
        <div className="cg-head-actions">
          <button
            onClick={toggleShowVoice}
            title={org.showVoice ? "Hide voice channels" : "Show voice channels"}
            aria-pressed={org.showVoice}
          >
            {org.showVoice ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <button onClick={() => setCatDialog({ mode: "new", name: "" })} title="New category" aria-label="New category">
            <FolderPlus size={15} />
          </button>
          <button onClick={onCreateChannel} title="Create channel" aria-label="Create channel">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {pinnedItems.length > 0 && (
        <div className="cg-group">
          <button className="cg-cat-head" onClick={() => toggleCollapse(PINNED_KEY)}>
            {org.collapsed[PINNED_KEY] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <span className="cg-cat-name">Pinned</span>
            <span className="cg-cat-count">{pinnedItems.length}</span>
          </button>
          {!org.collapsed[PINNED_KEY] && (
            <div className="channels-list">{pinnedItems.map((it) => row(it, { inPinned: true }))}</div>
          )}
        </div>
      )}

      {groups.map((g) => {
        if (g.items.length === 0) return null;
        const collapsed = org.collapsed[g.id];
        const deletable = !DEFAULT_CATS.some((c) => c.id === g.id) && g.id !== FALLBACK.id;
        const perm = org.catPerm[g.id];
        return (
          <div className="cg-group" key={g.id}>
            <button
              className="cg-cat-head"
              onClick={() => toggleCollapse(g.id)}
              onDoubleClick={() => setCatDialog({ mode: "rename", id: g.id, name: displayName(g) })}
            >
              {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              <span className="cg-cat-name">{displayName(g)}</span>
              <span className="cg-cat-count">{g.items.length}</span>
              <span
                className={`cg-cat-perm ${perm ? "set" : ""}`}
                onClick={(e) => { e.stopPropagation(); openPermDialog(g.id); }}
                title={perm ? `${perm.visibility === "PRIVATE" ? "Private" : "Public"} — category permission set` : "Set category permissions"}
              >
                <Lock size={13} />
              </span>
              {deletable && (
                <span
                  className="cg-cat-del"
                  onClick={(e) => { e.stopPropagation(); deleteCategory(g.id); }}
                  title="Delete category (items return to their default)"
                >
                  ×
                </span>
              )}
            </button>
            {!collapsed && <div className="channels-list">{g.items.map((it) => row(it))}</div>}
          </div>
        );
      })}

      {/* Per-item menu: pin/unpin, move to a category, and (channels only) sync toggle. */}
      <Menu
        anchorEl={menu?.anchor}
        open={!!menu}
        onClose={() => setMenu(null)}
        slotProps={{ paper: { sx: { minWidth: 220, borderRadius: 2 } } }}
      >
        {menu && (
          <MenuItem onClick={() => { togglePin(menu.item); setMenu(null); }}>
            {isPinned(menu.item)
              ? (<><PinOff size={15} style={{ marginRight: 8 }} /> Unpin</>)
              : (<><Pin size={15} style={{ marginRight: 8 }} /> Pin to top</>)}
          </MenuItem>
        )}
        {menu && menu.item.kind === "channel" && (
          <MenuItem onClick={() => { toggleSync(menu.item); setMenu(null); }}>
            {isSynced(menu.item)
              ? (<><Link2Off size={15} style={{ marginRight: 8 }} /> Override category permission</>)
              : (<><Link2 size={15} style={{ marginRight: 8 }} /> Sync with category permission</>)}
          </MenuItem>
        )}
        <Divider />
        <div className="cg-menu-label">Move to category</div>
        {allCats.map((c) => (
          <MenuItem
            key={c.id}
            selected={menu ? catOf(menu.item) === c.id : false}
            onClick={() => { moveTo(menu.item, c.id); setMenu(null); }}
          >
            {displayName(c)}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => setCatDialog({ mode: "new", name: "", forItem: menu?.item })}>
          <FolderPlus size={15} style={{ marginRight: 8 }} /> New category…
        </MenuItem>
      </Menu>

      {/* New / rename category — replaces the browser's window.prompt. */}
      <Dialog open={!!catDialog} onClose={() => setCatDialog(null)} slotProps={{ paper: { sx: { borderRadius: 3, width: 380 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{catDialog?.mode === "rename" ? "Rename category" : "New category"}</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <TextField
            autoFocus fullWidth size="small" label="Category name" placeholder="e.g. Engineering"
            value={catDialog?.name || ""}
            onChange={(e) => setCatDialog((s) => ({ ...s, name: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") submitCatDialog(); }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCatDialog(null)} sx={{ textTransform: "none", color: "#64748b" }}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={!catDialog?.name?.trim()} onClick={submitCatDialog}
            sx={{ textTransform: "none", borderRadius: 2 }}>
            {catDialog?.mode === "rename" ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category permissions — same visibility + team-access model as a single
          channel's settings, applied to every synced channel in the category. */}
      <Dialog open={!!permDialog} onClose={() => setPermDialog(null)} slotProps={{ paper: { sx: { borderRadius: 3, width: 440 } } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {permDialog && `${displayName(allCats.find((c) => c.id === permDialog.catId) || {})} permissions`}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "8px !important" }}>
          <div className="cg-perm-note">
            Applies to every channel in this category that is synced (not overridden per-channel).
          </div>
          <TextField
            select size="small" label="Visibility"
            value={permDialog?.visibility || "PUBLIC"}
            onChange={(e) => setPermDialog((s) => ({ ...s, visibility: e.target.value }))}
          >
            <MenuItem value="PUBLIC">Public — anyone in the workspace</MenuItem>
            <MenuItem value="PRIVATE">Private — members &amp; allowed teams only</MenuItem>
          </TextField>
          <FormControl size="small">
            <InputLabel>Teams with access</InputLabel>
            <Select
              multiple
              value={permDialog?.allowedTeamIds || []}
              label="Teams with access"
              onChange={(e) => setPermDialog((s) => ({ ...s, allowedTeamIds: e.target.value }))}
              renderValue={(sel) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {sel.map((id) => (
                    <Chip key={id} size="small" label={teams.find((t) => t.id === id)?.name || id} />
                  ))}
                </Box>
              )}
            >
              {teams.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  <Checkbox checked={(permDialog?.allowedTeamIds || []).includes(t.id)} />
                  <ListItemText primary={t.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPermDialog(null)} sx={{ textTransform: "none", color: "#64748b" }}>Cancel</Button>
          <Button variant="contained" disableElevation onClick={savePermDialog} sx={{ textTransform: "none", borderRadius: 2 }}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
