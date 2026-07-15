import "./ChatPage.css";

import WorkspaceSidebar from "./Components/WorkspaceSidebar/WorkspaceSidebar";
import Sidebar from "./Components/Sidebar/Sidebar";
import ChatArea from "./Components/ChatArea/ChatArea";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import MembersList from "./Components/MembersList/MembersList";
import ContactsDirectory from "./Components/ContactsDirectory/ContactsDirectory";
import ThreadPanel from "./Components/ThreadPanel/ThreadPanel";
import ProfilePanel from "./Components/ProfilePanel/ProfilePanel";
import TasksBoard from "./Components/TasksBoard/TasksBoard";
import MeetingsModal from "./Components/MeetingsModal/MeetingsModal";
import MyDesk from "./Components/MyDesk/MyDesk";
import AiAssistant from "./Components/AiAssistant/AiAssistant";
import CommandPalette from "./Components/CommandPalette/CommandPalette";
import ResizeHandle from "../../components/ResizeHandle";
import { MentionContext } from "./mentionContext";
import { authHeaders, getCurrentUserId } from "../../utils/auth";
import { syncPublicKey } from "../../utils/e2e";
import { getMyWorkspaces, getMembers, getTeams } from "../../api/workspace";
import {
  getChannelThreads,
  createThread,
  getChannels,
  getOrCreateDm,
  getDirectMessages,
  getUnread,
  markRead,
  markUnread,
} from "../../api/chat";
import { getAllUsers } from "../../api/user";

const norm = (s) => (s || "").replace(/\s+/g, "").toLowerCase();

// Mobile layout uses off-canvas drawers instead of side-by-side panels.
const MOBILE_QUERY = "(max-width: 820px)";
const isMobileView = () =>
  typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

/** useState that persists to localStorage under `key`. */
function usePersistentState(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s !== null ? JSON.parse(s) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      /* ignore */
    }
  }, [key, val]);
  return [val, setVal];
}

