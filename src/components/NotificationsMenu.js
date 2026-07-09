import { useState, useEffect } from "react";
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Button,
  Divider,
  useTheme,
  Tooltip,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CircleIcon from "@mui/icons-material/Circle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
// import { Client } from "@stomp/stompjs";
import { subscribeToNotifications } from "../ws/notificationsStompClient";
import { getCurrentUserId } from "../utils/auth";

// Import the fetch function from the notifications API file
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../api/notifications";

export default function NotificationsMenu() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [isDarkMode, setIsDarkMode] = useState(
    document.body.classList.contains("dark-mode"),
  );

  // Keep dark mode in sync when toggled elsewhere
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains("dark-mode"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // State to store the notifications fetched from the server
  const [notifications, setNotifications] = useState([]);
  // State to track whether notifications are still loading
  const [loading, setLoading] = useState(false);
  // 1. State variable to store the badge count (starts at 0)
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications from the server every time the popover opens
  useEffect(() => {
    if (!open) return;

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const data = await fetchNotifications(1, 20);
        setNotifications(data.items || []);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        // Whether it succeeded or failed, stop loading
        setLoading(false);
      }
    };
    loadNotifications();
  }, [open]);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const data = await fetchUnreadCount();
        console.log("📢 Data from Backend API:", data);
        setUnreadCount(data.unread || 0);
      } catch (error) {
        console.error("Failed to load unread count", error);
      }
    };
    loadUnreadCount();
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        // 1. Send PATCH request to the backend
        await markNotificationAsRead(notif.id);

        // 2. Update local state to change status immediately without refresh
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // 1. Send request to backend to mark all as read
      await markAllNotificationsAsRead();

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true })),
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleDelete = async (e, id, isRead) => {
    e.stopPropagation(); // Stop propagation to prevent triggering "mark as read" when clicking delete

    try {
      // 1. Send delete request to the backend
      await deleteNotification(id);

      setNotifications((prev) => prev.filter((n) => n.id !== id));

      // 3. Decrement red badge count if the deleted notification was unread
      if (!isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  // Single shared WebSocket connection (avoids duplicate connects in Strict Mode)
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;

    return subscribeToNotifications((data) => {
      if (data.action === "NEW_NOTIFICATION") {
        setUnreadCount((prev) => prev + 1);
        if (data.payload) {
          setNotifications((prev) => [data.payload, ...prev]);
        }
      }
    });
  }, []);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const getNotificationContent = (notification) => {
    switch (notification.type) {
      case "TASK_ASSIGNED":
        return {
          icon: <AssignmentIcon sx={{ color: "var(--accent-color)" }} />,
          title: notification.body,
          subtitle: notification.createdAt,
        };
      case "SIGNUP_SUCCESS":
        return {
          icon: <CheckCircleIcon sx={{ color: "#22c55e" }} />,
          title: "Welcome to Virtual Office!",
          subtitle: `Hello ${notification.payload.firstName}, your account is ready.`,
        };
      default:
        return {
          icon: <NotificationsIcon sx={{ color: "var(--text-secondary)" }} />,
          title: notification.body || "Notification",
          subtitle: notification.createdAt,
        };
    }
  };

  return (
    <>
      {/*  IconButton */}
      <IconButton
        onClick={handleClick}
        sx={{
          color: "var(--text-muted)",
          transition: "all 0.2s",
          padding: "4px",
          "&:hover": {
            color: "var(--text-secondary)",
            backgroundColor: "transparent",
          },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {/* Notifications Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-secondary)",
            color: "var(--text-primary)",
            boxShadow: isDarkMode
              ? "0 8px 32px rgba(0,0,0,0.5)"
              : "0 4px 20px rgba(0,0,0,0.12)",
          },
          elevation: 4,
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border-secondary)",
          }}
        >
          <Typography variant="h6" fontWeight="bold" sx={{ color: "var(--text-primary)" }}>
            Notifications
          </Typography>
          <Button
            size="small"
            onClick={handleMarkAllAsRead}
            sx={{ color: "var(--accent-color)", fontWeight: 600 }}
          >
            Mark all as read
          </Button>
        </Box>

        <Divider />

        <List sx={{ p: 0, overflowY: "auto", flexGrow: 1 }}>
          {/* Show loading text while fetching */}
          {loading && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          )}

          {/* Show message if no notifications found */}
          {!loading && notifications.length === 0 && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No notifications yet.
              </Typography>
            </Box>
          )}

          {!loading &&
            notifications.map((notif) => {
              const content = getNotificationContent(notif);

              return (
                <ListItem
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  sx={{
                    bgcolor: notif.read
                      ? "transparent"
                      : isDarkMode
                        ? "var(--accent-bg-active)"
                        : "rgba(80, 72, 229, 0.06)",
                    transition: "background-color 0.2s",
                    "&:hover": { bgcolor: "var(--bg-input)" },
                    cursor: "pointer",
                    pr: 6,
                    borderBottom: "1px solid var(--border-secondary)",
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: "var(--bg-secondary)",
                        border: "1px solid var(--border-primary)",
                      }}
                    >
                      {content.icon}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle2"
                        fontWeight={notif.read ? "normal" : "bold"}
                        sx={{ color: "var(--text-primary)" }}
                      >
                        {content.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="body2"
                          component="span"
                          display="block"
                          sx={{ color: "var(--text-secondary)" }}
                        >
                          {content.subtitle}
                        </Typography>
                        <Typography
                          variant="caption"
                          component="span"
                          sx={{ color: "var(--text-muted)" }}
                        >
                          {notif.occurredAt}
                        </Typography>
                      </>
                    }
                  />

                  {/* Accent dot for unread notifications */}
                  {!notif.read && (
                    <CircleIcon
                      sx={{ fontSize: 12, color: "var(--accent-color)", ml: 1, mr: 1 }}
                    />
                  )}

                  {/* Delete button */}
                  <Tooltip title="Dismiss">
                    <IconButton
                      size="small"
                      sx={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                        "&:hover": {
                          color: "#ef4444",
                          backgroundColor: "rgba(239,68,68,0.08)",
                        },
                      }}
                      onClick={(e) => handleDelete(e, notif.id, notif.read)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              );
            })}
        </List>

        <Divider sx={{ borderColor: "var(--border-secondary)" }} />

        {/* Load more button */}
        <Box sx={{ p: 1, textAlign: "center", backgroundColor: "var(--bg-secondary)" }}>
          <Button
            size="small"
            fullWidth
            sx={{ color: "var(--text-secondary)", "&:hover": { color: "var(--text-primary)" } }}
          >
            Load More
          </Button>
        </Box>
      </Popover>
    </>
  );
}
