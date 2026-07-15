import "./Sidebar.css";
import { ChevronDown, Search, Plus, Settings, Users, Gamepad2, CalendarDays, ListTodo, LayoutDashboard, Sparkles, Check, UserPlus, Copy, Target } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Menu, MenuItem, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../../../api/user";

import SettingsModal from "../SettingsModal/SettingsModal";
import CreateChannelModal from "../CreateChannelModal/CreateChannelModal";
import DmPickerModal from "../DmPickerModal/DmPickerModal";
import StatusMenu from "../StatusMenu/StatusMenu";
import { getUserPhoto } from "../../../../api/user";
import { getMyDesk, updateStatus } from "../../../../api/workspace";
import { statusColor, statusText } from "../../statusMeta";
import { authHeaders, getCurrentUserId } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";
import ChannelGroups from "./ChannelGroups";
import VoiceChannels from "./VoiceChannels";
import VoiceBar from "./VoiceBar";

const initials = (name) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

export default function Sidebar({
  activeChannel,
  setActiveChannel,
  workspaceId,
  workspaceName = "",
  workspaces = [],
  onSwitchWorkspace,
  activeView,
  members = [],
  unread = {},
  onOpenContacts,
  onOpenTasks,
  onOpenMeetings,
  onOpenDesk,
  onOpenAi,
  onOpenSearch,
  onEnterFocus,
}) {
  // Channels state
  const [channels, setChannels] = useState([]);
  // DMs state
  const [dms, setDms] = useState([]);
  // user state
  const [user, setUser] = useState(null);
  // Workspace menu (the header chevron)
  const [wsMenuAnchor, setWsMenuAnchor] = useState(null);
  const closeWsMenu = () => setWsMenuAnchor(null);
  const navigate = useNavigate();

  // Deep-link to THIS workspace. ChatPage resolves ?work_name=<slug> on load, so the
  // link lands the recipient in the right workspace rather than their default one.
  // Only useful to someone who is already a member — inviting is a separate item.
  const copyWorkspaceLink = async () => {
    const slug = workspaces.find((w) => w.id === workspaceId)?.slug;
    const url = slug
      ? `${window.location.origin}/chat?work_name=${encodeURIComponent(slug)}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      notify("Workspace link copied", "success");
    } catch {
      // Clipboard needs a secure origin — over plain http on a LAN IP it throws.
      notify("Couldn't copy — your browser blocked the clipboard here", "error");
    }
    closeWsMenu();
  };
  // Settings Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // user photo state
  const [userPhoto, setUserPhoto] = useState(null);
  // App dialogs / toasts
  const { notify } = useDialogs();

  // Create-channel modal (Phase 3: name + description + access + moderators)
  const [createOpen, setCreateOpen] = useState(false);

  // My desk in this workspace (carries my presence status) + status picker.
  const [myDesk, setMyDesk] = useState(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  // Resolve DM partners against the workspace directory (DM channels carry no name).
  const meId = getCurrentUserId();
  const dmMembersById = useMemo(
    () => new Map((members || []).map((m) => [Number(m.userId), m])),
    [members],
  );

  const [showDmPicker, setShowDmPicker] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    getMyDesk(workspaceId).then(setMyDesk).catch(() => {});
  }, [workspaceId]);

  // Open the SkyOffice virtual office for this workspace, authenticated via the
  // JWT (the office server verifies it + checks workspace membership).
  const openVirtualOffice = () => {
    if (!workspaceId) {
      notify("Workspace still loading — try again in a moment.", "warning");
      return;
    }
    const token = localStorage.getItem("token");
    const url = `${window.location.protocol}//${window.location.hostname}:5000/?token=${encodeURIComponent(
      token || "",
    )}&workspaceId=${workspaceId}`;
    window.open(url, "_blank", "noopener");
  };

  const saveStatus = async (status, statusEmoji, statusCustomText) => {
    if (!myDesk?.id) return;
    try {
      const updated = await updateStatus(workspaceId, myDesk.id, {
        status,
        statusEmoji,
        statusCustomText,
      });
      setMyDesk(updated);
    } catch {
      notify("Couldn't update status", "error");
    }
  };

  const openCreateChannel = () => {
    if (!workspaceId) {
      notify("Workspace still loading — try again in a moment.", "warning");
      return;
    }
    setCreateOpen(true);
  };

  // Open a DM chosen from the people picker.
  const openDm = (ch) => {
    setActiveChannel(ch);
    setDms((prev) => (prev.some((d) => d.id === ch.id) ? prev : [...prev, { id: ch.id, name: ch.name }]));
  };

  // Fetch channels once the workspace is resolved; DMs on mount.
  useEffect(() => {
    const fetchChannels = async () => {
      if (!workspaceId) return;
      try {
        const response = await fetch(
          `/api/chat/channels?workspaceId=${workspaceId}&page=1&limit=20`,
          {
            method: "GET",
            headers: authHeaders(),
          },
        );

        if (response.ok) {
          const data = await response.json();
          setChannels(data.content || []);

          // Set active channel to the first channel if none is selected
          if (data.content !== undefined) {
            if (data.content.length > 0) {
              if (activeChannel === null) {
                let firstChannelId = data.content[0].id;
                let firstChannelName = data.content[0].name;

                setActiveChannel({
                  id: firstChannelId,
                  name: firstChannelName,
                });
              }
            }
          }
        } else {
          console.error("Failed to fetch channels");
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
      }
    };

    const fetchDMs = async () => {
      try {
        const response = await fetch("/api/chat/dm?page=1&limit=20", {
          method: "GET",
          headers: authHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          setDms(data.content || []);
        }
      } catch (error) {
        console.error("Error fetching DMs:", error);
      }
    };

    fetchChannels();
    fetchDMs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const fetchUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);

      try {
        const photoUrl = await getUserPhoto();
        setUserPhoto(photoUrl);
      } catch (err) {
        console.log("No profile photo found");
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Dummy user data
  // const currentUser = {
  //   name: "User-3",
  //   avatar: "/user.jpg",
  //   status: "Set Status",
  // };

  return (
    <div className="sidebar-container">
      <div className="sidebar">
        <div className="sidebar-header">
          {/* The workspace you are in, not the product — this is the workspace switcher's header.
              Falls back to the product name only while the workspace list is still loading. */}
          <span title={workspaceName || "Virtual Office"}>{workspaceName || "Virtual Office"}</span>
          <button
            onClick={(e) => setWsMenuAnchor(e.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={!!wsMenuAnchor}
            aria-label="Workspace menu"
            title="Workspace menu"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {/* The chevron promised a menu and did nothing. The rail switches workspaces by
            icon; this is where the same list gets names, plus the workspace-level actions. */}
        <Menu
          anchorEl={wsMenuAnchor}
          open={!!wsMenuAnchor}
          onClose={closeWsMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 260, mt: 0.5 } } }}
        >
          <div className="ws-menu-head">
            <span className="ws-menu-name">{workspaceName || "Virtual Office"}</span>
            <span className="ws-menu-sub">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          </div>
          <Divider />

          {workspaces.length > 1 && (
            <div className="ws-menu-label">Switch workspace</div>
          )}
          {workspaces.map((ws) => (
            <MenuItem
              key={ws.id}
              selected={ws.id === workspaceId}
              onClick={() => {
                if (ws.id !== workspaceId) onSwitchWorkspace?.(ws);
                closeWsMenu();
              }}
            >
              <span className="ws-menu-badge">{initials(ws.name)}</span>
              <span className="ws-menu-item-name">{ws.name}</span>
              {ws.id === workspaceId && <Check size={15} className="ws-menu-check" />}
            </MenuItem>
          ))}
          {workspaces.length > 0 && <Divider />}

          <MenuItem onClick={() => { onOpenContacts?.(); closeWsMenu(); }}>
            <UserPlus size={15} className="ws-menu-icon" /> Invite people
          </MenuItem>
          <MenuItem onClick={copyWorkspaceLink}>
            <Copy size={15} className="ws-menu-icon" /> Copy link to this workspace
          </MenuItem>
          <MenuItem onClick={() => { navigate("/onboarding"); closeWsMenu(); }}>
            <Plus size={15} className="ws-menu-icon" /> Create or join a workspace
          </MenuItem>
        </Menu>

        <button className="virtual-office-btn" onClick={openVirtualOffice}>
          <Gamepad2 size={19} />
          <span>Enter Virtual Office</span>
        </button>

        {/* The two ways to leave the chat surface, side by side: go be with people, or go be
            alone with the work. Secondary styling — this one is about removing things, so it
            shouldn't shout as loudly as the office button above it. */}
        <button className="working-mode-btn" onClick={onEnterFocus}>
          <Target size={18} />
          <span>Enter Working Mode</span>
        </button>

        <div className="sidebar-main">
          <div className="search-drafts">
            <div className="search" onClick={onOpenSearch} title="Search everything (Ctrl/⌘K)">
              <Search size={18} />
              <span>Search</span>
              <span className="search-kbd">⌘K</span>
            </div>
            <div
              className={`drafts ${activeView === "contacts" ? "active-link" : ""}`}
              onClick={onOpenContacts}
            >
              <Users size={18} />
              <span>People</span>
            </div>
            <div
              className={`drafts ${activeView === "tasks" ? "active-link" : ""}`}
              onClick={onOpenTasks}
            >
              <ListTodo size={18} />
              <span>Tasks</span>
            </div>
            <div
              className={`drafts ${activeView === "meetings" ? "active-link" : ""}`}
              onClick={onOpenMeetings}
            >
              <CalendarDays size={18} />
              <span>Meetings</span>
            </div>
            <div
              className={`drafts ${activeView === "mydesk" ? "active-link" : ""}`}
              onClick={onOpenDesk}
            >
              <LayoutDashboard size={18} />
              <span>My Desk</span>
            </div>
            <div
              className={`drafts ${activeView === "ai" ? "active-link" : ""}`}
              onClick={onOpenAi}
            >
              <Sparkles size={18} />
              <span>Assistant</span>
            </div>
          </div>

          <ChannelGroups
            channels={channels}
            activeChannel={activeChannel}
            unread={unread}
            onSelect={(ch) => setActiveChannel({ id: ch.id, name: ch.name })}
            onCreateChannel={openCreateChannel}
          />

          <VoiceChannels workspaceId={workspaceId} members={members} />

          <div className="direct-messages-section">
            <div className="direct-messages-header">
              <span>DIRECT MESSAGES</span>
              <button
                onClick={() => setShowDmPicker(true)}
                aria-label="New Direct Message"
                title="New DM"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="direct-messages-list">
              {dms.map((dm) => {
                // DM channels are stored without a name, so resolve the other
                // participant against the directory. (The id was previously
                // compared against a hardcoded 1, which labelled every DM with
                // the signed-in user's own id for anyone whose id wasn't 1.)
                const otherUserId = dm.members?.find((m) => Number(m) !== Number(meId));
                const partner = dmMembersById.get(Number(otherUserId));
                const dmDisplayName = dm.name || partner?.name || `User ${otherUserId ?? "?"}`;

                const isActive = activeChannel !== null && activeChannel.id === dm.id;
                const u = unread[dm.id];
                const showBadge = !isActive && u && u.count > 0;
                return (
                  <div
                    key={dm.id}
                    className={`dm-item ${isActive ? "active" : ""} ${showBadge ? "unread" : ""}`}
                    onClick={() => {
                      setActiveChannel({
                        id: dm.id,
                        name: dmDisplayName,
                        type: "DIRECT",
                      });
                    }}
                  >
                    <div className="dm-avatar">
                      {partner?.avatar ? (
                        <img src={partner.avatar} alt="" />
                      ) : (
                        <span className="dm-initials">{initials(dmDisplayName)}</span>
                      )}
                      <span className={`status-dot ${partner?.online ? "online" : ""}`}></span>
                    </div>
                    <span className="dm-name">{dmDisplayName}</span>
                    {showBadge && (
                      <span className={`unread-badge ${u.mention ? "mention" : ""}`}>
                        {u.count > 99 ? "99+" : u.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Outside .sidebar-main on purpose. These were inside the scroll area, so a long
            channel list pushed them out of view — the profile row and the voice controls are
            exactly the things that must stay reachable. .sidebar is a flex column and
            .sidebar-main is flex:1, so as siblings they pin to the bottom. */}
        <VoiceBar />

        <div className="user-profile">
            <div
              className="user-info"
              onClick={() => setShowStatusMenu((s) => !s)}
              title="Set your status"
              role="button"
            >
              <div className="user-avatar">
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="Profile"
                    style={{
                      borderRadius: "50%",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "#e5e7ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#5048e5",
                      fontWeight: "700",
                      fontSize: "14px",
                    }}
                  >
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                )}
                <span
                  className="user-status-dot"
                  style={{ background: statusColor(myDesk?.status) }}
                />
              </div>

              <div className="user-details">
                <span
                  className="user-name"
                  title={user ? `${user.firstName} ${user.lastName}` : ""}
                >
                  {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
                </span>
                <span className="user-status">
                  {myDesk?.statusEmoji ? `${myDesk.statusEmoji} ` : ""}
                  {statusText(myDesk) || "Set a status"}
                </span>
              </div>
            </div>

            {showStatusMenu && (
              <StatusMenu
                desk={myDesk}
                onSave={saveStatus}
                onClose={() => setShowStatusMenu(false)}
              />
            )}

            <button
              className="settings-btn"
              aria-label="Settings"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings size={18} />
            </button>

            {/* Settings Modal */}
            <SettingsModal
              open={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              user={user}
              onUpdate={fetchUser}
              userPhoto={userPhoto}
            />
          </div>
      </div>

      <CreateChannelModal
        workspaceId={workspaceId}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(ch) => {
          setChannels((c) => [...c, ch]);
          setActiveChannel({ id: ch.id, name: ch.name });
        }}
      />

      <DmPickerModal
        workspaceId={workspaceId}
        open={showDmPicker}
        onClose={() => setShowDmPicker(false)}
        onOpenDm={openDm}
      />
    </div>
  );
}
