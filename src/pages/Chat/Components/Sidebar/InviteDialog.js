import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export default function InviteDialog({ open, onClose, channelId, channelName, workspaceId }) {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}/chat/join/${channelId}?workspaceId=${workspaceId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: "12px", p: 1 } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" fontWeight="700">
          Invite to #{channelName}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Share this link to invite people to the channel. Anyone with the link can join.
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            bgcolor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            p: "10px 12px",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              fontFamily: "monospace",
              fontSize: "13px",
              color: "#475569",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {inviteUrl}
          </Typography>

          <Box
            component="button"
            onClick={handleCopy}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              border: "none",
              bgcolor: copied ? "#02c27c" : "#5048e5",
              color: "#fff",
              borderRadius: "6px",
              px: 1.5,
              py: 0.8,
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              transition: "0.15s",
              "&:hover": { opacity: 0.85 },
            }}
          >
            <ContentCopyIcon sx={{ fontSize: 16 }} />
            {copied ? "Copied!" : "Copy"}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
