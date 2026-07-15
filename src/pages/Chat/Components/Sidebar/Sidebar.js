import "./Sidebar.css";
import { ChevronDown, Search, Hash, Plus, Settings, Users, Gamepad2, CalendarDays, ListTodo, LayoutDashboard, Sparkles } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
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
import VoiceChannels from "./VoiceChannels";
import VoiceBar from "./VoiceBar";

const initials = (name) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

export default function Sidebar({
  activeChannel,
  setActiveChannel,
  workspaceId,
  workspaceName = "",
  activeView,
  members = [],
  unread = {},
  onOpenContacts,
  onOpenTasks,
  onOpenMeetings,
  onOpenDesk,
  onOpenAi,
  onOpenSearch,
}) {
  // Channels state
  const [channels, setChannels] = useState([]);
  // DMs state
  const [dms, setDms] = useState([]);
  // user state
  const [user, setUser] = useState(null);
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
          <button>
            <ChevronDown size={18} />
          </button>
        </div>

        <button className="virtual-office-btn" onClick={openVirtualOffice}>
          <Gamepad2 size={19} />
          <span>Enter Virtual Office</span>
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

          <div className="channels-section">
            <div className="channels-header">
              <span>CHANNELS</span>
              <button onClick={openCreateChannel}>
                <Plus size={16} />
              </button>
            </div>

            <div className="channels-list">
              {channels.map((channel) => {
                const isActive = activeChannel !== null && activeChannel.id === channel.id;
                const u = unread[channel.id];
                const showBadge = !isActive && u && u.count > 0;
                return (
                  <div
                    key={channel.id}
                    className={`channel-item ${isActive ? "active" : ""} ${showBadge ? "unread" : ""}`}
                    onClick={() => {
                      setActiveChannel({
                        id: channel.id,
                        name: channel.name,
                      });
                    }}
                  >
                    <span>
                      <Hash size={16} />
                    </span>
                    <span className="channel-name">{channel.name}</span>
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
