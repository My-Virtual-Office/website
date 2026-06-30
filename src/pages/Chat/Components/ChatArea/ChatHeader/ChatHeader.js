import "./ChatHeader.css";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import NumbersIcon from "@mui/icons-material/Numbers";
import MenuIcon from "@mui/icons-material/Menu";
import { useState } from "react";
import { getCurrentUserId } from "../../../../../utils/auth";
import NotificationBell from "../../../../../components/NotificationBell/NotificationBell";
export default function ChatHeader({ activeChannel, onToggleSidebar }) {
  let channelNameForDisplay = "Loading...";
  if (activeChannel !== null) {
    if (activeChannel.name !== undefined) {
      channelNameForDisplay = activeChannel.name;
    }
  }
  // Menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Channel details state
  const [channelDetails, setChannelDetails] = useState(null);
  // Loading state
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Toggle info menu
  const toggleMenu = async () => {
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);

    // Fetch channel details when opening the menu
    if (newMenuState === true && activeChannel) {
      setIsLoadingDetails(true);

      try {
        const response = await fetch(`/api/chat/channels/${activeChannel.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": String(getCurrentUserId()),
            "X-User-Role": "USER",
          },
        });
        if (response.ok) {
          const data = await response.json();
          setChannelDetails(data);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    }
  };

  // Handle leaving the channel
  const handleLeaveChannel = async () => {
    // Prompt user for confirmation
    const confirmLeave = window.confirm(
      `Are you sure you want to leave ${channelNameForDisplay}?`,
    );

    if (confirmLeave) {
      try {
        const response = await fetch(
          `/api/chat/channels/${activeChannel.id}/leave`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": String(getCurrentUserId()),
              "X-User-Role": "USER",
            },
          },
        );

        if (response.ok) {
          alert("You have left the channel successfully!");
          setIsMenuOpen(false);
          // TODO: Notify Sidebar to remove the channel from the list
        } else {
          alert("An error occurred while leaving the channel!");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  };

  return (
    <div className="chat-header">
      {/* Left Side */}
      <div className="channel-info">
        <button
          className="header-btn md:hidden"
          aria-label="Open channels"
          onClick={onToggleSidebar}
          style={{ display: "flex", alignItems: "center" }}
        >
          <MenuIcon />
        </button>
        <h3>
          <NumbersIcon></NumbersIcon>
          <span>{channelNameForDisplay}</span>
        </h3>
        <span className="margin">|</span>
        <span className="channel-description">
          {channelDetails?.description || ""}
        </span>
      </div>

      {/* Right Side */}
      <div className="header-actions">
        <NotificationBell />

        <div
          className="info-dropdown-container"
          style={{ position: "relative" }}
        >
          <button className="header-btn" aria-label="Info" onClick={toggleMenu}>
            <InfoOutlinedIcon />
          </button>

          {isMenuOpen && (
            <div className="dropdown-menu expanded-menu">
              <div className="dropdown-info-section">
                {isLoadingDetails ? (
                  <span className="loading-text">Loading details...</span>
                ) : channelDetails ? (
                  <>
                    <div className="inline-detail">
                      <span className="inline-label">Created At:</span>
                      <span className="inline-value">
                        {new Date(
                          channelDetails.createdAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="inline-detail">
                      <span className="inline-label">
                        Members ({channelDetails.members?.length || 0}):
                      </span>
                    </div>

                    <div className="inline-members-tags">
                      {channelDetails.members?.map((mId) => (
                        <span key={mId} className="inline-tag">
                          User {mId}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="error-text">No data available</span>
                )}
              </div>
              <hr />

              <div
                className="dropdown-item leave-btn"
                onClick={handleLeaveChannel}
              >
                <span>Leave Channel</span>
              </div>
            </div>
          )}
        </div>

        <div className="header-search">
          <SearchOutlinedIcon />
          <input type="text" placeholder="Search" />
        </div>
      </div>
    </div>
  );
}
