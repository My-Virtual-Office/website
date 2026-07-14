import "./ChatHeader.css";
import {
  Hash,
  AtSign,
  Phone,
  Info,
  Search,
  Users,
  Pin,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { authHeaders } from "../../../../../utils/auth";
import { getPins } from "../../../../../api/chat";
import { useDialogs } from "../../../../../components/DialogProvider";
import ChannelSettingsModal from "../../ChannelSettingsModal/ChannelSettingsModal";
import NotificationCenter from "../../NotificationCenter/NotificationCenter";
export default function ChatHeader({
  activeChannel,
  workspaceId,
  sidebarOpen,
  membersOpen,
  onToggleSidebar,
  onToggleMembers,
  onChannelUpdated,
  onOpenSearch,
  onNotificationNavigate,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [pins, setPins] = useState([]);

  // In-channel message search (distinct from the global ⌘K palette): searches
  // only the messages of the currently open channel and jumps to a result.
  const [channelSearchOpen, setChannelSearchOpen] = useState(false);
  const [csQuery, setCsQuery] = useState("");
  const [csMessages, setCsMessages] = useState([]);
  const [csLoading, setCsLoading] = useState(false);
  const csBoxRef = useRef(null);
  const csInputRef = useRef(null);

  // Load this channel's messages when the search panel opens.
  useEffect(() => {
    if (!channelSearchOpen || !activeChannel?.id) return;
    let cancelled = false;
    setCsLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/chat/channels/${activeChannel.id}/messages?page=1&limit=50`,
          { headers: authHeaders() },
        );
        const data = res.ok ? await res.json() : {};
        if (!cancelled) setCsMessages(data.content || []); // newest-first
      } catch {
        if (!cancelled) setCsMessages([]);
      } finally {
        if (!cancelled) setCsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [channelSearchOpen, activeChannel?.id]);

  // Focus the input + close the panel on an outside click.
  useEffect(() => {
    if (!channelSearchOpen) return;
    setTimeout(() => csInputRef.current?.focus(), 30);
    const onDoc = (e) => {
      if (csBoxRef.current && !csBoxRef.current.contains(e.target)) setChannelSearchOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [channelSearchOpen]);

  const csResults = useMemo(() => {
    const q = csQuery.trim().toLowerCase();
    if (!q) return [];
    return csMessages
      .filter((m) => m.type !== "SYSTEM" && (m.content || "").toLowerCase().includes(q))
      .slice(0, 30);
  }, [csQuery, csMessages]);

  const toggleChannelSearch = () => {
    setChannelSearchOpen((o) => {
      const next = !o;
      if (next) {
        setShowPins(false);
        setIsMenuOpen(false);
      } else {
        setCsQuery("");
      }
      return next;
    });
  };

  // Scroll to a matching message in the list and flash it.
  const jumpToMessage = (id) => {
    setChannelSearchOpen(false);
    setCsQuery("");
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("msg-flash");
      setTimeout(() => el.classList.remove("msg-flash"), 1600);
    }
  };

  const togglePins = async () => {
    const next = !showPins;
    setShowPins(next);
    if (next) setIsMenuOpen(false); // only one header dropdown open at a time
    if (next && activeChannel?.id) {
      try {
        setPins(await getPins(activeChannel.id));
      } catch {
        setPins([]);
      }
    }
  };
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
    if (newMenuState) setShowPins(false); // only one header dropdown open at a time

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
      <div className="header-left">
        <button
          className="header-btn header-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          title={sidebarOpen ? "Collapse sidebar" : "Show sidebar"}
        >
          {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
        <div className="channel-info">
          <h3
            onClick={() =>
              activeChannel?.type !== "DIRECT" && activeChannel?.id && setSettingsOpen(true)
            }
            title={activeChannel?.type === "DIRECT" ? "" : "Channel settings"}
            style={activeChannel?.type === "DIRECT" ? { cursor: "default" } : undefined}
          >
            {activeChannel?.type === "DIRECT" ? <AtSign size={18} /> : <Hash size={18} />}
            <span>{channelNameForDisplay}</span>
          </h3>
          <span className="margin">|</span>
          <span className="channel-description">
            {channelDetails?.description || ""}
          </span>
        </div>
      </div>

      {/* Right Side */}
      <div className="header-actions">
        <button className="header-btn header-call" aria-label="Call">
          <Phone size={18} />
        </button>
        <button
          className={`header-btn ${membersOpen ? "active" : ""}`}
          onClick={onToggleMembers}
          aria-label="Toggle members"
          title={membersOpen ? "Hide members" : "Show members"}
        >
          <Users size={18} />
        </button>

        <div className="info-dropdown-container" style={{ position: "relative" }}>
          <button
            className={`header-btn ${showPins ? "active" : ""}`}
            onClick={togglePins}
            title="Pinned messages"
          >
            <Pin size={18} />
          </button>
          {showPins && (
            <div className="dropdown-menu pins-menu">
              <div className="pins-title">Pinned messages</div>
              {pins.length === 0 ? (
                <div className="pins-empty">No pinned messages yet</div>
              ) : (
                pins.map((m) => (
                  <div key={m.id} className="pins-item">
                    <span className="pins-sender">User {m.senderId}</span>
                    <span className="pins-content">{m.content || "(attachment)"}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

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

        {/* In-channel search (only this channel's messages) */}
        <div
          className="info-dropdown-container channel-search-wrap"
          style={{ position: "relative" }}
          ref={csBoxRef}
        >
          <button
            className={`header-btn ${channelSearchOpen ? "active" : ""}`}
            onClick={toggleChannelSearch}
            aria-label="Search this channel"
            title="Search this channel"
          >
            <Search size={18} />
          </button>
          {channelSearchOpen && (
            <div className="dropdown-menu channel-search-menu">
              <div className="cs-input-row">
                <Search size={15} />
                <input
                  ref={csInputRef}
                  type="text"
                  placeholder="Search this channel"
                  value={csQuery}
                  onChange={(e) => setCsQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setChannelSearchOpen(false)}
                />
                {csQuery && (
                  <button className="cs-clear" onClick={() => setCsQuery("")} aria-label="Clear">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="cs-results">
                {csLoading ? (
                  <div className="cs-empty">Loading messages…</div>
                ) : !csQuery.trim() ? (
                  <div className="cs-empty">Type to search messages in #{channelNameForDisplay}</div>
                ) : csResults.length === 0 ? (
                  <div className="cs-empty">No messages match “{csQuery.trim()}”</div>
                ) : (
                  csResults.map((m) => (
                    <button key={m.id} className="cs-item" onClick={() => jumpToMessage(m.id)}>
                      <span className="cs-item-top">
                        <span className="cs-sender">User {m.senderId}</span>
                        <span className="cs-time">
                          {m.createdAt
                            ? new Date(m.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })
                            : ""}
                        </span>
                      </span>
                      <span className="cs-content">{m.content || "(attachment)"}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-search" onClick={onOpenSearch} title="Search everything (Ctrl/⌘K)">
          <Search size={16} />
          <input type="text" placeholder="Search" readOnly onFocus={onOpenSearch} />
        </div>

        <NotificationCenter inline onNavigate={onNotificationNavigate} />
      </div>

      <ChannelSettingsModal
        channelId={activeChannel?.id}
        workspaceId={workspaceId}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUpdated={(ch) => onChannelUpdated?.(ch)}
      />
    </div>
  );
}