export default function ChatPage() {
  const [activeChannel, setActiveChannel] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [view, setView] = useState("chat"); // "chat" | "contacts"
  const [activeThread, setActiveThread] = useState(null); // {threadId, rootMessage, channelId}

  // Workspace directory used to resolve @mention / #channel clicks.
  const [dirMembers, setDirMembers] = useState([]);
  // Our E2E keypair for direct messages. The private half is generated in this
  // browser and never leaves it — see utils/e2e.js.
  const [e2eKey, setE2eKey] = useState(null);
  const [dirChannels, setDirChannels] = useState([]);
  const [profileMember, setProfileMember] = useState(null);
  const [focusTask, setFocusTask] = useState(null); // task # to focus in the board

  // The other person in a DM (for the Slack-style conversation intro + View Profile).
  // Match on display name OR any normalized handle form so "User 4"-style fallbacks resolve too.
  const dmPartner =
    activeChannel?.type === "DIRECT"
      ? dirMembers.find(
          (m) =>
            m.name === activeChannel.name ||
            m.handles?.has(norm(activeChannel.name || "")) ||
            String(m.userId) === String(activeChannel.dmUserId),
        ) || null
      : null;
  const [cmdkOpen, setCmdkOpen] = useState(false);

  // Ctrl/Cmd+K command palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setCmdkOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openOffice = () => {
    if (!workspaceId) return;
    const token = localStorage.getItem("token");
    window.open(
      `${window.location.protocol}//${window.location.hostname}:5000/?token=${encodeURIComponent(
        token || "",
      )}&workspaceId=${workspaceId}`,
      "_blank",
      "noopener",
    );
  };

  // Clicking a #<number> in chat opens the tasks board focused on that task.
  const handleTaskClick = (number) => {
    setFocusTask({ n: number });
    setView("tasks");
  };

  // Click a notification → jump to its subject (task board or channel), switching workspace if the
  // event happened in a different one. Powers global, cross-workspace notification redirects.
  const handleNotificationNavigate = (data) => {
    if (!data) return;
    const targetWs = data.workspaceId != null ? Number(data.workspaceId) : null;
    const go = () => {
      if (data.refType === "task" && data.taskNumber != null) {
        handleTaskClick(Number(data.taskNumber));
      } else if (data.refType === "channel" && data.channelId) {
        setView("chat");
        selectChannel({ id: String(data.channelId), name: data.channelName || "channel" });
      }
    };
    if (targetWs && targetWs !== workspaceId) {
      switchWorkspace(targetWs);
      setTimeout(go, 500); // let the new workspace's channels/tasks load first
    } else {
      go();
    }
  };

  // Unread badges: { [conversationId]: { count, mention } }.
  const [unread, setUnread] = useState({});
  const [convoIds, setConvoIds] = useState([]);
  const activeIdRef = useRef(null);

  // Selecting a channel returns to the chat view.
  const selectChannel = (ch) => {
    setActiveChannel(ch);
    setView("chat");
    setActiveThread(null);
    // On phones the sidebar is an overlay drawer — close it once a channel is picked.
    if (isMobileView()) setSidebarOpen(false);
  };

  // Open (or create) the thread rooted at a message, showing it in the right panel.
  const openThread = async (rootMessage) => {
    if (!activeChannel?.id || !rootMessage?.id) return;
    try {
      const threads = await getChannelThreads(activeChannel.id);
      let thread = threads.find((t) => t.rootMessageId === rootMessage.id);
      if (!thread) {
        const nameSnippet = (rootMessage.content || "Thread").slice(0, 80);
        thread = await createThread(activeChannel.id, rootMessage.id, nameSnippet);
      }
      setActiveThread({ threadId: thread.id, rootMessage, channelId: activeChannel.id });
    } catch (e) {
      console.error("Failed to open thread", e);
    }
  };
  // The user's active workspace id (membership lives here; required for channels).
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  // The workspace you are actually in. Slack/Discord name the workspace here, not the product —
  // with several workspaces open, "Virtual-Office" in every tab and sidebar tells you nothing.
  const activeWorkspaceName = workspaces.find((w) => w.id === workspaceId)?.name || "";
  // Name the browser tab after the workspace, so several open at once are tellable apart.
  // index.html ships "Virtual Office" as the title, which is what shows until this resolves.
  useEffect(() => {
    document.title = activeWorkspaceName
      ? `${activeWorkspaceName} | Virtual Office`
      : "Virtual Office";
  }, [activeWorkspaceName]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const workName = searchParams.get("work_name");

  // Pick the workspace named in ?work_name= (else the first); no workspace -> onboarding.
  useEffect(() => {
    let cancelled = false;
    getMyWorkspaces()
      .then((list) => {
        if (cancelled) return;
        if (!Array.isArray(list) || list.length === 0) {
          navigate("/onboarding");
          return;
        }
        setWorkspaces(list);
        // Prefer ?work_name, then the last workspace the user visited, then the first.
        const lastSlug = localStorage.getItem("vo-last-workspace");
        const active =
          list.find((w) => w.slug === workName) ||
          list.find((w) => w.slug === lastSlug) ||
          list[0];
        setWorkspaceId(active.id);
        try {
          localStorage.setItem("vo-last-workspace", active.slug);
        } catch {
          /* ignore */
        }
        if (active.slug !== workName) {
          setSearchParams({ work_name: active.slug }, { replace: true });
        }
      })
      .catch((err) => console.error("Failed to load workspaces:", err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Switch to another workspace: update state + URL, reset the open channel.
  const switchWorkspace = (ws) => {
    if (!ws || ws.id === workspaceId) return;
    setWorkspaceId(ws.id);
    setActiveChannel(null);
    try {
      localStorage.setItem("vo-last-workspace", ws.slug);
    } catch {
      /* ignore */
    }
    setSearchParams({ work_name: ws.slug });
  };

  // Load the workspace directory (members + channels) for mention resolution.
  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const [desks, teams, users, channels, dms] = await Promise.all([
          getMembers(workspaceId).catch(() => []),
          getTeams(workspaceId).catch(() => []),
          getAllUsers().catch(() => []),
          getChannels(workspaceId).catch(() => []),
          getDirectMessages().catch(() => []),
        ]);
        if (cancelled) return;
        const nameById = {};
        users.forEach((u) => {
          nameById[u.id] = {
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
            email: u.email,
            e2ePublicKey: u.e2ePublicKey || null,
          };
        });
        const enriched = desks
          .filter((m) => m.userId != null)
          .map((m) => {
            const name = nameById[m.userId]?.name || m.fullName || `User ${m.userId}`;
            return {
              userId: m.userId,
              name,
              title: m.title || "",
              team: teams.find((t) => t.id === m.teamId)?.name || "",
              role: m.role,
              email: nameById[m.userId]?.email || m.workEmail || "",
              e2ePublicKey: nameById[m.userId]?.e2ePublicKey || null,
              avatar: m.personalImageUrl || "",
              online: m.isOnline,
              // Every handle form the composer might have inserted for this person
              // (display name, desk fullName, or the "User{id}" fallback).
              handles: new Set(
                [name, m.fullName, `User${m.userId}`, `User ${m.userId}`]
                  .filter(Boolean)
                  .map(norm),
              ),
            };
          });
        setDirMembers(enriched);
        // Ensure this browser has a keypair and the server has our public half.
        const me = Number(getCurrentUserId());
        syncPublicKey(me, nameById[me]?.e2ePublicKey || null)
          .then((kp) => { if (!cancelled && kp) setE2eKey(kp); })
          .catch(() => { /* E2E unavailable (insecure context) — DMs stay plaintext */ });
        setDirChannels(channels.map((c) => ({ id: c.id, name: c.name })));
        setConvoIds([...channels.map((c) => c.id), ...dms.map((d) => d.id)]);
      } catch {
        /* directory best-effort — mentions just won't resolve */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // Clicking an @mention opens that person's profile card.
  const handleMentionClick = (handle) => {
    const h = norm(handle);
    const found = dirMembers.find((m) => m.handles.has(h));
    if (found) setProfileMember(found);
  };

  // Clicking a #channel jumps to it (if the caller can see it).
  const handleChannelClick = (name) => {
    const n = (name || "").toLowerCase();
    const ch = dirChannels.find((c) => (c.name || "").toLowerCase() === n);
    if (ch) selectChannel(ch);
  };

  // "Message" on a profile — open (or create) a DM and switch to it.
  const startDm = async (member) => {
    try {
      const dm = await getOrCreateDm(member.userId);
      // DM channels carry no name; use the person's name for the header.
      selectChannel({ id: dm.id, name: member.name, type: "DIRECT" });
      setProfileMember(null);
    } catch (e) {
      console.error("Failed to open DM", e);
    }
  };

  // Keep a ref of the channel currently being viewed (so the global subscription
  // doesn't badge it and can keep it marked read).
  useEffect(() => {
    activeIdRef.current = view === "chat" ? activeChannel?.id ?? null : null;
  }, [activeChannel, view]);

  // Seed unread counts for every conversation the user belongs to.
  useEffect(() => {
    if (!convoIds.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        convoIds.map(async (id) => {
          try {
            const u = await getUnread(id);
            return [id, { count: u.unreadCount || 0, mention: !!u.mentioned }];
          } catch {
            return [id, { count: 0, mention: false }];
          }
        }),
      );
      if (!cancelled) setUnread(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [convoIds]);

  // Live badge updates: subscribe to every conversation topic. New messages in a
  // non-active conversation bump its count (and flag a mention if it targets me).
  useEffect(() => {
    if (!stompClient?.connected || !convoIds.length) return;
    const myId = getCurrentUserId();
    const subs = convoIds.map((id) =>
      stompClient.subscribe(`/topic/channel/${id}`, (frame) => {
        let ev;
        try {
          ev = JSON.parse(frame.body);
        } catch {
          return;
        }
        if (ev.action !== "NEW_MESSAGE") return;
        const m = ev.payload || {};
        if (m.senderId === myId) return;
        if (activeIdRef.current === id) {
          if (m.id) markRead(id, m.id).catch(() => {});
          return;
        }
        setUnread((prev) => {
          const cur = prev[id] || { count: 0, mention: false };
          return {
            ...prev,
            [id]: {
              count: cur.count + 1,
              mention: cur.mention || (Array.isArray(m.mentions) && m.mentions.includes(myId)),
            },
          };
        });
      }),
    );
    return () => subs.forEach((s) => s.unsubscribe());
  }, [stompClient, convoIds]);

  // "Mark unread" on a message — move the read cursor back and refresh the badge.
  const handleMarkUnread = async (channelId, messageId) => {
    if (!channelId || !messageId) return;
    try {
      await markUnread(channelId, messageId);
      const u = await getUnread(channelId);
      setUnread((prev) => ({
        ...prev,
        [channelId]: { count: u.unreadCount || 0, mention: !!u.mentioned },
      }));
    } catch (e) {
      console.error("Failed to mark unread", e);
    }
  };

  // Opening a conversation clears its sidebar badge immediately. The server-side
  // mark-read is done by MessagesList after it captures the unread boundary.
  useEffect(() => {
    if (view !== "chat" || !activeChannel?.id) return;
    const id = activeChannel.id;
    setUnread((prev) => (prev[id] ? { ...prev, [id]: { count: 0, mention: false } } : prev));
  }, [activeChannel, view]);

  // Collapsible + resizable side panels (persisted).
  const [sidebarOpen, setSidebarOpen] = usePersistentState("vo-sidebar-open", true);
  const [membersOpen, setMembersOpen] = usePersistentState("vo-members-open", true);
  const [sidebarWidth, setSidebarWidth] = usePersistentState("vo-sidebar-w", 260);
  const [membersWidth, setMembersWidth] = usePersistentState("vo-members-w", 240);

  // Start with both drawers closed on phones (the persisted desktop defaults are
  // "open", which would cover the whole screen on a narrow layout). useLayoutEffect
  // applies this before paint so there's no flash of an open drawer.
  useLayoutEffect(() => {
    if (isMobileView()) {
      setSidebarOpen(false);
      setMembersOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the right-hand panel group (members / thread / profile) — used by the
  // mobile backdrop and to keep only one primary panel visible on phones.
  const closeRightPanels = () => {
    setMembersOpen(false);
    setActiveThread(null);
    setProfileMember(null);
  };

  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host;

    const client = new Client({
      reconnectDelay: 4000,
      // A ws-ticket is SINGLE-USE (consumed at the handshake). stompjs auto-reconnects after a drop
      // — very common on mobile (screen off, network switch, tab backgrounding) — so we must fetch a
      // FRESH ticket before EVERY connect attempt. Baking one ticket into brokerURL made every
      // reconnect replay a consumed ticket → broker rejects it → socket stays dead ("Can't send
      // message… reconnecting" forever). beforeConnect runs before each (re)connect.
      beforeConnect: async () => {
        try {
          const res = await fetch("/api/chat/ws-ticket", { method: "POST", headers: authHeaders() });
          if (!res.ok) throw new Error(`ws-ticket ${res.status}`);
          const { ticket } = await res.json();
          if (ticket) {
            client.brokerURL = `${wsProtocol}//${wsHost}/api/chat/connect?ticket=${ticket}`;
          }
        } catch (err) {
          console.error("Failed to fetch websocket ticket; will retry", err);
        }
      },
      onConnect: () => {
        setStompClient(client);
        client.subscribe("/user/queue/errors", (msg) => {
          console.error("STOMP Error:", JSON.parse(msg.body));
        });
      },
      onStompError: (frame) => {
        console.error("Broker reported error: " + frame.headers["message"]);
        console.error("Additional details: " + frame.body);
      },
    });

    // Seed brokerURL so activate() enters the connect loop; beforeConnect swaps in the ticketed URL.
    client.brokerURL = `${wsProtocol}//${wsHost}/api/chat/connect`;
    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  return (
    <MentionContext.Provider
      value={{
        onMention: handleMentionClick,
        onChannel: handleChannelClick,
        onMarkUnread: handleMarkUnread,
        onTask: handleTaskClick,
      }}
    >
    <div className="chatPage">
      <CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        workspaceId={workspaceId}
        channels={dirChannels}
        members={dirMembers}
        actions={{
          openChannel: (c) => selectChannel({ id: c.id, name: c.name }),
          // Switch to the chat view so the profile side-panel (only rendered there) shows.
          openPerson: (m) => { setView("chat"); setProfileMember(m); },
          openTask: handleTaskClick,
          openTasks: () => setView("tasks"),
          openPeople: () => setView("contacts"),
          openOffice,
        }}
      />
      {/* Workspace rail + channel sidebar. On desktop this is transparent to
          layout (display:contents); on phones it becomes an off-canvas drawer. */}
      <div className={`left-nav ${sidebarOpen ? "drawer-open" : ""}`}>
        <WorkspaceSidebar
          workspaces={workspaces}
          activeId={workspaceId}
          onSwitch={switchWorkspace}
        />

        {sidebarOpen && (
          <>
            <div className="side-panel" style={{ width: sidebarWidth }}>
              <Sidebar
                activeChannel={activeChannel}
                setActiveChannel={selectChannel}
                workspaceId={workspaceId}
                workspaceName={activeWorkspaceName}
                activeView={view}
                members={dirMembers}
                unread={unread}
                onOpenContacts={() => { setView("contacts"); if (isMobileView()) setSidebarOpen(false); }}
                onOpenTasks={() => { setView("tasks"); if (isMobileView()) setSidebarOpen(false); }}
                onOpenMeetings={() => { setView("meetings"); if (isMobileView()) setSidebarOpen(false); }}
                onOpenDesk={() => { setView("mydesk"); if (isMobileView()) setSidebarOpen(false); }}
                onOpenAi={() => { setView("ai"); if (isMobileView()) setSidebarOpen(false); }}
                onOpenSearch={() => setCmdkOpen(true)}
              />
            </div>
            <ResizeHandle
              width={sidebarWidth}
              setWidth={setSidebarWidth}
              min={200}
              max={420}
              direction={1}
            />
          </>
        )}
      </div>

      {/* Dim backdrop behind the left drawer (mobile only, hidden via CSS on desktop). */}
      {sidebarOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {view === "contacts" ? (
        <ContactsDirectory workspaceId={workspaceId} />
      ) : view === "tasks" ? (
        <TasksBoard workspaceId={workspaceId} focus={focusTask} />
      ) : view === "meetings" ? (
        <MeetingsModal workspaceId={workspaceId} inline />
      ) : view === "mydesk" ? (
        <MyDesk workspaceId={workspaceId} />
      ) : view === "ai" ? (
        <AiAssistant
          workspaceId={workspaceId}
          channels={dirChannels}
          members={dirMembers}
          unread={unread}
        />
      ) : (
        <>
          <ChatArea
            activeChannel={activeChannel}
            workspaceId={workspaceId}
            stompClient={stompClient}
            sidebarOpen={sidebarOpen}
            membersOpen={membersOpen}
            members={dirMembers}
            e2eKey={e2eKey}
            dmPartner={dmPartner}
            onViewProfile={() => (dmPartner ? setProfileMember(dmPartner) : setMembersOpen(true))}
            onOpenSearch={() => setCmdkOpen(true)}
            onNotificationNavigate={handleNotificationNavigate}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            onToggleMembers={() => setMembersOpen((o) => !o)}
            onChannelUpdated={(ch) =>
              setActiveChannel({ id: ch.id, name: ch.name })
            }
            onOpenThread={openThread}
          />

          {/* Dim backdrop behind the right drawer (members / thread / profile) — mobile only. */}
          {(profileMember || activeThread || membersOpen) && (
            <div
              className="drawer-backdrop drawer-backdrop-right"
              onClick={closeRightPanels}
              aria-hidden="true"
            />
          )}

          {profileMember ? (
            <>
              <ResizeHandle
                width={membersWidth}
                setWidth={setMembersWidth}
                min={260}
                max={420}
                direction={-1}
              />
              <div className="side-panel" style={{ width: Math.max(membersWidth, 300) }}>
                <ProfilePanel
                  member={profileMember}
                  onClose={() => setProfileMember(null)}
                  onMessage={startDm}
                />
              </div>
            </>
          ) : activeThread ? (
            <>
              <ResizeHandle
                width={membersWidth}
                setWidth={setMembersWidth}
                min={300}
                max={560}
                direction={-1}
              />
              <div className="side-panel" style={{ width: Math.max(membersWidth, 360) }}>
                <ThreadPanel
                  thread={activeThread}
                  stompClient={stompClient}
                  members={dirMembers}
                  onClose={() => setActiveThread(null)}
                />
              </div>
            </>
          ) : membersOpen ? (
            <>
              <ResizeHandle
                width={membersWidth}
                setWidth={setMembersWidth}
                min={180}
                max={400}
                direction={-1}
              />
              <div className="side-panel" style={{ width: membersWidth }}>
                <MembersList workspaceId={workspaceId} />
              </div>
            </>
          ) : null}
        </>
      )}

      {/* Floating "open navigation" button for the non-chat views (which have no
          header hamburger). Mobile only; hidden while the drawer is already open. */}
      {view !== "chat" && !sidebarOpen && (
        <button
          className="mobile-nav-fab"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
          title="Menu"
        >
          <Menu size={24} />
        </button>
      )}
    </div>
    </MentionContext.Provider>
  );
}
