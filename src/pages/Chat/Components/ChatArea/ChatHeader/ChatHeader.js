import "./ChatHeader.css";
import { Hash, Phone, Info, Search } from "lucide-react";
import { useState } from "react";
import { authHeaders } from "../../../../../utils/auth";
import { useDialogs } from "../../../../../components/DialogProvider";
export default function ChatHeader({ activeChannel }) {
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
  // App dialogs / toasts
  const { confirm, notify } = useDialogs();

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
          headers: authHeaders(),
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
    const confirmLeave = await confirm({
      title: "Leave channel",
      message: `Are you sure you want to leave ${channelNameForDisplay}?`,
      confirmText: "Leave",
      tone: "danger",
    });

    if (confirmLeave) {
      try {
        const response = await fetch(
          `/api/chat/channels/${activeChannel.id}/leave`,
          {
            method: "POST",
            headers: authHeaders(),
          },
        );

        if (response.ok) {
          notify("You have left the channel", "success");
          setIsMenuOpen(false);
          // TODO: Notify Sidebar to remove the channel from the list
        } else {
          notify("An error occurred while leaving the channel", "error");
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
        <h3>
          <Hash size={18} />
          <span>{channelNameForDisplay}</span>
        </h3>
        <span className="margin">|</span>
        <span className="channel-description">
          {channelDetails?.description || ""}
        </span>
      </div>

      {/* Right Side */}
      <div className="header-actions">
        <button className="header-btn" aria-label="Call">
          <Phone size={18} />
        </button>

        <div
          className="info-dropdown-container"
          style={{ position: "relative" }}
        >
          <button className="header-btn" aria-label="Info" onClick={toggleMenu}>
            <Info size={18} />
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
          <Search size={16} />
          <input type="text" placeholder="Search" />
        </div>
      </div>
    </div>
  );
}
