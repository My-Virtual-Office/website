import "./ChatHeader.css";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import NumbersIcon from "@mui/icons-material/Numbers";
import MenuIcon from "@mui/icons-material/Menu";
import { useState } from "react";
import { getCurrentUserId } from "../../../../../utils/auth";

import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import NightsStayOutlinedIcon from "@mui/icons-material/NightsStayOutlined";

import Switch from "@mui/material/Switch";

export default function ChatHeader({
  activeChannel,
  onToggleSidebar,
  channelMessages = [],
  usersMap = {},
  searchQuery,
  setSearchQuery,
}) {
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

  const filteredMessages =
    searchQuery.trim() === ""
      ? []
      : channelMessages.filter((msg) => {
          const text = msg.content || msg.text || "";
          return text.toLowerCase().includes(searchQuery.toLowerCase());
        });

  const handleResultClick = (msg) => {
    const element = document.getElementById(`msg-${msg.id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });

      element.classList.add("highlight-pulse");
      setTimeout(() => {
        element.classList.remove("highlight-pulse");
      }, 2000);
    }
    setSearchQuery("");
  };

  const [isDarkMode, setIsDarkMode] = useState(
    document.body.classList.contains("dark-mode"),
  );

  const toggleDarkMode = () => {
    if (document.body.classList.contains("dark-mode")) {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.body.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
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
        <div
          className="info-dropdown-container"
          style={{ position: "relative" }}
        >
          <Switch
            checked={isDarkMode}
            onChange={toggleDarkMode}
            className="theme-switch-mui"
            icon={
              <span className="mui-switch-icon-wrapper">
                <WbSunnyOutlinedIcon className="sunny-icon" />
              </span>
            }
            checkedIcon={
              <span className="mui-switch-icon-wrapper">
                <NightsStayOutlinedIcon className="moon-icon" />
              </span>
            }
            inputProps={{ "aria-label": "Toggle Theme" }}
          />

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

        <div
          className="header-search-container"
          style={{ position: "relative" }}
        >
          <div className="header-search">
            <SearchOutlinedIcon />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchQuery.trim() !== "" && (
            <div className="search-results-dropdown">
              {filteredMessages.length === 0 ? (
                <div className="search-result-empty">No results found</div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="search-result-item"
                    onClick={() => handleResultClick(msg)}
                  >
                    <div className="search-result-header">
                      <span className="search-result-user">
                        {usersMap[msg.senderId] || `User ${msg.senderId}`}
                      </span>
                      <span className="search-result-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="search-result-text">
                      {msg.content || msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
