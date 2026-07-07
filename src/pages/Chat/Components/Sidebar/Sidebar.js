import "./Sidebar.css";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchIcon from "@mui/icons-material/Search";
import DraftsOutlinedIcon from "@mui/icons-material/DraftsOutlined";
import NumbersIcon from "@mui/icons-material/Numbers";
import AddIcon from "@mui/icons-material/Add";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getCurrentUser } from "../../../../api/user";
import SettingsModal from "../SettingsModal/SettingsModal";
import { getUserPhoto } from "../../../../api/user";
import { getCurrentUserId } from "../../../../utils/auth";
import NotificationsMenu from "../../../../components/NotificationsMenu";
import CloseIcon from "@mui/icons-material/Close";
import { fetchRooms, createRoom, createChannel, fetchChannels as fetchChannelsApi } from "../../../../api/chat";
import InviteDialog from "./InviteDialog";

export default function Sidebar({ activeChannel, setActiveChannel, workspaceId }) {
  const location = useLocation();
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
  // invite dialog state
  const [inviteDialogChannel, setInviteDialogChannel] = useState(null);

  const isInviteOpen = Boolean(inviteDialogChannel);

  const handleCreateChannel = async () => {
    const channelName = prompt(
      "Enter the new channel name (e.g. Development):",
    );

    if (!channelName) return;

    try {
      const newChannel = await createChannel(channelName, workspaceId);
      if (newChannel) {
        setChannels([...channels, newChannel]);
        setInviteDialogChannel({ id: newChannel.id, name: newChannel.name });
      } else {
        alert("Failed to create the channel!");
      }
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  // Create a new DM
  const handleCreateDM = async () => {
    const targetIdStr = prompt("Enter the User ID you want to message:");
    if (!targetIdStr) return;

    const targetUserId = parseInt(targetIdStr);
    if (isNaN(targetUserId)) {
      alert("Please enter a valid User ID (numbers only).");
      return;
    }

    try {
      const response = await fetch("/api/chat/dm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": String(getCurrentUserId()), // Hardcoded user ID, update dynamically later
          "X-User-Role": "USER",
        },
        body: JSON.stringify({
          targetUserId: targetUserId,
        }),
      });

      if (response.ok) {
        // Reload page to reflect new DM
        window.location.reload();
      } else {
        alert("Failed to start direct message!");
      }
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  const handleCreateRoom = async () => {
    const roomName = prompt("Enter the new room name (e.g. Standup):");
    if (!roomName) return;

    try {
      const newRoom = await createRoom(roomName, workspaceId);
      setRooms([...rooms, newRoom]);
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create the room!");
    }
  };

  // Fetch channels and DMs on component mount
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        if (!workspaceId) return;
        let channelList = await fetchChannelsApi(workspaceId);
        setChannels(channelList);

        const joinChannelId = location.state?.joinChannelId;

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
            window.history.replaceState(null, "");
            return;
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
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": String(getCurrentUserId()),
            "X-User-Role": "USER",
          },
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
        const roomsData = await fetchRooms(workspaceId);
        setRooms(roomsData);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };

    fetchChannels();
    fetchDMs();
    fetchRoomsList();
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
          <span>Virtual-Office</span>
          <button>
            <KeyboardArrowDownIcon></KeyboardArrowDownIcon>
          </button>
        </div>

        <div className="sidebar-main">
          <div className="search-drafts">
            <div className="search">
              <SearchIcon></SearchIcon>
              <span>Search</span>
            </div>
            <div className="drafts">
              <DraftsOutlinedIcon></DraftsOutlinedIcon>
              <span>Drafts</span>
            </div>
          </div>

          <div className="channels-section">
            <div className="channels-header">
              <span>CHANNELS</span>
              <button onClick={handleCreateChannel}>
                <AddIcon></AddIcon>
              </button>
            </div>

            <div className="channels-list">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`channel-item ${activeChannel !== null && activeChannel.id === channel.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveChannel({
                      id: channel.id,
                      name: channel.name,
                      type: channel.type || "GROUP",
                    });
                  }}
                >
                  <span>
                    <NumbersIcon></NumbersIcon>
                  </span>
                  <span className="channel-name">{channel.name}</span>
                </div>
              ))}
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
                onClick={handleCreateDM}
                aria-label="New Direct Message"
                title="New DM"
              >
                <AddIcon />
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

                return (
                  <div
                    key={dm.id}
                    className={`dm-item ${activeChannel !== null && activeChannel.id === dm.id ? "active" : ""}`}
                    onClick={() => {
                      setActiveChannel({
                        id: dm.id,
                        name: dmDisplayName,
                        type: dm.type || "DIRECT",
                      });
                    }}
                  >
                    <div className="dm-avatar">
                      {/* Temporary avatar */}
                      <img src="/avatar1.jpg" alt={dmDisplayName} />
                      <span className="status-dot online"></span>
                    </div>
                    <span className="dm-name">{dmDisplayName}</span>
                    <button
                      className="dm-close-btn"
                      onClick={(e) => handleCloseDm(e, dm.id)}
                      title="Remove from sidebar"
                    >
                      <CloseIcon fontSize="small" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="user-profile">
            <div className="user-info">
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
              </div>

              <div className="user-details">
                <span className="user-name">
                  {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
                </span>
                <span className="user-status">
                  {user ? user.accountStatus : ""}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                paddingRight: "12px",
                gap: "4px",
              }}
            >
              <NotificationsMenu />

              <button
                className="settings-btn"
                aria-label="Settings"
                onClick={() => setIsSettingsOpen(true)}
                style={{ padding: "4px" }}
              >
                <SettingsOutlinedIcon></SettingsOutlinedIcon>
              </button>
            </div>

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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
