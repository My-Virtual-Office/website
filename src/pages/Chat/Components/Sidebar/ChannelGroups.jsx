import { useState, useEffect, useMemo, useRef } from "react";
import { Hash, Plus, ChevronDown, ChevronRight, MoreVertical, Pin, PinOff, FolderPlus } from "lucide-react";
import { Menu, MenuItem, Divider } from "@mui/material";
import "./ChannelGroups.css";

// Discord-style channel organisation, kept per-user per-workspace in localStorage.
// This is intentionally NOT on the server: pinning is a personal preference, and
// categories here organise YOUR sidebar without touching the shared channel list.
//
// Shape (per workspace):
//   { cats: [{id, name}], assign: {channelId: catId}, pinned: [channelId], collapsed: {catId|"__pinned__": bool} }
// Every channel belongs to exactly one category — anything unassigned falls into
// the always-present default category, so "each channel is in a category" holds.

const DEFAULT_CAT = { id: "default", name: "Channels" };
const PINNED_KEY = "__pinned__";

const emptyOrg = () => ({ cats: [DEFAULT_CAT], assign: {}, pinned: [], collapsed: {} });

function loadOrg(workspaceId) {
  if (!workspaceId) return emptyOrg();
  try {
    const raw = localStorage.getItem(`chan-org:${workspaceId}`);
    if (!raw) return emptyOrg();
    const o = JSON.parse(raw);
    // Guarantee the default category always exists and is first.
    const cats = [DEFAULT_CAT, ...(o.cats || []).filter((c) => c.id !== "default")];
    return { cats, assign: o.assign || {}, pinned: o.pinned || [], collapsed: o.collapsed || {} };
  } catch {
    return emptyOrg();
  }
}

let uid = 0;
const newId = () => `cat-${Date.now().toString(36)}-${uid++}`;

