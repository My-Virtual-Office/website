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
import { Client } from "@stomp/stompjs";
import { subscribeToNotifications } from "../ws/notificationsStompClient";
import { getCurrentUserId } from "../utils/auth";

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

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isDarkMode, setIsDarkMode] = useState(
    document.body.classList.contains("dark-mode"),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains("dark-mode"));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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
        setLoading(false);
      }
    };
    loadNotifications();
  }, [open]);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const data = await fetchUnreadCount();
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
        await markNotificationAsRead(notif.id);
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
    e.stopPropagation();

    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

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
          icon: <AssignmentIcon color="primary" />,
          title: notification.body,
          subtitle: notification.createdAt,
        };
      case "SIGNUP_SUCCESS":
        return {
          icon: <CheckCircleIcon color="success" />,
          title: "Welcome to Virtual Office!",
          subtitle: `Hello ${notification.payload.firstName}, your account is ready.`,
        };
      default:
        return {
          icon: <NotificationsIcon />,
          title: notification.body || "Notification",
          subtitle: notification.createdAt,
        };
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: "#94a3b8",
          transition: "all 0.2s",
          padding: "4px",
          "&:hover": { color: "#475569", backgroundColor: "transparent" },
        }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

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
            bgcolor: "background.paper",
            color: "text.primary",
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
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Notifications
          </Typography>
          <Button size="small" color="primary" onClick={handleMarkAllAsRead}>
            Mark all as read
          </Button>
        </Box>

        <Divider />

        <List sx={{ p: 0, overflowY: "auto", flexGrow: 1 }}>
          {loading && (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          )}

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
                      : "rgba(25, 118, 210, 0.08)",
                    transition: "background-color 0.2s",
                    "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
                    cursor: "pointer",
                    pr: 6,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: "white",
                        border: `1px solid ${theme.palette.grey[300]}`,
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
                        color="text.primary"
                      >
                        {content.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                          display="block"
                        >
                          {content.subtitle}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          component="span"
                        >
                          {notif.occurredAt}
                        </Typography>
                      </>
                    }
                  />

                  {!notif.read && (
                    <CircleIcon
                      sx={{ fontSize: 12, color: "primary.main", ml: 1, mr: 1 }}
                    />
                  )}

                  <Tooltip title="Dismiss">
                    <IconButton
                      size="small"
                      sx={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
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

        <Divider />

        <Box sx={{ p: 1, textAlign: "center" }}>
          <Button size="small" color="inherit" fullWidth>
            Load More
          </Button>
        </Box>
      </Popover>
    </>
  );
}
