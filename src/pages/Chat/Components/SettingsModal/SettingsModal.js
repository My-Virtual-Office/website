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
import { Fade } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";

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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handlePasswordUpdate = async () => {
    setError("");
    setSuccess("");
    try {
      const result = await updatePassword({ oldPassword, newPassword });
      if (result.status === "succeeded") {
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

    // preview uploaded photo
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    try {
      const result = await uploadPhoto(file);
      if (result.status === "succeeded") {
        setSuccess("Profile picture updated successfully!");
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      setError(err.response?.data?.Error || "Failed to upload photo");
      setPhotoPreview(null);
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
        sx: { width: "700px", maxWidth: "90%" },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" fontWeight="700" component="span">
          Preferences
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, display: "flex", height: "450px" }}>
        {/* sidebar content */}
        <Box
          sx={{
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "#f8fafc",
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
                color: "#64748b",
                minHeight: "50px",
                transition: "0.2s",
                "&:hover": {
                  color: "#5048e5",
                  bgcolor: "rgba(80, 72, 229, 0.04)",
                },
              },
              "& .Mui-selected": {
                color: "#5048e5 !important",
                bgcolor: "#e5e7ff",
              },
              "& .MuiTabs-indicator": {
                left: 0,
                width: "4px",
                bgcolor: "#5048e5",
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
          </Tabs>
        </Box>

        {/* right side content */}
        <Box sx={{ flex: 1, p: 4, overflowY: "auto" }}>
          {activeTab === 1 && (
            <Fade in={activeTab === 1} timeout={400}>
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="600">
                  Change Password
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={3}>
                  Make sure to choose a strong password to protect your account.
                </Typography>

                {error && (
                  <Typography color="error" mb={2}>
                    {error}
                  </Typography>
                )}
                {success && (
                  <Typography color="primary" mb={2} sx={{ color: "#02c27c" }}>
                    {success}
                  </Typography>
                )}

                <Box
                  component="form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handlePasswordUpdate();
                  }}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
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
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                    }}
                  >
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: "12px",
                        bgcolor: "#e5e7ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "32px",
                        fontWeight: "700",
                        color: "#5048e5",
                        position: "relative",
                        overflow: "hidden",
                        "&:hover .camera-overlay": { opacity: 1 },
                      }}
                    >
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Profile"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <>
                          {user?.firstName?.[0]}
                          {user?.lastName?.[0]}
                        </>
                      )}

                      <Box
                        className="camera-overlay"
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          bgcolor: "rgba(0,0,0,0.4)",
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

                    <Box>
                      <Typography
                        variant="h5"
                        fontWeight="700"
                        sx={{ color: "#0f172a" }}
                      >
                        {user?.firstName} {user?.lastName}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Local time:{" "}
                        {new Date().toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    </Box>
                  </Box>
                </label>

                <Typography
                  variant="subtitle2"
                  fontWeight="700"
                  mb={1}
                  sx={{ color: "#475569", letterSpacing: "0.5px" }}
                >
                  CONTACT INFORMATION
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                        color="textSecondary"
                      >
                        EMAIL ADDRESS
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ mt: 0.5, color: "#0f172a", fontWeight: "500" }}
                      >
                        {user?.email}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      sx={{
                        color: "#64748b",
                        "&:hover": { color: "#5048e5", bgcolor: "#f1f5f9" },
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>

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
                        color="textSecondary"
                      >
                        PHONE NUMBER
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ mt: 0.5, color: "#0f172a", fontWeight: "500" }}
                      >
                        {user?.phoneNumber || "Not provided"}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      sx={{
                        color: "#64748b",
                        "&:hover": { color: "#5048e5", bgcolor: "#f1f5f9" },
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>

                  <Box sx={{ pt: 2, mt: 1, borderTop: "1px solid #f1f5f9" }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight="700"
                      sx={{
                        color: "#475569",
                        letterSpacing: "0.5px",
                        mt: 1,
                        mb: 1,
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
                              ? "#02c27c"
                              : "#94a3b8",
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight="700"
                        sx={{
                          color:
                            user?.accountStatus === "ACTIVE"
                              ? "#00c853"
                              : "#94a3b8",
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
