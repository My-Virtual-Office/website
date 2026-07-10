import "./ChatHeader.css";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import NumbersIcon from "@mui/icons-material/Numbers";
import MenuIcon from "@mui/icons-material/Menu";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect, useRef, useMemo } from "react";
import { getCurrentUserId } from "../../../../../utils/auth";
import { Snackbar, Alert } from "@mui/material";
import WbSunnyOutlinedIcon from "@mui/icons-material/WbSunnyOutlined";
import NightsStayOutlinedIcon from "@mui/icons-material/NightsStayOutlined";
import Switch from "@mui/material/Switch";

function highlightText(text, query) {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="search-highlight">{part}</mark>
    ) : (
      part
    ),
  );
}

export default function ChatHeader({ activeChannel, onToggleSidebar, workspaceId, messages, usersMap, onSearchSelect }) {
  let channelNameForDisplay = "Loading...";
  if (activeChannel !== null) {
    if (activeChannel.name !== undefined) {
      channelNameForDisplay = activeChannel.name;
    }
  }

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [channelDetails, setChannelDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const searchInputRef = useRef(null);
  const searchDropdownRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Filter messages based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !messages?.length) return [];
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (msg) => msg.content && msg.content.toLowerCase().includes(q),
    ).slice(0, 20);
  }, [searchQuery, messages]);

  // Close search dropdown on outside click
  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchOpen(false);
        setSearchQuery("");
        setSelectedSearchIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setSelectedSearchIndex(-1);
    if (e.target.value.trim()) {
      setSearchOpen(true);
    }
  };

  const handleSearchFocus = () => {
    if (searchQuery.trim()) {
      setSearchOpen(true);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (!searchOpen || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1,
      );
    } else if (e.key === "Enter" && selectedSearchIndex >= 0) {
      e.preventDefault();
      handleResultClick(searchResults[selectedSearchIndex]);
    } else if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
      setSelectedSearchIndex(-1);
    }
  };

  const handleResultClick = (msg) => {
    if (onSearchSelect) onSearchSelect(msg.id);
    setSearchOpen(false);
    setSearchQuery("");
    setSelectedSearchIndex(-1);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSelectedSearchIndex(-1);
  };

  const handleCopyInviteLink = async () => {
    if (!activeChannel?.id) return;
    const inviteUrl = `${window.location.origin}/chat/join/${activeChannel.id}?workspaceId=${workspaceId}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
  };

  const toggleMenu = async () => {
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);

    if (newMenuState === true && activeChannel) {
      setIsLoadingDetails(true);
      try {
        const response = await fetch(`/api/chat/channels/${activeChannel.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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

  const handleLeaveChannel = async () => {
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
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "X-User-Id": String(getCurrentUserId()),
              "X-User-Role": "USER",
            },
          },
        );

        if (response.ok) {
          alert("You have left the channel successfully!");
          setIsMenuOpen(false);
        } else {
          alert("An error occurred while leaving the channel!");
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
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
          {activeChannel?.type === "ROOM" ? (
            <MeetingRoomIcon />
          ) : (
            <NumbersIcon />
          )}
          <span>{channelNameForDisplay}</span>
        </h3>
        <span className="margin">|</span>
        <span className="channel-description">
          {channelDetails?.description || ""}
        </span>
      </div>

      {/* Right Side */}
      <div className="header-actions">

        <div className="header-search" ref={searchContainerRef}>
          <SearchOutlinedIcon />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={closeSearch}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          )}

          {searchOpen && searchResults.length > 0 && (
            <div className="search-results-dropdown" ref={searchDropdownRef}>
              <div className="search-results-header">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </div>
              {searchResults.map((msg, idx) => {
                const senderName = (usersMap && usersMap[msg.senderId]) || `User ${msg.senderId}`;
                const date = new Date(msg.createdAt).toLocaleDateString();
                return (
                  <div
                    key={msg.id}
                    className={`search-result-item ${idx === selectedSearchIndex ? "selected" : ""}`}
                    onClick={() => handleResultClick(msg)}
                  >
                    <div className="search-result-meta">
                      <span className="search-result-sender">{senderName}</span>
                      <span className="search-result-date">{date}</span>
                    </div>
                    <div className="search-result-content">
                      {highlightText(msg.content, searchQuery)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {searchOpen && searchQuery.trim() && searchResults.length === 0 && (
            <div className="search-results-dropdown">
              <div className="search-results-empty">No messages found</div>
            </div>
          )}
        </div>

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

          {activeChannel?.type !== "ROOM" && (
            <button className="header-btn" aria-label="Copy invite link" onClick={handleCopyInviteLink}>
              <ContentCopyIcon />
            </button>
          )}

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

      </div>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ fontWeight: 600 }}>
          Invite link copied!
        </Alert>
      </Snackbar>
    </div>
  );
}
