import "./Sidebar.css";
import { ChevronDown, Search, FileText, Hash, Plus, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { getCurrentUser } from "../../../../api/user";
import SettingsModal from "../SettingsModal/SettingsModal";
import { getUserPhoto } from "../../../../api/user";
import { authHeaders } from "../../../../utils/auth";
import { useDialogs } from "../../../../components/DialogProvider";

export default function Sidebar({ activeChannel, setActiveChannel }) {
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
  const { prompt, notify } = useDialogs();

  const handleCreateChannel = async () => {
    const channelName = await prompt({
      title: "Create channel",
      message: "Give your new channel a name.",
      placeholder: "e.g. Development",
      confirmText: "Create",
    });

    if (!channelName) return;

    try {
      // Send request to create a new channel
      const response = await fetch("/api/chat/channels", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: channelName,
          workspaceId: 100, // Hardcoded workspaceId
          members: [1, 2, 3], // Hardcoded members
        }),
      });

      if (response.ok) {
        const newChannel = await response.json();

        // Add the new channel to the local state
        setChannels([...channels, newChannel]);
      } else {
        notify("Failed to create the channel", "error");
      }
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  // Create a new DM
  const handleCreateDM = async () => {
    const targetIdStr = await prompt({
      title: "New direct message",
      message: "Enter the User ID of the person you want to message.",
      placeholder: "User ID",
      confirmText: "Start",
    });
    if (!targetIdStr) return;

    const targetUserId = parseInt(targetIdStr, 10);
    if (isNaN(targetUserId)) {
      notify("Please enter a valid User ID (numbers only).", "warning");
      return;
    }

    try {
      const response = await fetch("/api/chat/dm", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          targetUserId: targetUserId,
        }),
      });

      if (response.ok) {
        // Reload page to reflect new DM
        window.location.reload();
      } else {
        notify("Failed to start direct message", "error");
      }
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  // Fetch channels and DMs on component mount
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // Fetch channels for workspaceId=100
        const response = await fetch(
          "/api/chat/channels?workspaceId=100&page=1&limit=20",
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
  }, []);

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
          <span>Virtual-Office</span>
          <button>
            <ChevronDown size={18} />
          </button>
        </div>

        <div className="sidebar-main">
          <div className="search-drafts">
            <div className="search">
              <Search size={18} />
              <span>Search</span>
            </div>
            <div className="drafts">
              <FileText size={18} />
              <span>Drafts</span>
            </div>
          </div>

          <div className="channels-section">
            <div className="channels-header">
              <span>CHANNELS</span>
              <button onClick={handleCreateChannel}>
                <Plus size={16} />
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
                    });
                  }}
                >
                  <span>
                    <Hash size={16} />
                  </span>
                  <span className="channel-name">{channel.name}</span>
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
                <Plus size={16} />
              </button>
            </div>

            <div className="direct-messages-list">
              {dms.map((dm) => {
                // Find the other user's ID to use as DM name
                const otherUserId = dm.members?.find((m) => m !== 1);
                const dmDisplayName = dm.name
                  ? dm.name
                  : `User ${otherUserId || "X"}`;

                return (
                  <div
                    key={dm.id}
                    className={`dm-item ${activeChannel !== null && activeChannel.id === dm.id ? "active" : ""}`}
                    onClick={() => {
                      setActiveChannel({
                        id: dm.id,
                        name: dmDisplayName,
                      });
                    }}
                  >
                    <div className="dm-avatar">
                      {/* Temporary avatar */}
                      <img src="/avatar1.jpg" alt={dmDisplayName} />
                      <span className="status-dot online"></span>
                    </div>
                    <span className="dm-name">{dmDisplayName}</span>
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
                <span
                  className="user-name"
                  title={user ? `${user.firstName} ${user.lastName}` : ""}
                >
                  {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
                </span>
                <span className="user-status">
                  {user ? user.accountStatus : ""}
                </span>
              </div>
            </div>

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
      </div>
    </div>
  );
}
