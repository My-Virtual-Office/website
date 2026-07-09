import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from "@mui/material";

export default function DeleteConfirmationDialog({ open, onClose, onConfirm }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          borderRadius: "12px",
          padding: "8px",
          fontFamily: "'Inter', sans-serif"
        },
      }}
    >
      <DialogTitle style={{ fontWeight: "600", color: "#1e293b", fontSize: "18px" }}>
        Delete Message
      </DialogTitle>
      <DialogContent>
        <DialogContentText style={{ color: "#64748b", fontSize: "14px" }}>
          Are you sure you want to delete this message? This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions style={{ padding: "16px 24px", gap: "8px" }}>
        <Button
          onClick={onClose}
          style={{
            color: "#64748b",
            fontWeight: "600",
            textTransform: "none",
            fontSize: "14px"
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          style={{
            backgroundColor: "#ef4444",
            color: "#ffffff",
            fontWeight: "600",
            textTransform: "none",
            borderRadius: "6px",
            fontSize: "14px",
            padding: "6px 16px"
          }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}