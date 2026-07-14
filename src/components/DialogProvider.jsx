import { createContext, useContext, useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";

/**
 * App-wide modern dialogs & toasts, exposed as an imperative API so call sites
 * can replace the native prompt()/confirm()/alert() with a single await:
 *
 *   const { prompt, confirm, notify } = useDialogs();
 *   const name = await prompt({ title, message, placeholder });   // string | null
 *   const ok   = await confirm({ title, message });               // boolean
 *   notify("Saved", "success");                                   // toast
 */
const DialogContext = createContext(null);

export function useDialogs() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialogs must be used within <DialogProvider>");
  return ctx;
}

const ACCENT = "#5048e5";

export default function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [toast, setToast] = useState(null);

  const prompt = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        setInputValue(opts.defaultValue || "");
        setDialog({ kind: "prompt", resolve, ...opts });
      }),
    [],
  );

  const confirm = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        setDialog({ kind: "confirm", resolve, ...opts });
      }),
    [],
  );

  const notify = useCallback(
    (message, severity = "info") =>
      setToast({ message, severity, key: Date.now() }),
    [],
  );

  const isPrompt = dialog?.kind === "prompt";
  const danger = dialog?.tone === "danger";

  const settle = (result) => {
    if (dialog) dialog.resolve(result);
    setDialog(null);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    settle(isPrompt ? inputValue.trim() : true);
  };

  return (
    <DialogContext.Provider value={{ prompt, confirm, notify }}>
      {children}

      <Dialog
        open={Boolean(dialog)}
        onClose={() => settle(isPrompt ? null : false)}
        slotProps={{
          paper: {
            component: "form",
            onSubmit,
            sx: { borderRadius: 3, minWidth: 400, p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#0f172a" }}>
          {dialog?.title}
        </DialogTitle>
        <DialogContent>
          {dialog?.message && (
            <DialogContentText sx={{ color: "#475569", mb: isPrompt ? 2 : 0 }}>
              {dialog.message}
            </DialogContentText>
          )}
          {isPrompt && (
            <TextField
              autoFocus
              fullWidth
              size="small"
              variant="outlined"
              placeholder={dialog?.placeholder || ""}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button
            onClick={() => settle(isPrompt ? null : false)}
            sx={{ textTransform: "none", color: "#64748b" }}
          >
            {dialog?.cancelText || "Cancel"}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={danger ? "error" : "primary"}
            disableElevation
            disabled={isPrompt && !inputValue.trim()}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              px: 2.5,
              ...(danger ? {} : { bgcolor: ACCENT, "&:hover": { bgcolor: "#403bc4" } }),
            }}
          >
            {dialog?.confirmText || (isPrompt ? "Create" : "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      {toast && (
        <Snackbar
          key={toast.key}
          open
          autoHideDuration={3500}
          onClose={() => setToast(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast(null)}
            severity={toast.severity}
            variant="filled"
            sx={{ borderRadius: 2 }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      )}
    </DialogContext.Provider>
  );
}
