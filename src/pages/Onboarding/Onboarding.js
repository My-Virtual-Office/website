import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Hexagon, Plus, LogIn } from "lucide-react";
import { createWorkspace, acceptInvite, slugify } from "../../api/workspace";

const ACCENT = "#5048e5";

export default function Onboarding() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Accept a pasted invite link or a raw token.
  const extractToken = (v) => {
    const m = (v || "").trim().match(/[0-9a-fA-F-]{16,}/);
    return m ? m[0] : (v || "").trim();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    setBusy(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      await createWorkspace({ name: name.trim(), slug: slugify(name), defaultTimezone: tz });
      navigate("/chat");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create the workspace. Try a different name.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");
    const token = extractToken(invite);
    if (!token) return;
    setBusy(true);
    try {
      await acceptInvite(token);
      navigate("/chat");
    } catch (err) {
      const code = err?.response?.status;
      setError(
        code === 410 ? "That invitation has expired."
          : code === 409 ? "You're already a member (or the invite isn't pending)."
          : "Invalid invitation. Check the link or token.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f6f6f7",
        p: 2,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 460 }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box
            sx={{
              width: 56, height: 56, borderRadius: 3, bgcolor: ACCENT, color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center", mb: 1.5,
            }}
          >
            <Hexagon size={30} strokeWidth={2.2} />
          </Box>
          <Typography variant="h5" fontWeight={800} color="#1d1c1d">
            Welcome to Virtual Office
          </Typography>
          <Typography variant="body2" color="#616061" mt={0.5}>
            Create a new workspace or join one you were invited to.
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 3, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => { setTab(v); setError(""); }}
            variant="fullWidth"
            sx={{
              "& .MuiTab-root": { textTransform: "none", fontWeight: 700, py: 1.5 },
              "& .Mui-selected": { color: `${ACCENT} !important` },
              "& .MuiTabs-indicator": { bgcolor: ACCENT },
            }}
          >
            <Tab icon={<Plus size={18} />} iconPosition="start" label="Create" />
            <Tab icon={<LogIn size={18} />} iconPosition="start" label="Join" />
          </Tabs>

          <CardContent sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

            {tab === 0 ? (
              <Box component="form" onSubmit={handleCreate} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="body2" color="#616061">
                  Name your workspace — you'll be its admin.
                </Typography>
                <TextField
                  autoFocus fullWidth size="small" label="Workspace name"
                  placeholder="e.g. Acme HQ"
                  value={name} onChange={(e) => setName(e.target.value)}
                />
                <Button
                  type="submit" variant="contained" disableElevation disabled={busy || !name.trim()}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: ACCENT, "&:hover": { bgcolor: "#403bc4" }, py: 1 }}
                >
                  {busy ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Create workspace"}
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleJoin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="body2" color="#616061">
                  Paste the invitation link or token you received.
                </Typography>
                <TextField
                  autoFocus fullWidth size="small" label="Invitation link or token"
                  placeholder="https://…?token=…  or  the token"
                  value={invite} onChange={(e) => setInvite(e.target.value)}
                />
                <Button
                  type="submit" variant="contained" disableElevation disabled={busy || !invite.trim()}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, bgcolor: ACCENT, "&:hover": { bgcolor: "#403bc4" }, py: 1 }}
                >
                  {busy ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Join workspace"}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