export default function ChannelGroups({
  channels,
  activeChannel,
  unread,
  onSelect,
  onCreateChannel,
}) {
  // workspaceId is implicit in the channels; persist under the first channel's ws.
  const workspaceId = channels[0]?.workspaceId ?? null;
  const [org, setOrg] = useState(() => loadOrg(workspaceId));
  const [menu, setMenu] = useState(null); // { anchor, channelId }
  const loadedFor = useRef(workspaceId);

  // Reload when the workspace changes (switching workspaces).
  useEffect(() => {
    if (loadedFor.current !== workspaceId) {
      loadedFor.current = workspaceId;
      setOrg(loadOrg(workspaceId));
    }
  }, [workspaceId]);

  // Persist on every change.
  useEffect(() => {
    if (!workspaceId) return;
    try {
      localStorage.setItem(`chan-org:${workspaceId}`, JSON.stringify(org));
    } catch {
      /* quota / private mode — the sidebar still works, it just won't remember */
    }
  }, [org, workspaceId]);

  const catOf = (id) => (org.assign[id] && org.cats.some((c) => c.id === org.assign[id]) ? org.assign[id] : "default");
  const isPinned = (id) => org.pinned.includes(id);

  // Group the live channel list by category, preserving server order within each.
  const groups = useMemo(() => {
    const byCat = new Map(org.cats.map((c) => [c.id, []]));
    channels.forEach((ch) => {
      const cid = catOf(ch.id);
      (byCat.get(cid) || byCat.get("default")).push(ch);
    });
    return org.cats.map((c) => ({ ...c, channels: byCat.get(c.id) || [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, org]);

  const pinnedChannels = useMemo(
    () => org.pinned.map((id) => channels.find((c) => c.id === id)).filter(Boolean),
    [channels, org.pinned],
  );

  const toggleCollapse = (key) =>
    setOrg((o) => ({ ...o, collapsed: { ...o.collapsed, [key]: !o.collapsed[key] } }));

  const togglePin = (id) =>
    setOrg((o) => ({
      ...o,
      pinned: o.pinned.includes(id) ? o.pinned.filter((x) => x !== id) : [...o.pinned, id],
    }));

  const moveTo = (id, catId) => setOrg((o) => ({ ...o, assign: { ...o.assign, [id]: catId } }));

  const addCategory = () => {
    const name = window.prompt("New category name")?.trim();
    if (!name) return;
    const id = newId();
    setOrg((o) => ({ ...o, cats: [...o.cats, { id, name }] }));
    // If a channel's menu opened this, drop it into the new category.
    if (menu?.channelId) moveTo(menu.channelId, id);
    setMenu(null);
  };

  const renameCategory = (catId) => {
    const cat = org.cats.find((c) => c.id === catId);
    const name = window.prompt("Rename category", cat?.name || "")?.trim();
    if (!name) return;
    setOrg((o) => ({ ...o, cats: o.cats.map((c) => (c.id === catId ? { ...c, name } : c)) }));
  };

  const deleteCategory = (catId) => {
    if (catId === "default") return;
    // Its channels fall back to the default category — never orphaned.
    setOrg((o) => {
      const assign = { ...o.assign };
      Object.keys(assign).forEach((chId) => {
        if (assign[chId] === catId) assign[chId] = "default";
      });
      return { ...o, cats: o.cats.filter((c) => c.id !== catId), assign };
    });
  };

  const row = (channel, { inPinned = false } = {}) => {
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
        {showBadge && (
          <span className={`unread-badge ${u.mention ? "mention" : ""}`}>
            {u.count > 99 ? "99+" : u.count}
          </span>
        )}
        <button
          className="cg-more"
          onClick={(e) => { e.stopPropagation(); setMenu({ anchor: e.currentTarget, channelId: channel.id }); }}
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
          <button onClick={addCategory} title="New category" aria-label="New category">
            <FolderPlus size={15} />
          </button>
          <button onClick={onCreateChannel} title="Create channel" aria-label="Create channel">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Pinned — a flat section at the top. Pinned channels still appear in their
          own category below, exactly like Discord. */}
      {pinnedChannels.length > 0 && (
        <div className="cg-group">
          <button className="cg-cat-head" onClick={() => toggleCollapse(PINNED_KEY)}>
            {org.collapsed[PINNED_KEY] ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            <span className="cg-cat-name">Pinned</span>
            <span className="cg-cat-count">{pinnedChannels.length}</span>
          </button>
          {!org.collapsed[PINNED_KEY] && (
            <div className="channels-list">{pinnedChannels.map((ch) => row(ch, { inPinned: true }))}</div>
          )}
        </div>
      )}

      {groups.map((g) => {
        // Hide an empty non-default category header only if it has no channels;
        // the default one always shows so there's always somewhere to land.
        if (g.channels.length === 0 && g.id !== "default") return null;
        const collapsed = org.collapsed[g.id];
        return (
          <div className="cg-group" key={g.id}>
            <button
              className="cg-cat-head"
              onClick={() => toggleCollapse(g.id)}
              onDoubleClick={() => g.id !== "default" && renameCategory(g.id)}
            >
              {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              <span className="cg-cat-name">{g.name}</span>
              <span className="cg-cat-count">{g.channels.length}</span>
              {g.id !== "default" && (
                <span
                  className="cg-cat-del"
                  onClick={(e) => { e.stopPropagation(); deleteCategory(g.id); }}
                  title="Delete category (channels move to Channels)"
                >
                  ×
                </span>
              )}
            </button>
            {!collapsed && <div className="channels-list">{g.channels.map((ch) => row(ch))}</div>}
          </div>
        );
      })}

      {/* Per-channel menu: pin/unpin + move to a category. */}
      <Menu
        anchorEl={menu?.anchor}
        open={!!menu}
        onClose={() => setMenu(null)}
        slotProps={{ paper: { sx: { minWidth: 200, borderRadius: 2 } } }}
      >
        {menu && (
          <MenuItem onClick={() => { togglePin(menu.channelId); setMenu(null); }}>
            {isPinned(menu.channelId)
              ? (<><PinOff size={15} style={{ marginRight: 8 }} /> Unpin</>)
              : (<><Pin size={15} style={{ marginRight: 8 }} /> Pin to top</>)}
          </MenuItem>
        )}
        <Divider />
        <div className="cg-menu-label">Move to category</div>
        {org.cats.map((c) => (
          <MenuItem
            key={c.id}
            selected={menu && catOf(menu.channelId) === c.id}
            onClick={() => { moveTo(menu.channelId, c.id); setMenu(null); }}
          >
            {c.name}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={addCategory}>
          <FolderPlus size={15} style={{ marginRight: 8 }} /> New category…
        </MenuItem>
      </Menu>
    </div>
  );
}
