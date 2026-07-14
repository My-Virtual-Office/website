import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Tabs,
  Tab,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import { Fade } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ThemeSwitcher from "../../../../theme/ThemeSwitcher";

import { updatePassword, uploadPhoto } from "../../../../api/user";

import InputField from "../../../../components/InputField";
import Button from "../../../../components/Button";

export default function SettingsModal({
  open,
  onClose,
  user,
  onUpdate,
  userPhoto,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photoPreview, setPhotoPreview] = useState(userPhoto);

  // ── Dark mode awareness ───────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(
    document.body.classList.contains("dark-mode"),
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.body.classList.contains("dark-mode"));
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePasswordUpdate = async () => {
    setError("");
    setSuccess("");
    try {
      const result = await updatePassword({ oldPassword, newPassword });
      if (result.status === "succeeded" || result.data?.message === "succeeded") {
        setSuccess("Password updated successfully");
        setOldPassword("");
        setNewPassword("");
      }
    } catch (err) {
      setError(err.response?.data?.Error || "Failed to update password");
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const previousPreview = photoPreview;
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    try {
      const result = await uploadPhoto(file);
      if (result.status === "succeeded" || result.data?.message === "succeeded") {
        setSuccess("Profile picture updated successfully!");
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      setError(err.response?.data?.Error || "Failed to upload photo");
      setPhotoPreview(previousPreview);
    }
  };

  useEffect(() => {
    if (userPhoto) {
      setPhotoPreview(userPhoto);
    }
  }, [userPhoto]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "700px",
          maxWidth: "90%",
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-secondary)",
          boxShadow: isDarkMode
            ? "0 16px 48px rgba(0,0,0,0.6)"
            : "0 8px 30px rgba(0,0,0,0.15)",
        },
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-secondary)",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <Typography
          variant="h6"
          fontWeight="700"
          component="span"
          sx={{ color: "var(--text-primary)" }}
        >
          Preferences
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            color: "var(--text-muted)",
            "&:hover": { color: "var(--text-primary)", bgcolor: "var(--bg-secondary)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: "flex", height: "450px", borderColor: "var(--border-secondary)" }}>
        {/* ── Left sidebar (tabs) ─────────────────────────────────── */}
        <Box
          sx={{
            borderRight: "1px solid var(--border-secondary)",
            backgroundColor: "var(--bg-secondary)",
            width: "200px",
          }}
        >
          <Tabs
            orientation="vertical"
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              "& .MuiTab-root": {
                alignItems: "center",
                textAlign: "center",
                textTransform: "none",
                fontWeight: "600",
                color: "var(--text-secondary)",
                minHeight: "50px",
                transition: "0.2s",
                "&:hover": {
                  color: "var(--accent-color)",
                  bgcolor: "var(--accent-bg-active)",
                },
              },
              "& .Mui-selected": {
                color: "var(--accent-color) !important",
                bgcolor: "var(--accent-bg-active)",
              },
              "& .MuiTabs-indicator": {
                left: 0,
                width: "4px",
                bgcolor: "var(--accent-color)",
                borderRadius: "0 4px 4px 0",
              },
            }}
          >
            <Tab
              icon={<PersonIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Account"
            />
            <Tab
              icon={<LockIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Security"
            />
            <Tab
              icon={<PaletteOutlinedIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label="Themes"
            />
          </Tabs>
        </Box>

        {/* right side content */}
        <Box sx={{ flex: 1, p: 4, overflowY: "auto" }}>
          {activeTab === 2 && (
            <Fade in={activeTab === 2} timeout={400}>
              <Box>
                <ThemeSwitcher />
              </Box>
            </Fade>
          )}

          {activeTab === 1 && (
            <Fade in={activeTab === 1} timeout={400}>
              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  fontWeight="600"
                  sx={{ color: "var(--text-primary)" }}
                >
                  Change Password
                </Typography>
                <Typography
                  variant="body2"
                  mb={3}
                  sx={{ color: "var(--text-secondary)" }}
                >
                  Make sure to choose a strong password to protect your account.
                </Typography>

                {error && (
                  <Typography color="error" mb={2}>
                    {error}
                  </Typography>
                )}
                {success && (
                  <Typography mb={2} sx={{ color: "#02c27c" }}>
                    {success}
                  </Typography>
                )}

                <Box
                  component="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePasswordUpdate();
                  }}
                  sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <InputField
                    label="Old Password"
                    type="password"
                    placeholder="Enter old password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                  <InputField
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Button type="submit">Save Changes</Button>
                </Box>
              </Box>
            </Fade>
          )}

          {/* Account tab */}
          {activeTab === 0 && (
            <Fade in={activeTab === 0} timeout={400}>
              <Box sx={{ position: "relative" }}>
                <input
                  type="file"
                  id="photo-upload"
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
                <label htmlFor="photo-upload">
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      mb: 2,
                      pb: 2,
                      borderBottom: "1px solid var(--border-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    {/* Avatar */}
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: "12px",
                        bgcolor: "var(--accent-bg-active)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "32px",
                        fontWeight: "700",
                        color: "var(--accent-color)",
                        position: "relative",
                        overflow: "hidden",
                        border: "2px solid var(--border-primary)",
                        "&:hover .camera-overlay": { opacity: 1 },
                      }}
                    >
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Profile"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <>
                          {user?.firstName?.[0]}
                          {user?.lastName?.[0]}
                        </>
                      )}

                      {/* Camera hover overlay */}
                      <Box
                        className="camera-overlay"
                        sx={{
                          position: "absolute",
                          top: 0, left: 0, right: 0, bottom: 0,
                          bgcolor: "rgba(0,0,0,0.45)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0,
                          transition: "0.3s",
                        }}
                      >
                        <CameraAltIcon sx={{ color: "white" }} />
                      </Box>
                    </Box>

                    {/* Name & time */}
                    <Box>
                      <Typography
                        variant="h5"
                        fontWeight="700"
                        sx={{ color: "var(--text-primary)" }}
                      >
                        {user?.firstName} {user?.lastName}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "var(--text-secondary)" }}
                      >
                        Local time:{" "}
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </Box>
                  </Box>
                </label>

                {/* Section label */}
                <Typography
                  variant="subtitle2"
                  fontWeight="700"
                  mb={1}
                  sx={{
                    color: "var(--text-secondary)",
                    letterSpacing: "0.5px",
                    borderLeft: "3px solid var(--accent-color)",
                    paddingLeft: "8px",
                  }}
                >
                  CONTACT INFORMATION
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
                  {/* Email */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        fontWeight="700"
                        sx={{ color: "var(--text-muted)" }}
                      >
                        EMAIL ADDRESS
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ mt: 0.5, color: "var(--text-primary)", fontWeight: "500" }}
                      >
                        {user?.email}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      sx={{
                        color: "var(--text-muted)",
                        "&:hover": {
                          color: "var(--accent-color)",
                          bgcolor: "var(--accent-bg-active)",
                        },
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>

                  {/* Phone */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        fontWeight="700"
                        sx={{ color: "var(--text-muted)" }}
                      >
                        PHONE NUMBER
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ mt: 0.5, color: "var(--text-primary)", fontWeight: "500" }}
                      >
                        {user?.phoneNumber || "Not provided"}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      sx={{
                        color: "var(--text-muted)",
                        "&:hover": {
                          color: "var(--accent-color)",
                          bgcolor: "var(--accent-bg-active)",
                        },
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>

                  {/* Account status */}
                  <Box
                    sx={{
                      pt: 2,
                      mt: 1,
                      borderTop: "1px solid var(--border-secondary)",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight="700"
                      sx={{
                        color: "var(--text-secondary)",
                        letterSpacing: "0.5px",
                        mt: 1,
                        mb: 1,
                        borderLeft: "3px solid var(--accent-color)",
                        paddingLeft: "8px",
                      }}
                    >
                      ACCOUNT STATUS
                    </Typography>
                    <Box
                      sx={{
                        mt: 1.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor:
                            user?.accountStatus === "ACTIVE"
                              ? "var(--accent-color)"
                              : "var(--text-muted)",
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight="700"
                        sx={{
                          color:
                            user?.accountStatus === "ACTIVE"
                              ? "var(--accent-color)"
                              : "var(--text-muted)",
                          textTransform: "capitalize",
                        }}
                      >
                        {user?.accountStatus?.toLowerCase()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Fade>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
