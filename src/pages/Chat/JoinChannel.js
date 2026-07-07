import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { joinChannel } from "../../api/chat";
import { Box, CircularProgress, Typography, Paper } from "@mui/material";

export default function JoinChannel() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("joining");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!channelId) return;
    const doJoin = async () => {
      try {
        await joinChannel(channelId);
        setStatus("success");
        setTimeout(() => navigate("/chat", { state: { joinChannelId: channelId } }), 1500);
      } catch (err) {
        setStatus("error");
        setError(err.message || "Failed to join channel");
      }
    };
    doJoin();
  }, [channelId, navigate]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f0f2f5",
        p: 2,
      }}
    >
      <Paper
        sx={{
          p: 5,
          borderRadius: "16px",
          textAlign: "center",
          maxWidth: 420,
          width: "100%",
        }}
      >
        {status === "joining" && (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" fontWeight="600">
              Joining channel...
            </Typography>
          </>
        )}

        {status === "success" && (
          <>
            <Typography
              variant="h5"
              fontWeight="700"
              sx={{ color: "#02c27c", mb: 1 }}
            >
              Joined!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Redirecting to chat...
            </Typography>
          </>
        )}

        {status === "error" && (
          <>
            <Typography
              variant="h6"
              fontWeight="600"
              sx={{ color: "#dc2626", mb: 1 }}
            >
              Failed to join
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {error}
            </Typography>
            <Box
              component="button"
              onClick={() => navigate("/chat")}
              sx={{
                border: "none",
                bgcolor: "#5048e5",
                color: "#fff",
                borderRadius: "8px",
                px: 3,
                py: 1,
                cursor: "pointer",
                fontWeight: 600,
                "&:hover": { opacity: 0.9 },
              }}
            >
              Go to Chat
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}
