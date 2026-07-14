import "./Sidebar.css";
import { ChevronDown, Search, Hash, Plus, Settings, Users, Gamepad2, CalendarDays, ListTodo, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUser } from "../../../../api/user";
import SettingsModal from "../SettingsModal/SettingsModal";
import CreateChannelModal from "../CreateChannelModal/CreateChannelModal";
import DmPickerModal from "../DmPickerModal/DmPickerModal";
import StatusMenu from "../StatusMenu/StatusMenu";
import { getUserPhoto } from "../../../../api/user";
import { getMyDesk, updateStatus } from "../../../../api/workspace";
import { statusColor, statusText } from "../../statusMeta";
import { authHeaders } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";

export default function Sidebar({
  activeChannel,
  setActiveChannel,
  workspaceId,
  activeView,
  unread = {},
  onOpenContacts,
  onOpenTasks,
  onOpenMeetings,
  onOpenDesk,
  onOpenSearch,
}) {
  // Channels state
  const [channels, setChannels] = useState([]);
  // Rooms state
  const [rooms, setRooms] = useState([]);
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

        if (channelList.length === 0) {
          const defaultNames = ["general", "random", "announcements"];
          for (const name of defaultNames) {
            try {
              await createChannel(name, workspaceId);
            } catch (err) {
              console.error(`Failed to create default channel "${name}":`, err);
            }
          }
          channelList = await fetchChannelsApi(workspaceId);
          setChannels(channelList);
        }

        if (joinChannelId) {
          const joined = channelList.find((ch) => ch.id === joinChannelId);
          if (joined) {
            setActiveChannel({
              id: joined.id,
              name: joined.name,
              type: joined.type || "GROUP",
            });
            return;
          }

          try {
            const directRes = await fetch(
              `/api/chat/channels/${joinChannelId}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "X-User-Id": String(getCurrentUserId()),
                  "X-User-Role": "USER",
                },
              },
            );
            if (directRes.ok) {
              const joinedChannel = await directRes.json();
              setChannels((prev) => {
                if (prev.some((c) => c.id === joinedChannel.id)) return prev;
                return [...prev, joinedChannel];
              });
              setActiveChannel({
                id: joinedChannel.id,
                name: joinedChannel.name,
                type: joinedChannel.type || "GROUP",
              });
              return;
            }
          } catch (fetchErr) {
            console.error("Failed to fetch joined channel directly:", fetchErr);
          }
        }

        if (activeChannel === null && channelList.length > 0) {
          setActiveChannel({
            id: channelList[0].id,
            name: channelList[0].name,
            type: channelList[0].type || "GROUP",
          });
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

    const fetchRoomsList = async () => {
      try {
        if (!workspaceId) return;
        const roomsData = await fetchRooms(workspaceId);
        setRooms(roomsData);
      } catch (error) {
        console.error("Error fetching rooms:", error);
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
  const handleCloseDm = (e, dmId) => {
    e.stopPropagation();
    setDms((prev) => prev.filter((dm) => dm.id !== dmId));
  };

  console.log("Current User ID extracted from token:", getCurrentUserId());
  return (
    <div className="sidebar-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <span>{activeWorkspace?.name || "Virtual-Office"}</span>
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

          <div className="rooms-section">
            <div className="rooms-header">
              <span>ROOMS</span>
              <button onClick={handleCreateRoom}>
                <AddIcon />
              </button>
            </div>
            <div className="rooms-list">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={`room-item ${activeChannel !== null && activeChannel.id === room.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveChannel({
                      id: room.id,
                      name: room.name,
                      type: "ROOM",
                    });
                  }}
                >
                  <span>
                    <MeetingRoomIcon />
                  </span>
                  <span className="room-name">{room.name}</span>
                </div>
              ))}
            </div>
          </div>

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
                // Find the other user's ID to use as DM name
                const currentId = getCurrentUserId();
                const otherUserId = dm.members?.find((m) => m !== currentId);
                const dmDisplayName = dm.name
                  ? dm.name
                  : (`User ${otherUserId || "X"}`);

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
                      {/* Temporary avatar */}
                      <img src="/avatar1.jpg" alt={dmDisplayName} />
                      <span className="status-dot online"></span>
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
                      backgroundColor: "var(--accent-bg-active)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-color)",
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

            {/* Invite Dialog */}
            <InviteDialog
              open={isInviteOpen}
              onClose={() => setInviteDialogChannel(null)}
              channelId={inviteDialogChannel?.id}
              channelName={inviteDialogChannel?.name}
              workspaceId={workspaceId}
            />
          </div>
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
