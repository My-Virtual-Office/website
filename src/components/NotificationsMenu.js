import { useState } from "react";
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

// بيانات وهمية للتجربة
const mockNotifications = [
  {
    id: "1",
    type: "TASK_ASSIGNED",
    read: false,
    occurredAt: "10:30 AM",
    payload: { taskTitle: "Wire up SMTP retries", assignedByName: "Mostafa" },
  },
  {
    id: "2",
    type: "SIGNUP_SUCCESS",
    read: true,
    occurredAt: "Yesterday",
    payload: { firstName: "Khaled" },
  },
];

export default function NotificationsMenu() {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const getNotificationContent = (notification) => {
    switch (notification.type) {
      case "TASK_ASSIGNED":
        return {
          icon: <AssignmentIcon color="primary" />,
          bgColor: theme.palette.primary.light,
          title: `New Task: ${notification.payload.taskTitle}`,
          subtitle: `Assigned by ${notification.payload.assignedByName}`,
        };
      case "SIGNUP_SUCCESS":
        return {
          icon: <CheckCircleIcon color="success" />,
          bgColor: theme.palette.success.light,
          title: "Welcome to Virtual Office!",
          subtitle: `Hello ${notification.payload.firstName}, your account is ready.`,
        };
      default:
        return {
          icon: <NotificationsIcon />,
          bgColor: theme.palette.grey[300],
          title: "Notification",
          subtitle: "You have a new update.",
        };
    }
  };

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <>
      {/*  IconButton */}
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

      {/* نافذة الإشعارات */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          style: {
            width: 380,
            maxHeight: 500,
            display: "flex",
            flexDirection: "column",
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
          <Button size="small" color="primary">
            Mark all as read
          </Button>
        </Box>

        <Divider />

        <List sx={{ p: 0, overflowY: "auto", flexGrow: 1 }}>
          {mockNotifications.map((notif) => {
            const content = getNotificationContent(notif);

            return (
              <ListItem
                key={notif.id}
                sx={{
                  bgcolor: notif.read
                    ? "transparent"
                    : "rgba(25, 118, 210, 0.08)",
                  transition: "background-color 0.2s",
                  "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
                  cursor: "pointer",
                  pr: 6, // إعطاء مساحة لزر الحذف
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: "white",
                      border: `1px solid ${content.bgColor}`,
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

                {/* النقطة الزرقاء للإشعار غير المقروء */}
                {!notif.read && (
                  <CircleIcon
                    sx={{ fontSize: 12, color: "primary.main", ml: 1, mr: 1 }}
                  />
                )}

                {/* زر الحذف (مخصص لمسار DELETE) */}
                <Tooltip title="Dismiss">
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // لمنع تفعيل النقر على الإشعار بالكامل عند ضغط زر الحذف
                      console.log("Delete notif", notif.id);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" color="action" />
                  </IconButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>

        <Divider />

        {/* زر تحميل المزيد (مخصص لمسار Pagination) */}
        <Box sx={{ p: 1, textAlign: "center" }}>
          <Button size="small" color="inherit" fullWidth>
            Load More
          </Button>
        </Box>
      </Popover>
    </>
  );
}
